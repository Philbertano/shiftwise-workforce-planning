import { WebSocket, WebSocketServer } from 'ws'
import { IncomingMessage } from 'http'
import { parse } from 'url'

interface PlanningWebSocketClient {
  ws: WebSocket
  userId: string
  sessionId: string
  lastActivity: Date
}

interface WebSocketMessage {
  type: string
  [key: string]: any
}

export class PlanningWebSocketManager {
  private wss: WebSocketServer
  private clients: Map<string, PlanningWebSocketClient> = new Map()
  private sessionClients: Map<string, Set<string>> = new Map() // sessionId -> Set of clientIds

  constructor(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/api/planning/ws'
    })

    this.wss.on('connection', this.handleConnection.bind(this))
    
    // Cleanup inactive connections every 30 seconds
    setInterval(() => {
      this.cleanupInactiveConnections()
    }, 30000)
  }

  private handleConnection(ws: WebSocket, request: IncomingMessage) {
    const clientId = this.generateClientId()
    console.log(`Planning WebSocket client connected: ${clientId}`)

    // Set up client with default values
    const client: PlanningWebSocketClient = {
      ws,
      userId: 'anonymous',
      sessionId: 'default',
      lastActivity: new Date()
    }

    this.clients.set(clientId, client)

    ws.on('message', (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString())
        this.handleMessage(clientId, message)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
        this.sendError(clientId, 'Invalid message format')
      }
    })

    ws.on('close', () => {
      console.log(`Planning WebSocket client disconnected: ${clientId}`)
      this.handleDisconnection(clientId)
    })

    ws.on('error', (error) => {
      console.error(`Planning WebSocket error for client ${clientId}:`, error)
      this.handleDisconnection(clientId)
    })

    // Send welcome message
    this.sendMessage(clientId, {
      type: 'connected',
      clientId,
      timestamp: new Date().toISOString()
    })
  }

  private handleMessage(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId)
    if (!client) return

    client.lastActivity = new Date()

    switch (message.type) {
      case 'auth':
        this.handleAuth(clientId, message)
        break

      case 'join_session':
        this.handleJoinSession(clientId, message)
        break

      case 'assignment_change':
        this.handleAssignmentChange(clientId, message)
        break

      case 'conflict_resolved':
        this.handleConflictResolved(clientId, message)
        break

      case 'ping':
        this.sendMessage(clientId, { type: 'pong', timestamp: new Date().toISOString() })
        break

      default:
        console.log(`Unknown message type: ${message.type}`)
        this.sendError(clientId, `Unknown message type: ${message.type}`)
    }
  }

  private handleAuth(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId)
    if (!client) return

    client.userId = message.userId || 'anonymous'
    
    this.sendMessage(clientId, {
      type: 'auth_success',
      userId: client.userId,
      timestamp: new Date().toISOString()
    })

    console.log(`Client ${clientId} authenticated as user ${client.userId}`)
  }

  private handleJoinSession(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId)
    if (!client) return

    const sessionId = message.sessionId || 'default'
    
    // Remove from old session
    this.removeFromSession(clientId, client.sessionId)
    
    // Add to new session
    client.sessionId = sessionId
    this.addToSession(clientId, sessionId)

    // Notify other clients in the session
    this.broadcastToSession(sessionId, {
      type: 'user_joined',
      userId: client.userId,
      sessionId,
      timestamp: new Date().toISOString()
    }, clientId)

    this.sendMessage(clientId, {
      type: 'session_joined',
      sessionId,
      timestamp: new Date().toISOString()
    })

    console.log(`Client ${clientId} joined session ${sessionId}`)
  }

  private handleAssignmentChange(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId)
    if (!client) return

    // Broadcast the assignment change to other clients in the same session
    this.broadcastToSession(client.sessionId, {
      type: 'assignment_change',
      changeType: message.changeType,
      assignment: message.assignment,
      timestamp: message.timestamp,
      changeId: message.changeId,
      userId: client.userId
    }, clientId)

    console.log(`Assignment change from ${client.userId}: ${message.changeType}`)
  }

  private handleConflictResolved(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId)
    if (!client) return

    // Broadcast the conflict resolution to other clients in the same session
    this.broadcastToSession(client.sessionId, {
      type: 'conflict_resolved',
      conflictId: message.conflictId,
      resolution: message.resolution,
      userId: client.userId,
      timestamp: new Date().toISOString()
    }, clientId)

    console.log(`Conflict resolved by ${client.userId}: ${message.conflictId}`)
  }

  private handleDisconnection(clientId: string) {
    const client = this.clients.get(clientId)
    if (!client) return

    // Notify other clients in the session
    this.broadcastToSession(client.sessionId, {
      type: 'user_left',
      userId: client.userId,
      sessionId: client.sessionId,
      timestamp: new Date().toISOString()
    }, clientId)

    // Remove from session
    this.removeFromSession(clientId, client.sessionId)
    
    // Remove client
    this.clients.delete(clientId)
  }

  private addToSession(clientId: string, sessionId: string) {
    if (!this.sessionClients.has(sessionId)) {
      this.sessionClients.set(sessionId, new Set())
    }
    this.sessionClients.get(sessionId)!.add(clientId)
  }

  private removeFromSession(clientId: string, sessionId: string) {
    const sessionClients = this.sessionClients.get(sessionId)
    if (sessionClients) {
      sessionClients.delete(clientId)
      if (sessionClients.size === 0) {
        this.sessionClients.delete(sessionId)
      }
    }
  }

  private broadcastToSession(sessionId: string, message: WebSocketMessage, excludeClientId?: string) {
    const sessionClients = this.sessionClients.get(sessionId)
    if (!sessionClients) return

    sessionClients.forEach(clientId => {
      if (clientId !== excludeClientId) {
        this.sendMessage(clientId, message)
      }
    })
  }

  private sendMessage(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId)
    if (!client || client.ws.readyState !== WebSocket.OPEN) return

    try {
      client.ws.send(JSON.stringify(message))
    } catch (error) {
      console.error(`Error sending message to client ${clientId}:`, error)
      this.handleDisconnection(clientId)
    }
  }

  private sendError(clientId: string, error: string) {
    this.sendMessage(clientId, {
      type: 'error',
      error,
      timestamp: new Date().toISOString()
    })
  }

  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private cleanupInactiveConnections() {
    const now = new Date()
    const timeout = 5 * 60 * 1000 // 5 minutes

    this.clients.forEach((client, clientId) => {
      if (now.getTime() - client.lastActivity.getTime() > timeout) {
        console.log(`Cleaning up inactive client: ${clientId}`)
        client.ws.terminate()
        this.handleDisconnection(clientId)
      }
    })
  }

  // Public methods for external use
  public broadcastConflict(sessionId: string, conflict: any) {
    this.broadcastToSession(sessionId, {
      type: 'conflict_detected',
      conflictId: conflict.id,
      conflictType: conflict.type,
      affectedAssignments: conflict.affectedAssignments,
      message: conflict.message,
      timestamp: new Date().toISOString()
    })
  }

  public getSessionStats() {
    const stats = {
      totalClients: this.clients.size,
      totalSessions: this.sessionClients.size,
      sessions: Array.from(this.sessionClients.entries()).map(([sessionId, clients]) => ({
        sessionId,
        clientCount: clients.size,
        clients: Array.from(clients).map(clientId => {
          const client = this.clients.get(clientId)
          return {
            clientId,
            userId: client?.userId,
            lastActivity: client?.lastActivity
          }
        })
      }))
    }
    return stats
  }

  public close() {
    this.wss.close()
    this.clients.clear()
    this.sessionClients.clear()
  }
}

// Export a singleton instance
let wsManager: PlanningWebSocketManager | null = null

export const initializePlanningWebSocket = (server: any): PlanningWebSocketManager => {
  if (!wsManager) {
    wsManager = new PlanningWebSocketManager(server)
  }
  return wsManager
}

export const getPlanningWebSocketManager = (): PlanningWebSocketManager | null => {
  return wsManager
}
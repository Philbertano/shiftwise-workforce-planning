import { Assignment, PlanningBoardData } from '../types'

export interface PlanningChange {
  type: 'add' | 'update' | 'delete'
  assignment: Assignment
  timestamp: Date
  id: string
}

export interface AssignmentConflict {
  id: string
  type: 'double_booking' | 'skill_mismatch' | 'capacity_exceeded' | 'concurrent_modification'
  affectedAssignments: string[]
  message: string
  resolution?: ConflictResolution
}

export interface ConflictResolution {
  action: 'accept_local' | 'accept_remote' | 'merge' | 'manual'
  resolvedAssignment?: Assignment
}

export interface PersistenceError {
  type: 'network' | 'validation' | 'conflict' | 'server'
  message: string
  assignment?: Assignment
  retryable: boolean
}

export interface PlanningSnapshot {
  id: string
  date: Date
  assignments: Assignment[]
  version: number
  createdAt: Date
  conflicts: AssignmentConflict[]
}

export class PlanningPersistenceService {
  private baseUrl: string
  private debounceTimeout: NodeJS.Timeout | null = null
  private pendingChanges: Map<string, PlanningChange> = new Map()
  private optimisticUpdates: Map<string, Assignment> = new Map()
  private changeListeners: Set<(changes: PlanningChange[]) => void> = new Set()
  private errorListeners: Set<(error: PersistenceError) => void> = new Set()
  private conflictListeners: Set<(conflict: AssignmentConflict) => void> = new Set()
  private isOnline: boolean = navigator.onLine
  private retryQueue: PlanningChange[] = []
  private maxRetries: number = 3
  private retryDelay: number = 1000
  private websocket: WebSocket | null = null
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 1000
  private currentUserId: string = 'current-user' // This should be set from auth context

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
    this.setupNetworkListeners()
    this.startRetryProcessor()
    this.initializeWebSocket()
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.processRetryQueue()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })
  }

  private startRetryProcessor(): void {
    setInterval(() => {
      if (this.isOnline && this.retryQueue.length > 0) {
        this.processRetryQueue()
      }
    }, this.retryDelay)
  }

  private initializeWebSocket(): void {
    if (typeof window === 'undefined') return // Skip in SSR

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/planning/ws`

    try {
      this.websocket = new WebSocket(wsUrl)
      
      this.websocket.onopen = () => {
        console.log('Planning WebSocket connected')
        this.reconnectAttempts = 0
        
        // Send authentication/identification message
        this.websocket?.send(JSON.stringify({
          type: 'auth',
          userId: this.currentUserId
        }))
      }

      this.websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          this.handleWebSocketMessage(message)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      this.websocket.onclose = () => {
        console.log('Planning WebSocket disconnected')
        this.websocket = null
        this.scheduleReconnect()
      }

      this.websocket.onerror = (error) => {
        console.error('Planning WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error)
      this.scheduleReconnect()
    }
  }

  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'assignment_change':
        // Another user made a change
        if (message.userId !== this.currentUserId) {
          const change: PlanningChange = {
            type: message.changeType,
            assignment: message.assignment,
            timestamp: new Date(message.timestamp),
            id: message.changeId
          }
          this.notifyChangeListeners([change])
        }
        break

      case 'conflict_detected':
        // Server detected a conflict
        const conflict: AssignmentConflict = {
          id: message.conflictId,
          type: message.conflictType,
          affectedAssignments: message.affectedAssignments,
          message: message.message
        }
        this.notifyConflictListeners(conflict)
        break

      case 'user_joined':
        console.log(`User ${message.userId} joined planning session`)
        break

      case 'user_left':
        console.log(`User ${message.userId} left planning session`)
        break

      default:
        console.log('Unknown WebSocket message type:', message.type)
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max WebSocket reconnection attempts reached')
      return
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++

    setTimeout(() => {
      if (this.isOnline) {
        console.log(`Attempting WebSocket reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        this.initializeWebSocket()
      }
    }, delay)
  }

  private broadcastChange(change: PlanningChange): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'assignment_change',
        changeType: change.type,
        assignment: change.assignment,
        timestamp: change.timestamp.toISOString(),
        changeId: change.id,
        userId: this.currentUserId
      }))
    }
  }

  /**
   * Save an assignment with optimistic updates and auto-save debouncing
   */
  async saveAssignment(assignment: Assignment): Promise<void> {
    // Detect potential conflicts before saving
    const conflicts = await this.detectConflicts(assignment)
    
    // If there are conflicts, handle them first
    if (conflicts.length > 0) {
      for (const conflict of conflicts) {
        await this.handleConflict(conflict)
      }
      return // Don't proceed with save until conflicts are resolved
    }

    const changeId = `${assignment.id}-${Date.now()}`
    const change: PlanningChange = {
      type: assignment.id.startsWith('temp-') ? 'add' : 'update',
      assignment,
      timestamp: new Date(),
      id: changeId
    }

    // Apply optimistic update immediately
    this.optimisticUpdates.set(assignment.id, assignment)
    this.notifyChangeListeners([change])

    // Broadcast change to other users
    this.broadcastChange(change)

    // Add to pending changes
    this.pendingChanges.set(assignment.id, change)

    // Debounce the actual save
    this.debouncedSave()
  }

  /**
   * Remove an assignment with optimistic updates
   */
  async removeAssignment(assignmentId: string): Promise<void> {
    const existingAssignment = this.optimisticUpdates.get(assignmentId)
    if (!existingAssignment) {
      throw new Error(`Assignment ${assignmentId} not found`)
    }

    const changeId = `${assignmentId}-delete-${Date.now()}`
    const change: PlanningChange = {
      type: 'delete',
      assignment: existingAssignment,
      timestamp: new Date(),
      id: changeId
    }

    // Apply optimistic update immediately
    this.optimisticUpdates.delete(assignmentId)
    this.notifyChangeListeners([change])

    // Add to pending changes
    this.pendingChanges.set(assignmentId, change)

    // Debounce the actual save
    this.debouncedSave()
  }

  /**
   * Load planning data for a specific date
   */
  async loadPlanningData(date: Date): Promise<PlanningBoardData> {
    try {
      const dateStr = date.toISOString().split('T')[0]
      const response = await fetch(`${this.baseUrl}/planning/data/${dateStr}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load planning data: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Clear optimistic updates when loading fresh data
      this.optimisticUpdates.clear()
      this.pendingChanges.clear()

      return data
    } catch (error) {
      this.handleError({
        type: 'network',
        message: `Failed to load planning data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        retryable: true
      })
      throw error
    }
  }

  /**
   * Subscribe to real-time changes
   */
  subscribeToChanges(callback: (changes: PlanningChange[]) => void): () => void {
    this.changeListeners.add(callback)
    return () => this.changeListeners.delete(callback)
  }

  /**
   * Subscribe to persistence errors
   */
  subscribeToErrors(callback: (error: PersistenceError) => void): () => void {
    this.errorListeners.add(callback)
    return () => this.errorListeners.delete(callback)
  }

  /**
   * Subscribe to conflicts
   */
  subscribeToConflicts(callback: (conflict: AssignmentConflict) => void): () => void {
    this.conflictListeners.add(callback)
    return () => this.conflictListeners.delete(callback)
  }

  /**
   * Handle assignment conflicts
   */
  async handleConflict(conflict: AssignmentConflict): Promise<ConflictResolution> {
    // Notify conflict listeners first
    this.notifyConflictListeners(conflict)

    // Return a promise that will be resolved when the UI provides a resolution
    return new Promise((resolve) => {
      // Store the resolver for this conflict
      (conflict as any).resolver = resolve
    })
  }

  /**
   * Resolve a conflict with a specific resolution
   */
  async resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/planning/conflicts/${conflictId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resolution,
          userId: this.currentUserId
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to resolve conflict: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Apply the resolution locally
      if (resolution.resolvedAssignment) {
        this.optimisticUpdates.set(resolution.resolvedAssignment.id, resolution.resolvedAssignment)
        
        const change: PlanningChange = {
          type: 'update',
          assignment: resolution.resolvedAssignment,
          timestamp: new Date(),
          id: `resolved-${conflictId}-${Date.now()}`
        }
        
        this.notifyChangeListeners([change])
      }

      // Broadcast the resolution to other users
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({
          type: 'conflict_resolved',
          conflictId,
          resolution,
          userId: this.currentUserId
        }))
      }

    } catch (error) {
      this.handleError({
        type: 'network',
        message: `Failed to resolve conflict: ${error instanceof Error ? error.message : 'Unknown error'}`,
        retryable: true
      })
      throw error
    }
  }

  /**
   * Detect potential conflicts before saving
   */
  private async detectConflicts(assignment: Assignment): Promise<AssignmentConflict[]> {
    const conflicts: AssignmentConflict[] = []

    // Check for double booking
    const existingAssignments = this.getOptimisticAssignments()
    const conflictingAssignments = existingAssignments.filter(existing => 
      existing.id !== assignment.id &&
      existing.employeeId === assignment.employeeId &&
      existing.demandId !== assignment.demandId
    )

    if (conflictingAssignments.length > 0) {
      conflicts.push({
        id: `double-booking-${Date.now()}`,
        type: 'double_booking',
        affectedAssignments: [assignment.id, ...conflictingAssignments.map(a => a.id)],
        message: `Employee ${assignment.employeeId} is already assigned to another station`
      })
    }

    // Check capacity constraints (this would need station data)
    // For now, we'll simulate this check
    const stationAssignments = existingAssignments.filter(a => a.demandId === assignment.demandId)
    const maxCapacity = 3 // This should come from station configuration
    
    if (stationAssignments.length >= maxCapacity) {
      conflicts.push({
        id: `capacity-exceeded-${Date.now()}`,
        type: 'capacity_exceeded',
        affectedAssignments: [assignment.id],
        message: `Station capacity exceeded (${stationAssignments.length}/${maxCapacity})`
      })
    }

    return conflicts
  }

  /**
   * Get current optimistic state
   */
  getOptimisticAssignments(): Assignment[] {
    return Array.from(this.optimisticUpdates.values())
  }

  /**
   * Rollback optimistic updates
   */
  async rollbackOptimisticUpdates(): Promise<void> {
    const rolledBackAssignments = Array.from(this.optimisticUpdates.values())
    this.optimisticUpdates.clear()
    this.pendingChanges.clear()

    // Notify listeners of rollback
    const rollbackChanges: PlanningChange[] = rolledBackAssignments.map(assignment => ({
      type: 'delete',
      assignment,
      timestamp: new Date(),
      id: `rollback-${assignment.id}-${Date.now()}`
    }))

    this.notifyChangeListeners(rollbackChanges)
  }

  /**
   * Force sync all pending changes
   */
  async forceSyncPendingChanges(): Promise<void> {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
      this.debounceTimeout = null
    }
    await this.processPendingChanges()
  }

  private debouncedSave(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }

    this.debounceTimeout = setTimeout(() => {
      this.processPendingChanges()
    }, 500) // 500ms debounce
  }

  private async processPendingChanges(): Promise<void> {
    if (this.pendingChanges.size === 0) {
      return
    }

    if (!this.isOnline || !navigator.onLine) {
      // Add to retry queue for when we're back online
      this.retryQueue.push(...Array.from(this.pendingChanges.values()))
      this.pendingChanges.clear()
      return
    }

    const changes = Array.from(this.pendingChanges.values())
    this.pendingChanges.clear()

    try {
      await this.syncChangesToBackend(changes)
    } catch (error) {
      // Add failed changes to retry queue
      this.retryQueue.push(...changes)
      
      this.handleError({
        type: 'network',
        message: `Failed to sync changes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        retryable: true
      })
    }
  }

  private async syncChangesToBackend(changes: PlanningChange[]): Promise<void> {
    const payload = {
      changes: changes.map(change => ({
        type: change.type,
        assignment: change.assignment,
        timestamp: change.timestamp.toISOString(),
        id: change.id
      }))
    }

    const response = await fetch(`${this.baseUrl}/planning/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      if (response.status === 409) {
        // Conflict detected
        const conflictData = await response.json()
        const conflict: AssignmentConflict = {
          id: `conflict-${Date.now()}`,
          type: 'concurrent_modification',
          affectedAssignments: changes.map(c => c.assignment.id),
          message: conflictData.message || 'Concurrent modification detected'
        }
        
        await this.handleConflict(conflict)
        return
      }

      throw new Error(`Sync failed: ${response.statusText}`)
    }

    const result = await response.json()
    
    // Handle any conflicts returned from the server
    if (result.conflicts && result.conflicts.length > 0) {
      for (const conflictData of result.conflicts) {
        const conflict: AssignmentConflict = {
          id: conflictData.id,
          type: conflictData.type,
          affectedAssignments: conflictData.affectedAssignments,
          message: conflictData.message
        }
        await this.handleConflict(conflict)
      }
    }
  }

  private async processRetryQueue(): Promise<void> {
    if (this.retryQueue.length === 0) {
      return
    }

    const changesToRetry = [...this.retryQueue]
    this.retryQueue = []

    try {
      await this.syncChangesToBackend(changesToRetry)
    } catch (error) {
      // If retry fails, put changes back in queue (with limit)
      const retriesLeft = changesToRetry.filter(change => 
        (change as any).retryCount < this.maxRetries
      )
      
      retriesLeft.forEach(change => {
        (change as any).retryCount = ((change as any).retryCount || 0) + 1
      })

      this.retryQueue.push(...retriesLeft)

      this.handleError({
        type: 'network',
        message: `Retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        retryable: retriesLeft.length > 0
      })
    }
  }

  private notifyChangeListeners(changes: PlanningChange[]): void {
    this.changeListeners.forEach(listener => {
      try {
        listener(changes)
      } catch (error) {
        console.error('Error in change listener:', error)
      }
    })
  }

  private notifyErrorListeners(error: PersistenceError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error)
      } catch (err) {
        console.error('Error in error listener:', err)
      }
    })
  }

  private notifyConflictListeners(conflict: AssignmentConflict): void {
    this.conflictListeners.forEach(listener => {
      try {
        listener(conflict)
      } catch (error) {
        console.error('Error in conflict listener:', error)
      }
    })
  }

  private handleError(error: PersistenceError): void {
    console.error('Persistence error:', error)
    this.notifyErrorListeners(error)
  }

  /**
   * Create a snapshot of current planning state
   */
  async createSnapshot(date: Date): Promise<PlanningSnapshot> {
    const assignments = this.getOptimisticAssignments()
    
    const snapshot: PlanningSnapshot = {
      id: `snapshot-${Date.now()}`,
      date,
      assignments,
      version: 1,
      createdAt: new Date(),
      conflicts: []
    }

    try {
      const response = await fetch(`${this.baseUrl}/planning/snapshots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(snapshot)
      })

      if (!response.ok) {
        throw new Error(`Failed to create snapshot: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.handleError({
        type: 'network',
        message: `Failed to create snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`,
        retryable: true
      })
      throw error
    }
  }

  /**
   * Restore from a snapshot
   */
  async restoreFromSnapshot(snapshotId: string): Promise<PlanningBoardData> {
    try {
      const response = await fetch(`${this.baseUrl}/planning/snapshots/${snapshotId}/restore`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`Failed to restore snapshot: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Clear current state and apply snapshot data
      this.optimisticUpdates.clear()
      this.pendingChanges.clear()

      return data
    } catch (error) {
      this.handleError({
        type: 'network',
        message: `Failed to restore snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`,
        retryable: true
      })
      throw error
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }
    
    if (this.websocket) {
      if (typeof this.websocket.close === 'function') {
        this.websocket.close()
      }
      this.websocket = null
    }
    
    this.changeListeners.clear()
    this.errorListeners.clear()
    this.conflictListeners.clear()
    this.optimisticUpdates.clear()
    this.pendingChanges.clear()
    this.retryQueue = []
  }

  /**
   * Set the current user ID for conflict resolution
   */
  setCurrentUserId(userId: string): void {
    this.currentUserId = userId
  }

  /**
   * Get active conflicts
   */
  getActiveConflicts(): AssignmentConflict[] {
    // This would typically be stored in the service state
    // For now, return empty array - conflicts are handled via listeners
    return []
  }

  /**
   * Check if the service is connected to real-time updates
   */
  isConnected(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN
  }
}

// Singleton instance
let persistenceServiceInstance: PlanningPersistenceService | null = null

export const getPlanningPersistenceService = (): PlanningPersistenceService => {
  if (!persistenceServiceInstance) {
    persistenceServiceInstance = new PlanningPersistenceService()
  }
  return persistenceServiceInstance
}
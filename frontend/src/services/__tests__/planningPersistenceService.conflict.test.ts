import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Assignment, AssignmentStatus } from '../../types'
// Import types and service separately to avoid module resolution issues
import type { AssignmentConflict, ConflictResolution } from '../planningPersistenceService'
import { PlanningPersistenceService } from '../planningPersistenceService'

// Mock WebSocket
const mockWebSocket = vi.fn().mockImplementation(() => ({
  readyState: 1, // OPEN
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}))
global.WebSocket = mockWebSocket as any
// Mock fetch
global.fetch = vi.fn()

// Mock navigator
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

describe('PlanningPersistenceService - Conflict Resolution', () => {
  let service: PlanningPersistenceService
  let mockFetch: any

  const mockAssignment: Assignment = {
    id: 'assignment-1',
    demandId: 'demand-1',
    employeeId: 'employee-1',
    status: 'confirmed' as AssignmentStatus,
    score: 85,
    explanation: 'Test assignment',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    createdBy: 'user-1'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.mocked(fetch)
    service = new PlanningPersistenceService('/api')
  })

  afterEach(() => {
    service.dispose()
  })

  describe('Subscription Methods', () => {
    it('should allow subscribing to changes', () => {
      const changeListener = vi.fn()
      const unsubscribe = service.subscribeToChanges(changeListener)
      expect(typeof unsubscribe).toBe('function')
      // Test unsubscribe
      unsubscribe()
    })

    it('should allow subscribing to errors', () => {
      const errorListener = vi.fn()
      const unsubscribe = service.subscribeToErrors(errorListener)
      expect(typeof unsubscribe).toBe('function')
      // Test unsubscribe
      unsubscribe()
    })

    it('should allow subscribing to conflicts', () => {
      const conflictListener = vi.fn()
      const unsubscribe = service.subscribeToConflicts(conflictListener)
      expect(typeof unsubscribe).toBe('function')
      // Test unsubscribe
      unsubscribe()
    })
  })

  describe('Conflict Resolution', () => {
    it('should resolve conflicts with accept_local action', async () => {
      const conflictId = 'conflict-1'
      const resolution: ConflictResolution = {
        action: 'accept_local',
        resolvedAssignment: mockAssignment
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          conflictId,
          resolution: 'accept_local'
        })
      })

      await service.resolveConflict(conflictId, resolution)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/planning/conflicts/conflict-1/resolve',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resolution,
            userId: 'current-user'
          })
        })
      )
    })

    it('should handle resolution errors', async () => {
      const conflictId = 'conflict-error'
      const resolution: ConflictResolution = {
        action: 'accept_local',
        resolvedAssignment: mockAssignment
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      })

      const errorListener = vi.fn()
      service.subscribeToErrors(errorListener)

      await expect(service.resolveConflict(conflictId, resolution)).rejects.toThrow(
        'Failed to resolve conflict: Internal Server Error'
      )

      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'network',
          message: expect.stringContaining('Failed to resolve conflict'),
          retryable: true
        })
      )
    })
  })

  describe('WebSocket Integration', () => {
    it('should track WebSocket connection status', () => {
      expect(service.isConnected()).toBe(false)
      
      // Mock WebSocket.OPEN constant
      global.WebSocket.OPEN = 1
      
      const mockWebSocket = {
        readyState: 1, // OPEN
        send: vi.fn(),
        close: vi.fn()
      }
      service['websocket'] = mockWebSocket as any
      expect(service.isConnected()).toBe(true)
    })
  })

  describe('Service State Management', () => {
    it('should track connection status', () => {
      // Mock WebSocket constants
      global.WebSocket.OPEN = 1
      global.WebSocket.CLOSED = 3
      
      // Ensure service starts with no websocket
      service['websocket'] = null
      expect(service.isConnected()).toBe(false)

      service['websocket'] = { readyState: 1 } as any
      expect(service.isConnected()).toBe(true)

      service['websocket'] = { readyState: 3 } as any // CLOSED
      expect(service.isConnected()).toBe(false)
    })

    it('should allow setting current user ID', () => {
      service.setCurrentUserId('new-user-123')
      expect(service['currentUserId']).toBe('new-user-123')
    })

    it('should clean up WebSocket on dispose', () => {
      const mockWebSocket = {
        close: vi.fn(),
        readyState: 1
      }
      service['websocket'] = mockWebSocket as any

      service.dispose()

      expect(mockWebSocket.close).toHaveBeenCalled()
      expect(service['websocket']).toBeNull()
    })
  })
})
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { PlanningPersistenceService, AssignmentConflict, PersistenceError } from '../planningPersistenceService'
import { Assignment, AssignmentStatus } from '../../types'

// Mock fetch
global.fetch = vi.fn()
const mockFetch = fetch as Mock

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

// Mock window event listeners
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener
})
Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener
})

describe('PlanningPersistenceService', () => {
  let service: PlanningPersistenceService
  let mockAssignment: Assignment

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PlanningPersistenceService('/api')
    
    mockAssignment = {
      id: 'test-assignment-1',
      demandId: 'demand-1',
      employeeId: 'emp-1',
      status: 'proposed' as AssignmentStatus,
      score: 0.95,
      explanation: 'Test assignment',
      createdAt: new Date(),
      createdBy: 'test-user'
    }

    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true
    })
  })

  afterEach(() => {
    service.dispose()
  })

  describe('constructor', () => {
    it('should initialize with default base URL', () => {
      const defaultService = new PlanningPersistenceService()
      expect(defaultService).toBeDefined()
      defaultService.dispose()
    })

    it('should set up network listeners', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function))
      expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
    })
  })

  describe('saveAssignment', () => {
    it('should apply optimistic update immediately', async () => {
      const changeListener = vi.fn()
      service.subscribeToChanges(changeListener)

      await service.saveAssignment(mockAssignment)

      expect(changeListener).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'update',
          assignment: mockAssignment
        })
      ])

      const optimisticAssignments = service.getOptimisticAssignments()
      expect(optimisticAssignments).toContain(mockAssignment)
    })

    it('should detect new assignments vs updates', async () => {
      const changeListener = vi.fn()
      service.subscribeToChanges(changeListener)

      const newAssignment = { ...mockAssignment, id: 'temp-new-assignment' }
      await service.saveAssignment(newAssignment)

      expect(changeListener).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'add',
          assignment: newAssignment
        })
      ])
    })

    it('should debounce save operations', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, results: [], conflicts: [] })
      })

      await service.saveAssignment(mockAssignment)
      await service.saveAssignment({ ...mockAssignment, score: 0.8 })

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600))

      // Should only make one API call due to debouncing
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('removeAssignment', () => {
    it('should apply optimistic delete immediately', async () => {
      const changeListener = vi.fn()
      service.subscribeToChanges(changeListener)

      // First add the assignment
      await service.saveAssignment(mockAssignment)
      changeListener.mockClear()

      // Then remove it
      await service.removeAssignment(mockAssignment.id)

      expect(changeListener).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'delete',
          assignment: mockAssignment
        })
      ])

      const optimisticAssignments = service.getOptimisticAssignments()
      expect(optimisticAssignments).not.toContain(mockAssignment)
    })

    it('should throw error if assignment not found', async () => {
      await expect(service.removeAssignment('non-existent')).rejects.toThrow(
        'Assignment non-existent not found'
      )
    })
  })

  describe('loadPlanningData', () => {
    it('should load data successfully', async () => {
      const mockData = {
        stations: [],
        shifts: [],
        employees: [],
        assignments: [mockAssignment],
        coverageStatus: [],
        violations: []
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData)
      })

      const result = await service.loadPlanningData(new Date('2024-01-15'))

      expect(mockFetch).toHaveBeenCalledWith('/api/planning/data/2024-01-15')
      expect(result).toEqual(mockData)
    })

    it('should handle load errors', async () => {
      const errorListener = vi.fn()
      service.subscribeToErrors(errorListener)

      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Not Found'
      })

      await expect(service.loadPlanningData(new Date())).rejects.toThrow()
      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'network',
          retryable: true
        })
      )
    })

    it('should clear optimistic updates when loading fresh data', async () => {
      await service.saveAssignment(mockAssignment)
      expect(service.getOptimisticAssignments()).toHaveLength(1)

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          stations: [], shifts: [], employees: [], assignments: [], coverageStatus: [], violations: []
        })
      })

      await service.loadPlanningData(new Date())
      expect(service.getOptimisticAssignments()).toHaveLength(0)
    })
  })

  describe('conflict handling', () => {
    it('should handle conflicts from server', async () => {
      const conflictListener = vi.fn()
      service.subscribeToConflicts(conflictListener)

      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({
          message: 'Concurrent modification detected'
        })
      })

      await service.saveAssignment(mockAssignment)
      
      // Wait for debounced save
      await new Promise(resolve => setTimeout(resolve, 600))

      expect(conflictListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'concurrent_modification',
          message: 'Concurrent modification detected'
        })
      )
    })

    it('should resolve conflicts', async () => {
      const conflict: AssignmentConflict = {
        id: 'conflict-1',
        type: 'double_booking',
        affectedAssignments: [mockAssignment.id],
        message: 'Double booking detected'
      }

      const resolution = await service.handleConflict(conflict)
      expect(resolution.action).toBe('accept_local')
    })
  })

  describe('offline handling', () => {
    it('should queue changes when offline', async () => {
      // Set both navigator.onLine and service's internal state
      Object.defineProperty(navigator, 'onLine', { value: false })
      service['isOnline'] = false

      await service.saveAssignment(mockAssignment)
      
      // Wait for debounced save
      await new Promise(resolve => setTimeout(resolve, 600))

      // Should not make API call when offline
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should process retry queue when back online', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', { value: false })
      
      await service.saveAssignment(mockAssignment)
      await new Promise(resolve => setTimeout(resolve, 600))

      // Go back online
      Object.defineProperty(navigator, 'onLine', { value: true })
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, results: [], conflicts: [] })
      })

      // Simulate online event
      const onlineHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'online'
      )?.[1]
      
      if (onlineHandler) {
        onlineHandler()
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      expect(mockFetch).toHaveBeenCalled()
    })
  })

  describe('rollback functionality', () => {
    it('should rollback optimistic updates', async () => {
      const changeListener = vi.fn()
      service.subscribeToChanges(changeListener)

      await service.saveAssignment(mockAssignment)
      expect(service.getOptimisticAssignments()).toHaveLength(1)

      changeListener.mockClear()
      await service.rollbackOptimisticUpdates()

      expect(service.getOptimisticAssignments()).toHaveLength(0)
      expect(changeListener).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'delete',
          assignment: mockAssignment
        })
      ])
    })
  })

  describe('force sync', () => {
    it('should force sync pending changes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, results: [], conflicts: [] })
      })

      await service.saveAssignment(mockAssignment)
      await service.forceSyncPendingChanges()

      expect(mockFetch).toHaveBeenCalledWith('/api/planning/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining(mockAssignment.id)
      })
    })
  })

  describe('snapshots', () => {
    it('should create snapshot', async () => {
      const mockSnapshot = {
        id: 'snapshot-1',
        date: new Date(),
        assignments: [mockAssignment],
        version: 1,
        createdAt: new Date(),
        conflicts: []
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, snapshot: mockSnapshot })
      })

      await service.saveAssignment(mockAssignment)
      await service.createSnapshot(new Date())

      expect(mockFetch).toHaveBeenCalledWith('/api/planning/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String)
      })
    })

    it('should restore from snapshot', async () => {
      const mockData = {
        stations: [], shifts: [], employees: [], assignments: [mockAssignment], coverageStatus: [], violations: []
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData)
      })

      const result = await service.restoreFromSnapshot('snapshot-1')

      expect(mockFetch).toHaveBeenCalledWith('/api/planning/snapshots/snapshot-1/restore', {
        method: 'POST'
      })
      expect(result).toEqual(mockData)
    })
  })

  describe('subscription management', () => {
    it('should manage change subscriptions', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      const unsubscribe1 = service.subscribeToChanges(listener1)
      const unsubscribe2 = service.subscribeToChanges(listener2)

      // Both should be called
      service['notifyChangeListeners']([{
        type: 'add',
        assignment: mockAssignment,
        timestamp: new Date(),
        id: 'change-1'
      }])

      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()

      // Unsubscribe one
      unsubscribe1()
      listener1.mockClear()
      listener2.mockClear()

      service['notifyChangeListeners']([{
        type: 'add',
        assignment: mockAssignment,
        timestamp: new Date(),
        id: 'change-2'
      }])

      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()

      unsubscribe2()
    })

    it('should manage error subscriptions', () => {
      const errorListener = vi.fn()
      const unsubscribe = service.subscribeToErrors(errorListener)

      const error: PersistenceError = {
        type: 'network',
        message: 'Test error',
        retryable: true
      }

      service['handleError'](error)
      expect(errorListener).toHaveBeenCalledWith(error)

      unsubscribe()
      errorListener.mockClear()

      service['handleError'](error)
      expect(errorListener).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('should dispose resources properly', () => {
      const changeListener = vi.fn()
      const errorListener = vi.fn()
      const conflictListener = vi.fn()

      service.subscribeToChanges(changeListener)
      service.subscribeToErrors(errorListener)
      service.subscribeToConflicts(conflictListener)

      service.dispose()

      // Should not call listeners after disposal
      service['notifyChangeListeners']([{
        type: 'add',
        assignment: mockAssignment,
        timestamp: new Date(),
        id: 'change-1'
      }])

      expect(changeListener).not.toHaveBeenCalled()
    })
  })
})
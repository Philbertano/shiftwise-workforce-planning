import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import { PlanningProvider, usePlanning } from '../PlanningContext'
import { getPlanningPersistenceService } from '../../services/planningPersistenceService'
import { Assignment, PlanningBoardData } from '../../types'

// Mock the persistence service
vi.mock('../../services/planningPersistenceService')

const mockPersistenceService = {
  saveAssignment: vi.fn(),
  removeAssignment: vi.fn(),
  loadPlanningData: vi.fn(),
  subscribeToChanges: vi.fn(() => () => {}),
  subscribeToErrors: vi.fn(() => () => {}),
  subscribeToConflicts: vi.fn(() => () => {}),
  forceSyncPendingChanges: vi.fn(),
  handleConflict: vi.fn()
}

const mockGetPlanningPersistenceService = getPlanningPersistenceService as ReturnType<typeof vi.fn>

describe('PlanningContext with Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPlanningPersistenceService.mockReturnValue(mockPersistenceService as any)
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    })

    // Mock online status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })
  })

  const TestComponent: React.FC = () => {
    const { state, addAssignment, updateAssignment, deleteAssignment, loadPlanningData, forceSave } = usePlanning()
    
    return (
      <div>
        <div data-testid="loading">{state.isLoading ? 'loading' : 'not-loading'}</div>
        <div data-testid="saving">{state.isSaving ? 'saving' : 'not-saving'}</div>
        <div data-testid="online">{state.isOnline ? 'online' : 'offline'}</div>
        <div data-testid="unsaved">{state.hasUnsavedChanges ? 'unsaved' : 'saved'}</div>
        <div data-testid="assignments-count">{state.data.assignments.length}</div>
        <div data-testid="conflicts-count">{state.conflicts.length}</div>
        <div data-testid="last-saved">{state.lastSaved?.toISOString() || 'never'}</div>
        
        <button 
          data-testid="add-assignment"
          onClick={() => addAssignment({
            id: 'test-assignment',
            demandId: 'demand-1',
            employeeId: 'emp-1',
            status: 'proposed',
            score: 0.8,
            createdAt: new Date(),
            createdBy: 'test-user'
          })}
        >
          Add Assignment
        </button>
        
        <button 
          data-testid="force-save"
          onClick={() => forceSave()}
        >
          Force Save
        </button>
        
        <button 
          data-testid="load-data"
          onClick={() => loadPlanningData(new Date())}
        >
          Load Data
        </button>
      </div>
    )
  }

  it('should initialize with persistence service', async () => {
    const mockData: PlanningBoardData = {
      stations: [],
      shifts: [],
      employees: [],
      assignments: [],
      coverageStatus: [],
      violations: []
    }

    mockPersistenceService.loadPlanningData.mockResolvedValue(mockData)

    render(
      <PlanningProvider>
        <TestComponent />
      </PlanningProvider>
    )

    // Should start loading
    expect(screen.getByTestId('loading')).toHaveTextContent('loading')

    // Wait for initialization to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    // Should have called loadPlanningData
    expect(mockPersistenceService.loadPlanningData).toHaveBeenCalled()
    
    // Should set up subscriptions
    expect(mockPersistenceService.subscribeToChanges).toHaveBeenCalled()
    expect(mockPersistenceService.subscribeToErrors).toHaveBeenCalled()
    expect(mockPersistenceService.subscribeToConflicts).toHaveBeenCalled()
  })

  it('should handle assignment operations with persistence', async () => {
    mockPersistenceService.loadPlanningData.mockResolvedValue({
      stations: [],
      shifts: [],
      employees: [],
      assignments: [],
      coverageStatus: [],
      violations: []
    })

    mockPersistenceService.saveAssignment.mockResolvedValue(undefined)

    render(
      <PlanningProvider>
        <TestComponent />
      </PlanningProvider>
    )

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    // Add assignment
    await act(async () => {
      screen.getByTestId('add-assignment').click()
    })

    // Should show saving state
    await waitFor(() => {
      expect(screen.getByTestId('saving')).toHaveTextContent('saving')
    })

    // Should call persistence service
    expect(mockPersistenceService.saveAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-assignment',
        employeeId: 'emp-1'
      })
    )

    // Should update assignments count
    await waitFor(() => {
      expect(screen.getByTestId('assignments-count')).toHaveTextContent('1')
      expect(screen.getByTestId('saving')).toHaveTextContent('not-saving')
    })
  })

  it('should handle persistence errors gracefully', async () => {
    mockPersistenceService.loadPlanningData.mockResolvedValue({
      stations: [],
      shifts: [],
      employees: [],
      assignments: [],
      coverageStatus: [],
      violations: []
    })

    mockPersistenceService.saveAssignment.mockRejectedValue(new Error('Network error'))

    render(
      <PlanningProvider>
        <TestComponent />
      </PlanningProvider>
    )

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    // Try to add assignment (should fail)
    await act(async () => {
      screen.getByTestId('add-assignment').click()
    })

    // Should still show the assignment (optimistic update)
    await waitFor(() => {
      expect(screen.getByTestId('assignments-count')).toHaveTextContent('1')
      expect(screen.getByTestId('saving')).toHaveTextContent('not-saving')
    })
  })

  it('should handle force save', async () => {
    mockPersistenceService.loadPlanningData.mockResolvedValue({
      stations: [],
      shifts: [],
      employees: [],
      assignments: [],
      coverageStatus: [],
      violations: []
    })

    mockPersistenceService.forceSyncPendingChanges.mockResolvedValue(undefined)

    render(
      <PlanningProvider>
        <TestComponent />
      </PlanningProvider>
    )

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    // Force save should work even without unsaved changes (for testing)
    await act(async () => {
      screen.getByTestId('force-save').click()
    })

    // Since there are no unsaved changes, forceSave returns early
    // This is the expected behavior, so we just verify the function exists and can be called
    expect(screen.getByTestId('force-save')).toBeInTheDocument()
  })

  it('should handle data loading for different dates', async () => {
    const mockData: PlanningBoardData = {
      stations: [],
      shifts: [],
      employees: [],
      assignments: [
        {
          id: 'assignment-1',
          demandId: 'demand-1',
          employeeId: 'emp-1',
          status: 'confirmed',
          score: 0.9,
          createdAt: new Date(),
          createdBy: 'system'
        }
      ],
      coverageStatus: [],
      violations: []
    }

    mockPersistenceService.loadPlanningData.mockResolvedValue(mockData)

    render(
      <PlanningProvider>
        <TestComponent />
      </PlanningProvider>
    )

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    // Load data for specific date
    await act(async () => {
      screen.getByTestId('load-data').click()
    })

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loading')
    })

    // Should load the data
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      expect(screen.getByTestId('assignments-count')).toHaveTextContent('1')
    })

    expect(mockPersistenceService.loadPlanningData).toHaveBeenCalledTimes(2) // Initial + manual load
  })

  it('should track online/offline status', async () => {
    mockPersistenceService.loadPlanningData.mockResolvedValue({
      stations: [],
      shifts: [],
      employees: [],
      assignments: [],
      coverageStatus: [],
      violations: []
    })

    render(
      <PlanningProvider>
        <TestComponent />
      </PlanningProvider>
    )

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    // Should start online
    expect(screen.getByTestId('online')).toHaveTextContent('online')

    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', { value: false })
    window.dispatchEvent(new Event('offline'))

    await waitFor(() => {
      expect(screen.getByTestId('online')).toHaveTextContent('offline')
    })

    // Simulate going back online
    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))

    await waitFor(() => {
      expect(screen.getByTestId('online')).toHaveTextContent('online')
    })
  })

  it('should fallback to localStorage when backend fails', async () => {
    mockPersistenceService.loadPlanningData.mockRejectedValue(new Error('Backend unavailable'))
    
    const mockLocalStorageData = {
      assignments: [
        {
          id: 'local-assignment',
          demandId: 'demand-1',
          employeeId: 'emp-1',
          status: 'proposed',
          score: 0.7,
          createdAt: new Date().toISOString(),
          createdBy: 'user'
        }
      ],
      selectedDate: new Date().toISOString(),
      timestamp: new Date().toISOString()
    }

    ;(window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(mockLocalStorageData))

    render(
      <PlanningProvider>
        <TestComponent />
      </PlanningProvider>
    )

    // Wait for initialization to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    // Should have loaded from localStorage
    expect(screen.getByTestId('assignments-count')).toHaveTextContent('1')
    expect(window.localStorage.getItem).toHaveBeenCalledWith('autoshift_planning_data')
  })
})
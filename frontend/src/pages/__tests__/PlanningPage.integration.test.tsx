import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PlanningProvider } from '../../contexts/PlanningContext'
import { PlanningPage } from '../PlanningPage'
import { getPlanningPersistenceService } from '../../services/planningPersistenceService'

// Mock the persistence service
vi.mock('../../services/planningPersistenceService')

// Mock the PlanningBoard component since we're testing integration
vi.mock('../../components/PlanningBoard/PlanningBoard', () => ({
  PlanningBoard: ({ onAssignmentChange, onAssignmentDelete, onDateChange }: any) => (
    <div data-testid="planning-board">
      <button 
        data-testid="add-assignment"
        onClick={() => onAssignmentChange({
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
        data-testid="delete-assignment"
        onClick={() => onAssignmentDelete('test-assignment')}
      >
        Delete Assignment
      </button>
      <button 
        data-testid="change-date"
        onClick={() => onDateChange(new Date('2024-01-15'))}
      >
        Change Date
      </button>
    </div>
  )
}))

// Mock the PersistenceStatus component
vi.mock('../../components/PlanningBoard/PersistenceStatus', () => ({
  PersistenceStatus: () => <div data-testid="persistence-status">Status</div>
}))

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

describe('PlanningPage Integration with Enhanced PlanningContext', () => {
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

  it('should render PlanningPage with persistence integration', async () => {
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
        <PlanningPage />
      </PlanningProvider>
    )

    // Should render the page components
    expect(screen.getByText('Production Shift Planning')).toBeInTheDocument()
    expect(screen.getByTestId('planning-board')).toBeInTheDocument()
    expect(screen.getByTestId('persistence-status')).toBeInTheDocument()

    // Wait for initialization
    await waitFor(() => {
      expect(mockPersistenceService.loadPlanningData).toHaveBeenCalled()
    })
  })

  it('should handle assignment operations through PlanningPage', async () => {
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
        <PlanningPage />
      </PlanningProvider>
    )

    // Wait for initialization
    await waitFor(() => {
      expect(mockPersistenceService.loadPlanningData).toHaveBeenCalled()
    })

    // Test assignment addition
    await act(async () => {
      screen.getByTestId('add-assignment').click()
    })

    // Should call the persistence service
    await waitFor(() => {
      expect(mockPersistenceService.saveAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-assignment',
          employeeId: 'emp-1'
        })
      )
    })
  })

  it('should handle assignment deletion through PlanningPage', async () => {
    mockPersistenceService.loadPlanningData.mockResolvedValue({
      stations: [],
      shifts: [],
      employees: [],
      assignments: [],
      coverageStatus: [],
      violations: []
    })

    mockPersistenceService.removeAssignment.mockResolvedValue(undefined)

    render(
      <PlanningProvider>
        <PlanningPage />
      </PlanningProvider>
    )

    // Wait for initialization
    await waitFor(() => {
      expect(mockPersistenceService.loadPlanningData).toHaveBeenCalled()
    })

    // Test assignment deletion
    await act(async () => {
      screen.getByTestId('delete-assignment').click()
    })

    // Should call the persistence service
    await waitFor(() => {
      expect(mockPersistenceService.removeAssignment).toHaveBeenCalledWith('test-assignment')
    })
  })

  it('should handle date changes through PlanningPage', async () => {
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
        <PlanningPage />
      </PlanningProvider>
    )

    // Wait for initialization
    await waitFor(() => {
      expect(mockPersistenceService.loadPlanningData).toHaveBeenCalled()
    })

    // Test date change
    await act(async () => {
      screen.getByTestId('change-date').click()
    })

    // Should call loadPlanningData again for the new date
    await waitFor(() => {
      expect(mockPersistenceService.loadPlanningData).toHaveBeenCalledTimes(2)
    })
  })

  it('should handle persistence errors gracefully in PlanningPage', async () => {
    mockPersistenceService.loadPlanningData.mockResolvedValue({
      stations: [],
      shifts: [],
      employees: [],
      assignments: [],
      coverageStatus: [],
      violations: []
    })

    mockPersistenceService.saveAssignment.mockRejectedValue(new Error('Network error'))

    // Mock console.error to avoid noise in test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <PlanningProvider>
        <PlanningPage />
      </PlanningProvider>
    )

    // Wait for initialization
    await waitFor(() => {
      expect(mockPersistenceService.loadPlanningData).toHaveBeenCalled()
    })

    // Test assignment addition that fails
    await act(async () => {
      screen.getByTestId('add-assignment').click()
    })

    // Should log the error
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save assignment:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })
})
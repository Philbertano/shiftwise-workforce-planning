import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { App } from '../../App';
import { AutomotiveThemeProvider } from '../../contexts/AutomotiveThemeContext';

// Mock persistence service
const mockPersistenceService = {
  saveAssignment: vi.fn().mockResolvedValue({}),
  removeAssignment: vi.fn().mockResolvedValue({}),
  loadPlanningData: vi.fn().mockResolvedValue({
    assignments: [
      {
        id: 'assignment1',
        employeeId: 'emp1',
        stationId: 'station1',
        shiftId: 'shift1',
        date: new Date('2024-01-15'),
        role: 'primary'
      }
    ],
    stations: [
      {
        id: 'station1',
        name: 'Assembly Station 1',
        capacity: 3,
        line: 'Assembly Line A'
      }
    ],
    employees: [
      {
        id: 'emp1',
        name: 'John Doe',
        skills: [{ skillId: 'welding', level: 'advanced' }]
      }
    ]
  }),
  subscribeToChanges: vi.fn(),
  unsubscribe: vi.fn(),
  handleConflict: vi.fn().mockResolvedValue({ resolution: 'accept_local' })
};

vi.mock('../../services/planningPersistenceService', () => ({
  getPlanningPersistenceService: vi.fn(() => mockPersistenceService),
  PlanningPersistenceService: vi.fn(() => mockPersistenceService)
}));

// Mock other services
vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} })
  }
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AutomotiveThemeProvider>
      <DndProvider backend={HTML5Backend}>
        {children}
      </DndProvider>
    </AutomotiveThemeProvider>
  </BrowserRouter>
);

describe('Persistence Workflow End-to-End', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
  });

  it('loads existing assignments when navigating to planning board', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Navigate to planning page
    const planningLink = screen.getByText('Shift Planning');
    fireEvent.click(planningLink);

    await waitFor(() => {
      // Verify persistence service was called to load data
      expect(mockPersistenceService.loadPlanningData).toHaveBeenCalled();

      // Verify existing assignment is displayed
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('1/3')).toBeInTheDocument(); // Capacity indicator
    });
  });

  it('automatically saves assignments when made', async () => {
    // Mock empty initial data for this test
    mockPersistenceService.loadPlanningData.mockResolvedValueOnce({
      assignments: [],
      stations: [
        {
          id: 'station1',
          name: 'Assembly Station 1',
          capacity: 3,
          line: 'Assembly Line A'
        }
      ],
      employees: [
        {
          id: 'emp1',
          name: 'John Doe',
          skills: [{ skillId: 'welding', level: 'advanced' }]
        }
      ]
    });

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Navigate to planning page
    const planningLink = screen.getByText('Shift Planning');
    fireEvent.click(planningLink);

    await waitFor(() => {
      expect(screen.getByText('Assembly Station 1')).toBeInTheDocument();
    });

    // Make an assignment
    const employee = screen.getByTestId('employee-emp1');
    const stationSlot = screen.getByTestId('slot-station1-shift1');

    fireEvent.dragStart(employee);
    fireEvent.dragOver(stationSlot);
    fireEvent.drop(stationSlot);

    // Verify assignment was saved automatically
    await waitFor(() => {
      expect(mockPersistenceService.saveAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp1',
          stationId: 'station1',
          shiftId: 'shift1'
        })
      );
    });
  });

  it('preserves assignments when navigating away and back', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Navigate to planning page
    const planningLink = screen.getByText('Shift Planning');
    fireEvent.click(planningLink);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Navigate away to dashboard
    const dashboardLink = screen.getByText('Dashboard');
    fireEvent.click(dashboardLink);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    // Navigate back to planning
    fireEvent.click(planningLink);

    await waitFor(() => {
      // Verify data is loaded again
      expect(mockPersistenceService.loadPlanningData).toHaveBeenCalledTimes(2);
      
      // Verify assignment is still there
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('1/3')).toBeInTheDocument();
    });
  });

  it('handles browser refresh by restoring state', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Navigate to planning page
    const planningLink = screen.getByText('Shift Planning');
    fireEvent.click(planningLink);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Simulate browser refresh by re-rendering the app
    const { rerender } = render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Navigate to planning page again (simulating refresh)
    const newPlanningLink = screen.getByText('Shift Planning');
    fireEvent.click(newPlanningLink);

    await waitFor(() => {
      // Verify state is restored
      expect(mockPersistenceService.loadPlanningData).toHaveBeenCalled();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('shows persistence status indicators', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Navigate to planning page
    const planningLink = screen.getByText('Shift Planning');
    fireEvent.click(planningLink);

    await waitFor(() => {
      // Check for persistence status indicator
      const statusIndicator = screen.getByTestId('persistence-status');
      expect(statusIndicator).toBeInTheDocument();
      expect(statusIndicator).toHaveTextContent('Saved');
    });
  });

  it('handles save errors gracefully', async () => {
    // Mock save error
    mockPersistenceService.saveAssignment.mockRejectedValueOnce(new Error('Network error'));

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Navigate to planning page
    const planningLink = screen.getByText('Shift Planning');
    fireEvent.click(planningLink);

    await waitFor(() => {
      expect(screen.getByText('Assembly Station 1')).toBeInTheDocument();
    });

    // Make an assignment that will fail to save
    const employee = screen.getByTestId('employee-emp1');
    const stationSlot = screen.getByTestId('slot-station1-shift1');

    fireEvent.dragStart(employee);
    fireEvent.dragOver(stationSlot);
    fireEvent.drop(stationSlot);

    // Verify error handling
    await waitFor(() => {
      const statusIndicator = screen.getByTestId('persistence-status');
      expect(statusIndicator).toHaveTextContent('Save failed');
      
      // Should show retry option
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('handles concurrent modifications with conflict resolution', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Navigate to planning page
    const planningLink = screen.getByText('Shift Planning');
    fireEvent.click(planningLink);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Simulate external change notification
    const subscribeCallback = mockPersistenceService.subscribeToChanges.mock.calls[0]?.[0];
    
    if (subscribeCallback) {
      subscribeCallback([
        {
          type: 'conflict',
          conflict: {
            id: 'conflict1',
            type: 'double_booking',
            affectedAssignments: ['assignment1'],
            localChange: {
              employeeId: 'emp1',
              stationId: 'station1',
              shiftId: 'shift1'
            },
            remoteChange: {
              employeeId: 'emp1',
              stationId: 'station2',
              shiftId: 'shift1'
            }
          }
        }
      ]);
    }

    // Should show conflict resolution dialog
    await waitFor(() => {
      expect(screen.getByText('Assignment Conflict Detected')).toBeInTheDocument();
      expect(screen.getByText('Accept Local Changes')).toBeInTheDocument();
      expect(screen.getByText('Accept Remote Changes')).toBeInTheDocument();
    });

    // Resolve conflict
    const acceptLocalButton = screen.getByText('Accept Local Changes');
    fireEvent.click(acceptLocalButton);

    await waitFor(() => {
      expect(mockPersistenceService.handleConflict).toHaveBeenCalledWith(
        expect.objectContaining({
          resolution: 'accept_local'
        })
      );
    });
  });

  it('provides offline support with queued operations', async () => {
    // Mock network failure
    mockPersistenceService.saveAssignment.mockRejectedValue(new Error('Network unavailable'));

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Navigate to planning page
    const planningLink = screen.getByText('Shift Planning');
    fireEvent.click(planningLink);

    await waitFor(() => {
      expect(screen.getByText('Assembly Station 1')).toBeInTheDocument();
    });

    // Make assignment while offline
    const employee = screen.getByTestId('employee-emp1');
    const stationSlot = screen.getByTestId('slot-station1-shift1');

    fireEvent.dragStart(employee);
    fireEvent.dragOver(stationSlot);
    fireEvent.drop(stationSlot);

    // Should show offline indicator
    await waitFor(() => {
      const statusIndicator = screen.getByTestId('persistence-status');
      expect(statusIndicator).toHaveTextContent('Offline - Changes queued');
    });

    // Simulate coming back online
    mockPersistenceService.saveAssignment.mockResolvedValue({});
    
    // Trigger retry
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    await waitFor(() => {
      const statusIndicator = screen.getByTestId('persistence-status');
      expect(statusIndicator).toHaveTextContent('Saved');
    });
  });

  it('maintains data consistency across multiple tabs/windows', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Navigate to planning page
    const planningLink = screen.getByText('Shift Planning');
    fireEvent.click(planningLink);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Simulate change from another tab
    const subscribeCallback = mockPersistenceService.subscribeToChanges.mock.calls[0]?.[0];
    
    if (subscribeCallback) {
      subscribeCallback([
        {
          type: 'assignment_added',
          assignment: {
            id: 'assignment2',
            employeeId: 'emp2',
            stationId: 'station1',
            shiftId: 'shift1',
            date: new Date('2024-01-15'),
            role: 'secondary'
          }
        }
      ]);
    }

    // Should reflect the change from other tab
    await waitFor(() => {
      expect(screen.getByText('2/3')).toBeInTheDocument(); // Updated capacity
    });
  });

  it('handles large datasets efficiently', async () => {
    // Mock large dataset
    const largeDataset = {
      assignments: Array.from({ length: 1000 }, (_, i) => ({
        id: `assignment${i}`,
        employeeId: `emp${i % 100}`,
        stationId: `station${i % 50}`,
        shiftId: 'shift1',
        date: new Date('2024-01-15')
      })),
      stations: Array.from({ length: 50 }, (_, i) => ({
        id: `station${i}`,
        name: `Station ${i}`,
        capacity: 3,
        line: `Line ${Math.floor(i / 10)}`
      })),
      employees: Array.from({ length: 100 }, (_, i) => ({
        id: `emp${i}`,
        name: `Employee ${i}`,
        skills: [{ skillId: 'general', level: 'intermediate' }]
      }))
    };

    mockPersistenceService.loadPlanningData.mockResolvedValueOnce(largeDataset);

    const startTime = performance.now();

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Navigate to planning page
    const planningLink = screen.getByText('Shift Planning');
    fireEvent.click(planningLink);

    await waitFor(() => {
      expect(screen.getByText('Station 0')).toBeInTheDocument();
    }, { timeout: 5000 });

    const endTime = performance.now();
    const loadTime = endTime - startTime;

    // Should load within reasonable time (5 seconds)
    expect(loadTime).toBeLessThan(5000);
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { PlanningBoard } from '../../components/PlanningBoard/PlanningBoard';
import { PlanningProvider } from '../../contexts/PlanningContext';
import { AutomotiveThemeProvider } from '../../contexts/AutomotiveThemeContext';

// Mock services
vi.mock('../../services/planningPersistenceService', () => ({
  getPlanningPersistenceService: vi.fn(() => ({
    saveAssignment: vi.fn().mockResolvedValue({}),
    removeAssignment: vi.fn().mockResolvedValue({}),
    loadPlanningData: vi.fn().mockResolvedValue({
      assignments: [],
      stations: [],
      employees: []
    }),
    subscribeToChanges: vi.fn(),
    unsubscribe: vi.fn()
  }))
}));

vi.mock('../../services/assignmentValidationService', () => ({
  assignmentValidationService: {
    validateAssignment: vi.fn().mockResolvedValue({ isValid: true, violations: [] }),
    validateStationCapacity: vi.fn().mockResolvedValue({ isValid: true, violations: [] })
  }
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AutomotiveThemeProvider>
    <DndProvider backend={HTML5Backend}>
      <PlanningProvider>
        {children}
      </PlanningProvider>
    </DndProvider>
  </AutomotiveThemeProvider>
);

describe('Multi-Assignment Workflow Integration', () => {
  const mockStations = [
    {
      id: 'station1',
      name: 'Assembly Station 1',
      line: 'Assembly Line A',
      capacity: 3,
      requiredSkills: [
        { skillId: 'welding', level: 'intermediate', required: true }
      ]
    },
    {
      id: 'station2',
      name: 'Paint Booth 1',
      line: 'Paint Shop',
      capacity: 2,
      requiredSkills: [
        { skillId: 'painting', level: 'advanced', required: true }
      ]
    }
  ];

  const mockEmployees = [
    {
      id: 'emp1',
      name: 'John Doe',
      skills: [
        { skillId: 'welding', level: 'advanced' }
      ],
      availability: { available: true }
    },
    {
      id: 'emp2',
      name: 'Jane Smith',
      skills: [
        { skillId: 'welding', level: 'intermediate' }
      ],
      availability: { available: true }
    },
    {
      id: 'emp3',
      name: 'Bob Johnson',
      skills: [
        { skillId: 'painting', level: 'advanced' }
      ],
      availability: { available: true }
    }
  ];

  const mockShifts = [
    {
      id: 'shift1',
      name: 'Day Shift',
      startTime: '08:00',
      endTime: '16:00'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows multiple employees to be assigned to a single station slot', async () => {
    const mockData = {
      stations: mockStations,
      employees: mockEmployees,
      shifts: mockShifts,
      assignments: [],
      coverageStatus: [],
      gaps: [],
      violations: []
    };

    render(
      <TestWrapper>
        <PlanningBoard
          data={mockData}
          selectedDate={new Date('2024-01-15')}
          onAssignmentChange={vi.fn()}
          onAssignmentDelete={vi.fn()}
          onDateChange={vi.fn()}
        />
      </TestWrapper>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Assembly Station 1')).toBeInTheDocument();
    });

    // Find the station slot for Assembly Station 1, Day Shift
    const stationSlot = screen.getByTestId('slot-station1-shift1');
    expect(stationSlot).toBeInTheDocument();

    // Check that capacity indicator shows 0/3
    expect(screen.getByText('0/3')).toBeInTheDocument();

    // Simulate drag and drop of first employee
    const employee1 = screen.getByTestId('employee-emp1');
    fireEvent.dragStart(employee1);
    fireEvent.dragOver(stationSlot);
    fireEvent.drop(stationSlot);

    // Wait for assignment to be processed
    await waitFor(() => {
      expect(screen.getByText('1/3')).toBeInTheDocument();
    });

    // Simulate drag and drop of second employee to same slot
    const employee2 = screen.getByTestId('employee-emp2');
    fireEvent.dragStart(employee2);
    fireEvent.dragOver(stationSlot);
    fireEvent.drop(stationSlot);

    // Wait for second assignment to be processed
    await waitFor(() => {
      expect(screen.getByText('2/3')).toBeInTheDocument();
    });

    // Verify both employees are shown in the slot
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('prevents over-assignment when station capacity is reached', async () => {
    const mockData = {
      stations: mockStations,
      employees: mockEmployees,
      shifts: mockShifts,
      assignments: [],
      coverageStatus: [],
      gaps: []
    };

    render(
      <TestWrapper>
        <PlanningBoard
          data={mockData}
          selectedDate={new Date('2024-01-15')}
          onAssignmentChange={vi.fn()}
          onAssignmentDelete={vi.fn()}
          onDateChange={vi.fn()}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Paint Booth 1')).toBeInTheDocument();
    });

    const paintBoothSlot = screen.getByTestId('slot-station2-shift1');

    // Assign first employee (should succeed)
    const employee3 = screen.getByTestId('employee-emp3');
    fireEvent.dragStart(employee3);
    fireEvent.dragOver(paintBoothSlot);
    fireEvent.drop(paintBoothSlot);

    await waitFor(() => {
      expect(screen.getByText('1/2')).toBeInTheDocument();
    });

    // Try to assign second employee (should succeed)
    const employee1 = screen.getByTestId('employee-emp1');
    fireEvent.dragStart(employee1);
    fireEvent.dragOver(paintBoothSlot);
    fireEvent.drop(paintBoothSlot);

    await waitFor(() => {
      expect(screen.getByText('2/2')).toBeInTheDocument();
    });

    // Try to assign third employee (should be prevented)
    const employee2 = screen.getByTestId('employee-emp2');
    fireEvent.dragStart(employee2);
    fireEvent.dragOver(paintBoothSlot);
    fireEvent.drop(paintBoothSlot);

    // Should still show 2/2 and display capacity warning
    await waitFor(() => {
      expect(screen.getByText('2/2')).toBeInTheDocument();
      expect(screen.getByText('Station at capacity')).toBeInTheDocument();
    });
  });

  it('validates skill requirements for multi-assignments', async () => {
    const mockData = {
      stations: mockStations,
      employees: mockEmployees,
      shifts: mockShifts,
      assignments: [],
      coverageStatus: [],
      gaps: []
    };

    render(
      <TestWrapper>
        <PlanningBoard
          data={mockData}
          selectedDate={new Date('2024-01-15')}
          onAssignmentChange={vi.fn()}
          onAssignmentDelete={vi.fn()}
          onDateChange={vi.fn()}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Assembly Station 1')).toBeInTheDocument();
    });

    const assemblySlot = screen.getByTestId('slot-station1-shift1');

    // Try to assign employee without required welding skill to assembly station
    // (This should be prevented by validation)
    const employee3 = screen.getByTestId('employee-emp3'); // Has painting, not welding
    fireEvent.dragStart(employee3);
    fireEvent.dragOver(assemblySlot);
    fireEvent.drop(assemblySlot);

    // Should show skill mismatch warning
    await waitFor(() => {
      expect(screen.getByText('Skill requirements not met')).toBeInTheDocument();
    });

    // Capacity should remain 0/3
    expect(screen.getByText('0/3')).toBeInTheDocument();
  });

  it('allows removal of individual employees from multi-assignment slots', async () => {
    const mockData = {
      stations: mockStations,
      employees: mockEmployees,
      shifts: mockShifts,
      assignments: [],
      coverageStatus: [],
      gaps: []
    };

    render(
      <TestWrapper>
        <PlanningBoard
          data={mockData}
          selectedDate={new Date('2024-01-15')}
          onAssignmentChange={vi.fn()}
          onAssignmentDelete={vi.fn()}
          onDateChange={vi.fn()}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Assembly Station 1')).toBeInTheDocument();
    });

    const assemblySlot = screen.getByTestId('slot-station1-shift1');

    // Assign two employees
    const employee1 = screen.getByTestId('employee-emp1');
    fireEvent.dragStart(employee1);
    fireEvent.dragOver(assemblySlot);
    fireEvent.drop(assemblySlot);

    await waitFor(() => {
      expect(screen.getByText('1/3')).toBeInTheDocument();
    });

    const employee2 = screen.getByTestId('employee-emp2');
    fireEvent.dragStart(employee2);
    fireEvent.dragOver(assemblySlot);
    fireEvent.drop(assemblySlot);

    await waitFor(() => {
      expect(screen.getByText('2/3')).toBeInTheDocument();
    });

    // Remove first employee
    const removeButton1 = screen.getByTestId('remove-emp1-station1-shift1');
    fireEvent.click(removeButton1);

    // Should now show 1/3 and only Jane Smith
    await waitFor(() => {
      expect(screen.getByText('1/3')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('updates capacity indicators in real-time during assignments', async () => {
    const mockData = {
      stations: mockStations,
      employees: mockEmployees,
      shifts: mockShifts,
      assignments: [],
      coverageStatus: [],
      gaps: []
    };

    render(
      <TestWrapper>
        <PlanningBoard
          data={mockData}
          selectedDate={new Date('2024-01-15')}
          onAssignmentChange={vi.fn()}
          onAssignmentDelete={vi.fn()}
          onDateChange={vi.fn()}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Assembly Station 1')).toBeInTheDocument();
    });

    const assemblySlot = screen.getByTestId('slot-station1-shift1');
    const capacityIndicator = screen.getByTestId('capacity-station1-shift1');

    // Initially should show empty state
    expect(capacityIndicator).toHaveClass('empty');
    expect(screen.getByText('0/3')).toBeInTheDocument();

    // Assign first employee
    const employee1 = screen.getByTestId('employee-emp1');
    fireEvent.dragStart(employee1);
    fireEvent.dragOver(assemblySlot);
    fireEvent.drop(assemblySlot);

    await waitFor(() => {
      expect(capacityIndicator).toHaveClass('understaffed');
      expect(screen.getByText('1/3')).toBeInTheDocument();
    });

    // Assign second employee
    const employee2 = screen.getByTestId('employee-emp2');
    fireEvent.dragStart(employee2);
    fireEvent.dragOver(assemblySlot);
    fireEvent.drop(assemblySlot);

    await waitFor(() => {
      expect(capacityIndicator).toHaveClass('understaffed');
      expect(screen.getByText('2/3')).toBeInTheDocument();
    });

    // If we had a third employee with welding skills, assigning them would make it optimal
    // For now, verify the understaffed state is maintained
    expect(capacityIndicator).toHaveClass('understaffed');
  });

  it('persists multi-assignments to backend automatically', async () => {
    const mockData = {
      stations: mockStations,
      employees: mockEmployees,
      shifts: mockShifts,
      assignments: [],
      coverageStatus: [],
      gaps: []
    };

    render(
      <TestWrapper>
        <PlanningBoard
          data={mockData}
          selectedDate={new Date('2024-01-15')}
          onAssignmentChange={vi.fn()}
          onAssignmentDelete={vi.fn()}
          onDateChange={vi.fn()}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Assembly Station 1')).toBeInTheDocument();
    });

    const assemblySlot = screen.getByTestId('slot-station1-shift1');

    // Assign employee
    const employee1 = screen.getByTestId('employee-emp1');
    fireEvent.dragStart(employee1);
    fireEvent.dragOver(assemblySlot);
    fireEvent.drop(assemblySlot);

    // Verify persistence service was called
    const { getPlanningPersistenceService } = await import('../../services/planningPersistenceService');
    const service = getPlanningPersistenceService();
    await waitFor(() => {
      expect(service.saveAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp1',
          stationId: 'station1',
          shiftId: 'shift1'
        })
      );
    });
  });

  it('handles concurrent assignments from multiple users', async () => {
    const mockData = {
      stations: mockStations,
      employees: mockEmployees,
      shifts: mockShifts,
      assignments: [],
      coverageStatus: [],
      gaps: []
    };

    render(
      <TestWrapper>
        <PlanningBoard
          data={mockData}
          selectedDate={new Date('2024-01-15')}
          onAssignmentChange={vi.fn()}
          onAssignmentDelete={vi.fn()}
          onDateChange={vi.fn()}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Assembly Station 1')).toBeInTheDocument();
    });

    // Simulate external assignment update
    const { getPlanningPersistenceService } = await import('../../services/planningPersistenceService');
    const service = getPlanningPersistenceService();
    const mockSubscribeCallback = vi.mocked(service.subscribeToChanges).mock.calls[0]?.[0];
    
    if (mockSubscribeCallback) {
      mockSubscribeCallback([
        {
          type: 'assignment_added',
          assignment: {
            id: 'ext1',
            employeeId: 'emp2',
            stationId: 'station1',
            shiftId: 'shift1',
            date: new Date('2024-01-15')
          }
        }
      ]);
    }

    // Should reflect the external assignment
    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('1/3')).toBeInTheDocument();
    });
  });
});
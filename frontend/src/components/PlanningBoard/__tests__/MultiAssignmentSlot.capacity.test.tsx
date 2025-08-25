import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { vi } from 'vitest'
import { MultiAssignmentSlot } from '../MultiAssignmentSlot'
import { Assignment, Employee, ConstraintViolation } from '../../../types'

// Mock data
const mockEmployees: Employee[] = [
  {
    id: 'emp1',
    name: 'John Doe',
    team: 'Team A',
    skills: [],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'emp2',
    name: 'Jane Smith',
    team: 'Team B',
    skills: [],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const mockAssignments: Assignment[] = [
  {
    id: 'assign1',
    employeeId: 'emp1',
    stationId: 'station1',
    shiftId: 'shift1',
    date: new Date('2024-01-15'),
    status: 'confirmed',
    score: 85,
    explanation: 'Good match',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const mockViolations: ConstraintViolation[] = []

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DndProvider backend={HTML5Backend}>
    {children}
  </DndProvider>
)

describe('MultiAssignmentSlot Capacity Management', () => {
  const defaultProps = {
    stationId: 'station1',
    shiftId: 'shift1',
    date: new Date('2024-01-15'),
    employees: mockEmployees,
    violations: mockViolations,
    onAssignmentDrop: vi.fn(),
    onAssignmentDelete: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show understaffed status when below capacity', () => {
    render(
      <TestWrapper>
        <MultiAssignmentSlot
          {...defaultProps}
          assignments={mockAssignments}
          capacity={3}
        />
      </TestWrapper>
    )

    // Should show capacity indicator with understaffed status
    expect(screen.getByText('1/3')).toBeInTheDocument()
    expect(screen.getByText('⚠')).toBeInTheDocument()
  })

  it('should show optimal status when at capacity', () => {
    const fullAssignments = [
      ...mockAssignments,
      {
        id: 'assign2',
        employeeId: 'emp2',
        stationId: 'station1',
        shiftId: 'shift1',
        date: new Date('2024-01-15'),
        status: 'confirmed' as const,
        score: 80,
        explanation: 'Good match',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    render(
      <TestWrapper>
        <MultiAssignmentSlot
          {...defaultProps}
          assignments={fullAssignments}
          capacity={2}
        />
      </TestWrapper>
    )

    // Should show capacity indicator with optimal status
    expect(screen.getByText('2/2')).toBeInTheDocument()
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('should show overstaffed status and warning when over capacity', () => {
    const overAssignments = [
      ...mockAssignments,
      {
        id: 'assign2',
        employeeId: 'emp2',
        stationId: 'station1',
        shiftId: 'shift1',
        date: new Date('2024-01-15'),
        status: 'confirmed' as const,
        score: 80,
        explanation: 'Good match',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'assign3',
        employeeId: 'emp3',
        stationId: 'station1',
        shiftId: 'shift1',
        date: new Date('2024-01-15'),
        status: 'confirmed' as const,
        score: 75,
        explanation: 'Acceptable match',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    render(
      <TestWrapper>
        <MultiAssignmentSlot
          {...defaultProps}
          assignments={overAssignments}
          capacity={2}
        />
      </TestWrapper>
    )

    // Should show capacity indicator with overstaffed status
    expect(screen.getByText('3/2')).toBeInTheDocument()
    expect(screen.getByText('🚫')).toBeInTheDocument()
  })

  it('should show empty slots indicators when under capacity', () => {
    render(
      <TestWrapper>
        <MultiAssignmentSlot
          {...defaultProps}
          assignments={mockAssignments}
          capacity={3}
        />
      </TestWrapper>
    )

    // Should show 2 empty slot indicators (3 capacity - 1 assignment = 2 empty)
    const emptySlots = screen.getAllByText('+')
    expect(emptySlots).toHaveLength(2)
  })

  it('should not show empty slots when at or over capacity', () => {
    const fullAssignments = [
      ...mockAssignments,
      {
        id: 'assign2',
        employeeId: 'emp2',
        stationId: 'station1',
        shiftId: 'shift1',
        date: new Date('2024-01-15'),
        status: 'confirmed' as const,
        score: 80,
        explanation: 'Good match',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    render(
      <TestWrapper>
        <MultiAssignmentSlot
          {...defaultProps}
          assignments={fullAssignments}
          capacity={2}
        />
      </TestWrapper>
    )

    // Should not show any empty slot indicators
    expect(screen.queryByText('+')).not.toBeInTheDocument()
  })

  it('should show capacity warnings in tooltip on hover', async () => {
    render(
      <TestWrapper>
        <MultiAssignmentSlot
          {...defaultProps}
          assignments={mockAssignments}
          capacity={3}
        />
      </TestWrapper>
    )

    const slot = screen.getByText('1/3').closest('.multi-assignment-slot')
    expect(slot).toBeInTheDocument()

    // Hover over the slot to show tooltip
    if (slot) {
      fireEvent.mouseEnter(slot)
      
      // Should show capacity details in tooltip
      expect(screen.getByText('Station Capacity Status')).toBeInTheDocument()
      expect(screen.getByText('Required: 3 employees')).toBeInTheDocument()
      expect(screen.getByText('Assigned: 1 employees')).toBeInTheDocument()
      expect(screen.getByText('Available: 2 slots')).toBeInTheDocument()
    }
  })

  it('should include capacity warnings in violation badge count', () => {
    const overAssignments = [
      ...mockAssignments,
      {
        id: 'assign2',
        employeeId: 'emp2',
        stationId: 'station1',
        shiftId: 'shift1',
        date: new Date('2024-01-15'),
        status: 'confirmed' as const,
        score: 80,
        explanation: 'Good match',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'assign3',
        employeeId: 'emp3',
        stationId: 'station1',
        shiftId: 'shift1',
        date: new Date('2024-01-15'),
        status: 'confirmed' as const,
        score: 75,
        explanation: 'Acceptable match',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    render(
      <TestWrapper>
        <MultiAssignmentSlot
          {...defaultProps}
          assignments={overAssignments}
          capacity={2}
          violations={[]} // No constraint violations, only capacity warnings
        />
      </TestWrapper>
    )

    // Should show violation badge with count of capacity warnings
    expect(screen.getByText('1')).toBeInTheDocument() // 1 capacity warning for overstaffing
  })
})
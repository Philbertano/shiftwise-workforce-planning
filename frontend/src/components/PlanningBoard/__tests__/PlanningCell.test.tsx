import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { PlanningCell } from '../PlanningCell'
import { Assignment, Employee, CoverageStatus, ConstraintViolation } from '../../../types'

const mockEmployee: Employee = {
  id: 'emp-1',
  name: 'John Smith',
  contractType: 'full-time',
  weeklyHours: 40,
  maxHoursPerDay: 8,
  minRestHours: 11,
  team: 'Team Alpha',
  active: true
}

const mockAssignment: Assignment = {
  id: 'assignment-1',
  demandId: 'demand-1',
  employeeId: 'emp-1',
  status: 'proposed',
  score: 85.5,
  createdAt: new Date(),
  createdBy: 'user'
}

const mockCoverage: CoverageStatus = {
  stationId: 'station-1',
  shiftId: 'shift-1',
  required: 2,
  assigned: 1,
  coverage: 95,
  status: 'partial',
  gaps: []
}

const mockViolations: ConstraintViolation[] = [
  {
    constraintId: 'skill-constraint',
    severity: 'warning',
    message: 'Suboptimal skill match',
    affectedAssignments: ['assignment-1'],
    suggestedActions: ['Consider alternative assignment']
  }
]

const renderWithDnd = (component: React.ReactElement) => {
  return render(
    <DndProvider backend={HTML5Backend}>
      {component}
    </DndProvider>
  )
}

const mockProps = {
  stationId: 'station-1',
  shiftId: 'shift-1',
  date: new Date('2024-01-15'),
  onAssignmentDrop: vi.fn(),
  onAssignmentDelete: vi.fn()
}

describe('PlanningCell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty slot when no assignment', () => {
    renderWithDnd(
      <PlanningCell
        {...mockProps}
        coverage={mockCoverage}
        violations={[]}
      />
    )
    
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  it('renders assignment card when assignment exists', () => {
    renderWithDnd(
      <PlanningCell
        {...mockProps}
        assignment={mockAssignment}
        employee={mockEmployee}
        coverage={mockCoverage}
        violations={[]}
      />
    )
    
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getByText('Team Alpha')).toBeInTheDocument()
    expect(screen.getByText('Score: 85.5')).toBeInTheDocument()
  })

  it('displays coverage status with correct styling', () => {
    const { container } = renderWithDnd(
      <PlanningCell
        {...mockProps}
        coverage={mockCoverage}
        violations={[]}
      />
    )
    
    expect(container.querySelector('.coverage-partial')).toBeTruthy()
  })

  it('displays violation indicators', () => {
    renderWithDnd(
      <PlanningCell
        {...mockProps}
        violations={mockViolations}
      />
    )
    
    expect(screen.getByText('1 issue')).toBeInTheDocument()
  })

  it('applies violation styling classes', () => {
    const { container } = renderWithDnd(
      <PlanningCell
        {...mockProps}
        violations={mockViolations}
      />
    )
    
    expect(container.querySelector('.violation-warning')).toBeInTheDocument()
  })

  it('handles assignment deletion', () => {
    renderWithDnd(
      <PlanningCell
        {...mockProps}
        assignment={mockAssignment}
        employee={mockEmployee}
        violations={[]}
      />
    )
    
    const deleteButton = screen.getByTitle('Remove assignment')
    fireEvent.click(deleteButton)
    
    expect(mockProps.onAssignmentDelete).toHaveBeenCalledWith('assignment-1')
  })

  it('shows assignment tooltip on hover', () => {
    renderWithDnd(
      <PlanningCell
        {...mockProps}
        assignment={mockAssignment}
        employee={mockEmployee}
        violations={mockViolations}
      />
    )
    
    const assignmentCard = screen.getByText('John Smith').closest('.assignment-card')
    fireEvent.mouseEnter(assignmentCard!)
    
    expect(screen.getByText('Contract: full-time')).toBeInTheDocument()
    expect(screen.getByText('Suboptimal skill match')).toBeInTheDocument()
  })

  it('applies correct coverage classes', () => {
    const fullCoverage: CoverageStatus = {
      ...mockCoverage,
      coverage: 100,
      status: 'full'
    }

    const { container } = renderWithDnd(
      <PlanningCell
        {...mockProps}
        coverage={fullCoverage}
        violations={[]}
      />
    )
    
    expect(container.querySelector('.coverage-full')).toBeInTheDocument()
  })

  it('handles critical violations with animation', () => {
    const criticalViolations: ConstraintViolation[] = [
      {
        constraintId: 'labor-law',
        severity: 'critical',
        message: 'Labor law violation',
        affectedAssignments: ['assignment-1'],
        suggestedActions: ['Remove assignment']
      }
    ]

    const { container } = renderWithDnd(
      <PlanningCell
        {...mockProps}
        violations={criticalViolations}
      />
    )
    
    expect(container.querySelector('.violation-critical')).toBeInTheDocument()
  })
})
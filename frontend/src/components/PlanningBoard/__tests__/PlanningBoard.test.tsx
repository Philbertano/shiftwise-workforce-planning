import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PlanningBoard } from '../PlanningBoard'
import { PlanningBoardData, Assignment } from '../../../types'

const mockData: PlanningBoardData = {
  stations: [
    {
      id: 'station-1',
      name: 'Assembly Line A',
      line: 'Production Line 1',
      priority: 'high',
      requiredSkills: [
        { skillId: 'skill-1', minLevel: 2, count: 2, mandatory: true }
      ]
    }
  ],
  shifts: [
    {
      id: 'shift-1',
      name: 'Day Shift',
      startTime: '06:00',
      endTime: '14:00',
      shiftType: 'day',
      breakRules: []
    }
  ],
  employees: [
    {
      id: 'emp-1',
      name: 'John Smith',
      contractType: 'full-time',
      weeklyHours: 40,
      maxHoursPerDay: 8,
      minRestHours: 11,
      team: 'Team Alpha',
      active: true
    }
  ],
  assignments: [],
  coverageStatus: [],
  violations: []
}

const mockProps = {
  data: mockData,
  selectedDate: new Date('2024-01-15'),
  onAssignmentChange: vi.fn(),
  onAssignmentDelete: vi.fn(),
  onDateChange: vi.fn()
}

describe('PlanningBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders planning board with stations and shifts', () => {
    render(<PlanningBoard {...mockProps} />)
    
    expect(screen.getByText('Assembly Line A')).toBeInTheDocument()
    expect(screen.getByText('Day Shift')).toBeInTheDocument()
    expect(screen.getByText('06:00 - 14:00')).toBeInTheDocument()
  })

  it('displays week navigation', () => {
    render(<PlanningBoard {...mockProps} />)
    
    expect(screen.getByText('← Previous Week')).toBeInTheDocument()
    expect(screen.getByText('Next Week →')).toBeInTheDocument()
    expect(screen.getByText(/Week of/)).toBeInTheDocument()
  })

  it('shows employee panel with employees', () => {
    render(<PlanningBoard {...mockProps} />)
    
    expect(screen.getByText('Employees (1)')).toBeInTheDocument()
    expect(screen.getAllByText('John Smith')).toHaveLength(1)
    expect(screen.getAllByText('Team Alpha')).toHaveLength(2) // One in employee panel, one in filter dropdown
  })

  it('displays violation panel', () => {
    render(<PlanningBoard {...mockProps} />)
    
    expect(screen.getByText('Constraint Violations')).toBeInTheDocument()
    expect(screen.getByText('No constraint violations detected')).toBeInTheDocument()
  })

  it('handles week navigation', () => {
    render(<PlanningBoard {...mockProps} />)
    
    const nextWeekButton = screen.getByText('Next Week →')
    fireEvent.click(nextWeekButton)
    
    expect(mockProps.onDateChange).toHaveBeenCalled()
  })

  it('filters employees by search term', () => {
    render(<PlanningBoard {...mockProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search employees...')
    fireEvent.change(searchInput, { target: { value: 'John' } })
    
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    
    fireEvent.change(searchInput, { target: { value: 'NonExistent' } })
    expect(screen.queryByText('John Smith')).not.toBeInTheDocument()
  })

  it('displays assignments when provided', () => {
    const dataWithAssignment = {
      ...mockData,
      assignments: [
        {
          id: 'assignment-1',
          demandId: 'station-1-shift-1-2024-01-15',
          employeeId: 'emp-1',
          status: 'proposed' as const,
          score: 85.5,
          createdAt: new Date(),
          createdBy: 'user'
        }
      ]
    }

    render(<PlanningBoard {...mockProps} data={dataWithAssignment} />)
    
    expect(screen.getAllByText('John Smith')).toHaveLength(2) // One in assignment, one in employee panel
    expect(screen.getByText('Score: 85.5')).toBeInTheDocument()
  })

  it('displays violations when provided', () => {
    const dataWithViolations = {
      ...mockData,
      violations: [
        {
          constraintId: 'skill-constraint',
          severity: 'error' as const,
          message: 'Employee lacks required skill',
          affectedAssignments: ['assignment-1'],
          suggestedActions: ['Assign different employee']
        }
      ]
    }

    render(<PlanningBoard {...mockProps} data={dataWithViolations} />)
    
    expect(screen.getByText('Constraint Violations (1)')).toBeInTheDocument()
    expect(screen.getByText('Employee lacks required skill')).toBeInTheDocument()
  })
})
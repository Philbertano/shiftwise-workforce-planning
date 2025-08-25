import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom';
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { describe, it, expect, vi } from 'vitest'
import { MultiAssignmentSlot } from '../MultiAssignmentSlot'
import { Station, Employee, Assignment } from '../../../types'

// Mock the validation hook
vi.mock('../../../hooks/useAssignmentValidation', () => ({
  useAssignmentValidation: () => ({
    validateAssignment: vi.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    })
  })
}))

const mockStation: Station = {
  id: 'station-1',
  name: 'Assembly Station 1',
  line: 'Line A',
  capacity: 2,
  requiredSkills: [],
  priority: 'high',
  active: true
}

const mockEmployee: Employee = {
  id: 'employee-1',
  name: 'John Doe',
  active: true,
  skills: [],
  contractType: 'full_time'
}

const mockAssignment: Assignment = {
  id: 'assignment-1',
  demandId: 'demand-1',
  employeeId: 'employee-1',
  status: 'confirmed',
  score: 85,
  createdAt: new Date(),
  createdBy: 'user-1'
}

const defaultProps = {
  stationId: 'station-1',
  shiftId: 'shift-1',
  date: new Date('2024-01-01'),
  assignments: [mockAssignment],
  employees: [mockEmployee],
  stations: [mockStation],
  capacity: 2,
  violations: [],
  onAssignmentDrop: vi.fn(),
  onAssignmentDelete: vi.fn()
}

const renderWithDnd = (component: React.ReactElement) => {
  return render(
    <DndProvider backend={HTML5Backend}>
      {component}
    </DndProvider>
  )
}

describe('MultiAssignmentSlot with Validation', () => {
  it('renders without validation errors', () => {
    renderWithDnd(<MultiAssignmentSlot {...defaultProps} />)
    
    // Should render the slot
    expect(document.querySelector('.multi-assignment-slot')).toBeInTheDocument()
    
    // Should not show validation errors initially
    expect(screen.queryByText(/Assignment Error/)).not.toBeInTheDocument()
  })

  it('applies correct capacity status classes', () => {
    renderWithDnd(<MultiAssignmentSlot {...defaultProps} />)
    
    const slot = document.querySelector('.multi-assignment-slot')
    expect(slot).toHaveClass('capacity-understaffed') // 1 assignment out of 2 capacity
  })

  it('shows capacity indicator', () => {
    renderWithDnd(<MultiAssignmentSlot {...defaultProps} />)
    
    // Should show capacity indicator
    expect(document.querySelector('.capacity-count')).toBeInTheDocument()
  })

  it('renders empty slots for available capacity', () => {
    renderWithDnd(<MultiAssignmentSlot {...defaultProps} />)
    
    // Should show 1 empty slot (capacity 2 - 1 assignment = 1 empty)
    const emptySlots = document.querySelectorAll('.empty-slot-indicator')
    expect(emptySlots).toHaveLength(1)
  })

  it('handles zero assignments correctly', () => {
    const propsWithNoAssignments = {
      ...defaultProps,
      assignments: []
    }
    
    renderWithDnd(<MultiAssignmentSlot {...propsWithNoAssignments} />)
    
    const slot = document.querySelector('.multi-assignment-slot')
    expect(slot).toHaveClass('capacity-empty')
    
    // Should show all empty slots
    const emptySlots = document.querySelectorAll('.empty-slot-indicator')
    expect(emptySlots).toHaveLength(2) // Full capacity available
  })

  it('handles over-capacity assignments', () => {
    const overCapacityAssignments = [
      mockAssignment,
      { ...mockAssignment, id: 'assignment-2', employeeId: 'employee-2' },
      { ...mockAssignment, id: 'assignment-3', employeeId: 'employee-3' }
    ]
    
    const propsOverCapacity = {
      ...defaultProps,
      assignments: overCapacityAssignments
    }
    
    renderWithDnd(<MultiAssignmentSlot {...propsOverCapacity} />)
    
    const slot = document.querySelector('.multi-assignment-slot')
    expect(slot).toHaveClass('capacity-overstaffed')
    
    // Should not show empty slots when over capacity
    const emptySlots = document.querySelectorAll('.empty-slot-indicator')
    expect(emptySlots).toHaveLength(0)
  })

  it('shows violation badge when violations exist', () => {
    const propsWithViolations = {
      ...defaultProps,
      violations: [
        {
          constraintId: 'skill-mismatch',
          severity: 'warning' as const,
          message: 'Skill mismatch detected',
          affectedAssignments: ['assignment-1']
        }
      ]
    }
    
    renderWithDnd(<MultiAssignmentSlot {...propsWithViolations} />)
    
    const violationBadge = document.querySelector('.violation-badge')
    expect(violationBadge).toBeInTheDocument()
    // Badge shows total violations + capacity warnings, so just check it exists
    expect(violationBadge?.textContent).toBeTruthy()
  })
})
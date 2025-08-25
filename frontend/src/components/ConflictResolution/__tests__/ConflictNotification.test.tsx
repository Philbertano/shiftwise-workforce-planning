import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom';
import { ConflictNotification } from '../ConflictNotification'
import { AssignmentConflict } from '../../../services/planningPersistenceService'

const mockConflicts: AssignmentConflict[] = [
  {
    id: 'conflict-1',
    type: 'double_booking',
    affectedAssignments: ['assignment-1', 'assignment-2'],
    message: 'Employee is already assigned to another station'
  },
  {
    id: 'conflict-2',
    type: 'concurrent_modification',
    affectedAssignments: ['assignment-3'],
    message: 'Assignment was modified by another user'
  },
  {
    id: 'conflict-3',
    type: 'capacity_exceeded',
    affectedAssignments: ['assignment-4'],
    message: 'Station capacity exceeded'
  }
]

describe('ConflictNotification', () => {
  const mockOnResolveConflict = vi.fn()
  const mockOnDismiss = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when there are no conflicts', () => {
    render(
      <ConflictNotification
        conflicts={[]}
        onResolveConflict={mockOnResolveConflict}
        onDismiss={mockOnDismiss}
      />
    )

    expect(screen.queryByText(/Assignment Conflicts/)).not.toBeInTheDocument()
  })

  it('renders conflict count correctly', () => {
    render(
      <ConflictNotification
        conflicts={mockConflicts}
        onResolveConflict={mockOnResolveConflict}
        onDismiss={mockOnDismiss}
      />
    )

    expect(screen.getByText('Assignment Conflicts (3)')).toBeInTheDocument()
    expect(screen.getByText('These conflicts need your attention')).toBeInTheDocument()
  })

  it('renders all conflicts with correct information', () => {
    render(
      <ConflictNotification
        conflicts={mockConflicts}
        onResolveConflict={mockOnResolveConflict}
        onDismiss={mockOnDismiss}
      />
    )

    expect(screen.getByText('DOUBLE_BOOKING Conflict')).toBeInTheDocument()
    expect(screen.getByText('CONCURRENT_MODIFICATION Conflict')).toBeInTheDocument()
    expect(screen.getByText('CAPACITY_EXCEEDED Conflict')).toBeInTheDocument()

    expect(screen.getByText('Employee is already assigned to another station')).toBeInTheDocument()
    expect(screen.getByText('Assignment was modified by another user')).toBeInTheDocument()
    expect(screen.getByText('Station capacity exceeded')).toBeInTheDocument()
  })

  it('shows affected assignments count', () => {
    render(
      <ConflictNotification
        conflicts={mockConflicts}
        onResolveConflict={mockOnResolveConflict}
        onDismiss={mockOnDismiss}
      />
    )

    expect(screen.getByText('Affects 2 assignments')).toBeInTheDocument()
    expect(screen.getByText('Affects 1 assignment')).toBeInTheDocument()
  })

  it('calls onResolveConflict when resolve button is clicked', () => {
    render(
      <ConflictNotification
        conflicts={mockConflicts}
        onResolveConflict={mockOnResolveConflict}
        onDismiss={mockOnDismiss}
      />
    )

    const resolveButtons = screen.getAllByText('Resolve')
    fireEvent.click(resolveButtons[0])

    expect(mockOnResolveConflict).toHaveBeenCalledWith('conflict-1')
  })

  it('calls onDismiss when dismiss button is clicked', () => {
    render(
      <ConflictNotification
        conflicts={mockConflicts}
        onResolveConflict={mockOnResolveConflict}
        onDismiss={mockOnDismiss}
      />
    )

    const dismissButtons = screen.getAllByText('×')
    fireEvent.click(dismissButtons[0])

    expect(mockOnDismiss).toHaveBeenCalledWith('conflict-1')
  })

  it('applies correct severity classes', () => {
    render(
      <ConflictNotification
        conflicts={mockConflicts}
        onResolveConflict={mockOnResolveConflict}
        onDismiss={mockOnDismiss}
      />
    )

    const notifications = screen.getAllByRole('button', { name: /Resolve/ })
    
    // Check that notifications have the correct parent elements with severity classes
    const doubleBookingNotification = notifications[0].closest('.conflict-notification')
    const concurrentModificationNotification = notifications[1].closest('.conflict-notification')
    const capacityExceededNotification = notifications[2].closest('.conflict-notification')

    expect(doubleBookingNotification).toHaveClass('high')
    expect(concurrentModificationNotification).toHaveClass('medium')
    expect(capacityExceededNotification).toHaveClass('high')
  })

  it('displays correct icons for different conflict types', () => {
    render(
      <ConflictNotification
        conflicts={mockConflicts}
        onResolveConflict={mockOnResolveConflict}
        onDismiss={mockOnDismiss}
      />
    )

    // Check that icons are present (emojis are rendered as text)
    expect(screen.getByText('⚠️')).toBeInTheDocument() // double_booking
    expect(screen.getByText('👥')).toBeInTheDocument() // concurrent_modification
    expect(screen.getByText('📊')).toBeInTheDocument() // capacity_exceeded
  })

  it('handles single conflict correctly', () => {
    const singleConflict = [mockConflicts[0]]
    
    render(
      <ConflictNotification
        conflicts={singleConflict}
        onResolveConflict={mockOnResolveConflict}
        onDismiss={mockOnDismiss}
      />
    )

    expect(screen.getByText('Assignment Conflicts (1)')).toBeInTheDocument()
    expect(screen.getByText('DOUBLE_BOOKING Conflict')).toBeInTheDocument()
  })

  it('handles conflicts with no affected assignments', () => {
    const conflictWithNoAssignments: AssignmentConflict[] = [{
      id: 'conflict-empty',
      type: 'skill_mismatch',
      affectedAssignments: [],
      message: 'No assignments affected'
    }]
    
    render(
      <ConflictNotification
        conflicts={conflictWithNoAssignments}
        onResolveConflict={mockOnResolveConflict}
        onDismiss={mockOnDismiss}
      />
    )

    expect(screen.getByText('Affects 0 assignments')).toBeInTheDocument()
  })
})
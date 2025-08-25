import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom';
import { ConflictResolutionModal } from '../ConflictResolutionModal'
import { AssignmentConflict, ConflictResolution } from '../../../services/planningPersistenceService'
import { Assignment, AssignmentStatus } from '../../../types'

const mockConflict: AssignmentConflict = {
  id: 'conflict-1',
  type: 'concurrent_modification',
  affectedAssignments: ['assignment-1'],
  message: 'This assignment was modified by another user'
}

const mockLocalAssignment: Assignment = {
  id: 'assignment-1',
  demandId: 'demand-1',
  employeeId: 'employee-1',
  status: 'confirmed' as AssignmentStatus,
  score: 85,
  explanation: 'Local assignment',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  createdBy: 'user-1'
}

const mockRemoteAssignment: Assignment = {
  id: 'assignment-1',
  demandId: 'demand-1',
  employeeId: 'employee-2',
  status: 'confirmed' as AssignmentStatus,
  score: 90,
  explanation: 'Remote assignment',
  createdAt: new Date('2024-01-01T10:05:00Z'),
  createdBy: 'user-2'
}

describe('ConflictResolutionModal', () => {
  const mockOnResolve = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders conflict information correctly', () => {
    render(
      <ConflictResolutionModal
        conflict={mockConflict}
        localAssignment={mockLocalAssignment}
        remoteAssignment={mockRemoteAssignment}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    )

    expect(screen.getByText('Assignment Conflict Detected')).toBeInTheDocument()
    expect(screen.getByText('CONCURRENT_MODIFICATION Conflict')).toBeInTheDocument()
    expect(screen.getByText(mockConflict.message)).toBeInTheDocument()
  })

  it('displays assignment comparison when both assignments are provided', () => {
    render(
      <ConflictResolutionModal
        conflict={mockConflict}
        localAssignment={mockLocalAssignment}
        remoteAssignment={mockRemoteAssignment}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    )

    expect(screen.getByText('Your Changes')).toBeInTheDocument()
    expect(screen.getByText('Other User\'s Changes')).toBeInTheDocument()
    expect(screen.getByText('employee-1')).toBeInTheDocument()
    expect(screen.getByText('employee-2')).toBeInTheDocument()
  })

  it('shows resolution options', () => {
    render(
      <ConflictResolutionModal
        conflict={mockConflict}
        localAssignment={mockLocalAssignment}
        remoteAssignment={mockRemoteAssignment}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    )

    expect(screen.getByText('Keep my changes')).toBeInTheDocument()
    expect(screen.getByText('Accept other user\'s changes')).toBeInTheDocument()
    expect(screen.getByText('Merge changes (if possible)')).toBeInTheDocument()
    expect(screen.getByText('Resolve manually')).toBeInTheDocument()
  })

  it('calls onResolve with correct resolution when resolve button is clicked', async () => {
    render(
      <ConflictResolutionModal
        conflict={mockConflict}
        localAssignment={mockLocalAssignment}
        remoteAssignment={mockRemoteAssignment}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    )

    // Select "Accept other user's changes"
    const remoteRadio = screen.getByDisplayValue('accept_remote')
    fireEvent.click(remoteRadio)

    // Click resolve button
    const resolveButton = screen.getByText('Resolve Conflict')
    fireEvent.click(resolveButton)

    await waitFor(() => {
      expect(mockOnResolve).toHaveBeenCalledWith({
        action: 'accept_remote',
        resolvedAssignment: mockRemoteAssignment
      })
    })
  })

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <ConflictResolutionModal
        conflict={mockConflict}
        localAssignment={mockLocalAssignment}
        remoteAssignment={mockRemoteAssignment}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('calls onCancel when close button is clicked', () => {
    render(
      <ConflictResolutionModal
        conflict={mockConflict}
        localAssignment={mockLocalAssignment}
        remoteAssignment={mockRemoteAssignment}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    )

    const closeButton = screen.getByText('×')
    fireEvent.click(closeButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('does not render when isVisible is false', () => {
    render(
      <ConflictResolutionModal
        conflict={mockConflict}
        localAssignment={mockLocalAssignment}
        remoteAssignment={mockRemoteAssignment}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
        isVisible={false}
      />
    )

    expect(screen.queryByText('Assignment Conflict Detected')).not.toBeInTheDocument()
  })

  it('disables buttons when resolving', async () => {
    const slowResolve = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(
      <ConflictResolutionModal
        conflict={mockConflict}
        localAssignment={mockLocalAssignment}
        remoteAssignment={mockRemoteAssignment}
        onResolve={slowResolve}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    )

    const resolveButton = screen.getByText('Resolve Conflict')
    fireEvent.click(resolveButton)

    // Buttons should be disabled during resolution
    expect(resolveButton).toBeDisabled()
    expect(screen.getByText('Cancel')).toBeDisabled()
    expect(screen.getByText('×')).toBeDisabled()
    expect(screen.getByText('Resolving...')).toBeInTheDocument()

    await waitFor(() => {
      expect(slowResolve).toHaveBeenCalled()
    })
  })

  it('handles different conflict types correctly', () => {
    const doubleBookingConflict: AssignmentConflict = {
      id: 'conflict-2',
      type: 'double_booking',
      affectedAssignments: ['assignment-1', 'assignment-2'],
      message: 'Employee is already assigned to another station'
    }

    render(
      <ConflictResolutionModal
        conflict={doubleBookingConflict}
        localAssignment={mockLocalAssignment}
        remoteAssignment={mockRemoteAssignment}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    )

    expect(screen.getByText('DOUBLE_BOOKING Conflict')).toBeInTheDocument()
    expect(screen.getByText('Employee is already assigned to another station')).toBeInTheDocument()
  })

  it('shows merge option only for concurrent modification conflicts', () => {
    const capacityConflict: AssignmentConflict = {
      id: 'conflict-3',
      type: 'capacity_exceeded',
      affectedAssignments: ['assignment-1'],
      message: 'Station capacity exceeded'
    }

    render(
      <ConflictResolutionModal
        conflict={capacityConflict}
        localAssignment={mockLocalAssignment}
        remoteAssignment={mockRemoteAssignment}
        onResolve={mockOnResolve}
        onCancel={mockOnCancel}
        isVisible={true}
      />
    )

    expect(screen.queryByText('Merge changes (if possible)')).not.toBeInTheDocument()
  })
})
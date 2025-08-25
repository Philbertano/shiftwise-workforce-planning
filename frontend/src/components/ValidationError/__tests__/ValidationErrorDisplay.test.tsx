import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest'
import { ValidationErrorDisplay } from '../ValidationErrorDisplay'
import { ValidationError } from '../../../services/assignmentValidationService'

describe('ValidationErrorDisplay', () => {
  const mockErrors: ValidationError[] = [
    {
      type: 'capacity_exceeded',
      message: 'Station capacity exceeded',
      severity: 'error',
      suggestedAction: 'Remove an existing assignment'
    },
    {
      type: 'skill_mismatch',
      message: 'Employee lacks required skill',
      severity: 'error',
      suggestedAction: 'Select an employee with required skills'
    }
  ]

  const mockWarnings: ValidationError[] = [
    {
      type: 'employee_unavailable',
      message: 'Employee may not be available',
      severity: 'warning',
      suggestedAction: 'Verify employee availability'
    }
  ]

  it('renders nothing when no errors or warnings', () => {
    const { container } = render(
      <ValidationErrorDisplay errors={[]} warnings={[]} />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('renders errors correctly', () => {
    render(
      <ValidationErrorDisplay errors={mockErrors} warnings={[]} />
    )
    
    expect(screen.getByText('Assignment Errors')).toBeInTheDocument()
    expect(screen.getByText('Station capacity exceeded')).toBeInTheDocument()
    expect(screen.getByText('Employee lacks required skill')).toBeInTheDocument()
  })

  it('renders warnings correctly', () => {
    render(
      <ValidationErrorDisplay errors={[]} warnings={mockWarnings} />
    )
    
    expect(screen.getByText('Assignment Warning')).toBeInTheDocument()
    expect(screen.getByText('Employee may not be available')).toBeInTheDocument()
  })

  it('renders both errors and warnings', () => {
    render(
      <ValidationErrorDisplay errors={mockErrors} warnings={mockWarnings} />
    )
    
    expect(screen.getByText('Assignment Errors')).toBeInTheDocument()
    expect(screen.getByText('Assignment Warning')).toBeInTheDocument()
    expect(screen.getByText('Station capacity exceeded')).toBeInTheDocument()
    expect(screen.getByText('Employee may not be available')).toBeInTheDocument()
  })

  it('shows recovery actions when enabled', () => {
    render(
      <ValidationErrorDisplay 
        errors={mockErrors} 
        warnings={[]} 
        showRecoveryActions={true}
      />
    )
    
    expect(screen.getAllByText('Suggested actions:')).toHaveLength(2) // One for each error
    expect(screen.getByText('Remove an existing assignment')).toBeInTheDocument()
    expect(screen.getByText('Select an employee with required skills')).toBeInTheDocument()
  })

  it('hides recovery actions when disabled', () => {
    render(
      <ValidationErrorDisplay 
        errors={mockErrors} 
        warnings={[]} 
        showRecoveryActions={false}
      />
    )
    
    expect(screen.queryByText('Suggested actions:')).not.toBeInTheDocument()
  })

  it('calls onDismiss when dismiss button is clicked', () => {
    const mockOnDismiss = vi.fn()
    
    render(
      <ValidationErrorDisplay 
        errors={mockErrors} 
        warnings={[]} 
        onDismiss={mockOnDismiss}
      />
    )
    
    const dismissButton = screen.getByLabelText('Dismiss')
    fireEvent.click(dismissButton)
    
    expect(mockOnDismiss).toHaveBeenCalledTimes(1)
  })

  it('calls onRetry when retry button is clicked', () => {
    const mockOnRetry = vi.fn()
    
    render(
      <ValidationErrorDisplay 
        errors={mockErrors} 
        warnings={[]} 
        onRetry={mockOnRetry}
      />
    )
    
    const retryButton = screen.getByText('Try Again')
    fireEvent.click(retryButton)
    
    expect(mockOnRetry).toHaveBeenCalledTimes(1)
  })

  it('displays correct icons for different error types', () => {
    const errorTypes: ValidationError[] = [
      { type: 'capacity_exceeded', message: 'Capacity error', severity: 'error' },
      { type: 'skill_mismatch', message: 'Skill error', severity: 'error' },
      { type: 'employee_unavailable', message: 'Employee error', severity: 'error' },
      { type: 'duplicate_assignment', message: 'Duplicate error', severity: 'error' }
    ]
    
    render(
      <ValidationErrorDisplay errors={errorTypes} warnings={[]} />
    )
    
    // Check that different icons are displayed (emojis)
    expect(screen.getByText('⚠️')).toBeInTheDocument() // capacity_exceeded
    expect(screen.getByText('🔧')).toBeInTheDocument() // skill_mismatch
    expect(screen.getByText('👤')).toBeInTheDocument() // employee_unavailable
    expect(screen.getByText('🔄')).toBeInTheDocument() // duplicate_assignment
  })

  it('handles single vs plural error titles correctly', () => {
    // Single error
    render(
      <ValidationErrorDisplay errors={[mockErrors[0]]} warnings={[]} />
    )
    expect(screen.getByText('Assignment Error')).toBeInTheDocument()
    
    // Multiple errors
    render(
      <ValidationErrorDisplay errors={mockErrors} warnings={[]} />
    )
    expect(screen.getByText('Assignment Errors')).toBeInTheDocument()
  })

  it('handles single vs plural warning titles correctly', () => {
    // Single warning
    render(
      <ValidationErrorDisplay errors={[]} warnings={[mockWarnings[0]]} />
    )
    expect(screen.getByText('Assignment Warning')).toBeInTheDocument()
    
    // Multiple warnings
    const multipleWarnings = [...mockWarnings, { ...mockWarnings[0], message: 'Another warning' }]
    render(
      <ValidationErrorDisplay errors={[]} warnings={multipleWarnings} />
    )
    expect(screen.getByText('Assignment Warnings')).toBeInTheDocument()
  })
})
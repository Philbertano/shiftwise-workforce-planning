import React, { useState, useEffect } from 'react'
import { Assignment, Station, Employee } from '../../types'
import { ValidationErrorDisplay } from '../ValidationError'
import { useAssignmentValidation } from '../../hooks/useAssignmentValidation'
import { ValidationResult } from '../../services/assignmentValidationService'
import './AssignmentValidationDialog.css'

interface AssignmentValidationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (assignment: Assignment) => Promise<void>
  station: Station
  employee: Employee
  date: Date
  shiftId: string
  stations: Station[]
  employees: Employee[]
  assignments: Assignment[]
}

export const AssignmentValidationDialog: React.FC<AssignmentValidationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  station,
  employee,
  date,
  shiftId,
  stations,
  employees,
  assignments
}) => {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showWarnings, setShowWarnings] = useState(true)

  const { validateAssignment } = useAssignmentValidation({
    stations,
    employees,
    assignments
  })

  // Validate when dialog opens or dependencies change
  useEffect(() => {
    if (isOpen) {
      const result = validateAssignment(station.id, employee.id, date, shiftId)
      setValidationResult(result)
    }
  }, [isOpen, station.id, employee.id, date, shiftId, validateAssignment])

  const handleConfirm = async () => {
    if (!validationResult) return

    // If there are errors, don't proceed
    if (!validationResult.isValid) {
      return
    }

    setIsSubmitting(true)
    try {
      const assignment: Assignment = {
        id: `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        demandId: `${station.id}-${shiftId}-${date.toISOString().split('T')[0]}`,
        employeeId: employee.id,
        status: 'proposed',
        score: 85, // Default score - could be calculated based on skill match
        explanation: 'Manual assignment',
        createdAt: new Date(),
        createdBy: 'current-user' // Should come from auth context
      }

      await onConfirm(assignment)
      onClose()
    } catch (error) {
      console.error('Failed to create assignment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForceConfirm = async () => {
    // Allow confirmation even with warnings (but not errors)
    if (validationResult && validationResult.errors.length === 0) {
      await handleConfirm()
    }
  }

  if (!isOpen) return null

  return (
    <div className="assignment-validation-dialog-overlay">
      <div className="assignment-validation-dialog">
        <div className="dialog-header">
          <h3>Confirm Assignment</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="dialog-content">
          <div className="assignment-summary">
            <h4>Assignment Details</h4>
            <div className="assignment-details">
              <div className="detail-row">
                <span className="label">Employee:</span>
                <span className="value">{employee.name}</span>
              </div>
              <div className="detail-row">
                <span className="label">Station:</span>
                <span className="value">{station.name}</span>
              </div>
              <div className="detail-row">
                <span className="label">Production Line:</span>
                <span className="value">{station.line}</span>
              </div>
              <div className="detail-row">
                <span className="label">Date:</span>
                <span className="value">{date.toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <span className="label">Shift:</span>
                <span className="value">{shiftId}</span>
              </div>
            </div>
          </div>

          {validationResult && (
            <ValidationErrorDisplay
              errors={validationResult.errors}
              warnings={showWarnings ? validationResult.warnings : []}
              onDismiss={() => setShowWarnings(false)}
              showRecoveryActions={true}
            />
          )}

          {validationResult && validationResult.isValid && validationResult.warnings.length === 0 && (
            <div className="validation-success">
              <span className="success-icon">✅</span>
              <span className="success-message">Assignment is valid and ready to be created.</span>
            </div>
          )}
        </div>

        <div className="dialog-actions">
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          
          {validationResult && validationResult.isValid && (
            <button 
              className="btn btn-primary" 
              onClick={handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Confirm Assignment'}
            </button>
          )}

          {validationResult && !validationResult.isValid && validationResult.errors.length === 0 && validationResult.warnings.length > 0 && (
            <button 
              className="btn btn-warning" 
              onClick={handleForceConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Proceed with Warnings'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default AssignmentValidationDialog
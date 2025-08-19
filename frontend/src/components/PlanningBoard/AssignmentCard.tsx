import React, { useState } from 'react'
import { useDrag } from 'react-dnd'
import { Assignment, Employee, ConstraintViolation } from '../../types'

interface AssignmentCardProps {
  assignment: Assignment
  employee: Employee
  violations: ConstraintViolation[]
  onDelete: () => void
}

export const AssignmentCard: React.FC<AssignmentCardProps> = ({
  assignment,
  employee,
  violations,
  onDelete
}) => {
  const [showTooltip, setShowTooltip] = useState(false)

  const [{ isDragging }, drag] = useDrag({
    type: 'assignment',
    item: {
      type: 'assignment',
      id: assignment.id,
      employeeId: assignment.employeeId,
      assignmentId: assignment.id
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })

  const getStatusClass = () => {
    switch (assignment.status) {
      case 'confirmed': return 'status-confirmed'
      case 'proposed': return 'status-proposed'
      case 'rejected': return 'status-rejected'
      default: return 'status-unknown'
    }
  }

  const hasViolations = violations.length > 0
  const hasErrors = violations.some(v => v.severity === 'error' || v.severity === 'critical')

  const cardClasses = [
    'assignment-card',
    getStatusClass(),
    hasErrors ? 'has-errors' : '',
    hasViolations ? 'has-violations' : '',
    isDragging ? 'dragging' : ''
  ].filter(Boolean).join(' ')

  return (
    <div
      ref={drag}
      className={cardClasses}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="assignment-header">
        <span className="employee-name">{employee.name}</span>
        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          title="Remove assignment"
        >
          ×
        </button>
      </div>

      <div className="assignment-details">
        <span className="employee-team">{employee.team}</span>
        {assignment.score > 0 && (
          <span className="assignment-score">
            Score: {assignment.score.toFixed(1)}
          </span>
        )}
      </div>

      {hasViolations && (
        <div className="violation-indicator">
          <span className="violation-icon">⚠</span>
          <span className="violation-count">{violations.length}</span>
        </div>
      )}

      {showTooltip && (
        <div className="assignment-tooltip">
          <div className="tooltip-header">
            <strong>{employee.name}</strong>
            <span className="status-badge">{assignment.status}</span>
          </div>
          
          <div className="tooltip-details">
            <div>Team: {employee.team}</div>
            <div>Contract: {employee.contractType}</div>
            {assignment.score > 0 && (
              <div>Score: {assignment.score.toFixed(2)}</div>
            )}
          </div>

          {assignment.explanation && (
            <div className="tooltip-explanation">
              <strong>Explanation:</strong>
              <p>{assignment.explanation}</p>
            </div>
          )}

          {violations.length > 0 && (
            <div className="tooltip-violations">
              <strong>Issues:</strong>
              {violations.map((violation, index) => (
                <div key={index} className={`violation-item severity-${violation.severity}`}>
                  <span className="violation-message">{violation.message}</span>
                  {violation.suggestedActions.length > 0 && (
                    <div className="suggested-actions">
                      Suggestions: {violation.suggestedActions.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
import React from 'react'
import { useDrop } from 'react-dnd'
import { Assignment, Employee, CoverageStatus, ConstraintViolation, DragItem } from '../../types'
import { AssignmentCard } from './AssignmentCard'

interface PlanningCellProps {
  stationId: string
  shiftId: string
  date: Date
  assignment?: Assignment
  employee?: Employee
  coverage?: CoverageStatus
  violations: ConstraintViolation[]
  onAssignmentDrop: (employeeId: string, stationId: string, shiftId: string, date: Date) => void
  onAssignmentDelete: (assignmentId: string) => void
}

export const PlanningCell: React.FC<PlanningCellProps> = ({
  stationId,
  shiftId,
  date,
  assignment,
  employee,
  coverage,
  violations,
  onAssignmentDrop,
  onAssignmentDelete
}) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'employee',
    drop: (item: DragItem) => {
      if (item.type === 'employee' && item.id) {
        onAssignmentDrop(item.id, stationId, shiftId, date)
      }
    },
    canDrop: (item: DragItem) => {
      // Add validation logic here
      return item.type === 'employee'
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  })

  const getCoverageClass = () => {
    if (!coverage) return 'coverage-unknown'
    
    if (coverage.coverage >= 100) return 'coverage-full'
    if (coverage.coverage >= 90) return 'coverage-partial'
    return 'coverage-critical'
  }

  const getViolationClass = () => {
    if (violations.length === 0) return ''
    
    const maxSeverity = violations.reduce((max, v) => {
      const severityOrder = { info: 1, warning: 2, error: 3, critical: 4 }
      const currentLevel = severityOrder[v.severity] || 0
      const maxLevel = severityOrder[max] || 0
      return currentLevel > maxLevel ? v.severity : max
    }, 'info')

    return `violation-${maxSeverity}`
  }

  const cellClasses = [
    'planning-cell',
    getCoverageClass(),
    getViolationClass(),
    isOver && canDrop ? 'drop-target-active' : '',
    isOver && !canDrop ? 'drop-target-invalid' : ''
  ].filter(Boolean).join(' ')

  return (
    <div ref={drop} className={cellClasses}>
      {assignment && employee ? (
        <AssignmentCard
          assignment={assignment}
          employee={employee}
          violations={violations}
          onDelete={() => onAssignmentDelete(assignment.id)}
        />
      ) : (
        <div className="empty-slot">
          {coverage && (
            <div className="coverage-indicator">
              {coverage.assigned}/{coverage.required}
            </div>
          )}
          {violations.length > 0 && (
            <div className="violation-count">
              {violations.length} issue{violations.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
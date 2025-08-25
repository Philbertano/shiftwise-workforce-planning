import React, { useState, useMemo, useCallback } from 'react'
import { useDrop } from 'react-dnd'
import { Assignment, Employee, CoverageStatus, ConstraintViolation, DragItem, Station } from '../../types'
import { AssignmentCard } from './AssignmentCard'
import { 
  StationCapacityIndicator, 
  calculateCapacityStatus, 
  getCapacityWarnings
} from './StationCapacityIndicator'
import { ValidationErrorDisplay } from '../ValidationError'
import { useAssignmentValidation } from '../../hooks/useAssignmentValidation'
import './MultiAssignmentSlot.css'

interface MultiAssignmentSlotProps {
  stationId: string
  shiftId: string
  date: Date
  assignments: Assignment[]
  employees: Employee[]
  stations: Station[]
  capacity: number
  coverage?: CoverageStatus
  violations: ConstraintViolation[]
  onAssignmentDrop: (employeeId: string, stationId: string, shiftId: string, date: Date) => void
  onAssignmentDelete: (assignmentId: string) => void
}

export const MultiAssignmentSlot: React.FC<MultiAssignmentSlotProps> = React.memo(({
  stationId,
  shiftId,
  date,
  assignments,
  employees,
  stations,
  capacity,
  coverage,
  violations,
  onAssignmentDrop,
  onAssignmentDelete
}) => {
  const [showCapacityDetails, setShowCapacityDetails] = useState(false)
  const [validationError, setValidationError] = useState<{ errors: any[], warnings: any[] } | null>(null)

  const { validateAssignment } = useAssignmentValidation({
    stations,
    employees,
    assignments
  })

  const handleDrop = useCallback((item: DragItem) => {
    if (item.type === 'employee' && item.id) {
      // Use comprehensive validation
      const validationResult = validateAssignment(stationId, item.id, date, shiftId)
      
      if (validationResult.isValid) {
        onAssignmentDrop(item.id, stationId, shiftId, date)
        setValidationError(null)
      } else {
        // Show validation errors
        setValidationError({
          errors: validationResult.errors,
          warnings: validationResult.warnings
        })
        console.warn('Assignment validation failed:', validationResult.errors)
      }
    }
  }, [validateAssignment, stationId, date, shiftId, onAssignmentDrop])

  const canDropItem = useCallback((item: DragItem) => {
    // Check if we can add more employees to this slot
    if (item.type !== 'employee' || !item.id) return false
    
    // Use comprehensive validation for drag feedback
    const validationResult = validateAssignment(stationId, item.id, date, shiftId)
    return validationResult.isValid
  }, [validateAssignment, stationId, date, shiftId])

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'employee',
    drop: handleDrop,
    canDrop: canDropItem,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  })

  // Memoize expensive calculations
  const capacityStatus = useMemo(() => {
    const current = assignments.length
    const required = capacity
    
    if (current === 0) return 'empty'
    if (current < required) return 'understaffed'
    if (current === required) return 'optimal'
    return 'overstaffed'
  }, [assignments.length, capacity])

  const capacityClass = useMemo(() => {
    switch (capacityStatus) {
      case 'empty': return 'capacity-empty'
      case 'understaffed': return 'capacity-understaffed'
      case 'optimal': return 'capacity-optimal'
      case 'overstaffed': return 'capacity-overstaffed'
      default: return ''
    }
  }, [capacityStatus])

  const coverageClass = useMemo(() => {
    if (!coverage) return 'coverage-unknown'
    
    if (coverage.coverage >= 100) return 'coverage-full'
    if (coverage.coverage >= 90) return 'coverage-partial'
    return 'coverage-critical'
  }, [coverage])

  const violationClass = useMemo(() => {
    if (violations.length === 0) return ''
    
    const maxSeverity = violations.reduce((max, v) => {
      const severityOrder = { info: 1, warning: 2, error: 3, critical: 4 }
      const currentLevel = severityOrder[v.severity] || 0
      const maxLevel = severityOrder[max] || 0
      return currentLevel > maxLevel ? v.severity : max
    }, 'info')

    return `violation-${maxSeverity}`
  }, [violations])

  const slotClasses = useMemo(() => [
    'multi-assignment-slot',
    capacityClass,
    coverageClass,
    violationClass,
    isOver && canDrop ? 'drop-target-active' : '',
    isOver && !canDrop ? 'drop-target-invalid' : ''
  ].filter(Boolean).join(' '), [capacityClass, coverageClass, violationClass, isOver, canDrop])

  const assignedEmployees = useMemo(() => 
    assignments.map(assignment => {
      const employee = employees.find(emp => emp.id === assignment.employeeId)
      return { assignment, employee }
    }).filter(item => item.employee),
    [assignments, employees]
  )

  // Calculate capacity status with enhanced information
  const enhancedCapacityStatus = useMemo(() => calculateCapacityStatus(
    assignments.length,
    capacity,
    true // TODO: Implement skill matching logic based on station requirements
  ), [assignments.length, capacity])

  // Get capacity warnings for this station
  const capacityWarnings = useMemo(() => getCapacityWarnings(enhancedCapacityStatus), [enhancedCapacityStatus])

  const handleMouseEnter = useCallback(() => setShowCapacityDetails(true), [])
  const handleMouseLeave = useCallback(() => setShowCapacityDetails(false), [])
  const handleValidationDismiss = useCallback(() => setValidationError(null), [])

  return (
    <div 
      ref={drop} 
      className={slotClasses}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Capacity indicator */}
      <div className="slot-header">
        <StationCapacityIndicator 
          capacity={enhancedCapacityStatus}
          compact={true}
          showWarnings={true}
        />
        {(violations.length > 0 || capacityWarnings.length > 0) && (
          <span className="violation-badge" title={
            [...violations.map(v => v.message), ...capacityWarnings].join('; ')
          }>
            {violations.length + capacityWarnings.length}
          </span>
        )}
      </div>

      {/* Assignment cards */}
      <div className="assignment-cards">
        {assignedEmployees.map(({ assignment, employee }) => (
          <AssignmentCard
            key={assignment.id}
            assignment={assignment}
            employee={employee!}
            violations={violations.filter(v => 
              v.affectedAssignments.includes(assignment.id)
            )}
            onDelete={() => onAssignmentDelete(assignment.id)}
            compact={assignments.length > 1}
          />
        ))}
      </div>

      {/* Empty slots indicator */}
      {assignments.length < capacity && (
        <div className="empty-slots">
          {Array.from({ length: capacity - assignments.length }, (_, index) => (
            <div key={index} className="empty-slot-indicator">
              <span className="plus-icon">+</span>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced capacity details tooltip */}
      {showCapacityDetails && (
        <div className="capacity-tooltip">
          <div className="tooltip-header">
            <strong>Station Capacity Status</strong>
          </div>
          <div className="tooltip-content">
            <div>Required: {capacity} employees</div>
            <div>Assigned: {assignments.length} employees</div>
            <div>Status: {capacityStatus}</div>
            {enhancedCapacityStatus.availableCapacity !== undefined && (
              <div>Available: {enhancedCapacityStatus.availableCapacity} slots</div>
            )}
            {coverage && (
              <div>Coverage: {coverage.coverage.toFixed(1)}%</div>
            )}
            
            {/* Capacity warnings */}
            {capacityWarnings.length > 0 && (
              <div className="capacity-warnings-summary">
                <strong>Capacity Issues ({capacityWarnings.length}):</strong>
                {capacityWarnings.map((warning, index) => (
                  <div key={index} className="capacity-warning-item">
                    {warning}
                  </div>
                ))}
              </div>
            )}
            
            {/* Constraint violations */}
            {violations.length > 0 && (
              <div className="violations-summary">
                <strong>Constraint Violations ({violations.length}):</strong>
                {violations.slice(0, 3).map((violation, index) => (
                  <div key={index} className={`violation-summary severity-${violation.severity}`}>
                    {violation.message}
                  </div>
                ))}
                {violations.length > 3 && (
                  <div className="more-violations">
                    +{violations.length - 3} more constraint issues
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation error display */}
      {validationError && (
        <div className="validation-error-overlay">
          <ValidationErrorDisplay
            errors={validationError.errors}
            warnings={validationError.warnings}
            onDismiss={handleValidationDismiss}
            showRecoveryActions={true}
          />
        </div>
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for performance optimization
  return (
    prevProps.stationId === nextProps.stationId &&
    prevProps.shiftId === nextProps.shiftId &&
    prevProps.date.getTime() === nextProps.date.getTime() &&
    prevProps.capacity === nextProps.capacity &&
    prevProps.assignments.length === nextProps.assignments.length &&
    prevProps.violations.length === nextProps.violations.length &&
    prevProps.coverage?.coverage === nextProps.coverage?.coverage &&
    // Deep comparison for assignments array
    JSON.stringify(prevProps.assignments) === JSON.stringify(nextProps.assignments)
  )
})
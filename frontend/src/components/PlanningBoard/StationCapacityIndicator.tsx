import React from 'react'

interface CapacityStatus {
  current: number
  required: number
  status: 'empty' | 'understaffed' | 'optimal' | 'overstaffed'
  skillsMatch: boolean
  canAcceptMore?: boolean
  availableCapacity?: number
}

interface StationCapacityIndicatorProps {
  capacity: CapacityStatus
  compact?: boolean
  showDetails?: boolean
  showWarnings?: boolean
}

export const StationCapacityIndicator: React.FC<StationCapacityIndicatorProps> = ({
  capacity,
  compact = false,
  showDetails = false,
  showWarnings = true
}) => {
  const getStatusIcon = () => {
    switch (capacity.status) {
      case 'empty': return '○'
      case 'understaffed': return '⚠'
      case 'optimal': return '✓'
      case 'overstaffed': return '⚠'
      default: return '?'
    }
  }

  const getStatusColor = () => {
    switch (capacity.status) {
      case 'empty': return 'var(--automotive-color-text-secondary, #6c757d)'
      case 'understaffed': return 'var(--automotive-color-warning, #d97706)'
      case 'optimal': return 'var(--automotive-color-success, #059669)'
      case 'overstaffed': return 'var(--automotive-color-error, #dc2626)'
      default: return 'var(--automotive-color-text-secondary, #6c757d)'
    }
  }

  const getStatusMessage = () => {
    switch (capacity.status) {
      case 'empty': return 'No employees assigned'
      case 'understaffed': return `Need ${capacity.required - capacity.current} more employees`
      case 'optimal': return 'Fully staffed'
      case 'overstaffed': return `${capacity.current - capacity.required} employees over capacity`
      default: return 'Unknown status'
    }
  }

  const getCapacityWarning = () => {
    if (!showWarnings) return null
    
    if (capacity.status === 'overstaffed') {
      return 'Station is overstaffed - consider reassigning employees'
    }
    
    if (capacity.status === 'understaffed' && capacity.current > 0) {
      return 'Station is understaffed - production may be impacted'
    }
    
    if (capacity.status === 'empty') {
      return 'Station has no employees assigned - production will be stopped'
    }
    
    return null
  }

  const getProgressPercentage = () => {
    if (capacity.required === 0) return 0
    return Math.min((capacity.current / capacity.required) * 100, 100)
  }

  const getOverstaffingPercentage = () => {
    if (capacity.current <= capacity.required) return 0
    return ((capacity.current - capacity.required) / capacity.required) * 100
  }

  const indicatorClasses = [
    'capacity-indicator',
    'automotive-card',
    `status-${capacity.status}`,
    compact ? 'compact' : '',
    !capacity.skillsMatch ? 'skills-mismatch' : '',
    capacity.status === 'overstaffed' ? 'capacity-violation' : ''
  ].filter(Boolean).join(' ')

  const warningMessage = getCapacityWarning()

  if (compact) {
    return (
      <div className={indicatorClasses}>
        <span 
          className="status-icon" 
          style={{ color: getStatusColor() }}
          title={getStatusMessage()}
        >
          {getStatusIcon()}
        </span>
        <span className="capacity-count">
          {capacity.current}/{capacity.required}
        </span>
        {capacity.status === 'overstaffed' && (
          <span className="overstaffed-indicator" title="Over capacity">
            🚫
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={indicatorClasses}>
      <div className="capacity-header">
        <span className="status-icon" style={{ color: getStatusColor() }}>
          {getStatusIcon()}
        </span>
        <span className="capacity-count">
          {capacity.current}/{capacity.required}
        </span>
        <span className="status-text">
          {capacity.status.charAt(0).toUpperCase() + capacity.status.slice(1)}
        </span>
      </div>

      {showDetails && (
        <>
          <div className="capacity-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${getProgressPercentage()}%`,
                  backgroundColor: getStatusColor()
                }}
              />
              {capacity.status === 'overstaffed' && (
                <div 
                  className="overstaffing-fill"
                  style={{ 
                    width: `${Math.min(getOverstaffingPercentage(), 100)}%`,
                    backgroundColor: 'var(--automotive-color-error, #dc2626)'
                  }}
                />
              )}
            </div>
            <span className="progress-text">
              {getProgressPercentage().toFixed(0)}%
            </span>
          </div>

          {!capacity.skillsMatch && (
            <div className="skills-warning automotive-status automotive-status--warning">
              <span className="warning-icon">⚠</span>
              <span className="warning-text">Skill requirements not met</span>
            </div>
          )}

          {warningMessage && (
            <div className={`capacity-warning automotive-status ${
              capacity.status === 'overstaffed' ? 'automotive-status--error' : 
              capacity.status === 'understaffed' ? 'automotive-status--warning' : 
              'automotive-status--error'
            }`}>
              <span className="warning-icon">
                {capacity.status === 'overstaffed' ? '🚫' : 
                 capacity.status === 'empty' ? '⏹' : '⚠'}
              </span>
              <span className="warning-text">{warningMessage}</span>
            </div>
          )}

          <div className="capacity-details">
            <div className="detail-item">
              <span className="detail-label">Required:</span>
              <span className="detail-value">{capacity.required}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Assigned:</span>
              <span className="detail-value">{capacity.current}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">
                {capacity.current > capacity.required ? 'Excess:' : 'Gap:'}
              </span>
              <span className="detail-value">
                {Math.abs(capacity.required - capacity.current)}
              </span>
            </div>
            {capacity.availableCapacity !== undefined && (
              <div className="detail-item">
                <span className="detail-label">Available:</span>
                <span className="detail-value">{capacity.availableCapacity}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export const calculateCapacityStatus = (
  current: number,
  required: number,
  skillsMatch: boolean = true
): CapacityStatus => {
  let status: CapacityStatus['status']
  
  if (current === 0) {
    status = 'empty'
  } else if (current < required) {
    status = 'understaffed'
  } else if (current === required) {
    status = 'optimal'
  } else {
    status = 'overstaffed'
  }

  const availableCapacity = Math.max(0, required - current)
  const canAcceptMore = current < required

  return {
    current,
    required,
    status,
    skillsMatch,
    canAcceptMore,
    availableCapacity
  }
}

/**
 * Validates if a new assignment can be added to a station
 * @param currentAssignments Current number of assignments
 * @param stationCapacity Maximum capacity of the station
 * @param employeeId ID of employee to assign (to check for duplicates)
 * @param existingAssignments Array of existing assignment employee IDs
 * @returns Validation result with success flag and error message
 */
export const validateCapacityAssignment = (
  currentAssignments: number,
  stationCapacity: number,
  employeeId: string,
  existingAssignments: string[] = []
): { canAssign: boolean; reason?: string; severity?: 'warning' | 'error' } => {
  // Check if employee is already assigned
  if (existingAssignments.includes(employeeId)) {
    return {
      canAssign: false,
      reason: 'Employee is already assigned to this station slot',
      severity: 'error'
    }
  }

  // Check if station is at capacity
  if (currentAssignments >= stationCapacity) {
    return {
      canAssign: false,
      reason: `Station is at maximum capacity (${stationCapacity} employees)`,
      severity: 'error'
    }
  }

  // Check if assignment would exceed capacity
  if (currentAssignments + 1 > stationCapacity) {
    return {
      canAssign: false,
      reason: 'Assignment would exceed station capacity',
      severity: 'error'
    }
  }

  // Warn if station will be at capacity after this assignment
  if (currentAssignments + 1 === stationCapacity) {
    return {
      canAssign: true,
      reason: 'Station will be at full capacity after this assignment',
      severity: 'warning'
    }
  }

  return { canAssign: true }
}

/**
 * Gets capacity validation warnings for a station
 * @param capacityStatus Current capacity status
 * @returns Array of warning messages
 */
export const getCapacityWarnings = (capacityStatus: CapacityStatus): string[] => {
  const warnings: string[] = []

  if (capacityStatus.status === 'overstaffed') {
    warnings.push(`Station is overstaffed by ${capacityStatus.current - capacityStatus.required} employees`)
  }

  if (capacityStatus.status === 'understaffed') {
    const shortage = capacityStatus.required - capacityStatus.current
    warnings.push(`Station needs ${shortage} more employee${shortage > 1 ? 's' : ''} to meet requirements`)
  }

  if (capacityStatus.status === 'empty') {
    warnings.push('Station has no employees assigned - production will be stopped')
  }

  if (!capacityStatus.skillsMatch) {
    warnings.push('Assigned employees do not meet all required skills')
  }

  return warnings
}
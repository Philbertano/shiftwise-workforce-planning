import React, { useState, useMemo } from 'react'
import { ConstraintViolation } from '../../types'

interface ViolationPanelProps {
  violations: ConstraintViolation[]
}

export const ViolationPanel: React.FC<ViolationPanelProps> = ({ violations }) => {
  const [expandedViolations, setExpandedViolations] = useState<Set<string>>(new Set())
  const [filterSeverity, setFilterSeverity] = useState('')

  const filteredViolations = useMemo(() => {
    if (!filterSeverity) return violations
    return violations.filter(v => v.severity === filterSeverity)
  }, [violations, filterSeverity])

  const violationCounts = useMemo(() => {
    return violations.reduce((counts, violation) => {
      counts[violation.severity] = (counts[violation.severity] || 0) + 1
      return counts
    }, {} as Record<string, number>)
  }, [violations])

  const toggleViolation = (violationId: string) => {
    const newExpanded = new Set(expandedViolations)
    if (newExpanded.has(violationId)) {
      newExpanded.delete(violationId)
    } else {
      newExpanded.add(violationId)
    }
    setExpandedViolations(newExpanded)
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '❓'
    }
  }

  const getSeverityClass = (severity: string) => {
    return `severity-${severity}`
  }

  if (violations.length === 0) {
    return (
      <div className="violation-panel">
        <div className="panel-header">
          <h3>Constraint Violations</h3>
        </div>
        <div className="no-violations">
          <div className="success-icon">✅</div>
          <p>No constraint violations detected</p>
        </div>
      </div>
    )
  }

  return (
    <div className="violation-panel">
      <div className="panel-header">
        <h3>Constraint Violations ({violations.length})</h3>
      </div>

      <div className="violation-summary">
        {Object.entries(violationCounts).map(([severity, count]) => (
          <div key={severity} className={`summary-item ${getSeverityClass(severity)}`}>
            <span className="severity-icon">{getSeverityIcon(severity)}</span>
            <span className="severity-label">{severity}</span>
            <span className="severity-count">{count}</span>
          </div>
        ))}
      </div>

      <div className="violation-filters">
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="filter-select"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      <div className="violation-list">
        {filteredViolations.map((violation, index) => {
          const violationId = `${violation.constraintId}-${index}`
          const isExpanded = expandedViolations.has(violationId)

          return (
            <div key={violationId} className={`violation-item ${getSeverityClass(violation.severity)}`}>
              <div 
                className="violation-header"
                onClick={() => toggleViolation(violationId)}
              >
                <span className="severity-icon">{getSeverityIcon(violation.severity)}</span>
                <span className="violation-message">{violation.message}</span>
                <span className="expand-icon">{isExpanded ? '−' : '+'}</span>
              </div>

              {isExpanded && (
                <div className="violation-details">
                  <div className="constraint-info">
                    <strong>Constraint:</strong> {violation.constraintId}
                  </div>

                  {violation.affectedAssignments.length > 0 && (
                    <div className="affected-assignments">
                      <strong>Affected Assignments:</strong>
                      <ul>
                        {violation.affectedAssignments.map(assignmentId => (
                          <li key={assignmentId}>{assignmentId}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {violation.suggestedActions.length > 0 && (
                    <div className="suggested-actions">
                      <strong>Suggested Actions:</strong>
                      <ul>
                        {violation.suggestedActions.map((action, actionIndex) => (
                          <li key={actionIndex}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { ProductionLine } from '../../types'
import './StaffingLevelMonitor.css'

interface StaffingLevel {
  productionLineId: string
  shiftId: string
  required: number
  assigned: number
  efficiency: number
  status: 'optimal' | 'understaffed' | 'overstaffed' | 'critical'
}

interface StaffingAlert {
  type: 'understaffed' | 'overstaffed' | 'skill_gap' | 'safety_violation'
  productionLineId: string
  shiftId: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
}

interface StaffingLevelMonitorProps {
  staffingLevels: StaffingLevel[]
  productionLines: ProductionLine[]
  onAlert?: (alert: StaffingAlert) => void
  detailed?: boolean
}

export const StaffingLevelMonitor: React.FC<StaffingLevelMonitorProps> = React.memo(({
  staffingLevels,
  productionLines,
  onAlert,
  detailed = false
}) => {
  const [alerts, setAlerts] = useState<StaffingAlert[]>([])
  const [selectedShift, setSelectedShift] = useState<string>('all')

  // Generate alerts based on staffing levels
  useEffect(() => {
    const newAlerts: StaffingAlert[] = []
    
    staffingLevels.forEach(level => {
      const line = productionLines.find(l => l.id === level.productionLineId)
      if (!line) return
      
      if (level.status === 'critical') {
        newAlerts.push({
          type: 'understaffed',
          productionLineId: level.productionLineId,
          shiftId: level.shiftId,
          severity: 'critical',
          message: `${line.name} is critically understaffed (${level.assigned}/${level.required})`
        })
      } else if (level.status === 'understaffed') {
        newAlerts.push({
          type: 'understaffed',
          productionLineId: level.productionLineId,
          shiftId: level.shiftId,
          severity: 'high',
          message: `${line.name} needs additional staff (${level.assigned}/${level.required})`
        })
      } else if (level.status === 'overstaffed') {
        newAlerts.push({
          type: 'overstaffed',
          productionLineId: level.productionLineId,
          shiftId: level.shiftId,
          severity: 'medium',
          message: `${line.name} is overstaffed (${level.assigned}/${level.required})`
        })
      }
      
      if (level.efficiency < 70) {
        newAlerts.push({
          type: 'skill_gap',
          productionLineId: level.productionLineId,
          shiftId: level.shiftId,
          severity: level.efficiency < 50 ? 'critical' : 'high',
          message: `${line.name} efficiency is low (${level.efficiency.toFixed(1)}%)`
        })
      }
    })
    
    setAlerts(newAlerts)
    
    // Notify parent of critical alerts
    newAlerts.filter(alert => alert.severity === 'critical').forEach(alert => {
      onAlert?.(alert)
    })
  }, [staffingLevels, productionLines, onAlert])

  // Memoize utility functions
  const getShiftName = useCallback((shiftId: string) => {
    const shiftNames: { [key: string]: string } = {
      'shift-1': 'Day Shift',
      'shift-2': 'Evening Shift',
      'shift-3': 'Night Shift'
    }
    return shiftNames[shiftId] || `Shift ${shiftId}`
  }, [])

  const getLineName = useCallback((lineId: string) => {
    const line = productionLines.find(l => l.id === lineId)
    return line?.name || 'Unknown Line'
  }, [productionLines])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'optimal': return 'var(--automotive-success)'
      case 'understaffed': return 'var(--automotive-warning)'
      case 'overstaffed': return 'var(--automotive-info)'
      case 'critical': return 'var(--automotive-error)'
      default: return 'var(--automotive-text-secondary)'
    }
  }, [])

  const getSeverityColor = useCallback((severity: string) => {
    switch (severity) {
      case 'low': return 'var(--automotive-info)'
      case 'medium': return 'var(--automotive-warning)'
      case 'high': return 'var(--automotive-error)'
      case 'critical': return 'var(--automotive-error)'
      default: return 'var(--automotive-text-secondary)'
    }
  }, [])

  const getAlertIcon = useCallback((type: string) => {
    switch (type) {
      case 'understaffed': return '👥'
      case 'overstaffed': return '📈'
      case 'skill_gap': return '🎯'
      case 'safety_violation': return '🛡️'
      default: return '⚠️'
    }
  }, [])

  // Memoize expensive calculations
  const filteredStaffingLevels = useMemo(() => 
    selectedShift === 'all' 
      ? (staffingLevels || [])
      : (staffingLevels || []).filter(level => level.shiftId === selectedShift),
    [selectedShift, staffingLevels]
  )

  const shifts = useMemo(() => 
    [...new Set((staffingLevels || []).map(level => level.shiftId))],
    [staffingLevels]
  )

  const summaryStats = useMemo(() => ({
    totalPositions: (staffingLevels || []).reduce((sum, level) => sum + level.required, 0),
    filledPositions: (staffingLevels || []).reduce((sum, level) => sum + level.assigned, 0),
    averageEfficiency: (staffingLevels || []).reduce((sum, level) => sum + level.efficiency, 0) / (staffingLevels?.length || 1),
    criticalAlerts: (alerts || []).filter(alert => alert.severity === 'critical').length,
    highAlerts: (alerts || []).filter(alert => alert.severity === 'high').length
  }), [staffingLevels, alerts])

  const handleShiftChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedShift(e.target.value)
  }, [])

  return (
    <div className="staffing-level-monitor">
      <div className="section-header">
        <h3>Workforce Monitoring</h3>
        <div className="shift-filter">
          <select 
            value={selectedShift} 
            onChange={handleShiftChange}
            className="shift-select"
          >
            <option value="all">All Shifts</option>
            {shifts.map(shiftId => (
              <option key={shiftId} value={shiftId}>
                {getShiftName(shiftId)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="staffing-summary">
        <div className="summary-card">
          <div className="summary-value">{summaryStats.filledPositions}</div>
          <div className="summary-label">Active Workers</div>
          <div className="summary-detail">of {summaryStats.totalPositions} required</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{summaryStats.averageEfficiency.toFixed(1)}%</div>
          <div className="summary-label">Avg Efficiency</div>
          <div className="summary-detail">across all lines</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{summaryStats.criticalAlerts}</div>
          <div className="summary-label">Critical Alerts</div>
          <div className="summary-detail">{summaryStats.highAlerts} high priority</div>
        </div>
      </div>

      {detailed && (
        <div className="staffing-details">
          <h4>Staffing Levels by Production Line</h4>
          <div className="staffing-grid">
            {filteredStaffingLevels.map((level, index) => (
              <div key={index} className={`staffing-card staffing-card--${level.status}`}>
                <div className="staffing-card__header">
                  <div className="line-info">
                    <h5>{getLineName(level.productionLineId)}</h5>
                    <p>{getShiftName(level.shiftId)}</p>
                  </div>
                  <div className="status-badge" style={{ backgroundColor: getStatusColor(level.status) }}>
                    {level.status}
                  </div>
                </div>
                
                <div className="staffing-metrics">
                  <div className="metric-row">
                    <span className="metric-label">Staffing:</span>
                    <span className="metric-value">{level.assigned}/{level.required}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Coverage:</span>
                    <span className="metric-value">
                      {((level.assigned / level.required) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Efficiency:</span>
                    <span className="metric-value">{level.efficiency.toFixed(1)}%</span>
                  </div>
                </div>
                
                <div className="staffing-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${Math.min((level.assigned / level.required) * 100, 100)}%`,
                        backgroundColor: getStatusColor(level.status)
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="alerts-section">
        <div className="alerts-header">
          <h4>Active Alerts</h4>
          <div className="alert-count">
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        <div className="alerts-list">
          {alerts.length === 0 ? (
            <div className="no-alerts">
              <span className="no-alerts-icon">✅</span>
              <span>All production lines are properly staffed</span>
            </div>
          ) : (
            alerts.slice(0, detailed ? alerts.length : 5).map((alert, index) => (
              <div key={index} className={`alert-item alert-item--${alert.severity}`}>
                <div className="alert-icon">{getAlertIcon(alert.type)}</div>
                <div className="alert-content">
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-details">
                    {getLineName(alert.productionLineId)} • {getShiftName(alert.shiftId)}
                  </div>
                </div>
                <div className="alert-severity" style={{ color: getSeverityColor(alert.severity) }}>
                  {alert.severity.toUpperCase()}
                </div>
              </div>
            ))
          )}
          
          {!detailed && alerts.length > 5 && (
            <div className="more-alerts">
              +{alerts.length - 5} more alerts
            </div>
          )}
        </div>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for performance optimization
  return (
    prevProps.staffingLevels.length === nextProps.staffingLevels.length &&
    prevProps.productionLines.length === nextProps.productionLines.length &&
    prevProps.detailed === nextProps.detailed &&
    // Deep comparison for staffing levels
    JSON.stringify(prevProps.staffingLevels) === JSON.stringify(nextProps.staffingLevels)
  )
})
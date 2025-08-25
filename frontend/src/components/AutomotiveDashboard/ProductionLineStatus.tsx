import React from 'react'
import { ProductionLine } from '../../types'
import './ProductionLineStatus.css'

interface StaffingLevel {
  productionLineId: string
  shiftId: string
  required: number
  assigned: number
  efficiency: number
  status: 'optimal' | 'understaffed' | 'overstaffed' | 'critical'
}

interface ProductionLineStatusProps {
  productionLines: ProductionLine[]
  staffingLevels: StaffingLevel[]
  onLineClick?: (lineId: string) => void
  selectedLine?: string | null
  detailed?: boolean
}

export const ProductionLineStatus: React.FC<ProductionLineStatusProps> = ({
  productionLines,
  staffingLevels,
  onLineClick,
  selectedLine,
  detailed = false
}) => {
  const getLineStaffing = (lineId: string) => {
    const lineStaffing = staffingLevels.filter(level => level.productionLineId === lineId)
    if (lineStaffing.length === 0) return null
    
    const totalRequired = lineStaffing.reduce((sum, level) => sum + level.required, 0)
    const totalAssigned = lineStaffing.reduce((sum, level) => sum + level.assigned, 0)
    const averageEfficiency = lineStaffing.reduce((sum, level) => sum + level.efficiency, 0) / lineStaffing.length
    
    const criticalCount = lineStaffing.filter(level => level.status === 'critical').length
    const understaffedCount = lineStaffing.filter(level => level.status === 'understaffed').length
    
    let overallStatus: 'optimal' | 'understaffed' | 'overstaffed' | 'critical' = 'optimal'
    if (criticalCount > 0) overallStatus = 'critical'
    else if (understaffedCount > 0) overallStatus = 'understaffed'
    else if (totalAssigned > totalRequired * 1.1) overallStatus = 'overstaffed'
    
    return {
      totalRequired,
      totalAssigned,
      averageEfficiency,
      overallStatus,
      shifts: lineStaffing
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'var(--automotive-success)'
      case 'understaffed': return 'var(--automotive-warning)'
      case 'overstaffed': return 'var(--automotive-info)'
      case 'critical': return 'var(--automotive-error)'
      default: return 'var(--automotive-text-secondary)'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'optimal': return '✅'
      case 'understaffed': return '⚠️'
      case 'overstaffed': return '📈'
      case 'critical': return '🚨'
      default: return '❓'
    }
  }

  const getLineTypeIcon = (type: string) => {
    switch (type) {
      case 'assembly': return '🔧'
      case 'paint': return '🎨'
      case 'body_shop': return '🏗️'
      case 'final_inspection': return '🔍'
      case 'stamping': return '⚒️'
      case 'welding': return '⚡'
      case 'trim': return '✂️'
      case 'chassis': return '🚗'
      default: return '🏭'
    }
  }

  const formatLineType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return (
    <div className="production-line-status">
      <div className="section-header">
        <h3>Production Line Status</h3>
        <div className="status-legend">
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: 'var(--automotive-success)' }}></span>
            <span>Optimal</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: 'var(--automotive-warning)' }}></span>
            <span>Understaffed</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: 'var(--automotive-error)' }}></span>
            <span>Critical</span>
          </div>
        </div>
      </div>

      <div className={`production-lines ${detailed ? 'production-lines--detailed' : ''}`}>
        {productionLines.map(line => {
          const staffing = getLineStaffing(line.id)
          const isSelected = selectedLine === line.id
          const isActive = line.active
          
          return (
            <div
              key={line.id}
              className={`production-line ${isSelected ? 'production-line--selected' : ''} ${!isActive ? 'production-line--inactive' : ''}`}
              onClick={() => onLineClick?.(line.id)}
            >
              <div className="production-line__header">
                <div className="line-info">
                  <div className="line-icon">{getLineTypeIcon(line.type)}</div>
                  <div className="line-details">
                    <h4 className="line-name">{line.name}</h4>
                    <p className="line-type">{formatLineType(line.type)}</p>
                  </div>
                </div>
                
                <div className="line-status">
                  {staffing && (
                    <>
                      <div className="status-indicator">
                        <span className="status-icon">{getStatusIcon(staffing.overallStatus)}</span>
                        <span className="status-text" style={{ color: getStatusColor(staffing.overallStatus) }}>
                          {staffing.overallStatus.charAt(0).toUpperCase() + staffing.overallStatus.slice(1)}
                        </span>
                      </div>
                      <div className="efficiency-badge">
                        {staffing.averageEfficiency.toFixed(1)}% Efficiency
                      </div>
                    </>
                  )}
                  {!isActive && (
                    <div className="inactive-badge">Offline</div>
                  )}
                </div>
              </div>

              <div className="production-line__metrics">
                <div className="metric">
                  <span className="metric-label">Capacity</span>
                  <span className="metric-value">{line.capacity} units/hr</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Takt Time</span>
                  <span className="metric-value">{line.taktTime}s</span>
                </div>
                {staffing && (
                  <>
                    <div className="metric">
                      <span className="metric-label">Staffing</span>
                      <span className="metric-value">
                        {staffing.totalAssigned}/{staffing.totalRequired}
                      </span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Coverage</span>
                      <span className="metric-value">
                        {((staffing.totalAssigned / staffing.totalRequired) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </>
                )}
              </div>

              {detailed && staffing && (
                <div className="production-line__shifts">
                  <h5>Shift Details</h5>
                  <div className="shift-grid">
                    {staffing.shifts.map((shift, index) => (
                      <div key={index} className={`shift-card shift-card--${shift.status}`}>
                        <div className="shift-header">
                          <span className="shift-name">Shift {index + 1}</span>
                          <span className="shift-status">{getStatusIcon(shift.status)}</span>
                        </div>
                        <div className="shift-metrics">
                          <div className="shift-metric">
                            <span>Required: {shift.required}</span>
                          </div>
                          <div className="shift-metric">
                            <span>Assigned: {shift.assigned}</span>
                          </div>
                          <div className="shift-metric">
                            <span>Efficiency: {shift.efficiency.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="production-line__progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: staffing ? `${Math.min((staffing.totalAssigned / staffing.totalRequired) * 100, 100)}%` : '0%',
                      backgroundColor: staffing ? getStatusColor(staffing.overallStatus) : 'var(--automotive-text-secondary)'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
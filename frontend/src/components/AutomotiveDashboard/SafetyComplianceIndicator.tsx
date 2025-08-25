import React from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import './SafetyComplianceIndicator.css'

interface SafetyComplianceData {
  overallScore: number
  certificationCompliance: number
  ppeCompliance: number
  trainingCompliance: number
  incidentRate: number
  lastIncident?: Date
}

interface SafetyComplianceIndicatorProps {
  complianceData: SafetyComplianceData
  showDetails?: boolean
}

export const SafetyComplianceIndicator: React.FC<SafetyComplianceIndicatorProps> = ({
  complianceData,
  showDetails = false
}) => {
  const getComplianceColor = (score: number) => {
    if (score >= 95) return 'var(--automotive-success)'
    if (score >= 85) return 'var(--automotive-warning)'
    return 'var(--automotive-error)'
  }

  const getComplianceStatus = (score: number) => {
    if (score >= 95) return 'Excellent'
    if (score >= 85) return 'Good'
    if (score >= 70) return 'Needs Improvement'
    return 'Critical'
  }

  const getIncidentRateColor = (rate: number) => {
    if (rate === 0) return 'var(--automotive-success)'
    if (rate <= 2) return 'var(--automotive-warning)'
    return 'var(--automotive-error)'
  }

  const getIncidentRateStatus = (rate: number) => {
    if (rate === 0) return 'Zero Incidents'
    if (rate <= 2) return 'Low Risk'
    if (rate <= 5) return 'Moderate Risk'
    return 'High Risk'
  }

  const safetyMetrics = [
    {
      title: 'Certification Compliance',
      value: complianceData.certificationCompliance,
      icon: '📜',
      description: 'Workers with valid certifications'
    },
    {
      title: 'PPE Compliance',
      value: complianceData.ppeCompliance,
      icon: '🦺',
      description: 'Personal protective equipment usage'
    },
    {
      title: 'Training Compliance',
      value: complianceData.trainingCompliance,
      icon: '🎓',
      description: 'Completed safety training programs'
    }
  ]

  const CircularProgress: React.FC<{ value: number; size?: number; strokeWidth?: number }> = ({ 
    value, 
    size = 120, 
    strokeWidth = 8 
  }) => {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (value / 100) * circumference

    return (
      <div className="circular-progress" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="circular-progress-svg">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--automotive-border)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getComplianceColor(value)}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="circular-progress-bar"
          />
        </svg>
        <div className="circular-progress-content">
          <div className="progress-value">{value.toFixed(1)}%</div>
          <div className="progress-label">Safety Score</div>
        </div>
      </div>
    )
  }

  return (
    <div className="safety-compliance-indicator">
      <div className="section-header">
        <h3>Safety & Compliance</h3>
        <div className="safety-status">
          <div className="status-indicator">
            <span className="status-dot" style={{ backgroundColor: getComplianceColor(complianceData.overallScore) }}></span>
            <span className="status-text" style={{ color: getComplianceColor(complianceData.overallScore) }}>
              {getComplianceStatus(complianceData.overallScore)}
            </span>
          </div>
        </div>
      </div>

      <div className="compliance-overview">
        <div className="overall-score">
          <CircularProgress value={complianceData.overallScore} />
        </div>

        <div className="incident-summary">
          <div className="incident-card">
            <div className="incident-header">
              <span className="incident-icon">📊</span>
              <h4>Incident Rate</h4>
            </div>
            <div className="incident-value" style={{ color: getIncidentRateColor(complianceData.incidentRate) }}>
              {complianceData.incidentRate.toFixed(1)}
            </div>
            <div className="incident-label">incidents per month</div>
            <div className="incident-status" style={{ color: getIncidentRateColor(complianceData.incidentRate) }}>
              {getIncidentRateStatus(complianceData.incidentRate)}
            </div>
          </div>

          {complianceData.lastIncident && (
            <div className="last-incident">
              <div className="last-incident-header">
                <span className="incident-icon">⏰</span>
                <span>Last Incident</span>
              </div>
              <div className="last-incident-date">
                {formatDistanceToNow(complianceData.lastIncident, { addSuffix: true })}
              </div>
              <div className="last-incident-full-date">
                {format(complianceData.lastIncident, 'MMM d, yyyy')}
              </div>
            </div>
          )}

          {!complianceData.lastIncident && (
            <div className="no-incidents">
              <span className="no-incidents-icon">🎉</span>
              <span>No recent incidents</span>
            </div>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="compliance-details">
          <h4>Compliance Breakdown</h4>
          <div className="metrics-grid">
            {safetyMetrics.map((metric, index) => (
              <div key={index} className="metric-card">
                <div className="metric-header">
                  <span className="metric-icon">{metric.icon}</span>
                  <h5>{metric.title}</h5>
                </div>
                
                <div className="metric-value" style={{ color: getComplianceColor(metric.value) }}>
                  {metric.value.toFixed(1)}%
                </div>
                
                <div className="metric-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${metric.value}%`,
                        backgroundColor: getComplianceColor(metric.value)
                      }}
                    ></div>
                  </div>
                </div>
                
                <div className="metric-description">
                  {metric.description}
                </div>
                
                <div className="metric-status" style={{ color: getComplianceColor(metric.value) }}>
                  {getComplianceStatus(metric.value)}
                </div>
              </div>
            ))}
          </div>

          <div className="safety-actions">
            <h4>Recommended Actions</h4>
            <div className="actions-list">
              {complianceData.certificationCompliance < 95 && (
                <div className="action-item">
                  <span className="action-icon">📜</span>
                  <span className="action-text">Review and update worker certifications</span>
                  <button className="action-btn">Schedule</button>
                </div>
              )}
              
              {complianceData.ppeCompliance < 95 && (
                <div className="action-item">
                  <span className="action-icon">🦺</span>
                  <span className="action-text">Conduct PPE compliance audit</span>
                  <button className="action-btn">Start Audit</button>
                </div>
              )}
              
              {complianceData.trainingCompliance < 95 && (
                <div className="action-item">
                  <span className="action-icon">🎓</span>
                  <span className="action-text">Schedule safety training sessions</span>
                  <button className="action-btn">Schedule</button>
                </div>
              )}
              
              {complianceData.incidentRate > 2 && (
                <div className="action-item">
                  <span className="action-icon">🔍</span>
                  <span className="action-text">Investigate incident patterns</span>
                  <button className="action-btn">Investigate</button>
                </div>
              )}
              
              {complianceData.overallScore >= 95 && (
                <div className="action-item action-item--positive">
                  <span className="action-icon">🏆</span>
                  <span className="action-text">Excellent safety performance - maintain standards</span>
                  <button className="action-btn action-btn--success">Acknowledge</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
import React from 'react'
import './AutomotiveKPICards.css'

interface AutomotiveKPIData {
  overallEfficiency: number
  productionRate: number
  qualityScore: number
  safetyIncidents: number
  staffingEfficiency: number
  lineUtilization: number
}

interface AutomotiveMetrics {
  totalLines: number
  activeLines: number
  criticalStaffingIssues: number
  averageEfficiency: number
  skillGaps: number
  criticalSkillGaps: number
  safetyScore: number
}

interface AutomotiveKPICardsProps {
  kpiData: AutomotiveKPIData
  metrics: AutomotiveMetrics
}

interface KPICard {
  title: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  trendValue?: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  icon: string
  description: string
}

export const AutomotiveKPICards: React.FC<AutomotiveKPICardsProps> = ({
  kpiData,
  metrics
}) => {
  const getStatusFromValue = (value: number, thresholds: { excellent: number, good: number, warning: number }): 'excellent' | 'good' | 'warning' | 'critical' => {
    if (value >= thresholds.excellent) return 'excellent'
    if (value >= thresholds.good) return 'good'
    if (value >= thresholds.warning) return 'warning'
    return 'critical'
  }

  const kpiCards: KPICard[] = [
    {
      title: 'Overall Equipment Effectiveness',
      value: kpiData.overallEfficiency.toFixed(1),
      unit: '%',
      trend: kpiData.overallEfficiency > 85 ? 'up' : kpiData.overallEfficiency > 75 ? 'stable' : 'down',
      trendValue: 2.3,
      status: getStatusFromValue(kpiData.overallEfficiency, { excellent: 85, good: 75, warning: 65 }),
      icon: '⚙️',
      description: 'Production line efficiency and utilization'
    },
    {
      title: 'Production Rate',
      value: kpiData.productionRate.toFixed(0),
      unit: 'units/hr',
      trend: 'up',
      trendValue: 5.2,
      status: getStatusFromValue(kpiData.productionRate, { excellent: 95, good: 85, warning: 75 }),
      icon: '🏭',
      description: 'Current production throughput'
    },
    {
      title: 'Quality Score',
      value: kpiData.qualityScore.toFixed(1),
      unit: '%',
      trend: kpiData.qualityScore > 98 ? 'up' : 'stable',
      trendValue: 0.8,
      status: getStatusFromValue(kpiData.qualityScore, { excellent: 98, good: 95, warning: 90 }),
      icon: '✅',
      description: 'First-pass quality rate'
    },
    {
      title: 'Safety Performance',
      value: metrics.safetyScore.toFixed(1),
      unit: '%',
      trend: metrics.safetyScore > 95 ? 'up' : 'stable',
      trendValue: 1.2,
      status: getStatusFromValue(metrics.safetyScore, { excellent: 95, good: 90, warning: 85 }),
      icon: '🛡️',
      description: 'Safety compliance and incident rate'
    },
    {
      title: 'Workforce Efficiency',
      value: kpiData.staffingEfficiency.toFixed(1),
      unit: '%',
      trend: metrics.averageEfficiency > 90 ? 'up' : 'stable',
      trendValue: 3.1,
      status: getStatusFromValue(kpiData.staffingEfficiency, { excellent: 90, good: 80, warning: 70 }),
      icon: '👥',
      description: 'Staff utilization and productivity'
    },
    {
      title: 'Line Utilization',
      value: kpiData.lineUtilization.toFixed(1),
      unit: '%',
      trend: 'stable',
      trendValue: 0.5,
      status: getStatusFromValue(kpiData.lineUtilization, { excellent: 85, good: 75, warning: 65 }),
      icon: '📊',
      description: 'Production line capacity utilization'
    }
  ]

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return '↗️'
      case 'down': return '↘️'
      case 'stable': return '→'
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'var(--automotive-success)'
      case 'down': return 'var(--automotive-error)'
      case 'stable': return 'var(--automotive-warning)'
    }
  }

  return (
    <div className="automotive-kpi-cards">
      {kpiCards.map((card, index) => (
        <div key={index} className={`kpi-card kpi-card--${card.status}`}>
          <div className="kpi-card__header">
            <div className="kpi-card__icon">{card.icon}</div>
            <div className="kpi-card__title">{card.title}</div>
          </div>
          
          <div className="kpi-card__content">
            <div className="kpi-card__value">
              <span className="value">{card.value}</span>
              {card.unit && <span className="unit">{card.unit}</span>}
            </div>
            
            {card.trend && card.trendValue && (
              <div className="kpi-card__trend" style={{ color: getTrendColor(card.trend) }}>
                <span className="trend-icon">{getTrendIcon(card.trend)}</span>
                <span className="trend-value">{card.trendValue}%</span>
              </div>
            )}
          </div>
          
          <div className="kpi-card__description">
            {card.description}
          </div>
          
          <div className={`kpi-card__status-indicator kpi-card__status-indicator--${card.status}`}></div>
        </div>
      ))}
    </div>
  )
}
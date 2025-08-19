import React, { useMemo } from 'react'
import { Gap, CoverageStatus, Station, ShiftTemplate } from '../../types'

interface RiskIndicatorsProps {
  gaps: Gap[]
  coverageStatus: CoverageStatus[]
  stations: Station[]
  shifts: ShiftTemplate[]
}

interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical'
  score: number
  factors: string[]
  recommendations: string[]
}

export const RiskIndicators: React.FC<RiskIndicatorsProps> = ({
  gaps,
  coverageStatus,
  stations,
  shifts
}) => {
  const riskAssessment = useMemo((): RiskAssessment => {
    let score = 0
    const factors: string[] = []
    const recommendations: string[] = []

    // Critical gaps analysis
    const criticalGaps = gaps.filter(g => g.criticality === 'critical')
    const highGaps = gaps.filter(g => g.criticality === 'high')
    
    if (criticalGaps.length > 0) {
      score += criticalGaps.length * 10
      factors.push(`${criticalGaps.length} critical coverage gap${criticalGaps.length !== 1 ? 's' : ''}`)
      recommendations.push('Immediately address critical gaps through overtime or temporary assignments')
    }

    if (highGaps.length > 0) {
      score += highGaps.length * 5
      factors.push(`${highGaps.length} high-priority gap${highGaps.length !== 1 ? 's' : ''}`)
      recommendations.push('Plan additional staffing for high-priority positions')
    }

    // Coverage percentage analysis
    const lowCoverageSlots = coverageStatus.filter(c => c.coverage < 80)
    if (lowCoverageSlots.length > 0) {
      score += lowCoverageSlots.length * 3
      factors.push(`${lowCoverageSlots.length} slot${lowCoverageSlots.length !== 1 ? 's' : ''} with coverage below 80%`)
      recommendations.push('Review staffing levels for consistently under-covered positions')
    }

    // Station priority analysis
    const criticalStationGaps = gaps.filter(gap => {
      const station = stations.find(s => s.id === gap.stationId)
      return station?.priority === 'critical'
    })

    if (criticalStationGaps.length > 0) {
      score += criticalStationGaps.length * 8
      factors.push(`${criticalStationGaps.length} gap${criticalStationGaps.length !== 1 ? 's' : ''} in critical stations`)
      recommendations.push('Prioritize filling gaps in critical production stations')
    }

    // Skill concentration risk
    const skillGaps = gaps.reduce((acc, gap) => {
      acc[gap.skillId] = (acc[gap.skillId] || 0) + gap.count
      return acc
    }, {} as Record<string, number>)

    const highDemandSkills = Object.entries(skillGaps).filter(([_, count]) => count >= 3)
    if (highDemandSkills.length > 0) {
      score += highDemandSkills.length * 6
      factors.push(`High demand for ${highDemandSkills.length} skill${highDemandSkills.length !== 1 ? 's' : ''}`)
      recommendations.push('Consider cross-training employees in high-demand skills')
    }

    // Determine risk level
    let level: RiskAssessment['level']
    if (score >= 30) level = 'critical'
    else if (score >= 20) level = 'high'
    else if (score >= 10) level = 'medium'
    else level = 'low'

    // Add general recommendations based on risk level
    if (level === 'critical') {
      recommendations.unshift('URGENT: Implement emergency staffing measures immediately')
    } else if (level === 'high') {
      recommendations.unshift('Take immediate action to address staffing shortfalls')
    } else if (level === 'medium') {
      recommendations.unshift('Monitor situation closely and prepare contingency plans')
    } else {
      recommendations.push('Continue monitoring coverage levels')
    }

    return { level, score, factors, recommendations }
  }, [gaps, coverageStatus, stations])

  const stationRisks = useMemo(() => {
    return stations.map(station => {
      const stationGaps = gaps.filter(g => g.stationId === station.id)
      const stationCoverage = coverageStatus.filter(c => c.stationId === station.id)
      
      const avgCoverage = stationCoverage.length > 0
        ? stationCoverage.reduce((sum, c) => sum + c.coverage, 0) / stationCoverage.length
        : 100

      const criticalGapCount = stationGaps.filter(g => g.criticality === 'critical' || g.criticality === 'high').length
      
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
      if (criticalGapCount > 0 || avgCoverage < 70) riskLevel = 'critical'
      else if (stationGaps.length > 0 || avgCoverage < 85) riskLevel = 'high'
      else if (avgCoverage < 95) riskLevel = 'medium'

      return {
        station,
        avgCoverage,
        gapCount: stationGaps.length,
        criticalGapCount,
        riskLevel
      }
    }).sort((a, b) => {
      const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return riskOrder[b.riskLevel] - riskOrder[a.riskLevel]
    })
  }, [stations, gaps, coverageStatus])

  const getRiskClass = (level: string) => `risk-${level}`
  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'critical': return '🚨'
      case 'high': return '⚠️'
      case 'medium': return '⚡'
      case 'low': return '✅'
      default: return '❓'
    }
  }

  return (
    <div className="risk-indicators">
      <div className="risk-header">
        <h3>Risk Analysis</h3>
      </div>

      <div className="overall-risk">
        <div className={`risk-card ${getRiskClass(riskAssessment.level)}`}>
          <div className="risk-icon">{getRiskIcon(riskAssessment.level)}</div>
          <div className="risk-content">
            <div className="risk-level">
              {riskAssessment.level.toUpperCase()} RISK
            </div>
            <div className="risk-score">
              Risk Score: {riskAssessment.score}
            </div>
          </div>
        </div>
      </div>

      <div className="risk-factors">
        <h4>Risk Factors</h4>
        {riskAssessment.factors.length > 0 ? (
          <ul className="factors-list">
            {riskAssessment.factors.map((factor, index) => (
              <li key={index} className="factor-item">
                {factor}
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-factors">No significant risk factors identified</p>
        )}
      </div>

      <div className="recommendations">
        <h4>Recommendations</h4>
        <ul className="recommendations-list">
          {riskAssessment.recommendations.map((recommendation, index) => (
            <li key={index} className="recommendation-item">
              {recommendation}
            </li>
          ))}
        </ul>
      </div>

      <div className="station-risks">
        <h4>Station Risk Assessment</h4>
        <div className="station-risk-list">
          {stationRisks.map(({ station, avgCoverage, gapCount, criticalGapCount, riskLevel }) => (
            <div key={station.id} className={`station-risk-item ${getRiskClass(riskLevel)}`}>
              <div className="station-risk-header">
                <div className="station-info">
                  <div className="station-name">{station.name}</div>
                  <div className="station-line">{station.line}</div>
                </div>
                <div className="risk-indicator">
                  <span className="risk-icon">{getRiskIcon(riskLevel)}</span>
                  <span className="risk-label">{riskLevel.toUpperCase()}</span>
                </div>
              </div>
              
              <div className="station-metrics">
                <div className="metric">
                  <span className="metric-label">Avg Coverage:</span>
                  <span className="metric-value">{avgCoverage.toFixed(1)}%</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Total Gaps:</span>
                  <span className="metric-value">{gapCount}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Critical Gaps:</span>
                  <span className="metric-value">{criticalGapCount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="risk-legend">
        <h4>Risk Levels</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-icon">🚨</span>
            <span className="legend-text">Critical: Immediate action required</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">⚠️</span>
            <span className="legend-text">High: Urgent attention needed</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">⚡</span>
            <span className="legend-text">Medium: Monitor closely</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">✅</span>
            <span className="legend-text">Low: Acceptable risk level</span>
          </div>
        </div>
      </div>
    </div>
  )
}
import React, { useMemo } from 'react'
import { format, subDays, isWithinInterval } from 'date-fns'

interface CoverageHistoryPoint {
  date: Date
  averageCoverage: number
  criticalGaps: number
  totalGaps: number
}

interface CoverageTrendsProps {
  historicalData: CoverageHistoryPoint[]
  currentWeekStart: Date
}

export const CoverageTrends: React.FC<CoverageTrendsProps> = ({
  historicalData,
  currentWeekStart
}) => {
  const trendData = useMemo(() => {
    // Get last 30 days of data
    const thirtyDaysAgo = subDays(currentWeekStart, 30)
    const recentData = historicalData.filter(point => 
      isWithinInterval(point.date, { start: thirtyDaysAgo, end: currentWeekStart })
    ).sort((a, b) => a.date.getTime() - b.date.getTime())

    if (recentData.length === 0) return null

    // Calculate trends
    const latest = recentData[recentData.length - 1]
    const previous = recentData.length > 1 ? recentData[recentData.length - 2] : latest
    
    const coverageTrend = latest.averageCoverage - previous.averageCoverage
    const gapTrend = latest.totalGaps - previous.totalGaps
    const criticalGapTrend = latest.criticalGaps - previous.criticalGaps

    return {
      data: recentData,
      latest,
      trends: {
        coverage: coverageTrend,
        gaps: gapTrend,
        criticalGaps: criticalGapTrend
      }
    }
  }, [historicalData, currentWeekStart])

  const getTrendIcon = (value: number) => {
    if (value > 0) return '📈'
    if (value < 0) return '📉'
    return '➡️'
  }

  const getTrendClass = (value: number, isGoodWhenPositive: boolean = true) => {
    if (value === 0) return 'trend-neutral'
    const isPositive = value > 0
    const isGood = isGoodWhenPositive ? isPositive : !isPositive
    return isGood ? 'trend-positive' : 'trend-negative'
  }

  const formatTrendValue = (value: number, suffix: string = '') => {
    const sign = value > 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}${suffix}`
  }

  if (!trendData) {
    return (
      <div className="coverage-trends">
        <div className="trends-header">
          <h3>Coverage Trends</h3>
        </div>
        <div className="no-data">
          <p>No historical data available for trend analysis</p>
        </div>
      </div>
    )
  }

  const maxCoverage = Math.max(...trendData.data.map(d => d.averageCoverage))
  const minCoverage = Math.min(...trendData.data.map(d => d.averageCoverage))
  const maxGaps = Math.max(...trendData.data.map(d => d.totalGaps))

  return (
    <div className="coverage-trends">
      <div className="trends-header">
        <h3>Coverage Trends (Last 30 Days)</h3>
      </div>

      <div className="trend-summary">
        <div className="trend-card">
          <div className="trend-title">Average Coverage</div>
          <div className="trend-value">{trendData.latest.averageCoverage.toFixed(1)}%</div>
          <div className={`trend-change ${getTrendClass(trendData.trends.coverage)}`}>
            {getTrendIcon(trendData.trends.coverage)} {formatTrendValue(trendData.trends.coverage, '%')}
          </div>
        </div>

        <div className="trend-card">
          <div className="trend-title">Total Gaps</div>
          <div className="trend-value">{trendData.latest.totalGaps}</div>
          <div className={`trend-change ${getTrendClass(trendData.trends.gaps, false)}`}>
            {getTrendIcon(trendData.trends.gaps)} {formatTrendValue(trendData.trends.gaps)}
          </div>
        </div>

        <div className="trend-card">
          <div className="trend-title">Critical Gaps</div>
          <div className="trend-value">{trendData.latest.criticalGaps}</div>
          <div className={`trend-change ${getTrendClass(trendData.trends.criticalGaps, false)}`}>
            {getTrendIcon(trendData.trends.criticalGaps)} {formatTrendValue(trendData.trends.criticalGaps)}
          </div>
        </div>
      </div>

      <div className="trend-charts">
        <div className="chart-container">
          <h4>Coverage Percentage Over Time</h4>
          <div className="simple-chart">
            <div className="chart-grid">
              {trendData.data.map((point, index) => {
                const height = ((point.averageCoverage - minCoverage) / (maxCoverage - minCoverage)) * 100
                return (
                  <div key={index} className="chart-bar">
                    <div 
                      className="bar coverage-bar"
                      style={{ height: `${height}%` }}
                      title={`${format(point.date, 'MMM d')}: ${point.averageCoverage.toFixed(1)}%`}
                    />
                    <div className="bar-label">
                      {format(point.date, 'M/d')}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="chart-axis">
              <span>{minCoverage.toFixed(0)}%</span>
              <span>{maxCoverage.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        <div className="chart-container">
          <h4>Gap Count Over Time</h4>
          <div className="simple-chart">
            <div className="chart-grid">
              {trendData.data.map((point, index) => {
                const totalHeight = (point.totalGaps / maxGaps) * 100
                const criticalHeight = (point.criticalGaps / maxGaps) * 100
                return (
                  <div key={index} className="chart-bar">
                    <div 
                      className="bar total-gaps-bar"
                      style={{ height: `${totalHeight}%` }}
                      title={`${format(point.date, 'MMM d')}: ${point.totalGaps} total, ${point.criticalGaps} critical`}
                    />
                    <div 
                      className="bar critical-gaps-bar"
                      style={{ height: `${criticalHeight}%` }}
                    />
                    <div className="bar-label">
                      {format(point.date, 'M/d')}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="chart-axis">
              <span>0</span>
              <span>{maxGaps}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="trend-insights">
        <h4>Insights</h4>
        <div className="insights-list">
          {trendData.trends.coverage > 2 && (
            <div className="insight positive">
              ✅ Coverage has improved by {trendData.trends.coverage.toFixed(1)}% since yesterday
            </div>
          )}
          {trendData.trends.coverage < -2 && (
            <div className="insight negative">
              ⚠️ Coverage has declined by {Math.abs(trendData.trends.coverage).toFixed(1)}% since yesterday
            </div>
          )}
          {trendData.trends.criticalGaps > 0 && (
            <div className="insight negative">
              🚨 Critical gaps have increased by {trendData.trends.criticalGaps} since yesterday
            </div>
          )}
          {trendData.trends.criticalGaps < 0 && (
            <div className="insight positive">
              ✅ Critical gaps have decreased by {Math.abs(trendData.trends.criticalGaps)} since yesterday
            </div>
          )}
          {Math.abs(trendData.trends.coverage) <= 2 && trendData.trends.criticalGaps === 0 && (
            <div className="insight neutral">
              ➡️ Coverage levels remain stable with no significant changes
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
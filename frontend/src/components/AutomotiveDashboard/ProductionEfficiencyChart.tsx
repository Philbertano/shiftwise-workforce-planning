import React, { useMemo } from 'react'
import { format, subHours, subDays } from 'date-fns'
import './ProductionEfficiencyChart.css'

interface EfficiencyDataPoint {
  timestamp: Date
  productionLineId: string
  efficiency: number
  throughput: number
  staffingLevel: number
}

interface ProductionEfficiencyChartProps {
  data: EfficiencyDataPoint[]
  selectedLine?: string | null
  timeRange: '24h' | '7d' | '30d'
}

export const ProductionEfficiencyChart: React.FC<ProductionEfficiencyChartProps> = ({
  data,
  selectedLine,
  timeRange
}) => {
  const chartData = useMemo(() => {
    const now = new Date()
    let startTime: Date
    
    switch (timeRange) {
      case '24h':
        startTime = subHours(now, 24)
        break
      case '7d':
        startTime = subDays(now, 7)
        break
      case '30d':
        startTime = subDays(now, 30)
        break
      default:
        startTime = subHours(now, 24)
    }
    
    let filteredData = (data || []).filter(point => point.timestamp >= startTime)
    
    if (selectedLine) {
      filteredData = filteredData.filter(point => point.productionLineId === selectedLine)
    }
    
    // Group data by time intervals
    const groupedData = new Map<string, EfficiencyDataPoint[]>()
    
    filteredData.forEach(point => {
      let timeKey: string
      
      switch (timeRange) {
        case '24h':
          timeKey = format(point.timestamp, 'HH:00')
          break
        case '7d':
          timeKey = format(point.timestamp, 'MMM dd')
          break
        case '30d':
          timeKey = format(point.timestamp, 'MMM dd')
          break
        default:
          timeKey = format(point.timestamp, 'HH:00')
      }
      
      if (!groupedData.has(timeKey)) {
        groupedData.set(timeKey, [])
      }
      groupedData.get(timeKey)!.push(point)
    })
    
    // Calculate averages for each time interval
    const chartPoints = Array.from(groupedData.entries()).map(([timeKey, points]) => {
      const avgEfficiency = points.reduce((sum, p) => sum + p.efficiency, 0) / points.length
      const avgThroughput = points.reduce((sum, p) => sum + p.throughput, 0) / points.length
      const avgStaffing = points.reduce((sum, p) => sum + p.staffingLevel, 0) / points.length
      
      return {
        timeKey,
        efficiency: avgEfficiency,
        throughput: avgThroughput,
        staffingLevel: avgStaffing,
        dataPoints: points.length
      }
    }).sort((a, b) => a.timeKey.localeCompare(b.timeKey))
    
    return chartPoints
  }, [data, selectedLine, timeRange])

  const maxEfficiency = Math.max(...chartData.map(d => d.efficiency), 100)
  const maxThroughput = Math.max(...chartData.map(d => d.throughput), 1)
  const maxStaffing = Math.max(...chartData.map(d => d.staffingLevel), 1)

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 85) return 'var(--automotive-success)'
    if (efficiency >= 70) return 'var(--automotive-warning)'
    return 'var(--automotive-error)'
  }

  const chartHeight = 200
  const chartWidth = 100 // percentage

  return (
    <div className="production-efficiency-chart">
      <div className="chart-header">
        <h3>Production Efficiency Trends</h3>
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: 'var(--automotive-primary)' }}></div>
            <span>Efficiency</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: 'var(--automotive-secondary)' }}></div>
            <span>Throughput</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: 'var(--automotive-accent)' }}></div>
            <span>Staffing</span>
          </div>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="no-data">
          <span className="no-data-icon">📊</span>
          <span>No efficiency data available for the selected time range</span>
        </div>
      ) : (
        <div className="chart-container">
          <div className="chart-y-axis">
            <div className="y-axis-label">100%</div>
            <div className="y-axis-label">75%</div>
            <div className="y-axis-label">50%</div>
            <div className="y-axis-label">25%</div>
            <div className="y-axis-label">0%</div>
          </div>
          
          <div className="chart-area">
            <svg className="chart-svg" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
              {/* Grid lines */}
              <defs>
                <pattern id="grid" width="10" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 40" fill="none" stroke="var(--automotive-border)" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Efficiency line */}
              <polyline
                fill="none"
                stroke="var(--automotive-primary)"
                strokeWidth="2"
                points={chartData.map((point, index) => {
                  const x = chartData.length > 1 ? (index / (chartData.length - 1)) * chartWidth : chartWidth / 2
                  const y = chartHeight - (point.efficiency / maxEfficiency) * chartHeight
                  return `${x},${y}`
                }).join(' ')}
              />
              
              {/* Throughput line */}
              <polyline
                fill="none"
                stroke="var(--automotive-secondary)"
                strokeWidth="2"
                strokeDasharray="5,5"
                points={chartData.map((point, index) => {
                  const x = chartData.length > 1 ? (index / (chartData.length - 1)) * chartWidth : chartWidth / 2
                  const y = chartHeight - (point.throughput / maxThroughput) * chartHeight * 0.8
                  return `${x},${y}`
                }).join(' ')}
              />
              
              {/* Data points */}
              {chartData.map((point, index) => {
                const x = chartData.length > 1 ? (index / (chartData.length - 1)) * chartWidth : chartWidth / 2
                const y = chartHeight - (point.efficiency / maxEfficiency) * chartHeight
                
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="3"
                    fill={getEfficiencyColor(point.efficiency)}
                    stroke="white"
                    strokeWidth="1"
                  />
                )
              })}
            </svg>
            
            <div className="chart-x-axis">
              {chartData.map((point, index) => (
                <div key={index} className="x-axis-label">
                  {point.timeKey}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="chart-summary">
        <div className="summary-metrics">
          <div className="metric">
            <span className="metric-label">Avg Efficiency</span>
            <span className="metric-value">
              {chartData.length > 0 
                ? (chartData.reduce((sum, d) => sum + d.efficiency, 0) / chartData.length).toFixed(1)
                : '0'
              }%
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">Peak Efficiency</span>
            <span className="metric-value">
              {chartData.length > 0 
                ? Math.max(...chartData.map(d => d.efficiency)).toFixed(1)
                : '0'
              }%
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">Avg Throughput</span>
            <span className="metric-value">
              {chartData.length > 0 
                ? (chartData.reduce((sum, d) => sum + d.throughput, 0) / chartData.length).toFixed(0)
                : '0'
              } units/hr
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">Data Points</span>
            <span className="metric-value">
              {chartData.reduce((sum, d) => sum + d.dataPoints, 0)}
            </span>
          </div>
        </div>
        
        <div className="efficiency-status">
          {chartData.length > 0 && (
            <>
              <div className="status-indicator">
                <span className="status-dot" style={{ 
                  backgroundColor: getEfficiencyColor(
                    chartData.reduce((sum, d) => sum + d.efficiency, 0) / chartData.length
                  )
                }}></span>
                <span className="status-text">
                  {(() => {
                    const avgEfficiency = chartData.reduce((sum, d) => sum + d.efficiency, 0) / chartData.length
                    if (avgEfficiency >= 85) return 'Excellent Performance'
                    if (avgEfficiency >= 70) return 'Good Performance'
                    return 'Needs Improvement'
                  })()}
                </span>
              </div>
              
              <div className="trend-indicator">
                {(() => {
                  if (chartData.length < 2) return null
                  const firstHalf = chartData.slice(0, Math.floor(chartData.length / 2))
                  const secondHalf = chartData.slice(Math.floor(chartData.length / 2))
                  const firstAvg = firstHalf.reduce((sum, d) => sum + d.efficiency, 0) / firstHalf.length
                  const secondAvg = secondHalf.reduce((sum, d) => sum + d.efficiency, 0) / secondHalf.length
                  const trend = secondAvg - firstAvg
                  
                  return (
                    <div className="trend">
                      <span className="trend-icon">
                        {trend > 2 ? '📈' : trend < -2 ? '📉' : '➡️'}
                      </span>
                      <span className="trend-text">
                        {trend > 2 ? 'Improving' : trend < -2 ? 'Declining' : 'Stable'}
                      </span>
                    </div>
                  )
                })()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
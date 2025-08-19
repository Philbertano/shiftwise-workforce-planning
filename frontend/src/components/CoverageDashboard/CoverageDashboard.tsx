import React, { useState, useMemo } from 'react'
import { format, addDays, startOfWeek } from 'date-fns'
import { CoverageStatus, Gap, Station, ShiftTemplate } from '../../types'
import { CoverageHeatmap } from './CoverageHeatmap'
import { GapList } from './GapList'
import { CoverageTrends } from './CoverageTrends'
import { RiskIndicators } from './RiskIndicators'
import './CoverageDashboard.css'

interface CoverageDashboardData {
  coverageStatus: CoverageStatus[]
  gaps: Gap[]
  stations: Station[]
  shifts: ShiftTemplate[]
  historicalCoverage?: CoverageHistoryPoint[]
}

interface CoverageHistoryPoint {
  date: Date
  averageCoverage: number
  criticalGaps: number
  totalGaps: number
}

interface CoverageDashboardProps {
  data: CoverageDashboardData
  selectedDate: Date
  onDateChange: (date: Date) => void
  onGapClick?: (gap: Gap) => void
}

export const CoverageDashboard: React.FC<CoverageDashboardProps> = ({
  data,
  selectedDate,
  onDateChange,
  onGapClick
}) => {
  const [selectedView, setSelectedView] = useState<'heatmap' | 'trends' | 'risks'>('heatmap')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(selectedDate, { weekStartsOn: 1 }))

  // Generate week dates
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalSlots = data.coverageStatus.length
    const fullyCovered = data.coverageStatus.filter(c => c.coverage >= 100).length
    const partiallyCovered = data.coverageStatus.filter(c => c.coverage >= 90 && c.coverage < 100).length
    const criticalGaps = data.coverageStatus.filter(c => c.coverage < 90).length
    
    const averageCoverage = totalSlots > 0 
      ? data.coverageStatus.reduce((sum, c) => sum + c.coverage, 0) / totalSlots 
      : 0

    const criticalGapsList = data.gaps.filter(g => g.criticality === 'critical' || g.criticality === 'high')
    
    return {
      totalSlots,
      fullyCovered,
      partiallyCovered,
      criticalGaps,
      averageCoverage,
      totalGaps: data.gaps.length,
      criticalGapCount: criticalGapsList.length
    }
  }, [data.coverageStatus, data.gaps])

  const handlePreviousWeek = () => {
    const newWeekStart = addDays(weekStart, -7)
    setWeekStart(newWeekStart)
    onDateChange(newWeekStart)
  }

  const handleNextWeek = () => {
    const newWeekStart = addDays(weekStart, 7)
    setWeekStart(newWeekStart)
    onDateChange(newWeekStart)
  }

  const getCoverageForSlot = (stationId: string, shiftId: string, date: Date) => {
    const key = `${stationId}-${shiftId}-${format(date, 'yyyy-MM-dd')}`
    return data.coverageStatus.find(c => `${c.stationId}-${c.shiftId}` === key)
  }

  return (
    <div className="coverage-dashboard">
      <div className="dashboard-header">
        <div className="header-controls">
          <div className="week-navigation">
            <button className="btn btn-secondary" onClick={handlePreviousWeek}>
              ← Previous Week
            </button>
            <h2 className="week-title">
              Coverage Dashboard - Week of {format(weekStart, 'MMM d, yyyy')}
            </h2>
            <button className="btn btn-secondary" onClick={handleNextWeek}>
              Next Week →
            </button>
          </div>

          <div className="view-selector">
            <button 
              className={`btn ${selectedView === 'heatmap' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedView('heatmap')}
            >
              Heatmap
            </button>
            <button 
              className={`btn ${selectedView === 'trends' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedView('trends')}
            >
              Trends
            </button>
            <button 
              className={`btn ${selectedView === 'risks' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedView('risks')}
            >
              Risk Analysis
            </button>
          </div>
        </div>

        <div className="summary-stats">
          <div className="stat-card">
            <div className="stat-value">{summaryStats.averageCoverage.toFixed(1)}%</div>
            <div className="stat-label">Average Coverage</div>
          </div>
          <div className="stat-card success">
            <div className="stat-value">{summaryStats.fullyCovered}</div>
            <div className="stat-label">Fully Covered</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-value">{summaryStats.partiallyCovered}</div>
            <div className="stat-label">Partial Coverage</div>
          </div>
          <div className="stat-card danger">
            <div className="stat-value">{summaryStats.criticalGaps}</div>
            <div className="stat-label">Critical Gaps</div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="main-view">
          {selectedView === 'heatmap' && (
            <CoverageHeatmap
              stations={data.stations}
              shifts={data.shifts}
              weekDates={weekDates}
              getCoverageForSlot={getCoverageForSlot}
            />
          )}
          
          {selectedView === 'trends' && (
            <CoverageTrends
              historicalData={data.historicalCoverage || []}
              currentWeekStart={weekStart}
            />
          )}
          
          {selectedView === 'risks' && (
            <RiskIndicators
              gaps={data.gaps}
              coverageStatus={data.coverageStatus}
              stations={data.stations}
              shifts={data.shifts}
            />
          )}
        </div>

        <div className="sidebar">
          <GapList
            gaps={data.gaps}
            stations={data.stations}
            shifts={data.shifts}
            onGapClick={onGapClick}
          />
        </div>
      </div>
    </div>
  )
}
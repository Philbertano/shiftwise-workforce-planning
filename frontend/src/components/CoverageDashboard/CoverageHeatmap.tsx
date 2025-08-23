import React from 'react'
import { format } from 'date-fns'
import { Station, ShiftTemplate, CoverageStatus } from '../../types'

interface CoverageHeatmapProps {
  stations: Station[]
  shifts: ShiftTemplate[]
  weekDates: Date[]
  getCoverageForSlot: (stationId: string, shiftId: string, date: Date) => CoverageStatus | undefined
}

export const CoverageHeatmap: React.FC<CoverageHeatmapProps> = ({
  stations,
  shifts,
  weekDates,
  getCoverageForSlot
}) => {
  const getCoverageClass = (coverage?: CoverageStatus) => {
    if (!coverage) return 'coverage-unknown'
    
    if (coverage.coverage >= 100) return 'coverage-full'
    if (coverage.coverage >= 90) return 'coverage-partial'
    return 'coverage-critical'
  }

  const getCoverageText = (coverage?: CoverageStatus) => {
    if (!coverage) return 'N/A'
    return `${coverage.assigned}/${coverage.required}`
  }

  const getCoveragePercentage = (coverage?: CoverageStatus) => {
    if (!coverage) return 'N/A'
    return `${coverage.coverage.toFixed(0)}%`
  }

  return (
    <div className="coverage-heatmap">
      <div className="heatmap-header">
        <h3>Coverage Heatmap</h3>
        <div className="legend">
          <div className="legend-item">
            <div className="legend-color coverage-full"></div>
            <span>Full Coverage (≥100%)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color coverage-partial"></div>
            <span>Partial Coverage (90-99%)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color coverage-critical"></div>
            <span>Critical Gap (&lt;90%)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color coverage-unknown"></div>
            <span>No Data</span>
          </div>
        </div>
      </div>

      <div className="heatmap-grid">
        {/* Header row with dates */}
        <div className="grid-header">
          <div className="station-header">Station</div>
          <div className="shift-header">Shift</div>
          {weekDates.map(date => (
            <div key={date.toISOString()} className="date-header">
              <div className="date-day">{format(date, 'EEE')}</div>
              <div className="date-number">{format(date, 'd')}</div>
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {stations.map(station => (
          <div key={station.id} className="station-group">
            {shifts.map((shift, shiftIndex) => (
              <div key={`${station.id}-${shift.id}`} className="grid-row">
                {shiftIndex === 0 && (
                  <div className="station-cell" style={{ gridRowEnd: `span ${shifts.length}` }}>
                    <div className="station-name">{station.name}</div>
                    <div className="station-line">{station.line}</div>
                    <div className="station-priority priority-{station.priority}">
                      {station.priority.toUpperCase()}
                    </div>
                  </div>
                )}
                
                <div className="shift-cell">
                  <div className="shift-name">{shift.name}</div>
                  <div className="shift-time">
                    {shift.startTime} - {shift.endTime}
                  </div>
                </div>

                {weekDates.map(date => {
                  const coverage = getCoverageForSlot(station.id, shift.id, date)
                  const coverageClass = getCoverageClass(coverage)

                  return (
                    <div
                      key={`${station.id}-${shift.id}-${date.toISOString()}`}
                      className={`heatmap-cell ${coverageClass}`}
                      title={`${station.name} - ${shift.name} - ${format(date, 'MMM d')}: ${getCoveragePercentage(coverage)}`}
                    >
                      <div className="coverage-ratio">
                        {getCoverageText(coverage)}
                      </div>
                      <div className="coverage-percentage">
                        {getCoveragePercentage(coverage)}
                      </div>
                      {coverage && coverage.gaps.length > 0 && (
                        <div className="gap-indicator">
                          {coverage.gaps.length} gap{coverage.gaps.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
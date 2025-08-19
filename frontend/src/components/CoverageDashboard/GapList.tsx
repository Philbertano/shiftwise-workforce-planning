import React, { useState, useMemo } from 'react'
import { Gap, Station, ShiftTemplate, Priority } from '../../types'

interface GapListProps {
  gaps: Gap[]
  stations: Station[]
  shifts: ShiftTemplate[]
  onGapClick?: (gap: Gap) => void
}

export const GapList: React.FC<GapListProps> = ({
  gaps,
  stations,
  shifts,
  onGapClick
}) => {
  const [sortBy, setSortBy] = useState<'criticality' | 'count' | 'station'>('criticality')
  const [filterCriticality, setFilterCriticality] = useState<Priority | ''>('')

  const getStationName = (stationId: string) => {
    return stations.find(s => s.id === stationId)?.name || 'Unknown Station'
  }

  const getShiftName = (shiftId: string) => {
    return shifts.find(s => s.id === shiftId)?.name || 'Unknown Shift'
  }

  const getCriticalityOrder = (criticality: Priority) => {
    const order = { critical: 4, high: 3, medium: 2, low: 1 }
    return order[criticality] || 0
  }

  const sortedAndFilteredGaps = useMemo(() => {
    let filtered = gaps
    
    if (filterCriticality) {
      filtered = gaps.filter(gap => gap.criticality === filterCriticality)
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'criticality':
          return getCriticalityOrder(b.criticality) - getCriticalityOrder(a.criticality)
        case 'count':
          return b.count - a.count
        case 'station':
          return getStationName(a.stationId).localeCompare(getStationName(b.stationId))
        default:
          return 0
      }
    })
  }, [gaps, sortBy, filterCriticality])

  const gapCounts = useMemo(() => {
    return gaps.reduce((counts, gap) => {
      counts[gap.criticality] = (counts[gap.criticality] || 0) + 1
      return counts
    }, {} as Record<Priority, number>)
  }, [gaps])

  const getCriticalityClass = (criticality: Priority) => {
    return `criticality-${criticality}`
  }

  const getCriticalityIcon = (criticality: Priority) => {
    switch (criticality) {
      case 'critical': return '🚨'
      case 'high': return '⚠️'
      case 'medium': return '⚡'
      case 'low': return 'ℹ️'
      default: return '❓'
    }
  }

  return (
    <div className="gap-list">
      <div className="gap-list-header">
        <h3>Coverage Gaps ({gaps.length})</h3>
        
        <div className="gap-summary">
          {Object.entries(gapCounts).map(([criticality, count]) => (
            <div key={criticality} className={`summary-item ${getCriticalityClass(criticality as Priority)}`}>
              <span className="criticality-icon">{getCriticalityIcon(criticality as Priority)}</span>
              <span className="criticality-label">{criticality}</span>
              <span className="criticality-count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="gap-controls">
        <div className="sort-controls">
          <label>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'criticality' | 'count' | 'station')}
            className="sort-select"
          >
            <option value="criticality">Criticality</option>
            <option value="count">Gap Count</option>
            <option value="station">Station</option>
          </select>
        </div>

        <div className="filter-controls">
          <label>Filter:</label>
          <select
            value={filterCriticality}
            onChange={(e) => setFilterCriticality(e.target.value as Priority | '')}
            className="filter-select"
          >
            <option value="">All Criticalities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="gap-items">
        {sortedAndFilteredGaps.length === 0 ? (
          <div className="no-gaps">
            <div className="success-icon">✅</div>
            <p>No coverage gaps found</p>
          </div>
        ) : (
          sortedAndFilteredGaps.map((gap, index) => (
            <div
              key={`${gap.id}-${index}`}
              className={`gap-item ${getCriticalityClass(gap.criticality)}`}
              onClick={() => onGapClick?.(gap)}
            >
              <div className="gap-header">
                <span className="criticality-icon">{getCriticalityIcon(gap.criticality)}</span>
                <div className="gap-title">
                  <div className="station-name">{getStationName(gap.stationId)}</div>
                  <div className="shift-name">{getShiftName(gap.shiftId)}</div>
                </div>
                <div className="gap-count">
                  {gap.count} position{gap.count !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="gap-details">
                <div className="gap-skill">
                  Skill Required: {gap.skillId}
                </div>
                <div className="gap-impact">
                  Impact: {gap.impact}
                </div>
              </div>

              <div className="gap-criticality">
                <span className={`criticality-badge ${getCriticalityClass(gap.criticality)}`}>
                  {gap.criticality.toUpperCase()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {gaps.length > 0 && (
        <div className="gap-list-footer">
          <div className="total-impact">
            Total positions needed: {gaps.reduce((sum, gap) => sum + gap.count, 0)}
          </div>
        </div>
      )}
    </div>
  )
}
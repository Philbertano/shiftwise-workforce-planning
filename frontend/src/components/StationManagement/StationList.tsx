import React, { useState, useEffect } from 'react'
import { Station, Skill, Assignment, ProductionLine } from '../../types'
import { usePlanning } from '../../contexts/PlanningContext'
import { productionLineService } from '../../services/productionLineService'

interface StationListProps {
  stations: Station[]
  skills: Skill[]
  onEdit: (station: Station) => void
  onDelete: (stationId: string) => void
}

interface StationStaffingInfo {
  stationId: string
  currentStaffing: number
  requiredStaffing: number
  status: 'understaffed' | 'optimal' | 'overstaffed'
  assignments: Assignment[]
}

export const StationList: React.FC<StationListProps> = ({
  stations,
  skills,
  onEdit,
  onDelete
}) => {
  const { state } = usePlanning()
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const [staffingInfo, setStaffingInfo] = useState<StationStaffingInfo[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'dashboard'>('grid')

  useEffect(() => {
    loadProductionLines()
  }, [])

  useEffect(() => {
    calculateStaffingInfo()
  }, [stations, state.data.assignments, state.selectedDate])

  const loadProductionLines = async () => {
    try {
      const lines = await productionLineService.getProductionLines()
      setProductionLines(lines)
    } catch (error) {
      console.error('Failed to load production lines:', error)
    }
  }

  const calculateStaffingInfo = () => {
    const today = new Date(state.selectedDate)
    const todayStr = today.toDateString()

    const staffingData = stations.map(station => {
      // Get assignments for this station for the selected date
      const stationAssignments = state.data.assignments.filter(assignment => {
        const assignmentDate = new Date(assignment.demandId) // This would need proper date handling
        return assignment.demandId.includes(station.id) // Simplified logic
      })

      const currentStaffing = stationAssignments.length
      const requiredStaffing = station.capacity || 1
      
      let status: 'understaffed' | 'optimal' | 'overstaffed'
      if (currentStaffing < requiredStaffing) {
        status = 'understaffed'
      } else if (currentStaffing > requiredStaffing) {
        status = 'overstaffed'
      } else {
        status = 'optimal'
      }

      return {
        stationId: station.id,
        currentStaffing,
        requiredStaffing,
        status,
        assignments: stationAssignments
      }
    })

    setStaffingInfo(staffingData)
  }

  const getSkillName = (skillId: string) => {
    const skill = skills.find(s => s.id === skillId)
    return skill ? skill.name : 'Unknown Skill'
  }

  const getProductionLineName = (productionLineId?: string) => {
    if (!productionLineId) return 'Unassigned'
    const line = productionLines.find(l => l.id === productionLineId)
    return line ? line.name : 'Unknown Line'
  }

  const getStaffingInfo = (stationId: string) => {
    return staffingInfo.find(info => info.stationId === stationId) || {
      stationId,
      currentStaffing: 0,
      requiredStaffing: 1,
      status: 'understaffed' as const,
      assignments: []
    }
  }

  if (stations.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">🏭</div>
        <h3>No Production Lines</h3>
        <p>Get started by adding your first automotive production line.</p>
      </div>
    )
  }

  const renderGridView = () => (
    <div className="station-grid">
      {stations.map(station => {
        const staffing = getStaffingInfo(station.id)
        return (
          <div key={station.id} className="station-card">
            <div className="station-card__header">
              <div className="station-card__title">
                <h3>{station.name}</h3>
                {station.line && <span className="station-code">{station.line}</span>}
              </div>
              <div className="station-card__status">
                <span className={`status-badge ${station.active ? 'status-active' : 'status-inactive'}`}>
                  {station.active ? 'Active' : 'Inactive'}
                </span>
                <span className={`staffing-badge staffing-${staffing.status}`}>
                  {staffing.currentStaffing}/{staffing.requiredStaffing}
                </span>
              </div>
            </div>

            {station.description && (
              <p className="station-card__description">{station.description}</p>
            )}

            <div className="station-card__details">
              <div className="detail-item">
                <span className="detail-label">Production Line:</span>
                <span className="detail-value">{getProductionLineName(station.productionLineId)}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Current Staffing:</span>
                <span className={`detail-value staffing-${staffing.status}`}>
                  {staffing.currentStaffing} / {staffing.requiredStaffing} workers
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Priority:</span>
                <span className={`detail-value priority-${station.priority}`}>
                  {station.priority.charAt(0).toUpperCase() + station.priority.slice(1)}
                </span>
              </div>

              {station.requiredSkills && station.requiredSkills.length > 0 && (
                <div className="detail-item">
                  <span className="detail-label">Required Skills:</span>
                  <div className="skills-tags">
                    {station.requiredSkills.map((skill, index) => (
                      <span key={index} className="skill-tag">
                        {getSkillName(skill.skillId)} 
                        <span className="skill-details">
                          (L{skill.minLevel}, {skill.count}x)
                          {skill.mandatory && <span className="mandatory">*</span>}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="station-card__actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onEdit(station)}
              >
                <span className="btn-icon">✏️</span>
                Edit
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => onDelete(station.id)}
              >
                <span className="btn-icon">🗑️</span>
                Delete
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderDashboardView = () => (
    <div className="station-dashboard">
      <div className="dashboard-summary">
        <div className="summary-card">
          <h4>Total Stations</h4>
          <span className="summary-value">{stations.length}</span>
        </div>
        <div className="summary-card">
          <h4>Active Stations</h4>
          <span className="summary-value">{stations.filter(s => s.active).length}</span>
        </div>
        <div className="summary-card">
          <h4>Understaffed</h4>
          <span className="summary-value critical">
            {staffingInfo.filter(s => s.status === 'understaffed').length}
          </span>
        </div>
        <div className="summary-card">
          <h4>Optimal Staffing</h4>
          <span className="summary-value success">
            {staffingInfo.filter(s => s.status === 'optimal').length}
          </span>
        </div>
      </div>

      <div className="dashboard-table">
        <table className="station-table">
          <thead>
            <tr>
              <th>Station</th>
              <th>Production Line</th>
              <th>Status</th>
              <th>Staffing</th>
              <th>Priority</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stations.map(station => {
              const staffing = getStaffingInfo(station.id)
              return (
                <tr key={station.id} className={`station-row ${!station.active ? 'inactive' : ''}`}>
                  <td>
                    <div className="station-info">
                      <strong>{station.name}</strong>
                      {station.line && <span className="station-code">{station.line}</span>}
                    </div>
                  </td>
                  <td>{getProductionLineName(station.productionLineId)}</td>
                  <td>
                    <span className={`status-badge ${station.active ? 'status-active' : 'status-inactive'}`}>
                      {station.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="staffing-info">
                      <span className={`staffing-count staffing-${staffing.status}`}>
                        {staffing.currentStaffing}/{staffing.requiredStaffing}
                      </span>
                      <span className={`staffing-status staffing-${staffing.status}`}>
                        {staffing.status}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`priority-badge priority-${station.priority}`}>
                      {station.priority}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onEdit(station)}
                        title="Edit Station"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => onDelete(station.id)}
                        title="Delete Station"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="station-list">
      <div className="station-list__controls">
        <div className="view-toggle">
          <button
            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('grid')}
          >
            <span className="btn-icon">⊞</span>
            Grid View
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('dashboard')}
          >
            <span className="btn-icon">📊</span>
            Dashboard View
          </button>
        </div>
        <div className="date-info">
          <span>Staffing data for: {state.selectedDate.toLocaleDateString()}</span>
        </div>
      </div>

      {viewMode === 'grid' ? renderGridView() : renderDashboardView()}
    </div>
  )
}
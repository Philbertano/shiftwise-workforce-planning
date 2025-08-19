import React, { useState, useEffect, useMemo } from 'react'
import { Employee, Skill, EmployeeSkill, Station } from '../../types'
import './QualificationMatrix.css'

interface QualificationMatrixProps {
  employees: Employee[]
  skills: Skill[]
  employeeSkills: EmployeeSkill[]
  stations?: Station[]
  onSkillUpdate: (employeeSkill: EmployeeSkill) => void
  onBulkUpdate: (updates: EmployeeSkill[]) => void
}

interface FilterState {
  station: string
  skill: string
  expirationStatus: 'all' | 'expiring' | 'expired'
  employeeSearch: string
}

interface QualificationCell {
  employeeId: string
  skillId: string
  level: number
  validUntil?: Date
  certificationId?: string
  isExpiring: boolean
  isExpired: boolean
}

export const QualificationMatrix: React.FC<QualificationMatrixProps> = ({
  employees,
  skills,
  employeeSkills,
  stations = [],
  onSkillUpdate,
  onBulkUpdate
}) => {
  const [filters, setFilters] = useState<FilterState>({
    station: '',
    skill: '',
    expirationStatus: 'all',
    employeeSearch: ''
  })
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [bulkEditMode, setBulkEditMode] = useState(false)
  const [bulkEditLevel, setBulkEditLevel] = useState<number>(1)

  // Create qualification matrix data
  const qualificationMatrix = useMemo(() => {
    const matrix: QualificationCell[][] = []
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    employees.forEach((employee, empIndex) => {
      const row: QualificationCell[] = []
      
      skills.forEach(skill => {
        const employeeSkill = employeeSkills.find(
          es => es.employeeId === employee.id && es.skillId === skill.id
        )
        
        const validUntil = employeeSkill?.validUntil
        const isExpiring = validUntil ? validUntil <= thirtyDaysFromNow && validUntil > now : false
        const isExpired = validUntil ? validUntil <= now : false
        
        row.push({
          employeeId: employee.id,
          skillId: skill.id,
          level: employeeSkill?.level || 0,
          validUntil: employeeSkill?.validUntil,
          certificationId: employeeSkill?.certificationId,
          isExpiring,
          isExpired
        })
      })
      
      matrix.push(row)
    })

    return matrix
  }, [employees, skills, employeeSkills])

  // Filter employees and skills based on current filters
  const filteredData = useMemo(() => {
    let filteredEmployees = [...employees]
    let filteredSkills = [...skills]

    // Filter employees by search term
    if (filters.employeeSearch) {
      filteredEmployees = filteredEmployees.filter(emp => 
        emp.name.toLowerCase().includes(filters.employeeSearch.toLowerCase())
      )
    }

    // Filter by station if selected
    if (filters.station) {
      const station = stations.find(s => s.id === filters.station)
      if (station) {
        const requiredSkillIds = station.requiredSkills.map(rs => rs.skillId)
        filteredSkills = skills.filter(skill => requiredSkillIds.includes(skill.id))
      }
    }

    // Filter by specific skill if selected
    if (filters.skill) {
      filteredSkills = skills.filter(skill => skill.id === filters.skill)
    }

    // Filter by expiration status
    if (filters.expirationStatus !== 'all') {
      filteredEmployees = filteredEmployees.filter(employee => {
        const employeeRow = qualificationMatrix.find(row => row[0]?.employeeId === employee.id)
        if (!employeeRow) return false
        
        return filteredSkills.some(skill => {
          const cell = employeeRow.find(cell => cell.skillId === skill.id)
          if (!cell || cell.level === 0) return false
          
          switch (filters.expirationStatus) {
            case 'expiring':
              return cell.isExpiring
            case 'expired':
              return cell.isExpired
            default:
              return true
          }
        })
      })
    }

    return { filteredEmployees, filteredSkills }
  }, [employees, skills, filters, stations, qualificationMatrix])

  const handleCellClick = (employeeId: string, skillId: string, currentLevel: number) => {
    if (bulkEditMode) {
      const cellKey = `${employeeId}-${skillId}`
      const newSelected = new Set(selectedCells)
      
      if (newSelected.has(cellKey)) {
        newSelected.delete(cellKey)
      } else {
        newSelected.add(cellKey)
      }
      
      setSelectedCells(newSelected)
    } else {
      // Single cell edit - cycle through levels 0-3
      const newLevel = currentLevel >= 3 ? 0 : currentLevel + 1
      const existingSkill = employeeSkills.find(
        es => es.employeeId === employeeId && es.skillId === skillId
      )
      
      const updatedSkill: EmployeeSkill = {
        employeeId,
        skillId,
        level: newLevel,
        validUntil: existingSkill?.validUntil,
        certificationId: existingSkill?.certificationId
      }
      
      onSkillUpdate(updatedSkill)
    }
  }

  const handleBulkUpdate = () => {
    const updates: EmployeeSkill[] = []
    
    selectedCells.forEach(cellKey => {
      const [employeeId, skillId] = cellKey.split('-')
      const existingSkill = employeeSkills.find(
        es => es.employeeId === employeeId && es.skillId === skillId
      )
      
      updates.push({
        employeeId,
        skillId,
        level: bulkEditLevel,
        validUntil: existingSkill?.validUntil,
        certificationId: existingSkill?.certificationId
      })
    })
    
    onBulkUpdate(updates)
    setSelectedCells(new Set())
    setBulkEditMode(false)
  }

  const getCellClassName = (cell: QualificationCell) => {
    const classes = ['qualification-cell']
    
    if (cell.level === 0) {
      classes.push('level-0')
    } else {
      classes.push(`level-${cell.level}`)
    }
    
    if (cell.isExpired) {
      classes.push('expired')
    } else if (cell.isExpiring) {
      classes.push('expiring')
    }
    
    if (bulkEditMode && selectedCells.has(`${cell.employeeId}-${cell.skillId}`)) {
      classes.push('selected')
    }
    
    return classes.join(' ')
  }

  const formatExpiryDate = (date?: Date) => {
    if (!date) return ''
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  return (
    <div className="qualification-matrix">
      <div className="matrix-header">
        <h2>Qualification Matrix</h2>
        
        <div className="matrix-filters">
          <div className="filter-group">
            <label htmlFor="employee-search">Employee:</label>
            <input
              id="employee-search"
              type="text"
              placeholder="Search employees..."
              value={filters.employeeSearch}
              onChange={(e) => setFilters(prev => ({ ...prev, employeeSearch: e.target.value }))}
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="station-filter">Station:</label>
            <select
              id="station-filter"
              value={filters.station}
              onChange={(e) => setFilters(prev => ({ ...prev, station: e.target.value }))}
            >
              <option value="">All Stations</option>
              {stations.map(station => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="skill-filter">Skill:</label>
            <select
              id="skill-filter"
              value={filters.skill}
              onChange={(e) => setFilters(prev => ({ ...prev, skill: e.target.value }))}
            >
              <option value="">All Skills</option>
              {skills.map(skill => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="expiration-filter">Expiration:</label>
            <select
              id="expiration-filter"
              value={filters.expirationStatus}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                expirationStatus: e.target.value as FilterState['expirationStatus']
              }))}
            >
              <option value="all">All</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
        
        <div className="matrix-actions">
          <button
            className={`bulk-edit-toggle ${bulkEditMode ? 'active' : ''}`}
            onClick={() => {
              setBulkEditMode(!bulkEditMode)
              setSelectedCells(new Set())
            }}
          >
            {bulkEditMode ? 'Cancel Bulk Edit' : 'Bulk Edit'}
          </button>
          
          {bulkEditMode && (
            <div className="bulk-edit-controls">
              <select
                value={bulkEditLevel}
                onChange={(e) => setBulkEditLevel(Number(e.target.value))}
              >
                <option value={0}>No Skill</option>
                <option value={1}>Level 1</option>
                <option value={2}>Level 2</option>
                <option value={3}>Level 3</option>
              </select>
              <button
                onClick={handleBulkUpdate}
                disabled={selectedCells.size === 0}
              >
                Update Selected ({selectedCells.size})
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="matrix-legend">
        <div className="legend-item">
          <span className="legend-color level-0"></span>
          <span>No Skill</span>
        </div>
        <div className="legend-item">
          <span className="legend-color level-1"></span>
          <span>Level 1</span>
        </div>
        <div className="legend-item">
          <span className="legend-color level-2"></span>
          <span>Level 2</span>
        </div>
        <div className="legend-item">
          <span className="legend-color level-3"></span>
          <span>Level 3</span>
        </div>
        <div className="legend-item">
          <span className="legend-color expiring"></span>
          <span>Expiring Soon</span>
        </div>
        <div className="legend-item">
          <span className="legend-color expired"></span>
          <span>Expired</span>
        </div>
      </div>
      
      <div className="matrix-container">
        <table className="qualification-table">
          <thead>
            <tr>
              <th className="employee-header">Employee</th>
              {filteredData.filteredSkills.map(skill => (
                <th key={skill.id} className="skill-header">
                  <div className="skill-name">{skill.name}</div>
                  <div className="skill-category">{skill.category}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.filteredEmployees.map(employee => {
              const employeeRow = qualificationMatrix.find(
                row => row[0]?.employeeId === employee.id
              )
              
              return (
                <tr key={employee.id}>
                  <td className="employee-cell">
                    <div className="employee-name">{employee.name}</div>
                    <div className="employee-team">{employee.team}</div>
                  </td>
                  {filteredData.filteredSkills.map(skill => {
                    const cell = employeeRow?.find(c => c.skillId === skill.id)
                    if (!cell) return <td key={skill.id} className="qualification-cell level-0"></td>
                    
                    return (
                      <td
                        key={skill.id}
                        className={getCellClassName(cell)}
                        onClick={() => handleCellClick(cell.employeeId, cell.skillId, cell.level)}
                        title={`Level ${cell.level}${cell.validUntil ? ` - Expires: ${formatExpiryDate(cell.validUntil)}` : ''}`}
                      >
                        <div className="cell-content">
                          <span className="level-indicator">{cell.level || '-'}</span>
                          {cell.validUntil && (
                            <span className="expiry-date">
                              {formatExpiryDate(cell.validUntil)}
                            </span>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
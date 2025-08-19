import React, { useState, useMemo } from 'react'
import { useDrag } from 'react-dnd'
import { Employee } from '../../types'

interface EmployeePanelProps {
  employees: Employee[]
}

interface DraggableEmployeeProps {
  employee: Employee
}

const DraggableEmployee: React.FC<DraggableEmployeeProps> = ({ employee }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'employee',
    item: {
      type: 'employee',
      id: employee.id
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })

  const employeeClasses = [
    'employee-item',
    employee.active ? 'active' : 'inactive',
    isDragging ? 'dragging' : ''
  ].filter(Boolean).join(' ')

  return (
    <div ref={drag} className={employeeClasses}>
      <div className="employee-header">
        <span className="employee-name">{employee.name}</span>
        <span className="employee-status">
          {employee.active ? '●' : '○'}
        </span>
      </div>
      
      <div className="employee-details">
        <div className="employee-team">{employee.team}</div>
        <div className="employee-contract">{employee.contractType}</div>
        <div className="employee-hours">
          {employee.weeklyHours}h/week, max {employee.maxHoursPerDay}h/day
        </div>
      </div>
    </div>
  )
}

export const EmployeePanel: React.FC<EmployeePanelProps> = ({ employees }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTeam, setFilterTeam] = useState('')
  const [filterActive, setFilterActive] = useState<boolean | null>(null)

  const teams = useMemo(() => {
    const uniqueTeams = [...new Set(employees.map(e => e.team))]
    return uniqueTeams.sort()
  }, [employees])

  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesTeam = !filterTeam || employee.team === filterTeam
      const matchesActive = filterActive === null || employee.active === filterActive
      
      return matchesSearch && matchesTeam && matchesActive
    })
  }, [employees, searchTerm, filterTeam, filterActive])

  return (
    <div className="employee-panel">
      <div className="panel-header">
        <h3>Employees ({filteredEmployees.length})</h3>
      </div>

      <div className="employee-filters">
        <input
          type="text"
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="filter-select"
        >
          <option value="">All Teams</option>
          {teams.map(team => (
            <option key={team} value={team}>{team}</option>
          ))}
        </select>

        <select
          value={filterActive === null ? '' : filterActive.toString()}
          onChange={(e) => {
            const value = e.target.value
            setFilterActive(value === '' ? null : value === 'true')
          }}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div className="employee-list">
        {filteredEmployees.map(employee => (
          <DraggableEmployee key={employee.id} employee={employee} />
        ))}
      </div>

      <div className="panel-footer">
        <div className="drag-hint">
          💡 Drag employees to assign them to shifts
        </div>
      </div>
    </div>
  )
}
import React, { useState, useEffect } from 'react'
import { Employee, Skill, EmployeeSkill } from '../../types'
import { EmployeeForm } from './EmployeeForm'
import { EmployeeList } from './EmployeeList'
import { employeeService } from '../../services/employeeService'
import './EmployeeManagement.css'

interface EmployeeManagementProps {
  employees: Employee[]
  skills: Skill[]
  employeeSkills: EmployeeSkill[]
  onEmployeeCreate: (employee: Omit<Employee, 'id'>) => void
  onEmployeeUpdate: (employee: Employee) => void
  onEmployeeDelete: (employeeId: string) => void
  onEmployeeSkillUpdate: (employeeSkill: EmployeeSkill) => void
  onEmployeeSkillDelete: (employeeId: string, skillId: string) => void
}

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({
  employees,
  skills,
  employeeSkills,
  onEmployeeCreate,
  onEmployeeUpdate,
  onEmployeeDelete,
  onEmployeeSkillUpdate,
  onEmployeeSkillDelete
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTeam, setFilterTeam] = useState('')
  const [filterContractType, setFilterContractType] = useState('')
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>(employees)
  const [isSearching, setIsSearching] = useState(false)

  // Get unique teams for filtering
  const teams = Array.from(new Set(employees.map(emp => emp.team))).sort()

  // Update filtered employees when filters change
  useEffect(() => {
    const applyFilters = async () => {
      if (!searchTerm && !filterTeam && !filterContractType) {
        // No filters applied, show all employees
        setFilteredEmployees(employees)
        return
      }

      setIsSearching(true)
      try {
        // Use API search if search term is provided
        if (searchTerm) {
          const searchResults = await employeeService.searchEmployees(searchTerm, {
            team: filterTeam || undefined,
            contractType: filterContractType || undefined,
          })
          setFilteredEmployees(searchResults)
        } else {
          // Apply local filters
          const filtered = employees.filter(employee => {
            const matchesTeam = !filterTeam || employee.team === filterTeam
            const matchesContract = !filterContractType || employee.contractType === filterContractType
            return matchesTeam && matchesContract
          })
          setFilteredEmployees(filtered)
        }
      } catch (error) {
        console.error('Search failed:', error)
        // Fallback to local filtering
        const filtered = employees.filter(employee => {
          const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase())
          const matchesTeam = !filterTeam || employee.team === filterTeam
          const matchesContract = !filterContractType || employee.contractType === filterContractType
          return matchesSearch && matchesTeam && matchesContract
        })
        setFilteredEmployees(filtered)
      } finally {
        setIsSearching(false)
      }
    }

    // Debounce search
    const timeoutId = setTimeout(applyFilters, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, filterTeam, filterContractType, employees])

  const handleCreateEmployee = () => {
    setSelectedEmployee(null)
    setIsFormOpen(true)
  }

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee)
    setIsFormOpen(true)
  }

  const handleFormSubmit = (employeeData: Omit<Employee, 'id'>) => {
    if (selectedEmployee) {
      onEmployeeUpdate({ ...employeeData, id: selectedEmployee.id })
    } else {
      onEmployeeCreate(employeeData)
    }
    setIsFormOpen(false)
    setSelectedEmployee(null)
  }

  const handleFormCancel = () => {
    setIsFormOpen(false)
    setSelectedEmployee(null)
  }

  const handleDeleteEmployee = (employeeId: string) => {
    if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      onEmployeeDelete(employeeId)
    }
  }

  return (
    <div className="employee-management">
      <div className="management-header">
        <h2>Employee Management</h2>
        <button 
          className="create-button"
          onClick={handleCreateEmployee}
        >
          Add New Employee
        </button>
      </div>

      <div className="management-filters">
        <div className="filter-group">
          <label htmlFor="employee-search">Search:</label>
          <div className="search-input-container">
            <input
              id="employee-search"
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isSearching && <span className="search-spinner">🔍</span>}
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="team-filter">Team:</label>
          <select
            id="team-filter"
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
          >
            <option value="">All Teams</option>
            {teams.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="contract-filter">Contract Type:</label>
          <select
            id="contract-filter"
            value={filterContractType}
            onChange={(e) => setFilterContractType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="temporary">Temporary</option>
          </select>
        </div>
      </div>

      <EmployeeList
        employees={filteredEmployees}
        skills={skills}
        employeeSkills={employeeSkills}
        onEdit={handleEditEmployee}
        onDelete={handleDeleteEmployee}
        onSkillUpdate={onEmployeeSkillUpdate}
        onSkillDelete={onEmployeeSkillDelete}
      />

      {isFormOpen && (
        <EmployeeForm
          employee={selectedEmployee}
          skills={skills}
          employeeSkills={employeeSkills.filter(es => 
            selectedEmployee ? es.employeeId === selectedEmployee.id : false
          )}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          onSkillUpdate={onEmployeeSkillUpdate}
        />
      )}
    </div>
  )
}
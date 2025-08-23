import React, { useState, useEffect } from 'react'
import { EmployeeManagement } from '../components/EmployeeManagement/EmployeeManagement'
import { Employee, Skill, EmployeeSkill } from '../types'
import { employeeService } from '../services/employeeService'
import { skillService } from '../services/skillService'

export const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [employeeSkills, setEmployeeSkills] = useState<EmployeeSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load employees and skills in parallel
        const [employeesResponse, skillsData] = await Promise.all([
          employeeService.getEmployees({ limit: 1000 }),
          skillService.getSkills()
        ])

        setEmployees(employeesResponse.data)
        setSkills(skillsData)

        // Load employee skills for all employees
        const allEmployeeSkills: EmployeeSkill[] = []
        for (const employee of employeesResponse.data) {
          try {
            const employeeSkillsData = await employeeService.getEmployeeSkills(employee.id)
            employeeSkillsData.skills.forEach(skill => {
              allEmployeeSkills.push({
                employeeId: employee.id,
                skillId: skill.skillId,
                level: skill.level,
                validUntil: skill.validUntil,
                certificationId: skill.certificationId
              })
            })
          } catch (error) {
            console.warn(`Failed to load skills for employee ${employee.id}:`, error)
          }
        }

        setEmployeeSkills(allEmployeeSkills)
      } catch (error) {
        console.error('Failed to load data:', error)
        setError(error instanceof Error ? error.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleEmployeeCreate = async (employee: Omit<Employee, 'id'>) => {
    try {
      const employeeData = employeeService.convertFrontendEmployeeToApi(employee)
      const newEmployee = await employeeService.createEmployee(employeeData)
      setEmployees(prev => [...prev, newEmployee])
    } catch (error) {
      console.error('Failed to create employee:', error)
      alert('Failed to create employee. Please try again.')
    }
  }

  const handleEmployeeUpdate = async (employee: Employee) => {
    try {
      const { id, ...updateData } = employee
      const updatedEmployee = await employeeService.updateEmployee(id, updateData)
      setEmployees(prev => prev.map(emp => emp.id === employee.id ? updatedEmployee : emp))
    } catch (error) {
      console.error('Failed to update employee:', error)
      alert('Failed to update employee. Please try again.')
    }
  }

  const handleEmployeeDelete = async (employeeId: string) => {
    if (!window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      return
    }

    try {
      await employeeService.deleteEmployee(employeeId)
      setEmployees(prev => prev.filter(emp => emp.id !== employeeId))
      setEmployeeSkills(prev => prev.filter(skill => skill.employeeId !== employeeId))
    } catch (error) {
      console.error('Failed to delete employee:', error)
      alert('Failed to delete employee. Please try again.')
    }
  }

  const handleEmployeeSkillUpdate = async (employeeSkill: EmployeeSkill) => {
    try {
      const existing = employeeSkills.find(es => 
        es.employeeId === employeeSkill.employeeId && es.skillId === employeeSkill.skillId
      )

      if (employeeSkill.level === 0) {
        // Remove skill if level is 0
        if (existing) {
          await employeeService.removeEmployeeSkill(employeeSkill.employeeId, employeeSkill.skillId)
          setEmployeeSkills(prev => prev.filter(es => 
            !(es.employeeId === employeeSkill.employeeId && es.skillId === employeeSkill.skillId)
          ))
        }
        return
      }

      if (existing) {
        // Update existing skill
        await employeeService.updateEmployeeSkill(
          employeeSkill.employeeId, 
          employeeSkill.skillId, 
          {
            level: employeeSkill.level,
            validUntil: employeeSkill.validUntil?.toISOString(),
            certificationId: employeeSkill.certificationId
          }
        )
        setEmployeeSkills(prev => prev.map(es => 
          es.employeeId === employeeSkill.employeeId && es.skillId === employeeSkill.skillId 
            ? employeeSkill 
            : es
        ))
      } else {
        // Add new skill
        await employeeService.addEmployeeSkill(employeeSkill.employeeId, {
          skillId: employeeSkill.skillId,
          level: employeeSkill.level,
          validUntil: employeeSkill.validUntil?.toISOString(),
          certificationId: employeeSkill.certificationId
        })
        setEmployeeSkills(prev => [...prev, employeeSkill])
      }
    } catch (error) {
      console.error('Failed to update employee skill:', error)
      alert('Failed to update employee skill. Please try again.')
    }
  }

  const handleEmployeeSkillDelete = async (employeeId: string, skillId: string) => {
    try {
      await employeeService.removeEmployeeSkill(employeeId, skillId)
      setEmployeeSkills(prev => prev.filter(es => 
        !(es.employeeId === employeeId && es.skillId === skillId)
      ))
    } catch (error) {
      console.error('Failed to remove employee skill:', error)
      alert('Failed to remove employee skill. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Employee Management</h1>
          <p>Loading employee data...</p>
        </div>
        <div className="page-content">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Employee Management</h1>
          <p>Error loading employee data</p>
        </div>
        <div className="page-content">
          <div className="error-message">
            <p>Failed to load employee data: {error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Employee Management</h1>
        <p>Manage employee information, contracts, and availability</p>
      </div>
      <div className="page-content">
        <EmployeeManagement 
          employees={employees}
          skills={skills}
          employeeSkills={employeeSkills}
          onEmployeeCreate={handleEmployeeCreate}
          onEmployeeUpdate={handleEmployeeUpdate}
          onEmployeeDelete={handleEmployeeDelete}
          onEmployeeSkillUpdate={handleEmployeeSkillUpdate}
          onEmployeeSkillDelete={handleEmployeeSkillDelete}
        />
      </div>
    </div>
  )
}
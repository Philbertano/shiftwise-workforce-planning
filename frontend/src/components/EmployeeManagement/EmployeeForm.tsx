import React, { useState, useEffect } from 'react'
import { Employee, Skill, EmployeeSkill, ContractType } from '../../types'

interface EmployeeFormProps {
  employee: Employee | null
  skills: Skill[]
  employeeSkills: EmployeeSkill[]
  onSubmit: (employee: Omit<Employee, 'id'>) => void
  onCancel: () => void
  onSkillUpdate: (employeeSkill: EmployeeSkill) => void
}

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
  employee,
  skills,
  employeeSkills,
  onSubmit,
  onCancel,
  onSkillUpdate
}) => {
  const [formData, setFormData] = useState({
    name: '',
    contractType: 'full-time' as ContractType,
    weeklyHours: 40,
    maxHoursPerDay: 8,
    minRestHours: 11,
    team: '',
    active: true
  })

  const [skillAssignments, setSkillAssignments] = useState<Map<string, { level: number; validUntil?: Date; certificationId?: string }>>(new Map())

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name,
        contractType: employee.contractType,
        weeklyHours: employee.weeklyHours,
        maxHoursPerDay: employee.maxHoursPerDay,
        minRestHours: employee.minRestHours,
        team: employee.team,
        active: employee.active
      })

      // Initialize skill assignments
      const skillMap = new Map()
      employeeSkills.forEach(es => {
        skillMap.set(es.skillId, {
          level: es.level,
          validUntil: es.validUntil,
          certificationId: es.certificationId
        })
      })
      setSkillAssignments(skillMap)
    }
  }, [employee, employeeSkills])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : 
              type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              value
    }))
  }

  const handleSkillChange = (skillId: string, field: 'level' | 'validUntil' | 'certificationId', value: any) => {
    setSkillAssignments(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(skillId) || { level: 0 }
      
      if (field === 'validUntil') {
        value = value ? new Date(value) : undefined
      }
      
      newMap.set(skillId, { ...current, [field]: value })
      return newMap
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Submit employee data
    onSubmit(formData)
    
    // Submit skill assignments if editing existing employee
    if (employee) {
      skillAssignments.forEach((assignment, skillId) => {
        if (assignment.level > 0) {
          onSkillUpdate({
            employeeId: employee.id,
            skillId,
            level: assignment.level,
            validUntil: assignment.validUntil,
            certificationId: assignment.certificationId
          })
        }
      })
    }
  }

  const formatDateForInput = (date?: Date) => {
    if (!date) return ''
    return date.toISOString().split('T')[0]
  }

  return (
    <div className="modal-overlay">
      <div className="employee-form-modal">
        <div className="form-header">
          <h3>{employee ? 'Edit Employee' : 'Add New Employee'}</h3>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="employee-form">
          <div className="form-section">
            <h4>Basic Information</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="team">Team *</label>
                <input
                  id="team"
                  name="team"
                  type="text"
                  value={formData.team}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contractType">Contract Type</label>
                <select
                  id="contractType"
                  name="contractType"
                  value={formData.contractType}
                  onChange={handleInputChange}
                >
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="temporary">Temporary</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="active">Status</label>
                <label className="checkbox-label">
                  <input
                    id="active"
                    name="active"
                    type="checkbox"
                    checked={formData.active}
                    onChange={handleInputChange}
                  />
                  Active
                </label>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Work Schedule</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="weeklyHours">Weekly Hours</label>
                <input
                  id="weeklyHours"
                  name="weeklyHours"
                  type="number"
                  min="1"
                  max="60"
                  value={formData.weeklyHours}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxHoursPerDay">Max Hours Per Day</label>
                <input
                  id="maxHoursPerDay"
                  name="maxHoursPerDay"
                  type="number"
                  min="1"
                  max="24"
                  value={formData.maxHoursPerDay}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="minRestHours">Min Rest Hours</label>
                <input
                  id="minRestHours"
                  name="minRestHours"
                  type="number"
                  min="8"
                  max="24"
                  value={formData.minRestHours}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          {employee && (
            <div className="form-section">
              <h4>Skills & Qualifications</h4>
              
              <div className="skills-grid">
                {skills.map(skill => {
                  const assignment = skillAssignments.get(skill.id) || { level: 0 }
                  
                  return (
                    <div key={skill.id} className="skill-assignment">
                      <div className="skill-info">
                        <strong>{skill.name}</strong>
                        <span className="skill-category">({skill.category})</span>
                      </div>
                      
                      <div className="skill-controls">
                        <div className="form-group">
                          <label>Level</label>
                          <select
                            value={assignment.level}
                            onChange={(e) => handleSkillChange(skill.id, 'level', Number(e.target.value))}
                          >
                            <option value={0}>No Skill</option>
                            <option value={1}>Level 1</option>
                            <option value={2}>Level 2</option>
                            <option value={3}>Level 3</option>
                          </select>
                        </div>

                        {assignment.level > 0 && (
                          <>
                            <div className="form-group">
                              <label>Valid Until</label>
                              <input
                                type="date"
                                value={formatDateForInput(assignment.validUntil)}
                                onChange={(e) => handleSkillChange(skill.id, 'validUntil', e.target.value)}
                              />
                            </div>

                            <div className="form-group">
                              <label>Certification ID</label>
                              <input
                                type="text"
                                placeholder="Optional"
                                value={assignment.certificationId || ''}
                                onChange={(e) => handleSkillChange(skill.id, 'certificationId', e.target.value)}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="submit-button">
              {employee ? 'Update Employee' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
import React, { useState } from 'react'
import { Employee, Skill, EmployeeSkill } from '../../types'

interface EmployeeListProps {
  employees: Employee[]
  skills: Skill[]
  employeeSkills: EmployeeSkill[]
  onEdit: (employee: Employee) => void
  onDelete: (employeeId: string) => void
  onSkillUpdate: (employeeSkill: EmployeeSkill) => void
  onSkillDelete: (employeeId: string, skillId: string) => void
}

export const EmployeeList: React.FC<EmployeeListProps> = ({
  employees,
  skills,
  employeeSkills,
  onEdit,
  onDelete,
  onSkillUpdate,
  onSkillDelete
}) => {
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    employeeId: string;
    employeeName: string;
  } | null>(null)

  const getEmployeeSkills = (employeeId: string) => {
    return employeeSkills.filter(es => es.employeeId === employeeId)
  }

  const getSkillName = (skillId: string) => {
    return skills.find(s => s.id === skillId)?.name || 'Unknown Skill'
  }

  const formatDate = (date?: Date) => {
    if (!date) return 'No expiry'
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const isSkillExpiring = (validUntil?: Date) => {
    if (!validUntil) return false
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    return validUntil <= thirtyDaysFromNow && validUntil > now
  }

  const isSkillExpired = (validUntil?: Date) => {
    if (!validUntil) return false
    return validUntil <= new Date()
  }

  const toggleEmployeeExpansion = (employeeId: string) => {
    setExpandedEmployee(expandedEmployee === employeeId ? null : employeeId)
  }

  const handleQuickSkillUpdate = (employeeId: string, skillId: string, currentLevel: number) => {
    const newLevel = currentLevel >= 3 ? 0 : currentLevel + 1
    const existingSkill = employeeSkills.find(es => es.employeeId === employeeId && es.skillId === skillId)
    
    onSkillUpdate({
      employeeId,
      skillId,
      level: newLevel,
      validUntil: existingSkill?.validUntil,
      certificationId: existingSkill?.certificationId
    })
  }

  const handleDeleteClick = (employee: Employee) => {
    setDeleteConfirmation({
      employeeId: employee.id,
      employeeName: employee.name
    })
  }

  const handleConfirmDelete = () => {
    if (deleteConfirmation) {
      onDelete(deleteConfirmation.employeeId)
      setDeleteConfirmation(null)
    }
  }

  const handleCancelDelete = () => {
    setDeleteConfirmation(null)
  }

  return (
    <div className="employee-list">
      <div className="list-header">
        <h3>Employees ({employees.length})</h3>
      </div>

      <div className="employees-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Team</th>
              <th>Contract</th>
              <th>Hours/Week</th>
              <th>Status</th>
              <th>Skills</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(employee => {
              const empSkills = getEmployeeSkills(employee.id)
              const isExpanded = expandedEmployee === employee.id
              
              return (
                <React.Fragment key={employee.id}>
                  <tr className={`employee-row ${!employee.active ? 'inactive' : ''}`}>
                    <td>
                      <div className="employee-name">
                        {employee.name}
                        {empSkills.length > 0 && (
                          <button
                            className="expand-button"
                            onClick={() => toggleEmployeeExpansion(employee.id)}
                          >
                            {isExpanded ? '▼' : '▶'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td>{employee.team}</td>
                    <td>
                      <span className={`contract-type ${employee.contractType}`}>
                        {employee.contractType}
                      </span>
                    </td>
                    <td>{employee.weeklyHours}h</td>
                    <td>
                      <span className={`status ${employee.active ? 'active' : 'inactive'}`}>
                        {employee.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="skills-summary">
                        {empSkills.length > 0 ? (
                          <span className="skill-count">
                            {empSkills.length} skill{empSkills.length !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="no-skills">No skills assigned</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="edit-button"
                          onClick={() => onEdit(employee)}
                          title="Edit employee"
                        >
                          ✏️
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => handleDeleteClick(employee)}
                          title="Delete employee"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {isExpanded && empSkills.length > 0 && (
                    <tr className="skills-expansion">
                      <td colSpan={7}>
                        <div className="skills-detail">
                          <h4>Skills & Qualifications</h4>
                          <div className="skills-grid">
                            {empSkills.map(empSkill => {
                              const skill = skills.find(s => s.id === empSkill.skillId)
                              if (!skill) return null
                              
                              const isExpiring = isSkillExpiring(empSkill.validUntil)
                              const isExpired = isSkillExpired(empSkill.validUntil)
                              
                              return (
                                <div 
                                  key={empSkill.skillId} 
                                  className={`skill-item ${isExpired ? 'expired' : isExpiring ? 'expiring' : ''}`}
                                >
                                  <div className="skill-header">
                                    <strong>{skill.name}</strong>
                                    <span className="skill-category">({skill.category})</span>
                                  </div>
                                  
                                  <div className="skill-details">
                                    <div className="skill-level">
                                      <span>Level: </span>
                                      <button
                                        className={`level-badge level-${empSkill.level}`}
                                        onClick={() => handleQuickSkillUpdate(employee.id, empSkill.skillId, empSkill.level)}
                                        title="Click to change level"
                                      >
                                        {empSkill.level}
                                      </button>
                                    </div>
                                    
                                    <div className="skill-expiry">
                                      <span>Expires: </span>
                                      <span className={isExpired ? 'expired' : isExpiring ? 'expiring' : ''}>
                                        {formatDate(empSkill.validUntil)}
                                      </span>
                                    </div>
                                    
                                    {empSkill.certificationId && (
                                      <div className="skill-cert">
                                        <span>Cert: </span>
                                        <span>{empSkill.certificationId}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <button
                                    className="remove-skill-button"
                                    onClick={() => onSkillDelete(employee.id, empSkill.skillId)}
                                    title="Remove skill"
                                  >
                                    ×
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
        
        {employees.length === 0 && (
          <div className="empty-state">
            <p>No employees found matching the current filters.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <div className="modal-header">
              <h3>Confirm Delete</h3>
            </div>
            <div className="modal-content">
              <p>
                Are you sure you want to delete employee <strong>{deleteConfirmation.employeeName}</strong>?
              </p>
              <p className="warning-text">
                This action cannot be undone. All associated skills and assignments will be removed.
              </p>
            </div>
            <div className="modal-actions">
              <button 
                className="cancel-button" 
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
              <button 
                className="delete-button confirm-delete" 
                onClick={handleConfirmDelete}
              >
                Delete Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
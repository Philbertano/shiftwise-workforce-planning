import React, { useState } from 'react'
import { QualificationMatrix } from '../components/QualificationMatrix/QualificationMatrix'
import { Employee, Skill, EmployeeSkill, Station } from '../types'

// Mock data
const mockEmployees: Employee[] = [
  {
    id: 'emp-1',
    name: 'John Smith',
    contractType: 'full-time',
    weeklyHours: 40,
    maxHoursPerDay: 8,
    minRestHours: 11,
    team: 'Team Alpha',
    active: true
  },
  {
    id: 'emp-2',
    name: 'Sarah Johnson',
    contractType: 'full-time',
    weeklyHours: 40,
    maxHoursPerDay: 8,
    minRestHours: 11,
    team: 'Team Beta',
    active: true
  },
  {
    id: 'emp-3',
    name: 'Mike Wilson',
    contractType: 'part-time',
    weeklyHours: 20,
    maxHoursPerDay: 6,
    minRestHours: 11,
    team: 'Team Alpha',
    active: true
  }
]

const mockSkills: Skill[] = [
  {
    id: 'skill-1',
    name: 'Assembly',
    description: 'Product assembly skills',
    levelScale: 3,
    category: 'technical'
  },
  {
    id: 'skill-2',
    name: 'Quality Control',
    description: 'Quality inspection and control',
    levelScale: 3,
    category: 'technical'
  },
  {
    id: 'skill-3',
    name: 'Machine Operation',
    description: 'Operating production machinery',
    levelScale: 3,
    category: 'technical'
  }
]

const mockEmployeeSkills: EmployeeSkill[] = [
  {
    employeeId: 'emp-1',
    skillId: 'skill-1',
    level: 2,
    validUntil: new Date('2025-12-31')
  },
  {
    employeeId: 'emp-1',
    skillId: 'skill-3',
    level: 1,
    validUntil: new Date('2025-08-15')
  },
  {
    employeeId: 'emp-2',
    skillId: 'skill-2',
    level: 3,
    validUntil: new Date('2025-06-30')
  },
  {
    employeeId: 'emp-2',
    skillId: 'skill-1',
    level: 2,
    validUntil: new Date('2025-11-30')
  },
  {
    employeeId: 'emp-3',
    skillId: 'skill-1',
    level: 1,
    validUntil: new Date('2025-03-15')
  }
]

const mockStations: Station[] = [
  {
    id: 'station-1',
    name: 'Assembly Line A',
    line: 'Production Line 1',
    priority: 'high',
    requiredSkills: [
      { skillId: 'skill-1', minLevel: 2, count: 2, mandatory: true }
    ]
  },
  {
    id: 'station-2',
    name: 'Quality Control',
    line: 'Production Line 1',
    priority: 'critical',
    requiredSkills: [
      { skillId: 'skill-2', minLevel: 3, count: 1, mandatory: true }
    ]
  }
]

export const QualificationsPage: React.FC = () => {
  const [employeeSkills, setEmployeeSkills] = useState<EmployeeSkill[]>(mockEmployeeSkills)

  const handleSkillUpdate = (employeeSkill: EmployeeSkill) => {
    setEmployeeSkills(prev => {
      const existing = prev.find(es => 
        es.employeeId === employeeSkill.employeeId && es.skillId === employeeSkill.skillId
      )
      if (existing) {
        return prev.map(es => 
          es.employeeId === employeeSkill.employeeId && es.skillId === employeeSkill.skillId 
            ? employeeSkill 
            : es
        )
      } else {
        return [...prev, employeeSkill]
      }
    })
  }

  const handleBulkUpdate = (updates: EmployeeSkill[]) => {
    setEmployeeSkills(prev => {
      let updated = [...prev]
      updates.forEach(update => {
        const existingIndex = updated.findIndex(es => 
          es.employeeId === update.employeeId && es.skillId === update.skillId
        )
        if (existingIndex >= 0) {
          updated[existingIndex] = update
        } else {
          updated.push(update)
        }
      })
      return updated
    })
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Manufacturing Qualification Matrix</h1>
        <p>View and manage production worker qualifications and skill certifications</p>
      </div>
      <div className="page-content">
        <QualificationMatrix 
          employees={mockEmployees}
          skills={mockSkills}
          employeeSkills={employeeSkills}
          stations={mockStations}
          onSkillUpdate={handleSkillUpdate}
          onBulkUpdate={handleBulkUpdate}
        />
      </div>
    </div>
  )
}
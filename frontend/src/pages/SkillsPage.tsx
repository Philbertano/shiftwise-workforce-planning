import React, { useState } from 'react'
import { SkillManagement } from '../components/SkillManagement/SkillManagement'
import { Skill } from '../types'

// Mock data
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

export const SkillsPage: React.FC = () => {
  const [skills, setSkills] = useState<Skill[]>(mockSkills)

  const handleSkillCreate = (skill: Omit<Skill, 'id'>) => {
    const newSkill = { ...skill, id: `skill-${Date.now()}` }
    setSkills(prev => [...prev, newSkill])
  }

  const handleSkillUpdate = (skill: Skill) => {
    setSkills(prev => prev.map(s => s.id === skill.id ? skill : s))
  }

  const handleSkillDelete = (skillId: string) => {
    setSkills(prev => prev.filter(s => s.id !== skillId))
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Manufacturing Skills Management</h1>
        <p>Manage production skills, certifications, and proficiency levels</p>
      </div>
      <div className="page-content">
        <SkillManagement 
          skills={skills}
          onSkillCreate={handleSkillCreate}
          onSkillUpdate={handleSkillUpdate}
          onSkillDelete={handleSkillDelete}
        />
      </div>
    </div>
  )
}
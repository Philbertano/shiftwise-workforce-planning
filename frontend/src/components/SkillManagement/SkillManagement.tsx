import React, { useState } from 'react'
import { Skill, SkillCategory } from '../../types'
import { SkillForm } from './SkillForm'
import { SkillList } from './SkillList'
import './SkillManagement.css'

interface SkillManagementProps {
  skills: Skill[]
  onSkillCreate: (skill: Omit<Skill, 'id'>) => void
  onSkillUpdate: (skill: Skill) => void
  onSkillDelete: (skillId: string) => void
}

export const SkillManagement: React.FC<SkillManagementProps> = ({
  skills,
  onSkillCreate,
  onSkillUpdate,
  onSkillDelete
}) => {
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<SkillCategory | ''>('')

  // Filter skills based on search and category
  const filteredSkills = skills.filter(skill => {
    const matchesSearch = skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (skill.description && skill.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = !filterCategory || skill.category === filterCategory
    
    return matchesSearch && matchesCategory
  })

  // Group skills by category
  const skillsByCategory = filteredSkills.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = []
    }
    acc[skill.category].push(skill)
    return acc
  }, {} as Record<SkillCategory, Skill[]>)

  const handleCreateSkill = () => {
    setSelectedSkill(null)
    setIsFormOpen(true)
  }

  const handleEditSkill = (skill: Skill) => {
    setSelectedSkill(skill)
    setIsFormOpen(true)
  }

  const handleFormSubmit = (skillData: Omit<Skill, 'id'>) => {
    if (selectedSkill) {
      onSkillUpdate({ ...skillData, id: selectedSkill.id })
    } else {
      onSkillCreate(skillData)
    }
    setIsFormOpen(false)
    setSelectedSkill(null)
  }

  const handleFormCancel = () => {
    setIsFormOpen(false)
    setSelectedSkill(null)
  }

  const handleDeleteSkill = (skillId: string) => {
    if (window.confirm('Are you sure you want to delete this skill? This action cannot be undone and will remove all employee skill assignments.')) {
      onSkillDelete(skillId)
    }
  }

  return (
    <div className="skill-management">
      <div className="management-header">
        <h2>Skill Management</h2>
        <button 
          className="create-button"
          onClick={handleCreateSkill}
        >
          Add New Skill
        </button>
      </div>

      <div className="management-filters">
        <div className="filter-group">
          <label htmlFor="skill-search">Search:</label>
          <input
            id="skill-search"
            type="text"
            placeholder="Search skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="category-filter">Category:</label>
          <select
            id="category-filter"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as SkillCategory | '')}
          >
            <option value="">All Categories</option>
            <option value="technical">Technical</option>
            <option value="safety">Safety</option>
            <option value="quality">Quality</option>
            <option value="leadership">Leadership</option>
          </select>
        </div>
      </div>

      <div className="skills-overview">
        <div className="overview-stats">
          <div className="stat-card">
            <div className="stat-number">{skills.length}</div>
            <div className="stat-label">Total Skills</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{Object.keys(skillsByCategory).length}</div>
            <div className="stat-label">Categories</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{filteredSkills.length}</div>
            <div className="stat-label">Filtered Results</div>
          </div>
        </div>
      </div>

      <SkillList
        skillsByCategory={skillsByCategory}
        onEdit={handleEditSkill}
        onDelete={handleDeleteSkill}
      />

      {isFormOpen && (
        <SkillForm
          skill={selectedSkill}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  )
}
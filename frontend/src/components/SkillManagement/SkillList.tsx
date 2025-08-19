import React from 'react'
import { Skill, SkillCategory } from '../../types'

interface SkillListProps {
  skillsByCategory: Record<SkillCategory, Skill[]>
  onEdit: (skill: Skill) => void
  onDelete: (skillId: string) => void
}

const categoryLabels: Record<SkillCategory, string> = {
  technical: 'Technical Skills',
  safety: 'Safety Skills',
  quality: 'Quality Skills',
  leadership: 'Leadership Skills'
}

const categoryIcons: Record<SkillCategory, string> = {
  technical: '🔧',
  safety: '🦺',
  quality: '✅',
  leadership: '👥'
}

export const SkillList: React.FC<SkillListProps> = ({
  skillsByCategory,
  onEdit,
  onDelete
}) => {
  const categories = Object.keys(skillsByCategory) as SkillCategory[]

  if (categories.length === 0) {
    return (
      <div className="empty-state">
        <p>No skills found matching the current filters.</p>
      </div>
    )
  }

  return (
    <div className="skill-list">
      {categories.map(category => (
        <div key={category} className="skill-category">
          <div className="category-header">
            <h3>
              <span className="category-icon">{categoryIcons[category]}</span>
              {categoryLabels[category]}
              <span className="skill-count">({skillsByCategory[category].length})</span>
            </h3>
          </div>

          <div className="skills-grid">
            {skillsByCategory[category].map(skill => (
              <div key={skill.id} className="skill-card">
                <div className="skill-header">
                  <h4 className="skill-name">{skill.name}</h4>
                  <div className="skill-actions">
                    <button
                      className="edit-button"
                      onClick={() => onEdit(skill)}
                      title="Edit skill"
                    >
                      ✏️
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => onDelete(skill.id)}
                      title="Delete skill"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {skill.description && (
                  <p className="skill-description">{skill.description}</p>
                )}

                <div className="skill-details">
                  <div className="skill-levels">
                    <span className="detail-label">Levels:</span>
                    <div className="level-indicators">
                      {Array.from({ length: skill.levelScale }, (_, i) => (
                        <span key={i} className={`level-badge level-${i + 1}`}>
                          {i + 1}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="skill-category-badge">
                    <span className={`category-badge ${category}`}>
                      {category}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
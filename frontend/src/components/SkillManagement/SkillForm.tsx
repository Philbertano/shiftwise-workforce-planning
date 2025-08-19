import React, { useState, useEffect } from 'react'
import { Skill, SkillCategory } from '../../types'

interface SkillFormProps {
  skill: Skill | null
  onSubmit: (skill: Omit<Skill, 'id'>) => void
  onCancel: () => void
}

export const SkillForm: React.FC<SkillFormProps> = ({
  skill,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    levelScale: 3,
    category: 'technical' as SkillCategory
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (skill) {
      setFormData({
        name: skill.name,
        description: skill.description || '',
        levelScale: skill.levelScale,
        category: skill.category
      })
    }
  }, [skill])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Skill name is required'
    } else if (formData.name.length < 2) {
      newErrors.name = 'Skill name must be at least 2 characters'
    }

    if (formData.levelScale < 1 || formData.levelScale > 5) {
      newErrors.levelScale = 'Level scale must be between 1 and 5'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      onSubmit({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        levelScale: formData.levelScale,
        category: formData.category
      })
    }
  }

  return (
    <div className="modal-overlay">
      <div className="skill-form-modal">
        <div className="form-header">
          <h3>{skill ? 'Edit Skill' : 'Add New Skill'}</h3>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="skill-form">
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="name">Skill Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                className={errors.name ? 'error' : ''}
                placeholder="e.g., Welding, Quality Inspection, Team Leadership"
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
              >
                <option value="technical">Technical</option>
                <option value="safety">Safety</option>
                <option value="quality">Quality</option>
                <option value="leadership">Leadership</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="levelScale">Level Scale *</label>
              <select
                id="levelScale"
                name="levelScale"
                value={formData.levelScale}
                onChange={handleInputChange}
                className={errors.levelScale ? 'error' : ''}
              >
                <option value={1}>1 Level (Basic only)</option>
                <option value={2}>2 Levels (Basic, Advanced)</option>
                <option value={3}>3 Levels (Basic, Intermediate, Advanced)</option>
                <option value={4}>4 Levels (Novice, Basic, Intermediate, Advanced)</option>
                <option value={5}>5 Levels (Novice, Basic, Intermediate, Advanced, Expert)</option>
              </select>
              {errors.levelScale && <span className="error-message">{errors.levelScale}</span>}
              <small className="help-text">
                Defines how many proficiency levels this skill has (1-5)
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="Optional description of what this skill involves..."
              />
              <small className="help-text">
                Provide additional context about this skill (optional)
              </small>
            </div>
          </div>

          <div className="level-preview">
            <h4>Level Preview</h4>
            <div className="level-indicators">
              {Array.from({ length: formData.levelScale }, (_, i) => (
                <div key={i} className={`level-indicator level-${i + 1}`}>
                  Level {i + 1}
                </div>
              ))}
            </div>
            <small className="help-text">
              This is how the skill levels will appear in the system
            </small>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="submit-button">
              {skill ? 'Update Skill' : 'Create Skill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
import React, { useState } from 'react'
import { ProductionLine } from '../../types'
import './SkillCoverageMatrix.css'

interface SkillCoverageData {
  skillId: string
  skillName: string
  category: string
  required: number
  available: number
  coverage: number
  critical: boolean
}

interface SkillCoverageMatrixProps {
  skillCoverage: SkillCoverageData[]
  productionLines: ProductionLine[]
  title?: string
}

export const SkillCoverageMatrix: React.FC<SkillCoverageMatrixProps> = ({
  skillCoverage,
  productionLines,
  title = "Skill Coverage Matrix"
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'coverage' | 'critical'>('coverage')

  const categories = [...new Set(skillCoverage.map(skill => skill.category))]
  
  const filteredSkills = skillCoverage
    .filter(skill => selectedCategory === 'all' || skill.category === selectedCategory)
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.skillName.localeCompare(b.skillName)
        case 'coverage':
          return a.coverage - b.coverage
        case 'critical':
          return (b.critical ? 1 : 0) - (a.critical ? 1 : 0)
        default:
          return 0
      }
    })

  const getCoverageColor = (coverage: number, critical: boolean) => {
    if (critical && coverage < 100) return 'var(--automotive-error)'
    if (coverage >= 90) return 'var(--automotive-success)'
    if (coverage >= 70) return 'var(--automotive-warning)'
    return 'var(--automotive-error)'
  }

  const getCoverageStatus = (coverage: number, critical: boolean) => {
    if (critical && coverage < 100) return 'Critical Gap'
    if (coverage >= 90) return 'Adequate'
    if (coverage >= 70) return 'Low Coverage'
    return 'Critical'
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'technical': return '🔧'
      case 'safety': return '🛡️'
      case 'quality': return '✅'
      case 'leadership': return '👥'
      case 'maintenance': return '⚙️'
      case 'inspection': return '🔍'
      default: return '📋'
    }
  }

  const formatCategory = (category: string) => {
    return category ? category.charAt(0).toUpperCase() + category.slice(1) : ''
  }

  const summaryStats = {
    totalSkills: skillCoverage.length,
    criticalSkills: skillCoverage.filter(skill => skill.critical).length,
    adequateCoverage: skillCoverage.filter(skill => skill.coverage >= 90).length,
    criticalGaps: skillCoverage.filter(skill => skill.critical && skill.coverage < 100).length,
    averageCoverage: skillCoverage.reduce((sum, skill) => sum + skill.coverage, 0) / skillCoverage.length || 0
  }

  return (
    <div className="skill-coverage-matrix">
      <div className="section-header">
        <h3>{title}</h3>
        <div className="header-controls">
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-select"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {formatCategory(category)}
              </option>
            ))}
          </select>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as 'name' | 'coverage' | 'critical')}
            className="sort-select"
          >
            <option value="coverage">Sort by Coverage</option>
            <option value="name">Sort by Name</option>
            <option value="critical">Sort by Priority</option>
          </select>
        </div>
      </div>

      <div className="coverage-summary">
        <div className="summary-card">
          <div className="summary-value">{summaryStats.averageCoverage.toFixed(1)}%</div>
          <div className="summary-label">Average Coverage</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{summaryStats.adequateCoverage}</div>
          <div className="summary-label">Adequate Skills</div>
          <div className="summary-detail">of {summaryStats.totalSkills} total</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{summaryStats.criticalGaps}</div>
          <div className="summary-label">Critical Gaps</div>
          <div className="summary-detail">{summaryStats.criticalSkills} critical skills</div>
        </div>
      </div>

      <div className="skills-grid">
        {filteredSkills.map(skill => (
          <div key={skill.skillId} className={`skill-card ${skill.critical ? 'skill-card--critical' : ''}`}>
            <div className="skill-header">
              <div className="skill-info">
                <div className="skill-category">
                  <span className="category-icon">{getCategoryIcon(skill.category)}</span>
                  <span className="category-name">{formatCategory(skill.category)}</span>
                </div>
                <h4 className="skill-name">{skill.skillName}</h4>
              </div>
              
              {skill.critical && (
                <div className="critical-badge">
                  <span className="critical-icon">⚠️</span>
                  <span>Critical</span>
                </div>
              )}
            </div>

            <div className="skill-metrics">
              <div className="metric-row">
                <span className="metric-label">Required:</span>
                <span className="metric-value">{skill.required}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Available:</span>
                <span className="metric-value">{skill.available}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Coverage:</span>
                <span className="metric-value" style={{ color: getCoverageColor(skill.coverage, skill.critical) }}>
                  {skill.coverage.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="coverage-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${Math.min(skill.coverage, 100)}%`,
                    backgroundColor: getCoverageColor(skill.coverage, skill.critical)
                  }}
                ></div>
              </div>
              <div className="coverage-status" style={{ color: getCoverageColor(skill.coverage, skill.critical) }}>
                {getCoverageStatus(skill.coverage, skill.critical)}
              </div>
            </div>

            {skill.coverage < 90 && (
              <div className="skill-actions">
                <button className="action-btn action-btn--primary">
                  Find Workers
                </button>
                <button className="action-btn action-btn--secondary">
                  Schedule Training
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredSkills.length === 0 && (
        <div className="no-skills">
          <span className="no-skills-icon">🎯</span>
          <span>No skills found for the selected category</span>
        </div>
      )}
    </div>
  )
}
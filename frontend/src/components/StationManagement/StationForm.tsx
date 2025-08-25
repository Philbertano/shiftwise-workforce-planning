import React, { useState, useEffect } from 'react'
import { Station, Skill, RequiredSkill, Priority, ProductionLine, Equipment, SafetyRequirement } from '../../types'
import { productionLineService } from '../../services/productionLineService'
import { equipmentService } from '../../services/equipmentService'
import { safetyRequirementService } from '../../services/safetyRequirementService'

interface StationFormProps {
  station: Station | null
  skills: Skill[]
  onSubmit: (station: Omit<Station, 'id'>) => void
  onCancel: () => void
}

export const StationForm: React.FC<StationFormProps> = ({
  station,
  skills,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: '',
    line: '',
    description: '',
    capacity: 1,
    active: true,
    priority: 'medium' as Priority,
    requiredSkills: [] as RequiredSkill[],
    productionLineId: '',
    equipment: [] as Equipment[],
    safetyRequirements: [] as SafetyRequirement[]
  })

  // State for dropdown options
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>([])
  const [availableSafetyRequirements, setAvailableSafetyRequirements] = useState<SafetyRequirement[]>([])
  const [loading, setLoading] = useState(true)

  // Load dropdown data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [lines, equipment, safetyReqs] = await Promise.all([
          productionLineService.getActiveProductionLines(),
          equipmentService.getActiveEquipment(),
          safetyRequirementService.getActiveSafetyRequirements()
        ])
        setProductionLines(lines)
        setAvailableEquipment(equipment)
        setAvailableSafetyRequirements(safetyReqs)
      } catch (error) {
        console.error('Failed to load form data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    if (station) {
      setFormData({
        name: station.name,
        line: station.line || '',
        description: station.description || '',
        capacity: station.capacity || 1,
        active: station.active || true,
        priority: station.priority,
        requiredSkills: station.requiredSkills || [],
        productionLineId: station.productionLineId || '',
        equipment: station.equipment || [],
        safetyRequirements: station.safetyRequirements || []
      })
    }
  }, [station])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleAddSkill = () => {
    setFormData(prev => ({
      ...prev,
      requiredSkills: [
        ...prev.requiredSkills,
        { skillId: '', count: 1, minLevel: 1, mandatory: true }
      ]
    }))
  }

  const handleRemoveSkill = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requiredSkills: prev.requiredSkills.filter((_, i) => i !== index)
    }))
  }

  const handleSkillChange = (index: number, field: keyof RequiredSkill, value: any) => {
    setFormData(prev => ({
      ...prev,
      requiredSkills: prev.requiredSkills.map((skill, i) => 
        i === index ? { ...skill, [field]: value } : skill
      )
    }))
  }

  const handleAddEquipment = (equipmentId: string) => {
    const equipment = availableEquipment.find(eq => eq.id === equipmentId)
    if (equipment && !formData.equipment.some(eq => eq.id === equipmentId)) {
      setFormData(prev => ({
        ...prev,
        equipment: [...prev.equipment, equipment]
      }))
    }
  }

  const handleRemoveEquipment = (equipmentId: string) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.filter(eq => eq.id !== equipmentId)
    }))
  }

  const handleAddSafetyRequirement = (safetyReqId: string) => {
    const safetyReq = availableSafetyRequirements.find(sr => sr.id === safetyReqId)
    if (safetyReq && !formData.safetyRequirements.some(sr => sr.id === safetyReqId)) {
      setFormData(prev => ({
        ...prev,
        safetyRequirements: [...prev.safetyRequirements, safetyReq]
      }))
    }
  }

  const handleRemoveSafetyRequirement = (safetyReqId: string) => {
    setFormData(prev => ({
      ...prev,
      safetyRequirements: prev.safetyRequirements.filter(sr => sr.id !== safetyReqId)
    }))
  }

  if (loading) {
    return (
      <div className="station-form">
        <div className="loading-state">
          <p>Loading form data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="station-form">
      <div className="station-form__header">
        <h3>{station ? 'Edit Manufacturing Station' : 'Add New Manufacturing Station'}</h3>
        <p>Configure the manufacturing station details, production line assignment, and staffing requirements</p>
      </div>

      <form onSubmit={handleSubmit} className="station-form__form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="name">Station Name *</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Engine Assembly Station 1"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="line">Station Code</label>
            <input
              type="text"
              id="line"
              value={formData.line}
              onChange={(e) => setFormData(prev => ({ ...prev, line: e.target.value }))}
              placeholder="e.g., ENG-01-A"
            />
          </div>

          <div className="form-group">
            <label htmlFor="productionLineId">Production Line *</label>
            <select
              id="productionLineId"
              value={formData.productionLineId}
              onChange={(e) => setFormData(prev => ({ ...prev, productionLineId: e.target.value }))}
              required
            >
              <option value="">Select production line...</option>
              {productionLines.map(line => (
                <option key={line.id} value={line.id}>
                  {line.name} ({line.type.replace('_', ' ').toUpperCase()})
                </option>
              ))}
            </select>
            <small>Assign this station to a production line</small>
          </div>

          <div className="form-group">
            <label htmlFor="capacity">Workers per Shift *</label>
            <input
              type="number"
              id="capacity"
              min="1"
              max="50"
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
              required
            />
            <small>Number of workers needed per shift slot</small>
          </div>

          <div className="form-group">
            <label htmlFor="priority">Priority Level</label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <small>Station priority for staffing allocation</small>
          </div>

          <div className="form-group">
            <label htmlFor="active">Status</label>
            <select
              id="active"
              value={formData.active ? 'active' : 'inactive'}
              onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.value === 'active' }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the manufacturing station and its purpose..."
            rows={3}
          />
        </div>

        <div className="form-section">
          <div className="form-section__header">
            <h4>Station Equipment</h4>
            <div className="form-group">
              <label htmlFor="equipmentSelect">Add Equipment</label>
              <select
                id="equipmentSelect"
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddEquipment(e.target.value)
                    e.target.value = ''
                  }
                }}
              >
                <option value="">Select equipment to add...</option>
                {availableEquipment
                  .filter(eq => !formData.equipment.some(existing => existing.id === eq.id))
                  .map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.type.replace('_', ' ')}) - {eq.status}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {formData.equipment.length === 0 ? (
            <div className="empty-state">
              <p>No equipment assigned. Add equipment that workers will operate at this station.</p>
            </div>
          ) : (
            <div className="equipment-list">
              {formData.equipment.map((equipment) => (
                <div key={equipment.id} className="equipment-item">
                  <div className="equipment-info">
                    <h5>{equipment.name}</h5>
                    <p>
                      <span className="equipment-type">{equipment.type.replace('_', ' ').toUpperCase()}</span>
                      {equipment.model && <span className="equipment-model"> • {equipment.model}</span>}
                      {equipment.manufacturer && <span className="equipment-manufacturer"> • {equipment.manufacturer}</span>}
                    </p>
                    <div className="equipment-status">
                      <span className={`status-badge status-${equipment.status}`}>
                        {equipment.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    {equipment.requiredSkills.length > 0 && (
                      <div className="equipment-skills">
                        <small>Required skills: {equipment.requiredSkills.join(', ')}</small>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemoveEquipment(equipment.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-section">
          <div className="form-section__header">
            <h4>Safety Requirements</h4>
            <div className="form-group">
              <label htmlFor="safetySelect">Add Safety Requirement</label>
              <select
                id="safetySelect"
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddSafetyRequirement(e.target.value)
                    e.target.value = ''
                  }
                }}
              >
                <option value="">Select safety requirement to add...</option>
                {availableSafetyRequirements
                  .filter(sr => !formData.safetyRequirements.some(existing => existing.id === sr.id))
                  .map(sr => (
                    <option key={sr.id} value={sr.id}>
                      {sr.name} ({sr.level} - {sr.category.replace('_', ' ')})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {formData.safetyRequirements.length === 0 ? (
            <div className="empty-state">
              <p>No safety requirements defined. Add safety requirements that workers must meet for this station.</p>
            </div>
          ) : (
            <div className="safety-requirements-list">
              {formData.safetyRequirements.map((safetyReq) => (
                <div key={safetyReq.id} className="safety-requirement-item">
                  <div className="safety-requirement-info">
                    <h5>{safetyReq.name}</h5>
                    <p>{safetyReq.description}</p>
                    <div className="safety-requirement-details">
                      <span className={`level-badge level-${safetyReq.level}`}>
                        {safetyReq.level.toUpperCase()}
                      </span>
                      <span className={`category-badge category-${safetyReq.category}`}>
                        {safetyReq.category.replace('_', ' ').toUpperCase()}
                      </span>
                      {safetyReq.certificationRequired && (
                        <span className="certification-badge">
                          CERTIFICATION REQUIRED
                          {safetyReq.certificationValidityDays && (
                            <small> ({safetyReq.certificationValidityDays} days validity)</small>
                          )}
                        </span>
                      )}
                      {safetyReq.trainingRequired && (
                        <span className="training-badge">TRAINING REQUIRED</span>
                      )}
                    </div>
                    {safetyReq.equipmentRequired.length > 0 && (
                      <div className="required-equipment">
                        <small>Required equipment: {safetyReq.equipmentRequired.join(', ')}</small>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemoveSafetyRequirement(safetyReq.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-section">
          <div className="form-section__header">
            <h4>Required Skills & Certifications</h4>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddSkill}
            >
              <span className="btn-icon">+</span>
              Add Skill Requirement
            </button>
          </div>

          {formData.requiredSkills.length === 0 ? (
            <div className="empty-state">
              <p>No skill requirements defined. Add skills that workers need for this production line.</p>
            </div>
          ) : (
            <div className="skills-list">
              {formData.requiredSkills.map((skill, index) => (
                <div key={index} className="skill-requirement">
                  <div className="skill-requirement__fields">
                    <div className="form-group">
                      <label>Skill</label>
                      <select
                        value={skill.skillId}
                        onChange={(e) => handleSkillChange(index, 'skillId', e.target.value)}
                        required
                      >
                        <option value="">Select skill...</option>
                        {skills.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Workers Needed</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={skill.count}
                        onChange={(e) => handleSkillChange(index, 'count', parseInt(e.target.value))}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Min Level</label>
                      <select
                        value={skill.minLevel}
                        onChange={(e) => handleSkillChange(index, 'minLevel', parseInt(e.target.value))}
                      >
                        <option value={1}>Level 1 (Basic)</option>
                        <option value={2}>Level 2 (Intermediate)</option>
                        <option value={3}>Level 3 (Advanced)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={skill.mandatory}
                          onChange={(e) => handleSkillChange(index, 'mandatory', e.target.checked)}
                        />
                        Mandatory
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemoveSkill(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {station ? 'Update Manufacturing Station' : 'Create Manufacturing Station'}
          </button>
        </div>
      </form>
    </div>
  )
}
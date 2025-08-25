import React, { useState, useEffect } from 'react'
import { ProductionLine, productionLineService, CreateProductionLineData } from '../../services/productionLineService'

interface ProductionLineManagerProps {
  onClose: () => void
  onProductionLineCreated?: (line: ProductionLine) => void
}

export const ProductionLineManager: React.FC<ProductionLineManagerProps> = ({
  onClose,
  onProductionLineCreated
}) => {
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<CreateProductionLineData>({
    name: '',
    type: 'assembly',
    description: '',
    taktTime: 120,
    capacity: 30,
    active: true
  })

  useEffect(() => {
    loadProductionLines()
  }, [])

  const loadProductionLines = async () => {
    try {
      setLoading(true)
      const lines = await productionLineService.getProductionLines()
      setProductionLines(lines)
    } catch (error) {
      console.error('Failed to load production lines:', error)
      setError('Failed to load production lines')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsCreating(true)
      const newLine = await productionLineService.createProductionLine(formData)
      setProductionLines(prev => [...prev, newLine])
      
      // Reset form
      setFormData({
        name: '',
        type: 'assembly',
        description: '',
        taktTime: 120,
        capacity: 30,
        active: true
      })
      
      if (onProductionLineCreated) {
        onProductionLineCreated(newLine)
      }
      
      alert('Production line created successfully!')
    } catch (error) {
      console.error('Failed to create production line:', error)
      alert('Failed to create production line. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleInputChange = (field: keyof CreateProductionLineData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getTypeDisplayName = (type: ProductionLine['type']) => {
    const typeNames = {
      assembly: 'Assembly Line',
      paint: 'Paint Shop',
      body_shop: 'Body Shop',
      final_inspection: 'Final Inspection',
      stamping: 'Stamping Press',
      welding: 'Welding Station',
      trim: 'Trim & Final',
      chassis: 'Chassis Assembly'
    }
    return typeNames[type] || type
  }

  if (loading) {
    return (
      <div className="production-line-manager">
        <div className="production-line-manager__header">
          <h3>Production Line Management</h3>
          <button className="btn btn-secondary" onClick={onClose}>
            ✕ Close
          </button>
        </div>
        <div className="loading-state">
          <p>Loading production lines...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="production-line-manager">
      <div className="production-line-manager__header">
        <h3>Production Line Management</h3>
        <button className="btn btn-secondary" onClick={onClose}>
          ✕ Close
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={loadProductionLines}>Retry</button>
        </div>
      )}

      <div className="production-line-manager__content">
        <div className="production-line-form">
          <h4>Create New Production Line</h4>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Production Line Name *</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Engine Assembly Line 1"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="type">Line Type *</label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value as ProductionLine['type'])}
                  required
                >
                  <option value="assembly">Assembly Line</option>
                  <option value="paint">Paint Shop</option>
                  <option value="body_shop">Body Shop</option>
                  <option value="final_inspection">Final Inspection</option>
                  <option value="stamping">Stamping Press</option>
                  <option value="welding">Welding Station</option>
                  <option value="trim">Trim & Final</option>
                  <option value="chassis">Chassis Assembly</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="taktTime">Takt Time (seconds) *</label>
                <input
                  id="taktTime"
                  type="number"
                  value={formData.taktTime}
                  onChange={(e) => handleInputChange('taktTime', parseInt(e.target.value))}
                  min="1"
                  required
                />
                <small>Time between units (in seconds)</small>
              </div>

              <div className="form-group">
                <label htmlFor="capacity">Capacity (units/hour) *</label>
                <input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => handleInputChange('capacity', parseInt(e.target.value))}
                  min="1"
                  required
                />
                <small>Maximum units per hour</small>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Optional description of the production line"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => handleInputChange('active', e.target.checked)}
                />
                Active production line
              </label>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Production Line'}
              </button>
            </div>
          </form>
        </div>

        <div className="production-lines-list">
          <h4>Existing Production Lines ({productionLines.length})</h4>
          {productionLines.length === 0 ? (
            <div className="empty-state">
              <p>No production lines configured yet.</p>
            </div>
          ) : (
            <div className="production-lines-grid">
              {productionLines.map(line => (
                <div key={line.id} className="production-line-card">
                  <div className="production-line-card__header">
                    <h5>{line.name}</h5>
                    <span className={`status-badge ${line.active ? 'status-active' : 'status-inactive'}`}>
                      {line.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="production-line-card__details">
                    <div className="detail-item">
                      <span className="detail-label">Type:</span>
                      <span className="detail-value">{getTypeDisplayName(line.type)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Takt Time:</span>
                      <span className="detail-value">{line.taktTime}s</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Capacity:</span>
                      <span className="detail-value">{line.capacity} units/hr</span>
                    </div>
                  </div>

                  {line.description && (
                    <p className="production-line-card__description">{line.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
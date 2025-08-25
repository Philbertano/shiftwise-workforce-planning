import React, { useState } from 'react'
import { StationCapacityIndicator, calculateCapacityStatus, getCapacityWarnings } from './StationCapacityIndicator'

export const StationCapacityDemo: React.FC = () => {
  const [current, setCurrent] = useState(3)
  const [required, setRequired] = useState(5)
  const [skillsMatch, setSkillsMatch] = useState(true)

  const capacityStatus = calculateCapacityStatus(current, required, skillsMatch)
  const warnings = getCapacityWarnings(capacityStatus)

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>Station Capacity Management Demo</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Controls</h3>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
          <label>
            Current Employees:
            <input
              type="number"
              value={current}
              onChange={(e) => setCurrent(parseInt(e.target.value) || 0)}
              min="0"
              max="10"
              style={{ marginLeft: '10px', width: '60px' }}
            />
          </label>
          <label>
            Required Employees:
            <input
              type="number"
              value={required}
              onChange={(e) => setRequired(parseInt(e.target.value) || 1)}
              min="1"
              max="10"
              style={{ marginLeft: '10px', width: '60px' }}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={skillsMatch}
              onChange={(e) => setSkillsMatch(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Skills Match
          </label>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h3>Compact View</h3>
          <StationCapacityIndicator 
            capacity={capacityStatus}
            compact={true}
            showWarnings={true}
          />
        </div>

        <div>
          <h3>Detailed View</h3>
          <StationCapacityIndicator 
            capacity={capacityStatus}
            showDetails={true}
            showWarnings={true}
          />
        </div>
      </div>

      {warnings.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Capacity Warnings</h3>
          <ul>
            {warnings.map((warning, index) => (
              <li key={index} style={{ color: '#d97706', marginBottom: '5px' }}>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <h3>Status Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <div><strong>Status:</strong> {capacityStatus.status}</div>
          <div><strong>Can Accept More:</strong> {capacityStatus.canAcceptMore ? 'Yes' : 'No'}</div>
          <div><strong>Available Capacity:</strong> {capacityStatus.availableCapacity}</div>
          <div><strong>Skills Match:</strong> {capacityStatus.skillsMatch ? 'Yes' : 'No'}</div>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Status Examples</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <div>
            <h4>Empty Station</h4>
            <StationCapacityIndicator 
              capacity={calculateCapacityStatus(0, 3, true)}
              compact={true}
            />
          </div>
          <div>
            <h4>Understaffed</h4>
            <StationCapacityIndicator 
              capacity={calculateCapacityStatus(1, 3, true)}
              compact={true}
            />
          </div>
          <div>
            <h4>Optimal</h4>
            <StationCapacityIndicator 
              capacity={calculateCapacityStatus(3, 3, true)}
              compact={true}
            />
          </div>
          <div>
            <h4>Overstaffed</h4>
            <StationCapacityIndicator 
              capacity={calculateCapacityStatus(5, 3, true)}
              compact={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
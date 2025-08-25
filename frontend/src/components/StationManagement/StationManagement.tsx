import React, { useState } from 'react'
import { Station, Skill, RequiredSkill } from '../../types'
import { StationForm } from './StationForm'
import { StationList } from './StationList'
import { ProductionLineManager } from './ProductionLineManager'
import './StationManagement.css'

interface StationManagementProps {
  stations: Station[]
  skills: Skill[]
  onStationCreate: (station: Omit<Station, 'id'>) => void
  onStationUpdate: (station: Station) => void
  onStationDelete: (stationId: string) => void
}

export const StationManagement: React.FC<StationManagementProps> = ({
  stations,
  skills,
  onStationCreate,
  onStationUpdate,
  onStationDelete
}) => {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isProductionLineManagerOpen, setIsProductionLineManagerOpen] = useState(false)

  const handleCreateNew = () => {
    setSelectedStation(null)
    setIsFormOpen(true)
  }

  const handleEdit = (station: Station) => {
    setSelectedStation(station)
    setIsFormOpen(true)
  }

  const handleFormSubmit = (stationData: Omit<Station, 'id'>) => {
    if (selectedStation) {
      onStationUpdate({ ...stationData, id: selectedStation.id })
    } else {
      onStationCreate(stationData)
    }
    setIsFormOpen(false)
    setSelectedStation(null)
  }

  const handleFormCancel = () => {
    setIsFormOpen(false)
    setSelectedStation(null)
  }

  return (
    <div className="station-management">
      <div className="station-management__header">
        <div className="station-management__title">
          <h2>Production Lines ({stations.length})</h2>
          <p>Manage your automotive production lines and staffing requirements</p>
        </div>
        <div className="station-management__actions">
          <button 
            className="btn btn-secondary"
            onClick={() => setIsProductionLineManagerOpen(true)}
          >
            <span className="btn-icon">⚙️</span>
            Manage Lines
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleCreateNew}
          >
            <span className="btn-icon">🏭</span>
            Add Station
          </button>
        </div>
      </div>

      <div className="station-management__content">
        {isProductionLineManagerOpen ? (
          <ProductionLineManager
            onClose={() => setIsProductionLineManagerOpen(false)}
            onProductionLineCreated={() => {
              // Optionally refresh data or show success message
            }}
          />
        ) : isFormOpen ? (
          <div className="station-management__form">
            <StationForm
              station={selectedStation}
              skills={skills}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          </div>
        ) : (
          <StationList
            stations={stations}
            skills={skills}
            onEdit={handleEdit}
            onDelete={onStationDelete}
          />
        )}
      </div>
    </div>
  )
}
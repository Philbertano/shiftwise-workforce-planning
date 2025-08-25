import React, { useState, useEffect } from 'react'
import { StationManagement } from '../components/StationManagement/StationManagement'
import { Station, Skill } from '../types'
import { stationService } from '../services/stationService'
import { skillService } from '../services/skillService'

export const StationsPage: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [stationsData, skillsData] = await Promise.all([
          stationService.getStations(),
          skillService.getSkills()
        ])

        setStations(stationsData)
        setSkills(skillsData)
      } catch (error) {
        console.error('Failed to load data:', error)
        setError(error instanceof Error ? error.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleStationCreate = async (station: Omit<Station, 'id'>) => {
    try {
      const newStation = await stationService.createStation(station)
      setStations(prev => [...prev, newStation])
    } catch (error) {
      console.error('Failed to create station:', error)
      alert('Failed to create production line. Please try again.')
    }
  }

  const handleStationUpdate = async (station: Station) => {
    try {
      const updatedStation = await stationService.updateStation(station.id, station)
      setStations(prev => prev.map(s => s.id === station.id ? updatedStation : s))
    } catch (error) {
      console.error('Failed to update station:', error)
      alert('Failed to update production line. Please try again.')
    }
  }

  const handleStationDelete = async (stationId: string) => {
    if (!window.confirm('Are you sure you want to delete this production line? This action cannot be undone.')) {
      return
    }

    try {
      await stationService.deleteStation(stationId)
      setStations(prev => prev.filter(s => s.id !== stationId))
    } catch (error) {
      console.error('Failed to delete station:', error)
      alert('Failed to delete production line. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Production Lines</h1>
          <p>Loading production line data...</p>
        </div>
        <div className="page-content">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Production Lines</h1>
          <p>Error loading production line data</p>
        </div>
        <div className="page-content">
          <div className="error-message">
            <p>Failed to load production line data: {error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Production Lines Management</h1>
        <p>Configure production lines, staffing requirements, and skill needs</p>
      </div>
      <div className="page-content">
        <StationManagement 
          stations={stations}
          skills={skills}
          onStationCreate={handleStationCreate}
          onStationUpdate={handleStationUpdate}
          onStationDelete={handleStationDelete}
        />
      </div>
    </div>
  )
}
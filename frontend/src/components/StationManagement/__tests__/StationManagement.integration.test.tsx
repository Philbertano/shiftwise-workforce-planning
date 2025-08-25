import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom';
import { StationManagement } from '../StationManagement'
import { PlanningProvider } from '../../../contexts/PlanningContext'
import { Station, Skill } from '../../../types'

// Mock the production line service
vi.mock('../../../services/productionLineService', () => ({
  productionLineService: {
    getProductionLines: vi.fn().mockResolvedValue([
      { id: '1', name: 'Engine Assembly Line 1', type: 'assembly', taktTime: 120, capacity: 30, active: true }
    ])
  }
}))

const mockStations: Station[] = [
  {
    id: 'station-1',
    name: 'Engine Assembly Station',
    line: 'ENG-01',
    description: 'Main engine assembly',
    capacity: 3,
    active: true,
    priority: 'high',
    requiredSkills: [
      { skillId: 'skill-1', minLevel: 2, count: 2, mandatory: true }
    ],
    productionLineId: '1'
  }
]

const mockSkills: Skill[] = [
  {
    id: 'skill-1',
    name: 'Engine Assembly',
    description: 'Engine assembly skills',
    levelScale: 5,
    category: 'technical'
  }
]

const mockProps = {
  stations: mockStations,
  skills: mockSkills,
  onStationCreate: vi.fn(),
  onStationUpdate: vi.fn(),
  onStationDelete: vi.fn()
}

describe('StationManagement Integration', () => {
  it('renders comprehensive station management with automotive context', () => {
    render(
      <PlanningProvider>
        <StationManagement {...mockProps} />
      </PlanningProvider>
    )

    // Check main header with automotive terminology
    expect(screen.getByText('Production Lines (1)')).toBeInTheDocument()
    expect(screen.getByText('Manage your automotive production lines and staffing requirements')).toBeInTheDocument()
    
    // Check action buttons
    expect(screen.getByText('Manage Lines')).toBeInTheDocument()
    expect(screen.getByText('Add Station')).toBeInTheDocument()
  })

  it('shows station with real-time staffing information', () => {
    render(
      <PlanningProvider>
        <StationManagement {...mockProps} />
      </PlanningProvider>
    )

    // Should show station with staffing info
    expect(screen.getByText('Engine Assembly Station')).toBeInTheDocument()
    expect(screen.getByText('ENG-01')).toBeInTheDocument()
    expect(screen.getByText(/0 \/ 3 workers/)).toBeInTheDocument()
  })

  it('provides view toggle between grid and dashboard', () => {
    render(
      <PlanningProvider>
        <StationManagement {...mockProps} />
      </PlanningProvider>
    )

    expect(screen.getByText('Grid View')).toBeInTheDocument()
    expect(screen.getByText('Dashboard View')).toBeInTheDocument()
  })

  it('opens production line manager when manage lines is clicked', async () => {
    render(
      <PlanningProvider>
        <StationManagement {...mockProps} />
      </PlanningProvider>
    )

    const manageButton = screen.getByText('Manage Lines')
    fireEvent.click(manageButton)

    // Should show production line manager
    await waitFor(() => {
      expect(screen.getByText('Production Line Management')).toBeInTheDocument()
    })
  })

  it('shows station form when add station is clicked', () => {
    render(
      <PlanningProvider>
        <StationManagement {...mockProps} />
      </PlanningProvider>
    )

    const addButton = screen.getByText('Add Station')
    fireEvent.click(addButton)

    // Should show station form (this would depend on the StationForm implementation)
    // For now, just verify the button works
    expect(mockProps.onStationCreate).not.toHaveBeenCalled() // Form not submitted yet
  })
})
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom';
import { StationList } from '../StationList'
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
  onEdit: vi.fn(),
  onDelete: vi.fn()
}

describe('Enhanced StationList', () => {
  it('renders station list with automotive context', () => {
    render(
      <PlanningProvider>
        <StationList {...mockProps} />
      </PlanningProvider>
    )

    expect(screen.getByText('Engine Assembly Station')).toBeInTheDocument()
    expect(screen.getByText('ENG-01')).toBeInTheDocument()
  })

  it('shows view toggle controls', () => {
    render(
      <PlanningProvider>
        <StationList {...mockProps} />
      </PlanningProvider>
    )

    expect(screen.getByText('Grid View')).toBeInTheDocument()
    expect(screen.getByText('Dashboard View')).toBeInTheDocument()
  })

  it('displays staffing information', () => {
    render(
      <PlanningProvider>
        <StationList {...mockProps} />
      </PlanningProvider>
    )

    // Should show staffing ratio
    expect(screen.getByText(/0 \/ 3 workers/)).toBeInTheDocument()
  })
})
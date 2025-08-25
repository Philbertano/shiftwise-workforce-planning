import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom';
import { StationForm } from '../StationForm'
import { Station, Skill, Priority } from '../../../types'

import { vi } from 'vitest'

// Mock the services
vi.mock('../../../services/productionLineService', () => ({
  productionLineService: {
    getActiveProductionLines: vi.fn().mockResolvedValue([
      { id: '1', name: 'Engine Assembly Line 1', type: 'assembly', taktTime: 120, capacity: 30, active: true }
    ])
  }
}))

vi.mock('../../../services/equipmentService', () => ({
  equipmentService: {
    getActiveEquipment: vi.fn().mockResolvedValue([
      { 
        id: '1', 
        name: 'Robotic Welder #1', 
        type: 'robot', 
        status: 'operational', 
        requiredSkills: ['welding'], 
        safetyRequirements: ['lockout_tagout'], 
        active: true 
      }
    ])
  }
}))

vi.mock('../../../services/safetyRequirementService', () => ({
  safetyRequirementService: {
    getActiveSafetyRequirements: vi.fn().mockResolvedValue([
      {
        id: '1',
        name: 'Lockout/Tagout Certification',
        description: 'Required for working with electrical and mechanical equipment',
        category: 'lockout_tagout',
        level: 'intermediate',
        certificationRequired: true,
        trainingRequired: true,
        equipmentRequired: ['lockout_devices'],
        active: true
      }
    ])
  }
}))

const mockSkills: Skill[] = [
  {
    id: '1',
    name: 'Welding',
    description: 'Metal welding skills',
    levelScale: 3,
    category: 'technical'
  },
  {
    id: '2',
    name: 'Assembly',
    description: 'Component assembly skills',
    levelScale: 3,
    category: 'technical'
  }
]

const mockStation: Station = {
  id: '1',
  name: 'Test Station',
  line: 'TEST-01',
  description: 'Test station description',
  capacity: 2,
  active: true,
  priority: 'medium' as Priority,
  requiredSkills: [
    {
      skillId: '1',
      minLevel: 2,
      count: 1,
      mandatory: true
    }
  ],
  productionLineId: '1',
  equipment: [],
  safetyRequirements: []
}

describe('StationForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders automotive station form correctly', async () => {
    render(
      <StationForm
        station={null}
        skills={mockSkills}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading form data...')).not.toBeInTheDocument()
    })

    // Check automotive terminology
    expect(screen.getByText('Add New Manufacturing Station')).toBeInTheDocument()
    expect(screen.getByLabelText('Station Name *')).toBeInTheDocument()
    expect(screen.getByLabelText('Production Line *')).toBeInTheDocument()
    expect(screen.getByLabelText('Workers per Shift *')).toBeInTheDocument()
    expect(screen.getByText('Station Equipment')).toBeInTheDocument()
    expect(screen.getByText('Safety Requirements')).toBeInTheDocument()
  })

  it('populates form when editing existing station', async () => {
    render(
      <StationForm
        station={mockStation}
        skills={mockSkills}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading form data...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Edit Manufacturing Station')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Station')).toBeInTheDocument()
    expect(screen.getByDisplayValue('TEST-01')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
  })

  it('handles form submission with automotive fields', async () => {
    render(
      <StationForm
        station={null}
        skills={mockSkills}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading form data...')).not.toBeInTheDocument()
    })

    // Fill out the form
    fireEvent.change(screen.getByLabelText('Station Name *'), {
      target: { value: 'New Manufacturing Station' }
    })
    fireEvent.change(screen.getByLabelText('Workers per Shift *'), {
      target: { value: '3' }
    })
    fireEvent.change(screen.getByLabelText('Production Line *'), {
      target: { value: '1' }
    })

    // Submit the form
    fireEvent.click(screen.getByText('Create Manufacturing Station'))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Manufacturing Station',
          capacity: 3,
          productionLineId: '1',
          equipment: [],
          safetyRequirements: []
        })
      )
    })
  })

  it('allows adding and removing equipment', async () => {
    render(
      <StationForm
        station={null}
        skills={mockSkills}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading form data...')).not.toBeInTheDocument()
    })

    // Add equipment
    const equipmentSelect = screen.getByLabelText('Add Equipment')
    fireEvent.change(equipmentSelect, { target: { value: '1' } })

    await waitFor(() => {
      expect(screen.getByText('Robotic Welder #1')).toBeInTheDocument()
    })

    // Remove equipment
    fireEvent.click(screen.getByText('Remove'))

    await waitFor(() => {
      expect(screen.queryByText('Robotic Welder #1')).not.toBeInTheDocument()
    })
  })

  it('allows adding and removing safety requirements', async () => {
    render(
      <StationForm
        station={null}
        skills={mockSkills}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading form data...')).not.toBeInTheDocument()
    })

    // Add safety requirement
    const safetySelect = screen.getByLabelText('Add Safety Requirement')
    fireEvent.change(safetySelect, { target: { value: '1' } })

    await waitFor(() => {
      expect(screen.getByText('Lockout/Tagout Certification')).toBeInTheDocument()
    })

    // Remove safety requirement
    const removeButtons = screen.getAllByText('Remove')
    fireEvent.click(removeButtons[removeButtons.length - 1])

    await waitFor(() => {
      expect(screen.queryByText('Lockout/Tagout Certification')).not.toBeInTheDocument()
    })
  })
})
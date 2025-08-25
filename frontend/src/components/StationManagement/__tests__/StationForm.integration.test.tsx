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

// Integration test to verify the component works with real-like data
describe('StationForm Integration', () => {
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
    },
    {
      id: '3',
      name: 'Quality Control',
      description: 'Quality inspection skills',
      levelScale: 3,
      category: 'quality'
    }
  ]

  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a complete automotive station with all fields', async () => {
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

    // Fill out basic station information
    fireEvent.change(screen.getByLabelText('Station Name *'), {
      target: { value: 'Engine Assembly Station A1' }
    })
    
    fireEvent.change(screen.getByLabelText('Station Code'), {
      target: { value: 'ENG-A1' }
    })

    fireEvent.change(screen.getByLabelText('Production Line *'), {
      target: { value: '1' }
    })

    fireEvent.change(screen.getByLabelText('Workers per Shift *'), {
      target: { value: '4' }
    })

    fireEvent.change(screen.getByLabelText('Priority Level'), {
      target: { value: 'high' }
    })

    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Main engine assembly station for automotive production line' }
    })

    // Add equipment
    const equipmentSelect = screen.getByLabelText('Add Equipment')
    fireEvent.change(equipmentSelect, { target: { value: '1' } })

    // Add safety requirement
    const safetySelect = screen.getByLabelText('Add Safety Requirement')
    fireEvent.change(safetySelect, { target: { value: '1' } })

    // Add skill requirement
    fireEvent.click(screen.getByText('Add Skill Requirement'))

    await waitFor(() => {
      expect(screen.getByText('Select skill...')).toBeInTheDocument()
    })

    // Configure the skill requirement - find the skill select in the skill requirement section
    const skillRequirementSection = screen.getByText('Select skill...').closest('select')
    if (skillRequirementSection) {
      fireEvent.change(skillRequirementSection, { target: { value: '1' } })
    }

    // Submit the form
    fireEvent.click(screen.getByText('Create Manufacturing Station'))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Engine Assembly Station A1',
          line: 'ENG-A1',
          productionLineId: '1',
          capacity: 4,
          priority: 'high',
          description: 'Main engine assembly station for automotive production line',
          active: true,
          equipment: expect.arrayContaining([
            expect.objectContaining({
              id: '1',
              name: 'Robotic Welder #1'
            })
          ]),
          safetyRequirements: expect.arrayContaining([
            expect.objectContaining({
              id: '1',
              name: 'Lockout/Tagout Certification'
            })
          ]),
          requiredSkills: expect.arrayContaining([
            expect.objectContaining({
              skillId: '1',
              count: 1,
              minLevel: 1,
              mandatory: true
            })
          ])
        })
      )
    })
  })

  it('validates required fields properly', async () => {
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

    // Try to submit without required fields
    fireEvent.click(screen.getByText('Create Manufacturing Station'))

    // Form should not submit
    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    // Required field validation should prevent submission
    expect(screen.getByLabelText('Station Name *')).toBeRequired()
    expect(screen.getByLabelText('Production Line *')).toBeRequired()
    expect(screen.getByLabelText('Workers per Shift *')).toBeRequired()
  })

  it('handles automotive terminology consistently', async () => {
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

    // Check automotive terminology is used throughout
    expect(screen.getByText('Add New Manufacturing Station')).toBeInTheDocument()
    expect(screen.getByText('Configure the manufacturing station details, production line assignment, and staffing requirements')).toBeInTheDocument()
    expect(screen.getByLabelText('Station Name *')).toBeInTheDocument()
    expect(screen.getByLabelText('Station Code')).toBeInTheDocument()
    expect(screen.getByLabelText('Production Line *')).toBeInTheDocument()
    expect(screen.getByText('Station Equipment')).toBeInTheDocument()
    expect(screen.getByText('Safety Requirements')).toBeInTheDocument()
    expect(screen.getByText('Create Manufacturing Station')).toBeInTheDocument()
  })
})
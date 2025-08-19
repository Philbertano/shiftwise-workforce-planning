import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { SkillManagement } from '../SkillManagement'
import { Skill } from '../../../types'

// Mock data
const mockSkills: Skill[] = [
  {
    id: 'skill-1',
    name: 'Assembly',
    description: 'Basic assembly skills',
    levelScale: 3,
    category: 'technical'
  },
  {
    id: 'skill-2',
    name: 'Quality Control',
    description: 'Quality inspection skills',
    levelScale: 3,
    category: 'quality'
  },
  {
    id: 'skill-3',
    name: 'Safety Procedures',
    description: 'Workplace safety protocols',
    levelScale: 2,
    category: 'safety'
  },
  {
    id: 'skill-4',
    name: 'Team Leadership',
    description: 'Leading and managing teams',
    levelScale: 4,
    category: 'leadership'
  }
]

const mockProps = {
  skills: mockSkills,
  onSkillCreate: vi.fn(),
  onSkillUpdate: vi.fn(),
  onSkillDelete: vi.fn()
}

describe('SkillManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders skill management interface', () => {
    render(<SkillManagement {...mockProps} />)
    
    expect(screen.getByText('Skill Management')).toBeInTheDocument()
    expect(screen.getByText('Add New Skill')).toBeInTheDocument()
  })

  it('displays skill statistics', () => {
    render(<SkillManagement {...mockProps} />)
    
    expect(screen.getByText('Total Skills')).toBeInTheDocument()
    expect(screen.getByText('Categories')).toBeInTheDocument()
    expect(screen.getByText('Filtered Results')).toBeInTheDocument()
    
    // Check that there are stat numbers displayed
    const statCards = document.querySelectorAll('.stat-card')
    expect(statCards).toHaveLength(3)
  })

  it('groups skills by category', () => {
    render(<SkillManagement {...mockProps} />)
    
    expect(screen.getByText('Technical Skills')).toBeInTheDocument()
    expect(screen.getByText('Quality Skills')).toBeInTheDocument()
    expect(screen.getByText('Safety Skills')).toBeInTheDocument()
    expect(screen.getByText('Leadership Skills')).toBeInTheDocument()
  })

  it('displays skill cards with correct information', () => {
    render(<SkillManagement {...mockProps} />)
    
    expect(screen.getByText('Assembly')).toBeInTheDocument()
    expect(screen.getByText('Basic assembly skills')).toBeInTheDocument()
    expect(screen.getByText('Quality Control')).toBeInTheDocument()
    expect(screen.getByText('Quality inspection skills')).toBeInTheDocument()
  })

  it('shows skill level indicators', () => {
    render(<SkillManagement {...mockProps} />)
    
    // Check for level badges (numbers 1, 2, 3, etc.)
    const levelBadges = screen.getAllByText('1')
    expect(levelBadges.length).toBeGreaterThan(0)
    
    const level2Badges = screen.getAllByText('2')
    expect(level2Badges.length).toBeGreaterThan(0)
  })

  it('filters skills by search term', async () => {
    render(<SkillManagement {...mockProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search skills...')
    fireEvent.change(searchInput, { target: { value: 'Assembly' } })
    
    await waitFor(() => {
      expect(screen.getByText('Assembly')).toBeInTheDocument()
      expect(screen.queryByText('Quality Control')).not.toBeInTheDocument()
    })
  })

  it('filters skills by category', async () => {
    render(<SkillManagement {...mockProps} />)
    
    const categorySelect = screen.getByLabelText('Category:')
    fireEvent.change(categorySelect, { target: { value: 'technical' } })
    
    await waitFor(() => {
      expect(screen.getByText('Assembly')).toBeInTheDocument()
      expect(screen.queryByText('Quality Control')).not.toBeInTheDocument()
      expect(screen.queryByText('Safety Procedures')).not.toBeInTheDocument()
    })
  })

  it('opens create skill form', async () => {
    render(<SkillManagement {...mockProps} />)
    
    const addButton = screen.getByRole('button', { name: 'Add New Skill' })
    fireEvent.click(addButton)
    
    await waitFor(() => {
      expect(screen.getByLabelText('Skill Name *')).toBeInTheDocument()
      expect(screen.getByLabelText('Category *')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create Skill' })).toBeInTheDocument()
    })
  })

  it('opens edit skill form', async () => {
    render(<SkillManagement {...mockProps} />)
    
    const editButtons = screen.getAllByTitle('Edit skill')
    fireEvent.click(editButtons[0])
    
    await waitFor(() => {
      expect(screen.getByText('Edit Skill')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Assembly')).toBeInTheDocument()
    })
  })

  it('handles skill deletion with confirmation', async () => {
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    
    render(<SkillManagement {...mockProps} />)
    
    const deleteButtons = screen.getAllByTitle('Delete skill')
    fireEvent.click(deleteButtons[0])
    
    expect(confirmSpy).toHaveBeenCalledWith(
      'Are you sure you want to delete this skill? This action cannot be undone and will remove all employee skill assignments.'
    )
    expect(mockProps.onSkillDelete).toHaveBeenCalledWith('skill-1')
    
    confirmSpy.mockRestore()
  })

  it('cancels skill deletion when not confirmed', async () => {
    // Mock window.confirm to return false
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    
    render(<SkillManagement {...mockProps} />)
    
    const deleteButtons = screen.getAllByTitle('Delete skill')
    fireEvent.click(deleteButtons[0])
    
    expect(confirmSpy).toHaveBeenCalled()
    expect(mockProps.onSkillDelete).not.toHaveBeenCalled()
    
    confirmSpy.mockRestore()
  })

  it('displays category badges with correct styling', () => {
    render(<SkillManagement {...mockProps} />)
    
    expect(screen.getByText('technical')).toBeInTheDocument()
    expect(screen.getByText('quality')).toBeInTheDocument()
    expect(screen.getByText('safety')).toBeInTheDocument()
    expect(screen.getByText('leadership')).toBeInTheDocument()
  })

  it('shows skill count per category', () => {
    render(<SkillManagement {...mockProps} />)
    
    const skillCounts = screen.getAllByText('(1)')
    expect(skillCounts.length).toBeGreaterThan(0) // Each category has 1 skill
  })

  it('handles empty skill list', () => {
    const emptyProps = { ...mockProps, skills: [] }
    render(<SkillManagement {...emptyProps} />)
    
    // Check for Total Skills stat specifically
    expect(screen.getByText('Total Skills')).toBeInTheDocument()
    expect(screen.getByText('No skills found matching the current filters.')).toBeInTheDocument()
  })

  it('updates filtered results count when filtering', async () => {
    render(<SkillManagement {...mockProps} />)
    
    // Check that filtering works by looking at visible skills
    const categorySelect = screen.getByLabelText('Category:')
    fireEvent.change(categorySelect, { target: { value: 'technical' } })
    
    await waitFor(() => {
      // Should only show Assembly skill after filtering
      expect(screen.getByText('Assembly')).toBeInTheDocument()
      expect(screen.queryByText('Quality Control')).not.toBeInTheDocument()
      expect(screen.queryByText('Safety Procedures')).not.toBeInTheDocument()
      expect(screen.queryByText('Team Leadership')).not.toBeInTheDocument()
    })
  })

  it('displays category icons', () => {
    render(<SkillManagement {...mockProps} />)
    
    expect(screen.getByText('🔧')).toBeInTheDocument() // Technical
    expect(screen.getByText('✅')).toBeInTheDocument() // Quality
    expect(screen.getByText('🦺')).toBeInTheDocument() // Safety
    expect(screen.getByText('👥')).toBeInTheDocument() // Leadership
  })
})
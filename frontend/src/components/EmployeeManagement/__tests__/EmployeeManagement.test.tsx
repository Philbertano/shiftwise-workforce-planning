import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { EmployeeManagement } from '../EmployeeManagement'
import { Employee, Skill, EmployeeSkill } from '../../../types'

// Mock data
const mockEmployees: Employee[] = [
  {
    id: 'emp-1',
    name: 'John Smith',
    contractType: 'full-time',
    weeklyHours: 40,
    maxHoursPerDay: 8,
    minRestHours: 11,
    team: 'Team Alpha',
    active: true
  },
  {
    id: 'emp-2',
    name: 'Sarah Johnson',
    contractType: 'part-time',
    weeklyHours: 20,
    maxHoursPerDay: 6,
    minRestHours: 11,
    team: 'Team Beta',
    active: false
  }
]

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
  }
]

const mockEmployeeSkills: EmployeeSkill[] = [
  {
    employeeId: 'emp-1',
    skillId: 'skill-1',
    level: 2,
    validUntil: new Date('2025-12-31'),
    certificationId: 'cert-1'
  }
]

const mockProps = {
  employees: mockEmployees,
  skills: mockSkills,
  employeeSkills: mockEmployeeSkills,
  onEmployeeCreate: vi.fn(),
  onEmployeeUpdate: vi.fn(),
  onEmployeeDelete: vi.fn(),
  onEmployeeSkillUpdate: vi.fn(),
  onEmployeeSkillDelete: vi.fn()
}

describe('EmployeeManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders employee management interface', () => {
    render(<EmployeeManagement {...mockProps} />)
    
    expect(screen.getByText('Employee Management')).toBeInTheDocument()
    expect(screen.getByText('Add New Employee')).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
  })

  it('displays employee count', () => {
    render(<EmployeeManagement {...mockProps} />)
    
    expect(screen.getByText('Employees (2)')).toBeInTheDocument()
  })

  it('filters employees by search term', async () => {
    render(<EmployeeManagement {...mockProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search employees...')
    fireEvent.change(searchInput, { target: { value: 'Smith' } })
    
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument()
      expect(screen.queryByText('Sarah Johnson')).not.toBeInTheDocument()
    })
  })

  it('filters employees by team', async () => {
    render(<EmployeeManagement {...mockProps} />)
    
    const teamSelect = screen.getByLabelText('Team:')
    fireEvent.change(teamSelect, { target: { value: 'Team Alpha' } })
    
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument()
      expect(screen.queryByText('Sarah Johnson')).not.toBeInTheDocument()
    })
  })

  it('filters employees by contract type', async () => {
    render(<EmployeeManagement {...mockProps} />)
    
    const contractSelect = screen.getByLabelText('Contract Type:')
    fireEvent.change(contractSelect, { target: { value: 'part-time' } })
    
    await waitFor(() => {
      expect(screen.queryByText('John Smith')).not.toBeInTheDocument()
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
    })
  })

  it('opens create employee form', async () => {
    render(<EmployeeManagement {...mockProps} />)
    
    const addButton = screen.getByRole('button', { name: 'Add New Employee' })
    fireEvent.click(addButton)
    
    await waitFor(() => {
      // Check for the modal form elements instead of duplicate text
      expect(screen.getByLabelText('Name *')).toBeInTheDocument()
      expect(screen.getByLabelText('Team *')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create Employee' })).toBeInTheDocument()
    })
  })

  it('opens edit employee form', async () => {
    render(<EmployeeManagement {...mockProps} />)
    
    const editButtons = screen.getAllByTitle('Edit employee')
    fireEvent.click(editButtons[0])
    
    await waitFor(() => {
      expect(screen.getByText('Edit Employee')).toBeInTheDocument()
      expect(screen.getByDisplayValue('John Smith')).toBeInTheDocument()
    })
  })

  it('handles employee deletion with confirmation', async () => {
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    
    render(<EmployeeManagement {...mockProps} />)
    
    const deleteButtons = screen.getAllByTitle('Delete employee')
    fireEvent.click(deleteButtons[0])
    
    expect(confirmSpy).toHaveBeenCalledWith(
      'Are you sure you want to delete this employee? This action cannot be undone.'
    )
    expect(mockProps.onEmployeeDelete).toHaveBeenCalledWith('emp-1')
    
    confirmSpy.mockRestore()
  })

  it('cancels employee deletion when not confirmed', async () => {
    // Mock window.confirm to return false
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    
    render(<EmployeeManagement {...mockProps} />)
    
    const deleteButtons = screen.getAllByTitle('Delete employee')
    fireEvent.click(deleteButtons[0])
    
    expect(confirmSpy).toHaveBeenCalled()
    expect(mockProps.onEmployeeDelete).not.toHaveBeenCalled()
    
    confirmSpy.mockRestore()
  })

  it('displays employee skills information', () => {
    render(<EmployeeManagement {...mockProps} />)
    
    expect(screen.getByText('1 skill')).toBeInTheDocument()
    expect(screen.getByText('No skills assigned')).toBeInTheDocument()
  })

  it('shows employee status correctly', () => {
    render(<EmployeeManagement {...mockProps} />)
    
    const statusElements = screen.getAllByText(/Active|Inactive/)
    expect(statusElements).toHaveLength(2)
  })

  it('shows contract types with proper styling', () => {
    render(<EmployeeManagement {...mockProps} />)
    
    expect(screen.getByText('full-time')).toBeInTheDocument()
    expect(screen.getByText('part-time')).toBeInTheDocument()
  })

  it('handles empty employee list', () => {
    const emptyProps = { ...mockProps, employees: [] }
    render(<EmployeeManagement {...emptyProps} />)
    
    expect(screen.getByText('Employees (0)')).toBeInTheDocument()
    expect(screen.getByText('No employees found matching the current filters.')).toBeInTheDocument()
  })

  it('expands employee skills when clicked', async () => {
    render(<EmployeeManagement {...mockProps} />)
    
    const expandButton = screen.getByText('▶')
    fireEvent.click(expandButton)
    
    await waitFor(() => {
      expect(screen.getByText('Skills & Qualifications')).toBeInTheDocument()
      expect(screen.getByText('Assembly')).toBeInTheDocument()
    })
  })
})
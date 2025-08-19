import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { QualificationMatrix } from '../QualificationMatrix'
import { Employee, Skill, EmployeeSkill, Station } from '../../../types'

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
    contractType: 'full-time',
    weeklyHours: 40,
    maxHoursPerDay: 8,
    minRestHours: 11,
    team: 'Team Beta',
    active: true
  },
  {
    id: 'emp-3',
    name: 'Mike Wilson',
    contractType: 'part-time',
    weeklyHours: 20,
    maxHoursPerDay: 6,
    minRestHours: 11,
    team: 'Team Alpha',
    active: true
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
  },
  {
    id: 'skill-3',
    name: 'Safety',
    description: 'Safety procedures',
    levelScale: 3,
    category: 'safety'
  }
]

// Create dates relative to current time for testing
const now = new Date()
const futureDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) // 60 days from now
const expiringDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000) // 15 days from now (expiring)
const expiredDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago (expired)

const mockEmployeeSkills: EmployeeSkill[] = [
  {
    employeeId: 'emp-1',
    skillId: 'skill-1',
    level: 2,
    validUntil: futureDate,
    certificationId: 'cert-1'
  },
  {
    employeeId: 'emp-1',
    skillId: 'skill-2',
    level: 1,
    validUntil: expiringDate, // Expiring soon
    certificationId: 'cert-2'
  },
  {
    employeeId: 'emp-2',
    skillId: 'skill-1',
    level: 3,
    validUntil: futureDate,
    certificationId: 'cert-3'
  },
  {
    employeeId: 'emp-2',
    skillId: 'skill-3',
    level: 2,
    validUntil: expiredDate, // Expired
    certificationId: 'cert-4'
  },
  {
    employeeId: 'emp-3',
    skillId: 'skill-2',
    level: 1,
    certificationId: 'cert-5'
  }
]

const mockStations: Station[] = [
  {
    id: 'station-1',
    name: 'Assembly Line A',
    line: 'Production Line 1',
    priority: 'high',
    requiredSkills: [
      { skillId: 'skill-1', minLevel: 2, count: 2, mandatory: true },
      { skillId: 'skill-3', minLevel: 1, count: 1, mandatory: false }
    ]
  },
  {
    id: 'station-2',
    name: 'Quality Control',
    line: 'Production Line 1',
    priority: 'critical',
    requiredSkills: [
      { skillId: 'skill-2', minLevel: 2, count: 1, mandatory: true }
    ]
  }
]

const mockProps = {
  employees: mockEmployees,
  skills: mockSkills,
  employeeSkills: mockEmployeeSkills,
  stations: mockStations,
  onSkillUpdate: vi.fn(),
  onBulkUpdate: vi.fn()
}

describe('QualificationMatrix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the qualification matrix with employees and skills', () => {
    render(<QualificationMatrix {...mockProps} />)
    
    expect(screen.getByText('Qualification Matrix')).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
    expect(screen.getByText('Mike Wilson')).toBeInTheDocument()
    
    // Check skills in table headers specifically
    const skillHeaders = document.querySelectorAll('.skill-header .skill-name')
    const skillNames = Array.from(skillHeaders).map(header => header.textContent)
    expect(skillNames).toContain('Assembly')
    expect(skillNames).toContain('Quality Control')
    expect(skillNames).toContain('Safety')
  })

  it('displays skill levels correctly', () => {
    render(<QualificationMatrix {...mockProps} />)
    
    // Check that skill levels are displayed
    const levelCells = screen.getAllByText('2')
    expect(levelCells.length).toBeGreaterThan(0)
    
    const level3Cells = screen.getAllByText('3')
    expect(level3Cells.length).toBeGreaterThan(0)
  })

  it('highlights expiring and expired qualifications', () => {
    render(<QualificationMatrix {...mockProps} />)
    
    // Check for expiring and expired cells (by class names)
    const expiringCells = document.querySelectorAll('.expiring')
    const expiredCells = document.querySelectorAll('.expired')
    
    expect(expiringCells.length).toBeGreaterThan(0)
    expect(expiredCells.length).toBeGreaterThan(0)
  })

  it('filters employees by search term', async () => {
    render(<QualificationMatrix {...mockProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search employees...')
    fireEvent.change(searchInput, { target: { value: 'Smith' } })
    
    await waitFor(() => {
      // Check that only John Smith row is visible in the table body
      const employeeRows = document.querySelectorAll('tbody tr')
      expect(employeeRows).toHaveLength(1)
      
      const visibleEmployeeName = employeeRows[0].querySelector('.employee-name')
      expect(visibleEmployeeName).toHaveTextContent('John Smith')
    })
  })

  it('filters by station', async () => {
    render(<QualificationMatrix {...mockProps} />)
    
    const stationSelect = screen.getByLabelText('Station:')
    fireEvent.change(stationSelect, { target: { value: 'station-1' } })
    
    await waitFor(() => {
      // Should show skills required by station-1 (Assembly and Safety)
      const skillHeaders = document.querySelectorAll('.skill-header .skill-name')
      const skillNames = Array.from(skillHeaders).map(header => header.textContent)
      expect(skillNames).toContain('Assembly')
      expect(skillNames).toContain('Safety')
      expect(skillNames).not.toContain('Quality Control')
    })
  })

  it('filters by expiration status', async () => {
    render(<QualificationMatrix {...mockProps} />)
    
    const expirationSelect = screen.getByLabelText('Expiration:')
    fireEvent.change(expirationSelect, { target: { value: 'expired' } })
    
    await waitFor(() => {
      // Should only show employees with expired qualifications
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
      // Other employees might not be visible if they don't have expired qualifications
    })
  })

  it('handles single cell click to update skill level', () => {
    render(<QualificationMatrix {...mockProps} />)
    
    // Find a qualification cell and click it
    const qualificationCells = document.querySelectorAll('.qualification-cell')
    const firstCell = qualificationCells[0] as HTMLElement
    
    fireEvent.click(firstCell)
    
    expect(mockProps.onSkillUpdate).toHaveBeenCalled()
  })

  it('enables bulk edit mode', async () => {
    render(<QualificationMatrix {...mockProps} />)
    
    const bulkEditButton = screen.getByText('Bulk Edit')
    fireEvent.click(bulkEditButton)
    
    await waitFor(() => {
      expect(screen.getByText('Cancel Bulk Edit')).toBeInTheDocument()
      expect(screen.getByText(/Update Selected/)).toBeInTheDocument()
    })
  })

  it('handles bulk selection and update', async () => {
    render(<QualificationMatrix {...mockProps} />)
    
    // Enable bulk edit mode
    const bulkEditButton = screen.getByText('Bulk Edit')
    fireEvent.click(bulkEditButton)
    
    await waitFor(() => {
      expect(screen.getByText('Cancel Bulk Edit')).toBeInTheDocument()
    })
    
    // Select some cells
    const qualificationCells = document.querySelectorAll('.qualification-cell')
    fireEvent.click(qualificationCells[0])
    fireEvent.click(qualificationCells[1])
    
    // Set bulk edit level - find the select in bulk edit controls
    const bulkEditControls = document.querySelector('.bulk-edit-controls')
    const levelSelect = bulkEditControls?.querySelector('select') as HTMLSelectElement
    expect(levelSelect).toBeTruthy()
    fireEvent.change(levelSelect, { target: { value: '2' } })
    
    // Perform bulk update
    const updateButton = screen.getByText(/Update Selected/)
    fireEvent.click(updateButton)
    
    expect(mockProps.onBulkUpdate).toHaveBeenCalled()
  })

  it('displays legend correctly', () => {
    render(<QualificationMatrix {...mockProps} />)
    
    // Check legend items by looking in the legend container
    const legend = document.querySelector('.matrix-legend')
    expect(legend).toBeTruthy()
    
    const legendItems = legend?.querySelectorAll('.legend-item span:last-child')
    const legendTexts = Array.from(legendItems || []).map(item => item.textContent)
    
    expect(legendTexts).toContain('No Skill')
    expect(legendTexts).toContain('Level 1')
    expect(legendTexts).toContain('Level 2')
    expect(legendTexts).toContain('Level 3')
    expect(legendTexts).toContain('Expiring Soon')
    expect(legendTexts).toContain('Expired')
  })

  it('shows employee team information', () => {
    render(<QualificationMatrix {...mockProps} />)
    
    expect(screen.getAllByText('Team Alpha')).toHaveLength(2) // Two employees in Team Alpha
    expect(screen.getByText('Team Beta')).toBeInTheDocument()
  })

  it('shows skill categories', () => {
    render(<QualificationMatrix {...mockProps} />)
    
    expect(screen.getByText('technical')).toBeInTheDocument()
    expect(screen.getByText('quality')).toBeInTheDocument()
    expect(screen.getByText('safety')).toBeInTheDocument()
  })

  it('handles empty employee skills gracefully', () => {
    const propsWithoutSkills = {
      ...mockProps,
      employeeSkills: []
    }
    
    render(<QualificationMatrix {...propsWithoutSkills} />)
    
    // Should still render the matrix structure
    expect(screen.getByText('Qualification Matrix')).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    
    // All cells should show no skill level
    const dashCells = screen.getAllByText('-')
    expect(dashCells.length).toBeGreaterThan(0)
  })

  it('handles skill filtering correctly', async () => {
    render(<QualificationMatrix {...mockProps} />)
    
    const skillSelect = screen.getByLabelText('Skill:')
    fireEvent.change(skillSelect, { target: { value: 'skill-1' } })
    
    await waitFor(() => {
      // Check that only Assembly skill column is shown in the table header
      const skillHeaders = document.querySelectorAll('.skill-header .skill-name')
      expect(skillHeaders).toHaveLength(1)
      expect(skillHeaders[0]).toHaveTextContent('Assembly')
    })
  })
})
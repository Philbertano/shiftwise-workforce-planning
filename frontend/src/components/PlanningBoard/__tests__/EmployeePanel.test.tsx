import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom';
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { EmployeePanel } from '../EmployeePanel'
import { Employee } from '../../../types'

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
    active: true
  },
  {
    id: 'emp-3',
    name: 'Mike Wilson',
    contractType: 'temporary',
    weeklyHours: 30,
    maxHoursPerDay: 8,
    minRestHours: 11,
    team: 'Team Alpha',
    active: false
  }
]

const renderWithDnd = (component: React.ReactElement) => {
  return render(
    <DndProvider backend={HTML5Backend}>
      {component}
    </DndProvider>
  )
}

describe('EmployeePanel', () => {
  it('renders all employees initially', () => {
    renderWithDnd(<EmployeePanel employees={mockEmployees} />)
    
    expect(screen.getByText('Employees (3)')).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
    expect(screen.getByText('Mike Wilson')).toBeInTheDocument()
  })

  it('filters employees by search term', () => {
    renderWithDnd(<EmployeePanel employees={mockEmployees} />)
    
    const searchInput = screen.getByPlaceholderText('Search employees...')
    fireEvent.change(searchInput, { target: { value: 'Smith' } })
    
    expect(screen.getByText('Employees (1)')).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.queryByText('Sarah Johnson')).not.toBeInTheDocument()
  })

  it('filters employees by team', () => {
    renderWithDnd(<EmployeePanel employees={mockEmployees} />)
    
    const teamSelect = screen.getByDisplayValue('All Teams')
    fireEvent.change(teamSelect, { target: { value: 'Team Alpha' } })
    
    expect(screen.getByText('Employees (2)')).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getByText('Mike Wilson')).toBeInTheDocument()
    expect(screen.queryByText('Sarah Johnson')).not.toBeInTheDocument()
  })

  it('filters employees by active status', () => {
    renderWithDnd(<EmployeePanel employees={mockEmployees} />)
    
    const statusSelect = screen.getByDisplayValue('All Status')
    fireEvent.change(statusSelect, { target: { value: 'true' } })
    
    expect(screen.getByText('Employees (2)')).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
    expect(screen.queryByText('Mike Wilson')).not.toBeInTheDocument()
  })

  it('combines multiple filters', () => {
    renderWithDnd(<EmployeePanel employees={mockEmployees} />)
    
    const searchInput = screen.getByPlaceholderText('Search employees...')
    const teamSelect = screen.getByDisplayValue('All Teams')
    
    fireEvent.change(searchInput, { target: { value: 'Smith' } })
    fireEvent.change(teamSelect, { target: { value: 'Team Alpha' } })
    
    expect(screen.getByText('Employees (1)')).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
  })

  it('displays employee details correctly', () => {
    renderWithDnd(<EmployeePanel employees={mockEmployees} />)
    
    expect(screen.getAllByText('Team Alpha')).toHaveLength(3) // 2 employees + 1 filter option
    expect(screen.getByText('full-time')).toBeInTheDocument()
    expect(screen.getByText('40h/week, max 8h/day')).toBeInTheDocument()
  })

  it('shows active/inactive status indicators', () => {
    renderWithDnd(<EmployeePanel employees={mockEmployees} />)
    
    const employeeItems = screen.getAllByText('●')
    expect(employeeItems).toHaveLength(2) // Two active employees
    
    const inactiveItems = screen.getAllByText('○')
    expect(inactiveItems).toHaveLength(1) // One inactive employee
  })

  it('applies correct styling to inactive employees', () => {
    const { container } = renderWithDnd(<EmployeePanel employees={mockEmployees} />)
    
    const mikeWilsonItem = screen.getByText('Mike Wilson').closest('.employee-item')
    expect(mikeWilsonItem).toHaveClass('inactive')
  })

  it('shows drag hint', () => {
    renderWithDnd(<EmployeePanel employees={mockEmployees} />)
    
    expect(screen.getByText('💡 Drag employees to assign them to shifts')).toBeInTheDocument()
  })

  it('populates team filter options correctly', () => {
    renderWithDnd(<EmployeePanel employees={mockEmployees} />)
    
    const teamSelect = screen.getByDisplayValue('All Teams')
    fireEvent.click(teamSelect)
    
    expect(screen.getAllByText('Team Alpha')).toHaveLength(3) // 2 employees + 1 filter option
    expect(screen.getAllByText('Team Beta')).toHaveLength(2) // 1 employee + 1 filter option
  })

  it('handles empty employee list', () => {
    renderWithDnd(<EmployeePanel employees={[]} />)
    
    expect(screen.getByText('Employees (0)')).toBeInTheDocument()
  })

  it('clears filters when search is cleared', () => {
    renderWithDnd(<EmployeePanel employees={mockEmployees} />)
    
    const searchInput = screen.getByPlaceholderText('Search employees...')
    fireEvent.change(searchInput, { target: { value: 'Smith' } })
    
    // Wait for the filter to apply
    expect(screen.getByDisplayValue('Smith')).toBeInTheDocument()
    
    fireEvent.change(searchInput, { target: { value: '' } })
    expect(screen.getByText('Employees (3)')).toBeInTheDocument()
  })
})
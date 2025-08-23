import React from 'react'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Navigation } from '../Navigation'

const NavigationWithRouter = () => (
  <BrowserRouter>
    <Navigation />
  </BrowserRouter>
)

describe('Navigation', () => {
  it('should render all navigation links', () => {
    render(<NavigationWithRouter />)
    
    // Check that all navigation items are present
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Planning Board')).toBeInTheDocument()
    expect(screen.getByText('Employees')).toBeInTheDocument()
    expect(screen.getByText('Skills')).toBeInTheDocument()
    expect(screen.getByText('Qualification Matrix')).toBeInTheDocument()
    expect(screen.getByText('Coverage Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Plan Approval')).toBeInTheDocument()
    expect(screen.getByText('Execution Monitoring')).toBeInTheDocument()
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
  })

  it('should render ShiftWise title', () => {
    render(<NavigationWithRouter />)
    
    expect(screen.getByText('ShiftWise')).toBeInTheDocument()
    expect(screen.getByText('Workforce Planning')).toBeInTheDocument()
  })

  it('should have correct links', () => {
    render(<NavigationWithRouter />)
    
    const dashboardLink = screen.getByRole('link', { name: /📊 Dashboard/i })
    const planningLink = screen.getByRole('link', { name: /📅 Planning Board/i })
    const employeesLink = screen.getByRole('link', { name: /👥 Employees/i })
    const qualificationsLink = screen.getByRole('link', { name: /📋 Qualification Matrix/i })
    
    expect(dashboardLink).toHaveAttribute('href', '/')
    expect(planningLink).toHaveAttribute('href', '/planning')
    expect(employeesLink).toHaveAttribute('href', '/employees')
    expect(qualificationsLink).toHaveAttribute('href', '/qualifications')
  })
})
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
  it('should render all navigation links with automotive terminology', () => {
    render(<NavigationWithRouter />)
    
    // Check that all navigation items are present with automotive terminology
    expect(screen.getByText('Manufacturing Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Shift Planning')).toBeInTheDocument()
    expect(screen.getByText('Manufacturing Teams')).toBeInTheDocument()
    expect(screen.getByText('Production Lines')).toBeInTheDocument()
    expect(screen.getByText('Technical Skills')).toBeInTheDocument()
    expect(screen.getByText('Safety Certifications')).toBeInTheDocument()
    expect(screen.getByText('Line Coverage')).toBeInTheDocument()
    expect(screen.getByText('Shift Approval')).toBeInTheDocument()
    expect(screen.getByText('Production Monitor')).toBeInTheDocument()
    expect(screen.getByText('Manufacturing AI')).toBeInTheDocument()
  })

  it('should have automotive theme classes applied', () => {
    render(<NavigationWithRouter />)
    
    const navigation = document.querySelector('.navigation')
    expect(navigation).toHaveClass('automotive-theme')
    
    const navHeader = document.querySelector('.nav-header')
    expect(navHeader).toHaveClass('automotive')
  })

  it('should have correct links with automotive icons', () => {
    render(<NavigationWithRouter />)
    
    const dashboardLink = screen.getByRole('link', { name: /⚙️ Manufacturing Dashboard/i })
    const planningLink = screen.getByRole('link', { name: /📋 Shift Planning/i })
    const employeesLink = screen.getByRole('link', { name: /👥 Manufacturing Teams/i })
    const stationsLink = screen.getByRole('link', { name: /🏭 Production Lines/i })
    
    expect(dashboardLink).toHaveAttribute('href', '/')
    expect(planningLink).toHaveAttribute('href', '/planning')
    expect(employeesLink).toHaveAttribute('href', '/employees')
    expect(stationsLink).toHaveAttribute('href', '/stations')
  })

  it('should apply correct data attributes for manufacturing context', () => {
    render(<NavigationWithRouter />)
    
    const manufacturingLinks = document.querySelectorAll('[data-context="manufacturing"]')
    expect(manufacturingLinks.length).toBeGreaterThan(0)
    
    const productionSections = document.querySelectorAll('[data-section="production"]')
    expect(productionSections.length).toBeGreaterThan(0)
    
    const safetySections = document.querySelectorAll('[data-section="safety"]')
    expect(safetySections.length).toBeGreaterThan(0)
  })
})
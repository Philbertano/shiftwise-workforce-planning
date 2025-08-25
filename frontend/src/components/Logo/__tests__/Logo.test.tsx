import React from 'react'
import { render, screen } from '@testing-library/react'
import { Logo } from '../Logo'

describe('Logo Component', () => {
  it('renders with default props', () => {
    render(<Logo />)
    expect(screen.getByText('ShiftWise')).toBeInTheDocument()
    expect(screen.getByText('Automotive Manufacturing')).toBeInTheDocument()
  })

  it('renders without text when showText is false', () => {
    render(<Logo showText={false} />)
    expect(screen.queryByText('ShiftWise')).not.toBeInTheDocument()
    expect(screen.queryByText('Automotive Manufacturing')).not.toBeInTheDocument()
  })

  it('applies correct size classes', () => {
    const { container } = render(<Logo size="large" />)
    expect(container.firstChild).toHaveClass('logo--large')
  })

  it('applies correct variant classes', () => {
    const { container } = render(<Logo variant="automotive" />)
    expect(container.firstChild).toHaveClass('logo--automotive')
  })

  it('renders SVG with gear elements', () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveClass('logo__svg')
    
    // Check for gear elements
    const mainGear = container.querySelector('.logo__gear-main')
    const secondaryGear = container.querySelector('.logo__gear-secondary')
    const productionLine = container.querySelector('.logo__production-line')
    
    expect(mainGear).toBeInTheDocument()
    expect(secondaryGear).toBeInTheDocument()
    expect(productionLine).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('viewBox', '0 0 64 64')
  })
})
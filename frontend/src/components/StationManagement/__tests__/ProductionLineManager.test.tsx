import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom';
import { ProductionLineManager } from '../ProductionLineManager'

// Mock the production line service
vi.mock('../../../services/productionLineService', () => ({
  productionLineService: {
    getProductionLines: vi.fn().mockResolvedValue([
      { id: '1', name: 'Engine Assembly Line 1', type: 'assembly', taktTime: 120, capacity: 30, active: true },
      { id: '2', name: 'Paint Booth 1', type: 'paint', taktTime: 300, capacity: 12, active: true }
    ]),
    createProductionLine: vi.fn().mockResolvedValue({
      id: '3', name: 'New Line', type: 'assembly', taktTime: 120, capacity: 30, active: true
    })
  }
}))

const mockProps = {
  onClose: vi.fn(),
  onProductionLineCreated: vi.fn()
}

describe('ProductionLineManager', () => {
  it('renders production line manager with existing lines', async () => {
    render(<ProductionLineManager {...mockProps} />)

    expect(screen.getByText('Production Line Management')).toBeInTheDocument()
    expect(screen.getByText('Create New Production Line')).toBeInTheDocument()
    
    // Wait for production lines to load
    await waitFor(() => {
      expect(screen.getByText('Engine Assembly Line 1')).toBeInTheDocument()
      expect(screen.getByText('Paint Booth 1')).toBeInTheDocument()
    })
  })

  it('shows form fields for creating new production line', () => {
    render(<ProductionLineManager {...mockProps} />)

    expect(screen.getByLabelText(/Production Line Name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Line Type/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Takt Time/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Capacity/)).toBeInTheDocument()
  })

  it('handles close button click', () => {
    render(<ProductionLineManager {...mockProps} />)

    const closeButton = screen.getByText('✕ Close')
    fireEvent.click(closeButton)

    expect(mockProps.onClose).toHaveBeenCalled()
  })
})
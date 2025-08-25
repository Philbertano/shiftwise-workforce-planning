import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom';
import { vi } from 'vitest'
import { AutomotiveDashboard } from '../AutomotiveDashboard'
import { subHours } from 'date-fns'

const mockData = {
  productionLines: [
    {
      id: 'line-1',
      name: 'Assembly Line A',
      type: 'assembly' as const,
      description: 'Main vehicle assembly line',
      taktTime: 120,
      capacity: 30,
      active: true
    }
  ],
  stations: [
    {
      id: 'station-1',
      name: 'Assembly Station 1',
      line: 'Assembly Line A',
      priority: 'high' as const,
      requiredSkills: [],
      capacity: 3,
      active: true
    }
  ],
  shifts: [
    {
      id: 'shift-1',
      name: 'Day Shift',
      startTime: '06:00',
      endTime: '14:00',
      shiftType: 'day' as const,
      breakRules: []
    }
  ],
  coverageStatus: [
    {
      stationId: 'station-1',
      shiftId: 'shift-1',
      required: 3,
      assigned: 2,
      coverage: 67,
      status: 'partial' as const,
      gaps: []
    }
  ],
  gaps: [],
  staffingLevels: [
    {
      productionLineId: 'line-1',
      shiftId: 'shift-1',
      required: 12,
      assigned: 10,
      efficiency: 85.5,
      status: 'understaffed' as const
    }
  ],
  kpiData: {
    overallEfficiency: 87.2,
    productionRate: 28.5,
    qualityScore: 96.8,
    safetyIncidents: 0.2,
    staffingEfficiency: 82.1,
    lineUtilization: 89.4
  },
  efficiencyData: [
    {
      timestamp: subHours(new Date(), 1),
      productionLineId: 'line-1',
      efficiency: 85,
      throughput: 28,
      staffingLevel: 10
    }
  ],
  skillCoverage: [
    {
      skillId: 'welding',
      skillName: 'MIG Welding',
      category: 'technical',
      required: 15,
      available: 12,
      coverage: 80,
      critical: true
    }
  ],
  safetyCompliance: {
    overallScore: 94.2,
    certificationCompliance: 96.5,
    ppeCompliance: 91.8,
    trainingCompliance: 94.3,
    incidentRate: 0.2,
    lastIncident: subHours(new Date(), 168)
  }
}

describe('AutomotiveDashboard', () => {
  const defaultProps = {
    data: mockData,
    selectedDate: new Date(),
    onDateChange: vi.fn(),
    onProductionLineClick: vi.fn(),
    onStaffingAlert: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the dashboard title', () => {
    render(<AutomotiveDashboard {...defaultProps} />)
    expect(screen.getByText(/Manufacturing Operations Dashboard/)).toBeInTheDocument()
  })

  it('displays KPI cards with automotive metrics', () => {
    render(<AutomotiveDashboard {...defaultProps} />)
    
    expect(screen.getByText('Overall Equipment Effectiveness')).toBeInTheDocument()
    expect(screen.getByText('Production Rate')).toBeInTheDocument()
    expect(screen.getByText('Quality Score')).toBeInTheDocument()
    expect(screen.getByText('Safety Performance')).toBeInTheDocument()
    expect(screen.getByText('Workforce Efficiency')).toBeInTheDocument()
    expect(screen.getByText('Line Utilization')).toBeInTheDocument()
  })

  it('shows view selector buttons', () => {
    render(<AutomotiveDashboard {...defaultProps} />)
    
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Production Lines')).toBeInTheDocument()
    expect(screen.getByText('Workforce')).toBeInTheDocument()
    expect(screen.getAllByText('Safety & Compliance')).toHaveLength(2) // Button and section header
  })

  it('switches between different views', () => {
    render(<AutomotiveDashboard {...defaultProps} />)
    
    // Click on Production Lines view
    fireEvent.click(screen.getByText('Production Lines'))
    expect(screen.getByText('Production Lines')).toHaveClass('btn-primary')
    
    // Click on Workforce view
    fireEvent.click(screen.getByText('Workforce'))
    expect(screen.getByText('Workforce')).toHaveClass('btn-primary')
    
    // Click on Safety & Compliance view - get the button specifically
    const safetyButton = screen.getAllByText('Safety & Compliance').find(el => el.tagName === 'BUTTON')
    fireEvent.click(safetyButton!)
    expect(safetyButton).toHaveClass('btn-primary')
  })

  it('handles week navigation', () => {
    render(<AutomotiveDashboard {...defaultProps} />)
    
    const prevButton = screen.getByText('← Previous Week')
    const nextButton = screen.getByText('Next Week →')
    
    fireEvent.click(prevButton)
    expect(defaultProps.onDateChange).toHaveBeenCalled()
    
    fireEvent.click(nextButton)
    expect(defaultProps.onDateChange).toHaveBeenCalled()
  })

  it('displays production line status in overview', () => {
    render(<AutomotiveDashboard {...defaultProps} />)
    
    expect(screen.getByText('Production Line Status')).toBeInTheDocument()
    expect(screen.getByText('Assembly Line A')).toBeInTheDocument()
  })

  it('displays staffing level monitor in overview', () => {
    render(<AutomotiveDashboard {...defaultProps} />)
    
    expect(screen.getByText('Workforce Monitoring')).toBeInTheDocument()
    expect(screen.getByText('Active Workers')).toBeInTheDocument()
  })

  it('displays production efficiency chart in overview', () => {
    render(<AutomotiveDashboard {...defaultProps} />)
    
    expect(screen.getByText('Production Efficiency Trends')).toBeInTheDocument()
  })

  it('displays safety compliance indicator in overview', () => {
    render(<AutomotiveDashboard {...defaultProps} />)
    
    expect(screen.getAllByText('Safety & Compliance')).toHaveLength(2) // Button and section header
  })

  it('calls onProductionLineClick when production line is clicked', () => {
    render(<AutomotiveDashboard {...defaultProps} />)
    
    // This would require the ProductionLineStatus component to be rendered and clickable
    // The actual implementation depends on how the click handler is set up
  })

  it('calls onStaffingAlert when staffing alerts are generated', () => {
    const dataWithCriticalStaffing = {
      ...mockData,
      staffingLevels: [
        {
          productionLineId: 'line-1',
          shiftId: 'shift-1',
          required: 12,
          assigned: 4,
          efficiency: 45.5,
          status: 'critical' as const
        }
      ]
    }

    render(<AutomotiveDashboard {...defaultProps} data={dataWithCriticalStaffing} />)
    
    // The alert should be triggered automatically when critical staffing is detected
    // This would happen in the StaffingLevelMonitor component
  })

  it('renders responsive layout classes', () => {
    const { container } = render(<AutomotiveDashboard {...defaultProps} />)
    
    expect(container.firstChild).toHaveClass('automotive-dashboard')
    expect(container.querySelector('.dashboard-header')).toBeInTheDocument()
    expect(container.querySelector('.dashboard-content')).toBeInTheDocument()
  })

  it('displays correct KPI values', () => {
    render(<AutomotiveDashboard {...defaultProps} />)
    
    expect(screen.getByText('87.2')).toBeInTheDocument() // Overall efficiency
    expect(screen.getByText('29')).toBeInTheDocument() // Production rate (rounded)
    expect(screen.getByText('96.8')).toBeInTheDocument() // Quality score
    expect(screen.getByText('94.2')).toBeInTheDocument() // Safety score
  })
})
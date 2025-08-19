import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { CoverageDashboard } from '../CoverageDashboard'
import { CoverageStatus, Gap, Station, ShiftTemplate } from '../../../types'

const mockStations: Station[] = [
  {
    id: 'station-1',
    name: 'Assembly Line A',
    line: 'Production Line 1',
    priority: 'high',
    requiredSkills: [
      { skillId: 'skill-1', minLevel: 2, count: 2, mandatory: true }
    ]
  }
]

const mockShifts: ShiftTemplate[] = [
  {
    id: 'shift-1',
    name: 'Day Shift',
    startTime: '06:00',
    endTime: '14:00',
    shiftType: 'day',
    breakRules: []
  }
]

const mockCoverageStatus: CoverageStatus[] = [
  {
    stationId: 'station-1',
    shiftId: 'shift-1',
    required: 2,
    assigned: 1,
    coverage: 50,
    status: 'critical',
    gaps: []
  }
]

const mockGaps: Gap[] = [
  {
    id: 'gap-1',
    stationId: 'station-1',
    shiftId: 'shift-1',
    skillId: 'skill-1',
    count: 1,
    criticality: 'high',
    impact: 'Production delay possible'
  }
]

const mockData = {
  coverageStatus: mockCoverageStatus,
  gaps: mockGaps,
  stations: mockStations,
  shifts: mockShifts,
  historicalCoverage: []
}

const mockProps = {
  data: mockData,
  selectedDate: new Date('2024-01-15'),
  onDateChange: vi.fn(),
  onGapClick: vi.fn()
}

describe('CoverageDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard with summary statistics', () => {
    render(<CoverageDashboard {...mockProps} />)
    
    expect(screen.getByText('Coverage Dashboard - Week of Jan 15, 2024')).toBeInTheDocument()
    expect(screen.getByText('50.0%')).toBeInTheDocument() // Average coverage
    expect(screen.getByText('Average Coverage')).toBeInTheDocument()
  })

  it('displays view selector buttons', () => {
    render(<CoverageDashboard {...mockProps} />)
    
    expect(screen.getByText('Heatmap')).toBeInTheDocument()
    expect(screen.getByText('Trends')).toBeInTheDocument()
    expect(screen.getByText('Risk Analysis')).toBeInTheDocument()
  })

  it('switches between different views', () => {
    render(<CoverageDashboard {...mockProps} />)
    
    // Default view should be heatmap
    expect(screen.getByText('Coverage Heatmap')).toBeInTheDocument()
    
    // Switch to trends view
    fireEvent.click(screen.getByText('Trends'))
    expect(screen.getByText('Coverage Trends')).toBeInTheDocument() // Without the (Last 30 Days) part when no data
    
    // Switch to risk analysis view
    fireEvent.click(screen.getByText('Risk Analysis'))
    expect(screen.getAllByText('Risk Analysis')).toHaveLength(2) // One in button, one in header
  })

  it('handles week navigation', () => {
    render(<CoverageDashboard {...mockProps} />)
    
    const nextWeekButton = screen.getByText('Next Week →')
    fireEvent.click(nextWeekButton)
    
    expect(mockProps.onDateChange).toHaveBeenCalled()
  })

  it('displays gap list in sidebar', () => {
    render(<CoverageDashboard {...mockProps} />)
    
    expect(screen.getByText('Coverage Gaps (1)')).toBeInTheDocument()
    expect(screen.getAllByText('Assembly Line A')).toHaveLength(2) // One in heatmap, one in gap list
    expect(screen.getAllByText('Day Shift')).toHaveLength(2) // One in heatmap, one in gap list
  })

  it('shows correct summary statistics', () => {
    render(<CoverageDashboard {...mockProps} />)
    
    expect(screen.getAllByText('0')).toHaveLength(2) // Fully covered and partial coverage
    expect(screen.getAllByText('1')).toHaveLength(2) // Critical gaps and gap count in sidebar
  })

  it('handles gap click events', () => {
    render(<CoverageDashboard {...mockProps} />)
    
    const gapItem = screen.getAllByText('Assembly Line A')[1].closest('.gap-item') // Get the one in the sidebar
    fireEvent.click(gapItem!)
    
    expect(mockProps.onGapClick).toHaveBeenCalledWith(mockGaps[0])
  })

  it('displays historical trends when data is available', () => {
    const dataWithHistory = {
      ...mockData,
      historicalCoverage: [
        {
          date: new Date('2024-01-14'),
          averageCoverage: 85,
          criticalGaps: 2,
          totalGaps: 3
        },
        {
          date: new Date('2024-01-15'),
          averageCoverage: 90,
          criticalGaps: 1,
          totalGaps: 2
        }
      ]
    }

    const propsWithHistory = {
      ...mockProps,
      data: dataWithHistory,
      selectedDate: new Date('2024-01-15') // Set date to match the data
    }

    render(<CoverageDashboard {...propsWithHistory} />)
    
    // Switch to trends view
    fireEvent.click(screen.getByText('Trends'))
    
    // Just check that the trends view is displayed
    expect(screen.getByText('Coverage Trends (Last 30 Days)')).toBeInTheDocument()
    expect(screen.getAllByText('Average Coverage')).toHaveLength(2) // One in header, one in trends
  })

  it('shows no data message when no historical data available', () => {
    render(<CoverageDashboard {...mockProps} />)
    
    // Switch to trends view
    fireEvent.click(screen.getByText('Trends'))
    
    expect(screen.getByText('No historical data available for trend analysis')).toBeInTheDocument()
  })
})
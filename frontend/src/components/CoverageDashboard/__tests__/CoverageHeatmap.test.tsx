import React from 'react'
import { render, screen } from '@testing-library/react'
import { CoverageHeatmap } from '../CoverageHeatmap'
import { Station, ShiftTemplate, CoverageStatus } from '../../../types'

const mockStations: Station[] = [
  {
    id: 'station-1',
    name: 'Assembly Line A',
    line: 'Production Line 1',
    priority: 'high',
    requiredSkills: [
      { skillId: 'skill-1', minLevel: 2, count: 2, mandatory: true }
    ]
  },
  {
    id: 'station-2',
    name: 'Quality Control',
    line: 'Production Line 1',
    priority: 'critical',
    requiredSkills: [
      { skillId: 'skill-2', minLevel: 3, count: 1, mandatory: true }
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
  },
  {
    id: 'shift-2',
    name: 'Night Shift',
    startTime: '22:00',
    endTime: '06:00',
    shiftType: 'night',
    breakRules: []
  }
]

const weekDates = [
  new Date('2024-01-15'), // Monday
  new Date('2024-01-16'), // Tuesday
  new Date('2024-01-17'), // Wednesday
  new Date('2024-01-18'), // Thursday
  new Date('2024-01-19'), // Friday
  new Date('2024-01-20'), // Saturday
  new Date('2024-01-21')  // Sunday
]

const mockGetCoverageForSlot = (stationId: string, shiftId: string, date: Date): CoverageStatus | undefined => {
  if (stationId === 'station-1' && shiftId === 'shift-1' && date.getDate() === 15) {
    return {
      stationId: 'station-1',
      shiftId: 'shift-1',
      required: 2,
      assigned: 2,
      coverage: 100,
      status: 'full',
      gaps: []
    }
  }
  
  if (stationId === 'station-1' && shiftId === 'shift-1' && date.getDate() === 16) {
    return {
      stationId: 'station-1',
      shiftId: 'shift-1',
      required: 2,
      assigned: 1,
      coverage: 50,
      status: 'critical',
      gaps: [
        {
          id: 'gap-1',
          stationId: 'station-1',
          shiftId: 'shift-1',
          skillId: 'skill-1',
          count: 1,
          criticality: 'high',
          impact: 'Production delay'
        }
      ]
    }
  }
  
  return undefined
}

describe('CoverageHeatmap', () => {
  it('renders heatmap with stations and shifts', () => {
    render(
      <CoverageHeatmap
        stations={mockStations}
        shifts={mockShifts}
        weekDates={weekDates}
        getCoverageForSlot={mockGetCoverageForSlot}
      />
    )
    
    expect(screen.getByText('Coverage Heatmap')).toBeInTheDocument()
    expect(screen.getByText('Assembly Line A')).toBeInTheDocument()
    expect(screen.getByText('Quality Control')).toBeInTheDocument()
    expect(screen.getAllByText('Day Shift')).toHaveLength(2) // One for each station
    expect(screen.getAllByText('Night Shift')).toHaveLength(2) // One for each station
  })

  it('displays week dates in header', () => {
    render(
      <CoverageHeatmap
        stations={mockStations}
        shifts={mockShifts}
        weekDates={weekDates}
        getCoverageForSlot={mockGetCoverageForSlot}
      />
    )
    
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Tue')).toBeInTheDocument()
    expect(screen.getByText('Wed')).toBeInTheDocument()
    expect(screen.getByText('Thu')).toBeInTheDocument()
    expect(screen.getByText('Fri')).toBeInTheDocument()
    expect(screen.getByText('Sat')).toBeInTheDocument()
    expect(screen.getByText('Sun')).toBeInTheDocument()
  })

  it('shows coverage legend', () => {
    render(
      <CoverageHeatmap
        stations={mockStations}
        shifts={mockShifts}
        weekDates={weekDates}
        getCoverageForSlot={mockGetCoverageForSlot}
      />
    )
    
    expect(screen.getByText('Full Coverage (≥100%)')).toBeInTheDocument()
    expect(screen.getByText('Partial Coverage (90-99%)')).toBeInTheDocument()
    expect(screen.getByText('Critical Gap (<90%)')).toBeInTheDocument()
    expect(screen.getByText('No Data')).toBeInTheDocument()
  })

  it('displays coverage data correctly', () => {
    render(
      <CoverageHeatmap
        stations={mockStations}
        shifts={mockShifts}
        weekDates={weekDates}
        getCoverageForSlot={mockGetCoverageForSlot}
      />
    )
    
    // Full coverage cell
    expect(screen.getByText('2/2')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    
    // Critical coverage cell
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('1 gap')).toBeInTheDocument()
  })

  it('applies correct CSS classes for coverage levels', () => {
    const { container } = render(
      <CoverageHeatmap
        stations={mockStations}
        shifts={mockShifts}
        weekDates={weekDates}
        getCoverageForSlot={mockGetCoverageForSlot}
      />
    )
    
    expect(container.querySelector('.coverage-full')).toBeTruthy()
    expect(container.querySelector('.coverage-critical')).toBeTruthy()
    expect(container.querySelector('.coverage-unknown')).toBeTruthy()
  })

  it('shows N/A for slots with no data', () => {
    render(
      <CoverageHeatmap
        stations={mockStations}
        shifts={mockShifts}
        weekDates={weekDates}
        getCoverageForSlot={mockGetCoverageForSlot}
      />
    )
    
    // Most cells should show N/A since we only have data for 2 specific slots
    // Each cell shows N/A twice (once for coverage ratio, once for percentage)
    expect(screen.getAllByText('N/A')).toHaveLength(52) // (2 stations × 2 shifts × 7 days - 2 with data) × 2 = 52
  })

  it('displays station priority information', () => {
    render(
      <CoverageHeatmap
        stations={mockStations}
        shifts={mockShifts}
        weekDates={weekDates}
        getCoverageForSlot={mockGetCoverageForSlot}
      />
    )
    
    expect(screen.getByText('HIGH')).toBeInTheDocument()
    expect(screen.getByText('CRITICAL')).toBeInTheDocument()
  })

  it('shows shift time information', () => {
    render(
      <CoverageHeatmap
        stations={mockStations}
        shifts={mockShifts}
        weekDates={weekDates}
        getCoverageForSlot={mockGetCoverageForSlot}
      />
    )
    
    expect(screen.getAllByText('06:00 - 14:00')).toHaveLength(2) // One for each station
    expect(screen.getAllByText('22:00 - 06:00')).toHaveLength(2) // One for each station
  })
})
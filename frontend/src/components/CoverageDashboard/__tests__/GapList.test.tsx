import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { GapList } from '../GapList'
import { Gap, Station, ShiftTemplate } from '../../../types'

const mockStations: Station[] = [
  {
    id: 'station-1',
    name: 'Assembly Line A',
    line: 'Production Line 1',
    priority: 'high',
    requiredSkills: []
  },
  {
    id: 'station-2',
    name: 'Quality Control',
    line: 'Production Line 1',
    priority: 'critical',
    requiredSkills: []
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

const mockGaps: Gap[] = [
  {
    id: 'gap-1',
    stationId: 'station-1',
    shiftId: 'shift-1',
    skillId: 'skill-1',
    count: 2,
    criticality: 'critical',
    impact: 'Production line shutdown risk'
  },
  {
    id: 'gap-2',
    stationId: 'station-2',
    shiftId: 'shift-1',
    skillId: 'skill-2',
    count: 1,
    criticality: 'high',
    impact: 'Quality issues possible'
  },
  {
    id: 'gap-3',
    stationId: 'station-1',
    shiftId: 'shift-2',
    skillId: 'skill-1',
    count: 1,
    criticality: 'medium',
    impact: 'Reduced efficiency'
  }
]

const mockProps = {
  gaps: mockGaps,
  stations: mockStations,
  shifts: mockShifts,
  onGapClick: vi.fn()
}

describe('GapList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders gap list with correct count', () => {
    render(<GapList {...mockProps} />)
    
    expect(screen.getByText('Coverage Gaps (3)')).toBeInTheDocument()
  })

  it('displays gap summary by criticality', () => {
    render(<GapList {...mockProps} />)
    
    expect(screen.getByText('critical')).toBeInTheDocument()
    expect(screen.getByText('high')).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
  })

  it('shows all gaps initially', () => {
    render(<GapList {...mockProps} />)
    
    expect(screen.getAllByText('Assembly Line A')).toHaveLength(2) // Two gaps at Assembly Line A
    expect(screen.getByText('Quality Control')).toBeInTheDocument()
    expect(screen.getAllByText('Day Shift')).toHaveLength(2)
    expect(screen.getByText('Night Shift')).toBeInTheDocument()
  })

  it('sorts gaps by criticality by default', () => {
    render(<GapList {...mockProps} />)
    
    const gapItems = screen.getAllByText(/positions?/)
    expect(gapItems[0]).toHaveTextContent('2 positions') // Critical gap first
    expect(gapItems[1]).toHaveTextContent('1 position')  // High gap second
    expect(gapItems[2]).toHaveTextContent('1 position')  // Medium gap last
  })

  it('filters gaps by criticality', () => {
    render(<GapList {...mockProps} />)
    
    const filterSelect = screen.getByDisplayValue('All Criticalities')
    fireEvent.change(filterSelect, { target: { value: 'critical' } })
    
    expect(screen.getAllByText('Assembly Line A')).toHaveLength(1) // Only critical gap should remain
    expect(screen.queryByText('Quality Control')).not.toBeInTheDocument()
  })

  it('sorts gaps by count', () => {
    render(<GapList {...mockProps} />)
    
    const sortSelect = screen.getByDisplayValue('Criticality')
    fireEvent.change(sortSelect, { target: { value: 'count' } })
    
    const gapItems = screen.getAllByText(/positions?/)
    expect(gapItems[0]).toHaveTextContent('2 positions') // Highest count first
  })

  it('sorts gaps by station', () => {
    render(<GapList {...mockProps} />)
    
    const sortSelect = screen.getByDisplayValue('Criticality')
    fireEvent.change(sortSelect, { target: { value: 'station' } })
    
    // Should be sorted alphabetically by station name
    const stationNames = screen.getAllByText(/Assembly Line A|Quality Control/)
    expect(stationNames[0]).toHaveTextContent('Assembly Line A')
    expect(stationNames[1]).toHaveTextContent('Assembly Line A')
    expect(stationNames[2]).toHaveTextContent('Quality Control')
  })

  it('handles gap click events', () => {
    render(<GapList {...mockProps} />)
    
    const firstGapItem = screen.getAllByText('Assembly Line A')[0].closest('.gap-item')
    fireEvent.click(firstGapItem!)
    
    expect(mockProps.onGapClick).toHaveBeenCalledWith(mockGaps[0])
  })

  it('displays gap details correctly', () => {
    render(<GapList {...mockProps} />)
    
    expect(screen.getAllByText('Skill Required: skill-1')).toHaveLength(2) // Two gaps have skill-1
    expect(screen.getByText('Impact: Production line shutdown risk')).toBeInTheDocument()
    expect(screen.getByText('CRITICAL')).toBeInTheDocument()
  })

  it('shows total positions needed in footer', () => {
    render(<GapList {...mockProps} />)
    
    expect(screen.getByText('Total positions needed: 4')).toBeInTheDocument()
  })

  it('displays no gaps message when list is empty', () => {
    render(<GapList {...mockProps} gaps={[]} />)
    
    expect(screen.getByText('Coverage Gaps (0)')).toBeInTheDocument()
    expect(screen.getByText('No coverage gaps found')).toBeInTheDocument()
  })

  it('applies correct criticality classes', () => {
    const { container } = render(<GapList {...mockProps} />)
    
    expect(container.querySelector('.criticality-critical')).toBeTruthy()
    expect(container.querySelector('.criticality-high')).toBeTruthy()
    expect(container.querySelector('.criticality-medium')).toBeTruthy()
  })

  it('shows correct criticality icons', () => {
    render(<GapList {...mockProps} />)
    
    expect(screen.getAllByText('🚨')).toHaveLength(2) // Critical icon appears in summary and gap item
    expect(screen.getAllByText('⚠️')).toHaveLength(2) // High icon appears in summary and gap item
    expect(screen.getAllByText('⚡')).toHaveLength(2) // Medium icon appears in summary and gap item
  })

  it('handles combined filtering and sorting', () => {
    render(<GapList {...mockProps} />)
    
    // Filter to only high criticality
    const filterSelect = screen.getByDisplayValue('All Criticalities')
    fireEvent.change(filterSelect, { target: { value: 'high' } })
    
    // Should only show the high criticality gap
    expect(screen.getByText('Quality Control')).toBeInTheDocument()
    expect(screen.queryByText('Assembly Line A')).not.toBeInTheDocument()
    
    // Change sort order (should still only show high criticality gap)
    const sortSelect = screen.getByDisplayValue('Criticality')
    fireEvent.change(sortSelect, { target: { value: 'station' } })
    
    expect(screen.getByText('Quality Control')).toBeInTheDocument()
  })
})
import React from 'react'
import { CoverageDashboard } from '../components/CoverageDashboard/CoverageDashboard'

// Mock data for coverage dashboard
const mockCoverageData = {
  stations: [
    {
      id: 'station-1',
      name: 'Assembly Line A',
      line: 'Production Line 1',
      priority: 'high' as const,
      requiredSkills: []
    },
    {
      id: 'station-2',
      name: 'Quality Control',
      line: 'Production Line 1',
      priority: 'critical' as const,
      requiredSkills: []
    },
    {
      id: 'station-3',
      name: 'Packaging',
      line: 'Production Line 2',
      priority: 'medium' as const,
      requiredSkills: []
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
    },
    {
      id: 'shift-2',
      name: 'Evening Shift',
      startTime: '14:00',
      endTime: '22:00',
      shiftType: 'swing' as const,
      breakRules: []
    }
  ],
  coverageStatus: [
    {
      stationId: 'station-1',
      shiftId: 'shift-1',
      required: 4,
      assigned: 3,
      coverage: 75,
      status: 'partial' as const,
      gaps: []
    },
    {
      stationId: 'station-2',
      shiftId: 'shift-1',
      required: 2,
      assigned: 2,
      coverage: 100,
      status: 'full' as const,
      gaps: []
    },
    {
      stationId: 'station-3',
      shiftId: 'shift-2',
      required: 3,
      assigned: 1,
      coverage: 33,
      status: 'critical' as const,
      gaps: []
    }
  ],
  gaps: []
}

export const CoveragePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = React.useState(new Date())

  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
  }

  const handleGapClick = (gap: any) => {
    console.log('Gap clicked:', gap)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Production Line Coverage</h1>
        <p>Monitor manufacturing workforce coverage, staffing gaps, and production risk indicators</p>
      </div>
      <div className="page-content">
        <CoverageDashboard 
          data={mockCoverageData}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onGapClick={handleGapClick}
        />
      </div>
    </div>
  )
}
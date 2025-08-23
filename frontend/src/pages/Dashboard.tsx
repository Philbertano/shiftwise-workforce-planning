import React from 'react'
import { CoverageDashboard } from '../components/CoverageDashboard/CoverageDashboard'

// Mock data for the dashboard
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
    },
    {
      stationId: 'station-2',
      shiftId: 'shift-1',
      required: 2,
      assigned: 2,
      coverage: 100,
      status: 'full' as const,
      gaps: []
    }
  ],
  gaps: []
}

export const Dashboard: React.FC = () => {
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
        <h1>Dashboard</h1>
        <p>Overview of workforce planning and coverage status</p>
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
import React from 'react'
import { AutomotiveDashboard } from '../components/AutomotiveDashboard/AutomotiveDashboard'
import { addHours, subHours } from 'date-fns'

// Mock data for the automotive dashboard
const mockAutomotiveData = {
  productionLines: [
    {
      id: 'line-1',
      name: 'Assembly Line A',
      type: 'assembly' as const,
      description: 'Main vehicle assembly line',
      taktTime: 120,
      capacity: 30,
      active: true
    },
    {
      id: 'line-2',
      name: 'Paint Shop B',
      type: 'paint' as const,
      description: 'Automated paint application',
      taktTime: 180,
      capacity: 20,
      active: true
    },
    {
      id: 'line-3',
      name: 'Body Shop C',
      type: 'body_shop' as const,
      description: 'Body welding and assembly',
      taktTime: 150,
      capacity: 25,
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
    },
    {
      id: 'station-2',
      name: 'Quality Control',
      line: 'Assembly Line A',
      priority: 'critical' as const,
      requiredSkills: [],
      capacity: 2,
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
    },
    {
      id: 'shift-2',
      name: 'Evening Shift',
      startTime: '14:00',
      endTime: '22:00',
      shiftType: 'swing' as const,
      breakRules: []
    },
    {
      id: 'shift-3',
      name: 'Night Shift',
      startTime: '22:00',
      endTime: '06:00',
      shiftType: 'night' as const,
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
  gaps: [],
  staffingLevels: [
    {
      productionLineId: 'line-1',
      shiftId: 'shift-1',
      required: 12,
      assigned: 10,
      efficiency: 85.5,
      status: 'understaffed' as const
    },
    {
      productionLineId: 'line-2',
      shiftId: 'shift-1',
      required: 8,
      assigned: 8,
      efficiency: 92.3,
      status: 'optimal' as const
    },
    {
      productionLineId: 'line-3',
      shiftId: 'shift-1',
      required: 10,
      assigned: 6,
      efficiency: 68.2,
      status: 'critical' as const
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
  efficiencyData: Array.from({ length: 24 }, (_, i) => ({
    timestamp: subHours(new Date(), 23 - i),
    productionLineId: 'line-1',
    efficiency: 75 + Math.random() * 20,
    throughput: 25 + Math.random() * 10,
    staffingLevel: 8 + Math.random() * 4
  })),
  skillCoverage: [
    {
      skillId: 'welding',
      skillName: 'MIG Welding',
      category: 'technical',
      required: 15,
      available: 12,
      coverage: 80,
      critical: true
    },
    {
      skillId: 'quality-inspection',
      skillName: 'Quality Inspection',
      category: 'quality',
      required: 8,
      available: 9,
      coverage: 112.5,
      critical: false
    },
    {
      skillId: 'safety-lockout',
      skillName: 'Lockout/Tagout',
      category: 'safety',
      required: 20,
      available: 18,
      coverage: 90,
      critical: true
    },
    {
      skillId: 'forklift-operation',
      skillName: 'Forklift Operation',
      category: 'technical',
      required: 6,
      available: 7,
      coverage: 116.7,
      critical: false
    }
  ],
  safetyCompliance: {
    overallScore: 94.2,
    certificationCompliance: 96.5,
    ppeCompliance: 91.8,
    trainingCompliance: 94.3,
    incidentRate: 0.2,
    lastIncident: subHours(new Date(), 168) // 1 week ago
  }
}

export const Dashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = React.useState(new Date())

  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
  }

  const handleProductionLineClick = (lineId: string) => {
    console.log('Production line clicked:', lineId)
  }

  const handleStaffingAlert = (alert: any) => {
    console.log('Staffing alert:', alert)
    // In a real application, this would trigger notifications or alerts
  }

  return (
    <div className="page">
      <AutomotiveDashboard 
        data={mockAutomotiveData} 
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        onProductionLineClick={handleProductionLineClick}
        onStaffingAlert={handleStaffingAlert}
      />
    </div>
  )
}
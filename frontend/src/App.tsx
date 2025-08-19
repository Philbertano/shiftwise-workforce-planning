import React, { useState, useEffect } from 'react'
import { PlanningBoard } from './components/PlanningBoard/PlanningBoard'
import { PlanningBoardData, Assignment } from './types'

// Mock data for development
const mockData: PlanningBoardData = {
  stations: [
    {
      id: 'station-1',
      name: 'Assembly Line A',
      line: 'Production Line 1',
      priority: 'high',
      requiredSkills: [
        { skillId: 'skill-1', minLevel: 2, count: 2, mandatory: true },
        { skillId: 'skill-2', minLevel: 1, count: 1, mandatory: false }
      ]
    },
    {
      id: 'station-2',
      name: 'Quality Control',
      line: 'Production Line 1',
      priority: 'critical',
      requiredSkills: [
        { skillId: 'skill-3', minLevel: 3, count: 1, mandatory: true }
      ]
    }
  ],
  shifts: [
    {
      id: 'shift-1',
      name: 'Day Shift',
      startTime: '06:00',
      endTime: '14:00',
      shiftType: 'day',
      breakRules: [
        { duration: 30, startTime: '09:00', paid: true },
        { duration: 45, startTime: '12:00', paid: false }
      ]
    },
    {
      id: 'shift-2',
      name: 'Evening Shift',
      startTime: '14:00',
      endTime: '22:00',
      shiftType: 'swing',
      breakRules: [
        { duration: 30, startTime: '17:00', paid: true },
        { duration: 45, startTime: '19:00', paid: false }
      ]
    }
  ],
  employees: [
    {
      id: 'emp-1',
      name: 'John Smith',
      contractType: 'full-time',
      weeklyHours: 40,
      maxHoursPerDay: 8,
      minRestHours: 11,
      team: 'Team Alpha',
      active: true
    },
    {
      id: 'emp-2',
      name: 'Sarah Johnson',
      contractType: 'full-time',
      weeklyHours: 40,
      maxHoursPerDay: 8,
      minRestHours: 11,
      team: 'Team Beta',
      active: true
    },
    {
      id: 'emp-3',
      name: 'Mike Wilson',
      contractType: 'part-time',
      weeklyHours: 20,
      maxHoursPerDay: 6,
      minRestHours: 11,
      team: 'Team Alpha',
      active: false
    }
  ],
  assignments: [],
  coverageStatus: [],
  violations: []
}

function App() {
  const [data, setData] = useState<PlanningBoardData>(mockData)
  const [selectedDate, setSelectedDate] = useState(new Date())

  const handleAssignmentChange = (assignment: Assignment) => {
    setData(prevData => {
      const existingIndex = prevData.assignments.findIndex(a => a.id === assignment.id)
      
      if (existingIndex >= 0) {
        // Update existing assignment
        const newAssignments = [...prevData.assignments]
        newAssignments[existingIndex] = assignment
        return { ...prevData, assignments: newAssignments }
      } else {
        // Add new assignment
        return {
          ...prevData,
          assignments: [...prevData.assignments, assignment]
        }
      }
    })
  }

  const handleAssignmentDelete = (assignmentId: string) => {
    setData(prevData => ({
      ...prevData,
      assignments: prevData.assignments.filter(a => a.id !== assignmentId)
    }))
  }

  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
    // In a real app, this would trigger data fetching for the new date range
  }

  return (
    <div className="App">
      <PlanningBoard
        data={data}
        selectedDate={selectedDate}
        onAssignmentChange={handleAssignmentChange}
        onAssignmentDelete={handleAssignmentDelete}
        onDateChange={handleDateChange}
      />
    </div>
  )
}

export default App
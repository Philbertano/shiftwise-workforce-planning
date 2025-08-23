import React, { useState } from 'react'
import { PlanningBoard } from '../components/PlanningBoard/PlanningBoard'
import { PlanningBoardData, Assignment } from '../types'

// Mock data for planning board
const mockPlanningData: PlanningBoardData = {
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
    }
  ],
  assignments: [],
  coverageStatus: [],
  violations: []
}

export const PlanningPage: React.FC = () => {
  const [data, setData] = useState<PlanningBoardData>(mockPlanningData)
  const [selectedDate, setSelectedDate] = useState(new Date())

  const handleAssignmentChange = (assignment: Assignment) => {
    setData(prevData => {
      const existingIndex = prevData.assignments.findIndex(a => a.id === assignment.id)
      
      if (existingIndex >= 0) {
        const newAssignments = [...prevData.assignments]
        newAssignments[existingIndex] = assignment
        return { ...prevData, assignments: newAssignments }
      } else {
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
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Planning Board</h1>
        <p>Interactive shift planning and assignment management</p>
      </div>
      <div className="page-content">
        <PlanningBoard
          data={data}
          selectedDate={selectedDate}
          onAssignmentChange={handleAssignmentChange}
          onAssignmentDelete={handleAssignmentDelete}
          onDateChange={handleDateChange}
        />
      </div>
    </div>
  )
}
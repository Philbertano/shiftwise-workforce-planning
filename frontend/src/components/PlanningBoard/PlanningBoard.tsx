import React, { useState, useEffect, useCallback } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { format, addDays, startOfWeek } from 'date-fns'
import { PlanningBoardData, Assignment, ConstraintViolation, CoverageStatus } from '../../types'
import { PlanningGrid } from './PlanningGrid'
import { EmployeePanel } from './EmployeePanel'
import { ViolationPanel } from './ViolationPanel'
import './PlanningBoard.css'

interface PlanningBoardProps {
  data: PlanningBoardData
  selectedDate: Date
  onAssignmentChange: (assignment: Assignment) => void
  onAssignmentDelete: (assignmentId: string) => void
  onDateChange: (date: Date) => void
}

export const PlanningBoard: React.FC<PlanningBoardProps> = ({
  data,
  selectedDate,
  onAssignmentChange,
  onAssignmentDelete,
  onDateChange
}) => {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(selectedDate, { weekStartsOn: 1 }))
  const [violations, setViolations] = useState<ConstraintViolation[]>([])
  const [coverageStatus, setCoverageStatus] = useState<CoverageStatus[]>([])

  // Generate week dates
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  useEffect(() => {
    setViolations(data.violations || [])
    setCoverageStatus(data.coverageStatus || [])
  }, [data])

  const handlePreviousWeek = useCallback(() => {
    const newWeekStart = addDays(weekStart, -7)
    setWeekStart(newWeekStart)
    onDateChange(newWeekStart)
  }, [weekStart, onDateChange])

  const handleNextWeek = useCallback(() => {
    const newWeekStart = addDays(weekStart, 7)
    setWeekStart(newWeekStart)
    onDateChange(newWeekStart)
  }, [weekStart, onDateChange])

  const handleAssignmentDrop = useCallback(async (
    employeeId: string,
    stationId: string,
    shiftId: string,
    date: Date
  ) => {
    try {
      // Find existing assignment for this slot
      const existingAssignment = data.assignments.find(a => 
        a.demandId === `${stationId}-${shiftId}-${format(date, 'yyyy-MM-dd')}`
      )

      if (existingAssignment) {
        // Update existing assignment
        const updatedAssignment: Assignment = {
          ...existingAssignment,
          employeeId,
          status: 'proposed'
        }
        onAssignmentChange(updatedAssignment)
      } else {
        // Create new assignment
        const newAssignment: Assignment = {
          id: `${employeeId}-${stationId}-${shiftId}-${format(date, 'yyyy-MM-dd')}`,
          demandId: `${stationId}-${shiftId}-${format(date, 'yyyy-MM-dd')}`,
          employeeId,
          status: 'proposed',
          score: 0,
          createdAt: new Date(),
          createdBy: 'user'
        }
        onAssignmentChange(newAssignment)
      }
    } catch (error) {
      console.error('Failed to create assignment:', error)
    }
  }, [data.assignments, onAssignmentChange])

  const getCoverageForSlot = useCallback((stationId: string, shiftId: string, date: Date) => {
    const key = `${stationId}-${shiftId}-${format(date, 'yyyy-MM-dd')}`
    return coverageStatus.find(c => `${c.stationId}-${c.shiftId}` === key)
  }, [coverageStatus])

  const getViolationsForSlot = useCallback((stationId: string, shiftId: string, date: Date) => {
    const slotAssignments = data.assignments.filter(a => 
      a.demandId === `${stationId}-${shiftId}-${format(date, 'yyyy-MM-dd')}`
    )
    
    return violations.filter(v => 
      v.affectedAssignments.some(id => slotAssignments.some(a => a.id === id))
    )
  }, [violations, data.assignments])

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="planning-board">
        <div className="planning-board-header">
          <div className="week-navigation">
            <button className="btn btn-secondary" onClick={handlePreviousWeek}>
              ← Previous Week
            </button>
            <h2 className="week-title">
              Week of {format(weekStart, 'MMM d, yyyy')}
            </h2>
            <button className="btn btn-secondary" onClick={handleNextWeek}>
              Next Week →
            </button>
          </div>
        </div>

        <div className="planning-board-content">
          <div className="planning-grid-container">
            <PlanningGrid
              stations={data.stations}
              shifts={data.shifts}
              assignments={data.assignments}
              employees={data.employees}
              weekDates={weekDates}
              onAssignmentDrop={handleAssignmentDrop}
              onAssignmentDelete={onAssignmentDelete}
              getCoverageForSlot={getCoverageForSlot}
              getViolationsForSlot={getViolationsForSlot}
            />
          </div>

          <div className="planning-sidebar">
            <EmployeePanel employees={data.employees} />
            <ViolationPanel violations={violations} />
          </div>
        </div>
      </div>
    </DndProvider>
  )
}
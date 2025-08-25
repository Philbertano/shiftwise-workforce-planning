import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { format, addDays, startOfWeek } from 'date-fns'
import { PlanningBoardData, Assignment, ConstraintViolation, CoverageStatus } from '../../types'
import { PlanningGrid } from './PlanningGrid'
import { EmployeePanel } from './EmployeePanel'
import { ViolationPanel } from './ViolationPanel'
import { LoadingSpinner, SkeletonDashboard } from '../LoadingStates'
import { FadeTransition } from '../Transitions'
import { useDebounce } from '../../utils/performanceUtils'
import './PlanningBoard.css'

interface PlanningBoardProps {
  data: PlanningBoardData
  selectedDate: Date
  onAssignmentChange: (assignment: Assignment) => void
  onAssignmentDelete: (assignmentId: string) => void
  onDateChange: (date: Date) => void
  isLoading?: boolean
  isSaving?: boolean
}

export const PlanningBoard: React.FC<PlanningBoardProps> = React.memo(({
  data,
  selectedDate,
  onAssignmentChange,
  onAssignmentDelete,
  onDateChange,
  isLoading = false,
  isSaving = false
}) => {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(selectedDate, { weekStartsOn: 1 }))
  const [violations, setViolations] = useState<ConstraintViolation[]>([])
  const [coverageStatus, setCoverageStatus] = useState<CoverageStatus[]>([])

  // Memoize expensive calculations
  const weekDates = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  // Debounce assignment changes for better performance
  const debouncedAssignmentChange = useDebounce(onAssignmentChange, 300)

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
      const demandId = `${stationId}-${shiftId}-${format(date, 'yyyy-MM-dd')}`
      
      // Check if employee is already assigned to this slot
      const existingAssignment = data.assignments.find(a => 
        a.demandId === demandId && a.employeeId === employeeId
      )

      if (existingAssignment) {
        console.warn('Employee is already assigned to this slot')
        return
      }

      // Get station capacity
      const station = data.stations.find(s => s.id === stationId)
      const capacity = station?.capacity || 1

      // Check if slot has capacity
      const currentAssignments = data.assignments.filter(a => a.demandId === demandId)
      if (currentAssignments.length >= capacity) {
        console.warn('Slot is at capacity')
        return
      }

      // Create new assignment
      const newAssignment: Assignment = {
        id: `${employeeId}-${stationId}-${shiftId}-${format(date, 'yyyy-MM-dd')}-${Date.now()}`,
        demandId,
        employeeId,
        status: 'proposed',
        score: 0,
        createdAt: new Date(),
        createdBy: 'user'
      }
      debouncedAssignmentChange(newAssignment)
    } catch (error) {
      console.error('Failed to create assignment:', error)
    }
  }, [data.assignments, data.stations, debouncedAssignmentChange])

  const getCoverageForSlot = useCallback((stationId: string, shiftId: string, date: Date) => {
    const key = `${stationId}-${shiftId}-${format(date, 'yyyy-MM-dd')}`
    return coverageStatus.find(c => `${c.stationId}-${c.shiftId}` === key)
  }, [coverageStatus])

  const getViolationsForSlot = useCallback((stationId: string, shiftId: string, date: Date) => {
    const demandId = `${stationId}-${shiftId}-${format(date, 'yyyy-MM-dd')}`
    const slotAssignments = data.assignments.filter(a => a.demandId === demandId)
    
    return violations.filter(v => 
      v.affectedAssignments.some(id => slotAssignments.some(a => a.id === id))
    )
  }, [violations, data.assignments])

  if (isLoading) {
    return (
      <div className="planning-board">
        <SkeletonDashboard />
      </div>
    )
  }

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
          
          {isSaving && (
            <div className="saving-indicator">
              <LoadingSpinner size="small" message="Saving..." />
            </div>
          )}
        </div>

        <FadeTransition show={!isLoading} duration={300}>
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
        </FadeTransition>
      </div>
    </DndProvider>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for performance optimization
  return (
    prevProps.selectedDate.getTime() === nextProps.selectedDate.getTime() &&
    prevProps.data.assignments.length === nextProps.data.assignments.length &&
    prevProps.data.stations.length === nextProps.data.stations.length &&
    prevProps.data.employees.length === nextProps.data.employees.length &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.isSaving === nextProps.isSaving &&
    // Deep comparison for assignments if lengths are the same
    JSON.stringify(prevProps.data.assignments) === JSON.stringify(nextProps.data.assignments)
  )
})
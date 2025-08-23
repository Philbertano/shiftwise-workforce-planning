import React from 'react'
import { format } from 'date-fns'
import { Station, ShiftTemplate, Assignment, Employee, CoverageStatus, ConstraintViolation } from '../../types'
import { PlanningCell } from './PlanningCell'

interface PlanningGridProps {
  stations: Station[]
  shifts: ShiftTemplate[]
  assignments: Assignment[]
  employees: Employee[]
  weekDates: Date[]
  onAssignmentDrop: (employeeId: string, stationId: string, shiftId: string, date: Date) => void
  onAssignmentDelete: (assignmentId: string) => void
  getCoverageForSlot: (stationId: string, shiftId: string, date: Date) => CoverageStatus | undefined
  getViolationsForSlot: (stationId: string, shiftId: string, date: Date) => ConstraintViolation[]
}

export const PlanningGrid: React.FC<PlanningGridProps> = ({
  stations,
  shifts,
  assignments,
  employees,
  weekDates,
  onAssignmentDrop,
  onAssignmentDelete,
  getCoverageForSlot,
  getViolationsForSlot
}) => {
  const getAssignmentForSlot = (stationId: string, shiftId: string, date: Date) => {
    return assignments.find(a => 
      a.demandId === `${stationId}-${shiftId}-${format(date, 'yyyy-MM-dd')}`
    )
  }

  const getEmployeeById = (employeeId: string) => {
    return employees.find(e => e.id === employeeId)
  }

  return (
    <div className="planning-grid">
      {/* Header row with dates */}
      <div className="grid-header">
        <div className="station-header">Station</div>
        <div className="shift-header">Shift</div>
        {weekDates.map(date => (
          <div key={date.toISOString()} className="date-header">
            <div className="date-day">{format(date, 'EEE')}</div>
            <div className="date-number">{format(date, 'd')}</div>
          </div>
        ))}
      </div>

      {/* Grid rows */}
      {stations.map(station => (
        <div key={station.id} className="station-group">
          {shifts.map((shift, shiftIndex) => (
            <div key={`${station.id}-${shift.id}`} className="grid-row">
              {shiftIndex === 0 && (
                <div className="station-cell" style={{ gridRowEnd: `span ${shifts.length}` }}>
                  <div className="station-name">{station.name}</div>
                  <div className="station-line">{station.line}</div>
                  <div className="station-skills">
                    {station.requiredSkills.map(skill => (
                      <span key={skill.skillId} className="skill-tag">
                        L{skill.minLevel} ({skill.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="shift-cell">
                <div className="shift-name">{shift.name}</div>
                <div className="shift-time">
                  {shift.startTime} - {shift.endTime}
                </div>
              </div>

              {weekDates.map(date => {
                const assignment = getAssignmentForSlot(station.id, shift.id, date)
                const employee = assignment ? getEmployeeById(assignment.employeeId) : undefined
                const coverage = getCoverageForSlot(station.id, shift.id, date)
                const violations = getViolationsForSlot(station.id, shift.id, date)

                return (
                  <PlanningCell
                    key={`${station.id}-${shift.id}-${date.toISOString()}`}
                    stationId={station.id}
                    shiftId={shift.id}
                    date={date}
                    assignment={assignment}
                    employee={employee}
                    coverage={coverage}
                    violations={violations}
                    onAssignmentDrop={onAssignmentDrop}
                    onAssignmentDelete={onAssignmentDelete}
                  />
                )
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
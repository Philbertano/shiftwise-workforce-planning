import { useCallback, useMemo } from 'react'
import { Assignment, Station, Employee } from '../types'
import { 
  assignmentValidationService, 
  ValidationResult, 
  AssignmentValidationContext 
} from '../services/assignmentValidationService'

interface UseAssignmentValidationProps {
  stations: Station[]
  employees: Employee[]
  assignments: Assignment[]
}

export const useAssignmentValidation = ({
  stations,
  employees,
  assignments
}: UseAssignmentValidationProps) => {
  
  // Memoize the validation service to avoid recreating it
  const validationService = useMemo(() => assignmentValidationService, [])

  /**
   * Validate an assignment before adding it
   */
  const validateAssignment = useCallback((
    stationId: string,
    employeeId: string,
    date: Date,
    shiftId: string
  ): ValidationResult => {
    const station = stations.find(s => s.id === stationId)
    const employee = employees.find(e => e.id === employeeId)

    if (!station) {
      return {
        isValid: false,
        errors: [{
          type: 'capacity_exceeded',
          message: 'Station not found',
          severity: 'error',
          suggestedAction: 'Select a valid station'
        }],
        warnings: []
      }
    }

    if (!employee) {
      return {
        isValid: false,
        errors: [{
          type: 'employee_unavailable',
          message: 'Employee not found',
          severity: 'error',
          suggestedAction: 'Select a valid employee'
        }],
        warnings: []
      }
    }

    // Get existing assignments for this station on this date/shift
    const existingAssignments = assignments.filter(a => {
      // This is a simplified check - in a real app you'd need to match by date/shift
      // For now, we'll assume all assignments in the array are for the current context
      return a.demandId.includes(stationId) // Simplified station matching
    })

    const context: AssignmentValidationContext = {
      station,
      existingAssignments,
      employee,
      date,
      shiftId
    }

    return validationService.validateAssignment(context)
  }, [stations, employees, assignments, validationService])

  /**
   * Get user-friendly error messages
   */
  const getErrorMessages = useCallback((result: ValidationResult): string[] => {
    return result.errors.map(error => validationService.getErrorMessage(error))
  }, [validationService])

  /**
   * Get suggested recovery actions
   */
  const getRecoveryActions = useCallback((result: ValidationResult): string[] => {
    return result.errors.flatMap(error => validationService.getRecoveryActions(error))
  }, [validationService])

  /**
   * Check if a station is at capacity
   */
  const isStationAtCapacity = useCallback((stationId: string): boolean => {
    const station = stations.find(s => s.id === stationId)
    if (!station || !station.capacity) return false

    const stationAssignments = assignments.filter(a => 
      a.demandId.includes(stationId) // Simplified station matching
    )

    return stationAssignments.length >= station.capacity
  }, [stations, assignments])

  /**
   * Get station capacity status
   */
  const getStationCapacityStatus = useCallback((stationId: string) => {
    const station = stations.find(s => s.id === stationId)
    if (!station) return null

    const stationAssignments = assignments.filter(a => 
      a.demandId.includes(stationId) // Simplified station matching
    )

    const current = stationAssignments.length
    const capacity = station.capacity || 0

    return {
      current,
      capacity,
      available: Math.max(0, capacity - current),
      isAtCapacity: capacity > 0 && current >= capacity,
      isOverCapacity: capacity > 0 && current > capacity,
      utilizationPercent: capacity > 0 ? Math.round((current / capacity) * 100) : 0
    }
  }, [stations, assignments])

  return {
    validateAssignment,
    getErrorMessages,
    getRecoveryActions,
    isStationAtCapacity,
    getStationCapacityStatus
  }
}

export default useAssignmentValidation
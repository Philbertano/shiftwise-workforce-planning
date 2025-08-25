import { Assignment, Station, Employee, RequiredSkill } from '../types'

export interface ValidationError {
  type: 'capacity_exceeded' | 'skill_mismatch' | 'employee_unavailable' | 'duplicate_assignment'
  message: string
  severity: 'error' | 'warning'
  field?: string
  suggestedAction?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

export interface AssignmentValidationContext {
  station: Station
  existingAssignments: Assignment[]
  employee: Employee
  date: Date
  shiftId: string
}

/**
 * Service for validating assignment operations
 */
export class AssignmentValidationService {
  /**
   * Validate a new assignment before adding it
   */
  validateAssignment(context: AssignmentValidationContext): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Validate capacity constraints
    const capacityValidation = this.validateCapacity(context)
    errors.push(...capacityValidation.errors)
    warnings.push(...capacityValidation.warnings)

    // Validate skill requirements
    const skillValidation = this.validateSkillRequirements(context)
    errors.push(...skillValidation.errors)
    warnings.push(...skillValidation.warnings)

    // Validate employee availability
    const availabilityValidation = this.validateEmployeeAvailability(context)
    errors.push(...availabilityValidation.errors)
    warnings.push(...availabilityValidation.warnings)

    // Validate for duplicate assignments
    const duplicateValidation = this.validateDuplicateAssignment(context)
    errors.push(...duplicateValidation.errors)
    warnings.push(...duplicateValidation.warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate station capacity constraints
   */
  private validateCapacity(context: AssignmentValidationContext): ValidationResult {
    const { station, existingAssignments } = context
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    if (!station.capacity) {
      warnings.push({
        type: 'capacity_exceeded',
        message: 'Station capacity not defined. Assignment may exceed optimal staffing.',
        severity: 'warning',
        suggestedAction: 'Configure station capacity in station settings'
      })
      return { isValid: true, errors, warnings }
    }

    const currentAssignments = existingAssignments.length
    const newTotal = currentAssignments + 1

    if (newTotal > station.capacity) {
      errors.push({
        type: 'capacity_exceeded',
        message: `Station capacity exceeded. Current: ${currentAssignments}, Capacity: ${station.capacity}`,
        severity: 'error',
        field: 'capacity',
        suggestedAction: 'Remove an existing assignment or increase station capacity'
      })
    } else if (newTotal === station.capacity) {
      warnings.push({
        type: 'capacity_exceeded',
        message: `Station will be at full capacity (${station.capacity}/${station.capacity})`,
        severity: 'warning'
      })
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  /**
   * Validate skill requirements are met
   */
  private validateSkillRequirements(context: AssignmentValidationContext): ValidationResult {
    const { station, employee, existingAssignments } = context
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    if (!station.requiredSkills || station.requiredSkills.length === 0) {
      return { isValid: true, errors, warnings }
    }

    // Get all assigned employees including the new one
    const allAssignedEmployees = [...existingAssignments.map(a => ({ employeeId: a.employeeId })), { employeeId: employee.id }]

    for (const requiredSkill of station.requiredSkills) {
      const skillValidation = this.validateSingleSkillRequirement(
        requiredSkill,
        employee,
        allAssignedEmployees,
        context
      )
      errors.push(...skillValidation.errors)
      warnings.push(...skillValidation.warnings)
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  /**
   * Validate a single skill requirement
   */
  private validateSingleSkillRequirement(
    requiredSkill: RequiredSkill,
    newEmployee: Employee,
    allAssignedEmployees: { employeeId: string }[],
    context: AssignmentValidationContext
  ): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Check if the new employee has the required skill
    const employeeSkill = newEmployee.skills?.find(s => s.skillId === requiredSkill.skillId)
    
    if (!employeeSkill) {
      if (requiredSkill.mandatory) {
        errors.push({
          type: 'skill_mismatch',
          message: `Employee ${newEmployee.name} lacks required skill: ${requiredSkill.skillId}`,
          severity: 'error',
          field: 'skills',
          suggestedAction: 'Assign an employee with the required skill or mark skill as non-mandatory'
        })
      } else {
        warnings.push({
          type: 'skill_mismatch',
          message: `Employee ${newEmployee.name} lacks preferred skill: ${requiredSkill.skillId}`,
          severity: 'warning',
          suggestedAction: 'Consider assigning an employee with this skill for optimal performance'
        })
      }
    } else if (employeeSkill.level < requiredSkill.minLevel) {
      if (requiredSkill.mandatory) {
        errors.push({
          type: 'skill_mismatch',
          message: `Employee ${newEmployee.name} skill level (${employeeSkill.level}) below required minimum (${requiredSkill.minLevel}) for ${requiredSkill.skillId}`,
          severity: 'error',
          field: 'skills',
          suggestedAction: 'Assign an employee with higher skill level or reduce minimum requirement'
        })
      } else {
        warnings.push({
          type: 'skill_mismatch',
          message: `Employee ${newEmployee.name} skill level (${employeeSkill.level}) below preferred minimum (${requiredSkill.minLevel}) for ${requiredSkill.skillId}`,
          severity: 'warning',
          suggestedAction: 'Consider assigning an employee with higher skill level'
        })
      }
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  /**
   * Validate employee availability
   */
  private validateEmployeeAvailability(context: AssignmentValidationContext): ValidationResult {
    const { employee, date, shiftId } = context
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Check if employee is active
    if (!employee.active) {
      errors.push({
        type: 'employee_unavailable',
        message: `Employee ${employee.name} is not active`,
        severity: 'error',
        field: 'employee',
        suggestedAction: 'Select an active employee or reactivate this employee'
      })
    }

    // Check availability constraints (if implemented)
    if (employee.availability) {
      const dayOfWeek = date.getDay()
      const shiftAvailability = employee.availability.find(a => 
        a.dayOfWeek === dayOfWeek && a.shiftId === shiftId
      )

      if (!shiftAvailability || !shiftAvailability.available) {
        warnings.push({
          type: 'employee_unavailable',
          message: `Employee ${employee.name} may not be available for this shift`,
          severity: 'warning',
          suggestedAction: 'Verify employee availability or select a different employee'
        })
      }
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  /**
   * Validate for duplicate assignments
   */
  private validateDuplicateAssignment(context: AssignmentValidationContext): ValidationResult {
    const { employee, existingAssignments } = context
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    const existingAssignment = existingAssignments.find(a => a.employeeId === employee.id)
    
    if (existingAssignment) {
      errors.push({
        type: 'duplicate_assignment',
        message: `Employee ${employee.name} is already assigned to this station`,
        severity: 'error',
        field: 'employee',
        suggestedAction: 'Select a different employee or remove the existing assignment first'
      })
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  /**
   * Get user-friendly error message for display
   */
  getErrorMessage(error: ValidationError): string {
    return error.message
  }

  /**
   * Get suggested recovery actions for an error
   */
  getRecoveryActions(error: ValidationError): string[] {
    const actions: string[] = []
    
    if (error.suggestedAction) {
      actions.push(error.suggestedAction)
    }

    switch (error.type) {
      case 'capacity_exceeded':
        actions.push('Remove an existing assignment')
        actions.push('Increase station capacity')
        actions.push('Assign to a different station')
        break
      case 'skill_mismatch':
        actions.push('Select an employee with required skills')
        actions.push('Provide training to the employee')
        actions.push('Adjust skill requirements')
        break
      case 'employee_unavailable':
        actions.push('Select a different employee')
        actions.push('Check employee schedule')
        actions.push('Update employee availability')
        break
      case 'duplicate_assignment':
        actions.push('Remove existing assignment first')
        actions.push('Select a different employee')
        break
    }

    return [...new Set(actions)] // Remove duplicates
  }
}

// Singleton instance
export const assignmentValidationService = new AssignmentValidationService()
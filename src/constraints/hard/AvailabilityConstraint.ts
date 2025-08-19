import { Constraint } from '../base/Constraint.js';
import { BaseConstraintValidator } from '../base/ConstraintValidator.js';
import { ConstraintViolation } from '../base/ConstraintViolation.js';
import { ValidationContext } from '../base/ValidationContext.js';
import { Assignment } from '../../models/Assignment.js';
import { ConstraintType, Severity } from '../../types/index.js';

/**
 * Validator for availability constraint
 */
class AvailabilityValidator extends BaseConstraintValidator {
  constructor() {
    super('availability', 'Availability');
  }

  public validate(assignment: Assignment, context: ValidationContext): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    const employee = context.getEmployee(assignment.employeeId);
    const demand = context.getDemand(assignment.demandId);
    
    if (!employee || !demand) {
      violations.push(this.createViolation(
        'Cannot validate availability: Employee or demand not found',
        [assignment.id],
        ['Verify employee and demand exist in the system'],
        Severity.CRITICAL
      ));
      return violations;
    }

    // Check if employee is active
    if (!employee.active) {
      violations.push(this.createViolation(
        `Employee ${employee.name} is not active and cannot be assigned`,
        [assignment.id],
        [
          'Reactivate employee if appropriate',
          'Assign an active employee instead',
          'Update employee status if incorrect'
        ],
        Severity.CRITICAL
      ));
    }

    // Check for approved absences
    const absencesOnDate = context.getEmployeeAbsencesOnDate(employee.id, demand.date);
    if (absencesOnDate.length > 0) {
      const absenceTypes = absencesOnDate.map(absence => absence.type).join(', ');
      violations.push(this.createViolation(
        `Employee ${employee.name} has approved absence(s) on ${demand.date.toDateString()}: ${absenceTypes}`,
        [assignment.id],
        [
          'Assign a different employee',
          'Reschedule the shift if possible',
          'Check if absence can be modified'
        ],
        Severity.CRITICAL
      ));
    }

    // Check for conflicting assignments (same employee, overlapping time)
    const conflictingAssignments = this.findConflictingAssignments(
      employee.id,
      demand.date,
      context.assignments.filter(a => a.id !== assignment.id),
      context
    );

    if (conflictingAssignments.length > 0) {
      const shiftTemplate = context.getShiftTemplate(demand.shiftTemplateId);
      if (shiftTemplate) {
        for (const conflictingAssignment of conflictingAssignments) {
          const conflictingDemand = context.getDemand(conflictingAssignment.demandId);
          const conflictingShiftTemplate = conflictingDemand ? 
            context.getShiftTemplate(conflictingDemand.shiftTemplateId) : null;
          
          if (conflictingDemand && conflictingShiftTemplate) {
            const hasTimeOverlap = this.checkTimeOverlap(
              shiftTemplate.startTime,
              shiftTemplate.endTime,
              conflictingShiftTemplate.startTime,
              conflictingShiftTemplate.endTime
            );

            if (hasTimeOverlap) {
              violations.push(this.createViolation(
                `Employee ${employee.name} has conflicting assignment: ${shiftTemplate.startTime}-${shiftTemplate.endTime} overlaps with ${conflictingShiftTemplate.startTime}-${conflictingShiftTemplate.endTime}`,
                [assignment.id, conflictingAssignment.id],
                [
                  'Assign a different employee to one of the shifts',
                  'Adjust shift times to eliminate overlap',
                  'Cancel one of the conflicting assignments'
                ],
                Severity.CRITICAL
              ));
            }
          }
        }
      }
    }

    return violations;
  }

  /**
   * Check for time overlap between two shifts
   */
  private checkTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const start1Minutes = this.timeToMinutes(start1);
    const end1Minutes = this.timeToMinutes(end1);
    const start2Minutes = this.timeToMinutes(start2);
    const end2Minutes = this.timeToMinutes(end2);

    // Handle overnight shifts
    const end1Adjusted = end1Minutes <= start1Minutes ? end1Minutes + 24 * 60 : end1Minutes;
    const end2Adjusted = end2Minutes <= start2Minutes ? end2Minutes + 24 * 60 : end2Minutes;

    // Check for overlap
    return start1Minutes < end2Adjusted && start2Minutes < end1Adjusted;
  }

  /**
   * Convert time string to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

/**
 * Constraint that ensures employees are available for their assigned shifts
 */
export class AvailabilityConstraint extends Constraint {
  constructor() {
    super(
      'availability',
      'Availability',
      ConstraintType.HARD,
      95, // High priority for hard constraints
      'Ensures employees are available (not absent, not double-booked) for their assigned shifts',
      new AvailabilityValidator()
    );
  }

  public getSeverity(): Severity {
    return Severity.CRITICAL;
  }
}
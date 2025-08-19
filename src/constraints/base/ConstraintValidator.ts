import { Assignment } from '../../models/Assignment.js';
import { ValidationContext } from './ValidationContext.js';
import { ConstraintViolation } from './ConstraintViolation.js';

/**
 * Interface for constraint validation logic
 */
export interface ConstraintValidator {
  /**
   * Validate an assignment against this constraint
   * @param assignment The assignment to validate
   * @param context The validation context containing related data
   * @returns Array of constraint violations (empty if valid)
   */
  validate(assignment: Assignment, context: ValidationContext): ConstraintViolation[];
}

/**
 * Abstract base class for constraint validators
 */
export abstract class BaseConstraintValidator implements ConstraintValidator {
  protected readonly constraintId: string;
  protected readonly constraintName: string;

  constructor(constraintId: string, constraintName: string) {
    this.constraintId = constraintId;
    this.constraintName = constraintName;
  }

  /**
   * Abstract validation method to be implemented by concrete validators
   */
  public abstract validate(assignment: Assignment, context: ValidationContext): ConstraintViolation[];

  /**
   * Helper method to create a constraint violation
   */
  protected createViolation(
    message: string,
    affectedAssignments: string[],
    suggestedActions: string[],
    severity: import('../../types/index.js').Severity
  ): ConstraintViolation {
    return new ConstraintViolation(
      this.constraintId,
      severity,
      message,
      affectedAssignments,
      suggestedActions
    );
  }

  /**
   * Helper method to check if an assignment is active
   */
  protected isActiveAssignment(assignment: Assignment): boolean {
    return assignment.isActive();
  }

  /**
   * Helper method to find conflicting assignments for an employee
   */
  protected findConflictingAssignments(
    employeeId: string,
    targetDate: Date,
    assignments: Assignment[],
    context: ValidationContext
  ): Assignment[] {
    return assignments.filter(assignment => 
      assignment.employeeId === employeeId &&
      assignment.isActive() &&
      this.isOnSameDate(assignment, targetDate, context)
    );
  }

  /**
   * Helper method to check if assignment is on the same date
   */
  private isOnSameDate(assignment: Assignment, targetDate: Date, context: ValidationContext): boolean {
    const demand = context.demands.find(d => d.id === assignment.demandId);
    if (!demand) return false;
    
    return demand.date.toDateString() === targetDate.toDateString();
  }

  /**
   * Helper method to get employee by ID from context
   */
  protected getEmployee(employeeId: string, context: ValidationContext) {
    return context.employees.find(emp => emp.id === employeeId);
  }

  /**
   * Helper method to get demand by ID from context
   */
  protected getDemand(demandId: string, context: ValidationContext) {
    return context.demands.find(demand => demand.id === demandId);
  }

  /**
   * Helper method to get absences for an employee on a specific date
   */
  protected getEmployeeAbsencesOnDate(employeeId: string, date: Date, context: ValidationContext) {
    return context.absences.filter(absence => 
      absence.employeeId === employeeId &&
      absence.approved &&
      date >= absence.dateStart &&
      date <= absence.dateEnd
    );
  }
}
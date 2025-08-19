import { Constraint } from '../base/Constraint.js';
import { BaseConstraintValidator } from '../base/ConstraintValidator.js';
import { ConstraintViolation } from '../base/ConstraintViolation.js';
import { ValidationContext } from '../base/ValidationContext.js';
import { Assignment } from '../../models/Assignment.js';
import { ConstraintType, Severity } from '../../types/index.js';

/**
 * Validator for labor law compliance constraint
 */
class LaborLawValidator extends BaseConstraintValidator {
  constructor() {
    super('labor-law', 'Labor Law Compliance');
  }

  public validate(assignment: Assignment, context: ValidationContext): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    const employee = context.getEmployee(assignment.employeeId);
    const demand = context.getDemand(assignment.demandId);
    
    if (!employee || !demand) {
      violations.push(this.createViolation(
        'Cannot validate labor law compliance: Employee or demand not found',
        [assignment.id],
        ['Verify employee and demand exist in the system'],
        Severity.CRITICAL
      ));
      return violations;
    }

    const shiftTemplate = context.getShiftTemplate(demand.shiftTemplateId);
    if (!shiftTemplate) {
      violations.push(this.createViolation(
        'Cannot validate labor law compliance: Shift template not found',
        [assignment.id],
        ['Verify shift template exists in the system'],
        Severity.CRITICAL
      ));
      return violations;
    }

    // Check daily hour limits
    const shiftHours = this.calculateShiftHours(shiftTemplate.startTime, shiftTemplate.endTime);
    if (shiftHours > employee.maxHoursPerDay) {
      violations.push(this.createViolation(
        `Shift duration (${shiftHours}h) exceeds employee ${employee.name}'s daily limit (${employee.maxHoursPerDay}h)`,
        [assignment.id],
        [
          'Reduce shift duration',
          'Split shift between multiple employees',
          'Adjust employee daily hour limit if appropriate'
        ],
        Severity.CRITICAL
      ));
    }

    // Check total daily hours including other assignments
    const currentDayHours = context.getEmployeeHoursOnDate(employee.id, demand.date);
    const totalDayHours = currentDayHours + shiftHours;
    
    if (totalDayHours > employee.maxHoursPerDay) {
      violations.push(this.createViolation(
        `Total daily hours (${totalDayHours}h) would exceed employee ${employee.name}'s limit (${employee.maxHoursPerDay}h)`,
        [assignment.id],
        [
          'Remove or reassign other shifts on the same day',
          'Assign to a different employee',
          'Reduce shift duration'
        ],
        Severity.CRITICAL
      ));
    }

    // Check weekly hour limits
    const weekStart = this.getWeekStart(demand.date);
    const currentWeeklyHours = context.getEmployeeWeeklyHours(employee.id, weekStart);
    const totalWeeklyHours = currentWeeklyHours + shiftHours;
    
    if (totalWeeklyHours > employee.weeklyHours) {
      violations.push(this.createViolation(
        `Total weekly hours (${totalWeeklyHours}h) would exceed employee ${employee.name}'s limit (${employee.weeklyHours}h)`,
        [assignment.id],
        [
          'Reassign to employee with available weekly hours',
          'Reduce shift duration',
          'Spread assignments across multiple weeks'
        ],
        Severity.ERROR
      ));
    }

    // Check minimum rest periods between shifts
    const restViolations = this.checkRestPeriods(assignment, employee, demand, context);
    violations.push(...restViolations);

    // Check for excessive consecutive days
    const consecutiveDaysViolations = this.checkConsecutiveDays(assignment, employee, demand, context);
    violations.push(...consecutiveDaysViolations);

    return violations;
  }

  /**
   * Calculate hours for a shift
   */
  private calculateShiftHours(startTime: string, endTime: string): number {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;
    
    // Handle overnight shifts
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }
    
    return (endMinutes - startMinutes) / 60;
  }

  /**
   * Get the start of the week for a given date (assuming Monday is start of week)
   */
  private getWeekStart(date: Date): Date {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  /**
   * Check minimum rest periods between shifts
   */
  private checkRestPeriods(
    assignment: Assignment, 
    employee: any, 
    demand: any, 
    context: ValidationContext
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const shiftTemplate = context.getShiftTemplate(demand.shiftTemplateId);
    
    if (!shiftTemplate) return violations;

    // Check previous day assignments
    const previousDay = new Date(demand.date);
    previousDay.setDate(previousDay.getDate() - 1);
    const previousDayAssignments = context.getEmployeeAssignmentsOnDate(employee.id, previousDay);

    for (const prevAssignment of previousDayAssignments) {
      const prevDemand = context.getDemand(prevAssignment.demandId);
      const prevShiftTemplate = prevDemand ? context.getShiftTemplate(prevDemand.shiftTemplateId) : null;
      
      if (prevDemand && prevShiftTemplate) {
        const restHours = this.calculateRestHours(
          prevShiftTemplate.endTime,
          shiftTemplate.startTime,
          prevDemand.date,
          demand.date
        );

        if (restHours < employee.minRestHours) {
          violations.push(this.createViolation(
            `Insufficient rest period (${restHours}h) between shifts for employee ${employee.name} (minimum ${employee.minRestHours}h required)`,
            [assignment.id, prevAssignment.id],
            [
              'Adjust shift start time',
              'Assign to different employee',
              'Add rest day between shifts'
            ],
            Severity.CRITICAL
          ));
        }
      }
    }

    // Check next day assignments
    const nextDay = new Date(demand.date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayAssignments = context.getEmployeeAssignmentsOnDate(employee.id, nextDay);

    for (const nextAssignment of nextDayAssignments) {
      const nextDemand = context.getDemand(nextAssignment.demandId);
      const nextShiftTemplate = nextDemand ? context.getShiftTemplate(nextDemand.shiftTemplateId) : null;
      
      if (nextDemand && nextShiftTemplate) {
        const restHours = this.calculateRestHours(
          shiftTemplate.endTime,
          nextShiftTemplate.startTime,
          demand.date,
          nextDemand.date
        );

        if (restHours < employee.minRestHours) {
          violations.push(this.createViolation(
            `Insufficient rest period (${restHours}h) between shifts for employee ${employee.name} (minimum ${employee.minRestHours}h required)`,
            [assignment.id, nextAssignment.id],
            [
              'Adjust shift end time',
              'Assign to different employee',
              'Add rest day between shifts'
            ],
            Severity.CRITICAL
          ));
        }
      }
    }

    return violations;
  }

  /**
   * Calculate rest hours between two shifts
   */
  private calculateRestHours(endTime1: string, startTime2: string, date1: Date, date2: Date): number {
    const [endHour1, endMin1] = endTime1.split(':').map(Number);
    const [startHour2, startMin2] = startTime2.split(':').map(Number);
    
    const endDateTime1 = new Date(date1);
    endDateTime1.setHours(endHour1, endMin1, 0, 0);
    
    const startDateTime2 = new Date(date2);
    startDateTime2.setHours(startHour2, startMin2, 0, 0);
    
    // Handle overnight shifts
    if (endHour1 < 12 && startHour2 > 12) {
      endDateTime1.setDate(endDateTime1.getDate() + 1);
    }
    
    const restMilliseconds = startDateTime2.getTime() - endDateTime1.getTime();
    return restMilliseconds / (1000 * 60 * 60); // Convert to hours
  }

  /**
   * Check for excessive consecutive working days
   */
  private checkConsecutiveDays(
    assignment: Assignment, 
    employee: any, 
    demand: any, 
    context: ValidationContext
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    // Get employee preferences for max consecutive days
    const maxConsecutiveDays = employee.preferences?.maxConsecutiveDays || 6; // Default to 6 days
    
    // Count consecutive days including this assignment
    let consecutiveDays = 1; // Current assignment counts as 1
    
    // Count backwards
    let checkDate = new Date(demand.date);
    for (let i = 1; i < maxConsecutiveDays + 2; i++) {
      checkDate.setDate(checkDate.getDate() - 1);
      const assignments = context.getEmployeeAssignmentsOnDate(employee.id, checkDate);
      if (assignments.length > 0) {
        consecutiveDays++;
      } else {
        break;
      }
    }
    
    // Count forwards
    checkDate = new Date(demand.date);
    for (let i = 1; i < maxConsecutiveDays + 2; i++) {
      checkDate.setDate(checkDate.getDate() + 1);
      const assignments = context.getEmployeeAssignmentsOnDate(employee.id, checkDate);
      if (assignments.length > 0) {
        consecutiveDays++;
      } else {
        break;
      }
    }
    
    if (consecutiveDays > maxConsecutiveDays) {
      violations.push(this.createViolation(
        `Employee ${employee.name} would work ${consecutiveDays} consecutive days, exceeding limit of ${maxConsecutiveDays}`,
        [assignment.id],
        [
          'Provide rest day within the sequence',
          'Assign to different employee',
          'Adjust employee preferences if appropriate'
        ],
        Severity.WARNING
      ));
    }

    return violations;
  }
}

/**
 * Constraint that ensures compliance with labor laws and regulations
 */
export class LaborLawConstraint extends Constraint {
  constructor() {
    super(
      'labor-law',
      'Labor Law Compliance',
      ConstraintType.HARD,
      90, // High priority for hard constraints
      'Ensures compliance with labor laws including daily/weekly hour limits, rest periods, and consecutive day limits',
      new LaborLawValidator()
    );
  }

  public getSeverity(): Severity {
    return Severity.CRITICAL;
  }
}
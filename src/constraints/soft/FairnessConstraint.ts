import { Constraint } from '../base/Constraint.js';
import { BaseConstraintValidator } from '../base/ConstraintValidator.js';
import { ConstraintViolation } from '../base/ConstraintViolation.js';
import { ValidationContext } from '../base/ValidationContext.js';
import { Assignment } from '../../models/Assignment.js';
import { ConstraintType, Severity } from '../../types/index.js';

/**
 * Validator for fairness constraint
 */
class FairnessValidator extends BaseConstraintValidator {
  constructor() {
    super('fairness', 'Fairness');
  }

  public validate(assignment: Assignment, context: ValidationContext): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    const employee = context.getEmployee(assignment.employeeId);
    const demand = context.getDemand(assignment.demandId);
    
    if (!employee || !demand) {
      return violations; // Skip validation if data is missing
    }

    // Check workload distribution fairness
    const workloadViolations = this.checkWorkloadFairness(assignment, employee, demand, context);
    violations.push(...workloadViolations);

    // Check shift type distribution fairness
    const shiftTypeViolations = this.checkShiftTypeFairness(assignment, employee, demand, context);
    violations.push(...shiftTypeViolations);

    // Check weekend/holiday fairness
    const weekendViolations = this.checkWeekendFairness(assignment, employee, demand, context);
    violations.push(...weekendViolations);

    return violations;
  }

  /**
   * Check if workload is fairly distributed among team members
   */
  private checkWorkloadFairness(
    assignment: Assignment,
    employee: any,
    demand: any,
    context: ValidationContext
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    // Get all employees in the same team
    const teamMembers = context.employees.filter(emp => 
      emp.team === employee.team && emp.active
    );

    if (teamMembers.length <= 1) {
      return violations; // No fairness issues with single employee
    }

    // Calculate weekly hours for each team member
    const weekStart = this.getWeekStart(demand.date);
    const teamWorkloads = teamMembers.map(member => ({
      employee: member,
      weeklyHours: context.getEmployeeWeeklyHours(member.id, weekStart)
    }));

    // Add current assignment hours to the employee's workload
    const shiftTemplate = context.getShiftTemplate(demand.shiftTemplateId);
    if (shiftTemplate) {
      const shiftHours = this.calculateShiftHours(shiftTemplate.startTime, shiftTemplate.endTime);
      const currentEmployeeWorkload = teamWorkloads.find(w => w.employee.id === employee.id);
      if (currentEmployeeWorkload) {
        currentEmployeeWorkload.weeklyHours += shiftHours;
      }
    }

    // Calculate average and check for significant imbalance
    const totalHours = teamWorkloads.reduce((sum, w) => sum + w.weeklyHours, 0);
    const averageHours = totalHours / teamWorkloads.length;
    const currentEmployeeHours = teamWorkloads.find(w => w.employee.id === employee.id)?.weeklyHours || 0;

    // Check if this employee is getting significantly more hours than average
    const imbalanceThreshold = 0.3; // 30% above average
    if (currentEmployeeHours > averageHours * (1 + imbalanceThreshold)) {
      const underworkedEmployees = teamWorkloads
        .filter(w => w.weeklyHours < averageHours * 0.8)
        .map(w => w.employee.name);

      violations.push(this.createViolation(
        `Workload imbalance: Employee ${employee.name} (${currentEmployeeHours}h) significantly exceeds team average (${averageHours.toFixed(1)}h)`,
        [assignment.id],
        [
          `Consider assigning to underworked team members: ${underworkedEmployees.join(', ')}`,
          'Review workload distribution across the team',
          'Balance assignments over the week'
        ],
        Severity.WARNING
      ));
    }

    return violations;
  }

  /**
   * Check if shift types are fairly distributed
   */
  private checkShiftTypeFairness(
    assignment: Assignment,
    employee: any,
    demand: any,
    context: ValidationContext
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    const shiftTemplate = context.getShiftTemplate(demand.shiftTemplateId);
    if (!shiftTemplate) return violations;

    // Count shift types for this employee over the past month
    const monthStart = new Date(demand.date);
    monthStart.setDate(monthStart.getDate() - 30);
    
    const employeeAssignments = context.assignments.filter(a => 
      a.employeeId === employee.id && 
      a.isActive()
    );

    const shiftTypeCounts: Record<string, number> = {};
    let totalShifts = 0;

    for (const empAssignment of employeeAssignments) {
      const empDemand = context.getDemand(empAssignment.demandId);
      if (empDemand && empDemand.date >= monthStart) {
        const empShiftTemplate = context.getShiftTemplate(empDemand.shiftTemplateId);
        if (empShiftTemplate) {
          shiftTypeCounts[empShiftTemplate.shiftType] = (shiftTypeCounts[empShiftTemplate.shiftType] || 0) + 1;
          totalShifts++;
        }
      }
    }

    // Add current assignment
    shiftTypeCounts[shiftTemplate.shiftType] = (shiftTypeCounts[shiftTemplate.shiftType] || 0) + 1;
    totalShifts++;

    // Check if any shift type is disproportionately assigned
    const currentShiftTypeCount = shiftTypeCounts[shiftTemplate.shiftType];
    const currentShiftTypePercentage = currentShiftTypeCount / totalShifts;

    // If more than 70% of shifts are the same type, flag as unfair
    if (currentShiftTypePercentage > 0.7 && totalShifts >= 5) {
      violations.push(this.createViolation(
        `Shift type imbalance: Employee ${employee.name} assigned ${currentShiftTypeCount}/${totalShifts} ${shiftTemplate.shiftType} shifts (${(currentShiftTypePercentage * 100).toFixed(1)}%)`,
        [assignment.id],
        [
          'Rotate shift types more evenly',
          'Consider employee preferences for shift variety',
          'Balance shift types across team members'
        ],
        Severity.INFO
      ));
    }

    return violations;
  }

  /**
   * Check if weekend and holiday assignments are fairly distributed
   */
  private checkWeekendFairness(
    assignment: Assignment,
    employee: any,
    demand: any,
    context: ValidationContext
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    const dayOfWeek = demand.date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    
    if (!isWeekend) {
      return violations; // Only check weekend fairness for weekend assignments
    }

    // Count weekend assignments for this employee over the past 2 months
    const twoMonthsAgo = new Date(demand.date);
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);
    
    const employeeWeekendAssignments = context.assignments.filter(a => {
      if (a.employeeId !== employee.id || !a.isActive()) return false;
      
      const empDemand = context.getDemand(a.demandId);
      if (!empDemand || empDemand.date < twoMonthsAgo) return false;
      
      const empDayOfWeek = empDemand.date.getDay();
      return empDayOfWeek === 0 || empDayOfWeek === 6;
    });

    // Get team members for comparison
    const teamMembers = context.employees.filter(emp => 
      emp.team === employee.team && emp.active
    );

    if (teamMembers.length > 1) {
      // Calculate weekend assignments for each team member
      const teamWeekendCounts = teamMembers.map(member => {
        const memberWeekendAssignments = context.assignments.filter(a => {
          if (a.employeeId !== member.id || !a.isActive()) return false;
          
          const empDemand = context.getDemand(a.demandId);
          if (!empDemand || empDemand.date < twoMonthsAgo) return false;
          
          const empDayOfWeek = empDemand.date.getDay();
          return empDayOfWeek === 0 || empDayOfWeek === 6;
        });
        
        return {
          employee: member,
          weekendCount: memberWeekendAssignments.length + (member.id === employee.id ? 1 : 0)
        };
      });

      const averageWeekendAssignments = teamWeekendCounts.reduce((sum, tc) => sum + tc.weekendCount, 0) / teamWeekendCounts.length;
      const currentEmployeeWeekendCount = teamWeekendCounts.find(tc => tc.employee.id === employee.id)?.weekendCount || 0;

      // Check if this employee has significantly more weekend assignments
      if (currentEmployeeWeekendCount > averageWeekendAssignments * 1.5 && averageWeekendAssignments > 0) {
        const lessWeekendEmployees = teamWeekendCounts
          .filter(tc => tc.weekendCount < averageWeekendAssignments * 0.8)
          .map(tc => tc.employee.name);

        violations.push(this.createViolation(
          `Weekend assignment imbalance: Employee ${employee.name} has ${currentEmployeeWeekendCount} weekend assignments vs team average of ${averageWeekendAssignments.toFixed(1)}`,
          [assignment.id],
          [
            `Consider assigning weekends to: ${lessWeekendEmployees.join(', ')}`,
            'Implement weekend rotation schedule',
            'Review weekend assignment distribution'
          ],
          Severity.WARNING
        ));
      }
    }

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
   * Get the start of the week for a given date
   */
  private getWeekStart(date: Date): Date {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }
}

/**
 * Constraint that promotes fair distribution of workload and assignments
 */
export class FairnessConstraint extends Constraint {
  constructor() {
    super(
      'fairness',
      'Fairness',
      ConstraintType.SOFT,
      80, // High priority for soft constraints
      'Promotes fair distribution of workload, shift types, and weekend assignments among team members',
      new FairnessValidator()
    );
  }

  public getSeverity(): Severity {
    return Severity.WARNING;
  }
}
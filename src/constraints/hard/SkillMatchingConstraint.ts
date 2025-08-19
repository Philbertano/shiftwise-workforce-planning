import { Constraint } from '../base/Constraint.js';
import { BaseConstraintValidator } from '../base/ConstraintValidator.js';
import { ConstraintViolation } from '../base/ConstraintViolation.js';
import { ValidationContext } from '../base/ValidationContext.js';
import { Assignment } from '../../models/Assignment.js';
import { ConstraintType, Severity } from '../../types/index.js';

/**
 * Validator for skill matching constraint
 */
class SkillMatchingValidator extends BaseConstraintValidator {
  constructor() {
    super('skill-matching', 'Skill Matching');
  }

  public validate(assignment: Assignment, context: ValidationContext): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    const employee = context.getEmployee(assignment.employeeId);
    const demand = context.getDemand(assignment.demandId);
    
    if (!employee || !demand) {
      violations.push(this.createViolation(
        'Cannot validate skill matching: Employee or demand not found',
        [assignment.id],
        ['Verify employee and demand exist in the system'],
        Severity.CRITICAL
      ));
      return violations;
    }

    const station = context.getStation(demand.stationId);
    if (!station) {
      violations.push(this.createViolation(
        'Cannot validate skill matching: Station not found',
        [assignment.id],
        ['Verify station exists in the system'],
        Severity.CRITICAL
      ));
      return violations;
    }

    const employeeSkills = context.getEmployeeSkills(employee.id);
    
    // Check each required skill for the station
    for (const requiredSkill of station.requiredSkills) {
      const employeeSkill = employeeSkills.find(skill => skill.skillId === requiredSkill.skillId);
      
      if (!employeeSkill) {
        if (requiredSkill.mandatory) {
          violations.push(this.createViolation(
            `Employee ${employee.name} lacks required skill for station ${station.name}`,
            [assignment.id],
            [
              `Assign employee with required skill`,
              `Provide training for employee to acquire skill`,
              `Consider alternative station assignment`
            ],
            Severity.CRITICAL
          ));
        }
        continue;
      }

      // Check skill level
      if (employeeSkill.level < requiredSkill.minLevel) {
        violations.push(this.createViolation(
          `Employee ${employee.name} has insufficient skill level (${employeeSkill.level}) for station ${station.name} (requires ${requiredSkill.minLevel})`,
          [assignment.id],
          [
            `Assign employee with higher skill level`,
            `Provide additional training to improve skill level`,
            `Consider supervised assignment with experienced colleague`
          ],
          requiredSkill.mandatory ? Severity.CRITICAL : Severity.ERROR
        ));
      }

      // Check skill expiry
      if (employeeSkill.validUntil && employeeSkill.validUntil < context.date) {
        violations.push(this.createViolation(
          `Employee ${employee.name} has expired skill certification for station ${station.name}`,
          [assignment.id],
          [
            `Renew skill certification`,
            `Assign employee with valid certification`,
            `Provide refresher training`
          ],
          Severity.CRITICAL
        ));
      }

      // Check if skill expires soon (within 30 days)
      if (employeeSkill.validUntil) {
        const daysUntilExpiry = Math.ceil((employeeSkill.validUntil.getTime() - context.date.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
          violations.push(this.createViolation(
            `Employee ${employee.name} skill certification expires in ${daysUntilExpiry} days`,
            [assignment.id],
            [
              `Schedule certification renewal`,
              `Plan for alternative coverage`,
              `Consider training backup employees`
            ],
            Severity.WARNING
          ));
        }
      }
    }

    return violations;
  }
}

/**
 * Constraint that ensures employees have the required skills for their assigned stations
 */
export class SkillMatchingConstraint extends Constraint {
  constructor() {
    super(
      'skill-matching',
      'Skill Matching',
      ConstraintType.HARD,
      100, // Highest priority for hard constraints
      'Ensures employees have the required skills and certifications for their assigned stations',
      new SkillMatchingValidator()
    );
  }

  public getSeverity(): Severity {
    return Severity.CRITICAL;
  }
}
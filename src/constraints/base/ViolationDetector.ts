import { Assignment } from '../../models/Assignment.js';
import { ValidationContext } from './ValidationContext.js';
import { ConstraintViolation } from './ConstraintViolation.js';
import { ViolationReporter } from './ViolationReporter.js';
import { Constraint } from './Constraint.js';
import { Severity } from '../../types/index.js';

/**
 * Service for detecting constraint violations across assignments
 */
export class ViolationDetector {
  private constraints: Constraint[] = [];
  private reporter: ViolationReporter;

  constructor(constraints: Constraint[] = []) {
    this.constraints = constraints;
    this.reporter = new ViolationReporter();
  }

  /**
   * Add a constraint to the detector
   */
  public addConstraint(constraint: Constraint): void {
    this.constraints.push(constraint);
  }

  /**
   * Add multiple constraints to the detector
   */
  public addConstraints(constraints: Constraint[]): void {
    this.constraints.push(...constraints);
  }

  /**
   * Remove a constraint from the detector
   */
  public removeConstraint(constraintId: string): void {
    this.constraints = this.constraints.filter(c => c.id !== constraintId);
  }

  /**
   * Get all registered constraints
   */
  public getConstraints(): Constraint[] {
    return [...this.constraints];
  }

  /**
   * Detect violations for a single assignment
   */
  public detectViolationsForAssignment(
    assignment: Assignment,
    context: ValidationContext
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const constraint of this.constraints) {
      if (!constraint.isEnabled()) {
        continue;
      }

      try {
        const constraintViolations = constraint.validator.validate(assignment, context);
        violations.push(...constraintViolations);
      } catch (error) {
        // Create a violation for constraint validation errors
        const errorViolation = new ConstraintViolation(
          constraint.id,
          Severity.ERROR,
          `Constraint validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          [assignment.id],
          ['Review constraint configuration', 'Contact system administrator']
        );
        violations.push(errorViolation);
      }
    }

    return violations;
  }

  /**
   * Detect violations for multiple assignments
   */
  public detectViolationsForAssignments(
    assignments: Assignment[],
    context: ValidationContext
  ): ConstraintViolation[] {
    const allViolations: ConstraintViolation[] = [];

    for (const assignment of assignments) {
      const violations = this.detectViolationsForAssignment(assignment, context);
      allViolations.push(...violations);
    }

    // Also check for cross-assignment violations
    const crossViolations = this.detectCrossAssignmentViolations(assignments, context);
    allViolations.push(...crossViolations);

    return allViolations;
  }

  /**
   * Detect violations and generate a comprehensive report
   */
  public generateViolationReport(
    assignments: Assignment[],
    context: ValidationContext
  ): ViolationReporter {
    this.reporter.clear();
    
    const violations = this.detectViolationsForAssignments(assignments, context);
    this.reporter.addViolations(violations);
    
    return this.reporter;
  }

  /**
   * Check if assignments are valid (no blocking violations)
   */
  public areAssignmentsValid(
    assignments: Assignment[],
    context: ValidationContext
  ): boolean {
    const violations = this.detectViolationsForAssignments(assignments, context);
    return !violations.some(v => v.isBlocking());
  }

  /**
   * Get validation summary for assignments
   */
  public getValidationSummary(
    assignments: Assignment[],
    context: ValidationContext
  ): ValidationSummary {
    const violations = this.detectViolationsForAssignments(assignments, context);
    const reporter = new ViolationReporter();
    reporter.addViolations(violations);
    
    const summary = reporter.getSummary();
    const validAssignments = assignments.filter(assignment => {
      const assignmentViolations = violations.filter(v => 
        v.affectedAssignments.includes(assignment.id)
      );
      return !assignmentViolations.some(v => v.isBlocking());
    });

    return {
      totalAssignments: assignments.length,
      validAssignments: validAssignments.length,
      invalidAssignments: assignments.length - validAssignments.length,
      violationSummary: summary,
      isValid: summary.blocking === 0,
      canProceed: summary.critical === 0
    };
  }

  /**
   * Detect violations that span multiple assignments (e.g., double booking)
   */
  private detectCrossAssignmentViolations(
    assignments: Assignment[],
    context: ValidationContext
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    // Group assignments by employee and date
    const employeeAssignments = new Map<string, Assignment[]>();
    
    for (const assignment of assignments) {
      if (!assignment.isActive()) continue;
      
      const demand = context.demands.find(d => d.id === assignment.demandId);
      if (!demand) continue;

      const key = `${assignment.employeeId}-${demand.date.toDateString()}`;
      const existing = employeeAssignments.get(key) || [];
      existing.push(assignment);
      employeeAssignments.set(key, existing);
    }

    // Check for double bookings
    for (const [key, empAssignments] of employeeAssignments) {
      if (empAssignments.length > 1) {
        const [employeeId] = key.split('-');
        const employee = context.employees.find(e => e.id === employeeId);
        
        violations.push(new ConstraintViolation(
          'double-booking',
          Severity.CRITICAL,
          `Employee ${employee?.name || employeeId} has multiple assignments on the same date`,
          empAssignments.map(a => a.id),
          [
            'Remove conflicting assignments',
            'Reassign one of the shifts to another employee',
            'Split shifts if possible'
          ]
        ));
      }
    }

    return violations;
  }

  /**
   * Get suggested fixes for violations
   */
  public getSuggestedFixes(violations: ConstraintViolation[]): SuggestedFix[] {
    const fixes: SuggestedFix[] = [];

    for (const violation of violations) {
      const fix: SuggestedFix = {
        violationId: `${violation.constraintId}-${violation.timestamp.getTime()}`,
        severity: violation.severity,
        description: violation.message,
        actions: violation.suggestedActions.map((action, index) => ({
          id: `${violation.constraintId}-action-${index}`,
          description: action,
          type: this.categorizeAction(action),
          automated: this.isAutomatedAction(action),
          priority: this.getActionPriority(action, violation.severity)
        })),
        affectedAssignments: violation.affectedAssignments,
        estimatedEffort: this.estimateEffort(violation),
        canAutoResolve: violation.suggestedActions.some(action => this.isAutomatedAction(action))
      };

      fixes.push(fix);
    }

    return fixes.sort((a, b) => {
      // Sort by severity first, then by whether it can be auto-resolved
      const severityOrder = { critical: 4, error: 3, warning: 2, info: 1 };
      const aSeverity = severityOrder[a.severity as keyof typeof severityOrder] || 0;
      const bSeverity = severityOrder[b.severity as keyof typeof severityOrder] || 0;
      
      if (aSeverity !== bSeverity) {
        return bSeverity - aSeverity;
      }
      
      return a.canAutoResolve === b.canAutoResolve ? 0 : a.canAutoResolve ? -1 : 1;
    });
  }

  /**
   * Categorize an action type
   */
  private categorizeAction(action: string): ActionType {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('reassign') || actionLower.includes('swap')) {
      return ActionType.REASSIGNMENT;
    }
    if (actionLower.includes('remove') || actionLower.includes('delete')) {
      return ActionType.REMOVAL;
    }
    if (actionLower.includes('approve') || actionLower.includes('review')) {
      return ActionType.APPROVAL;
    }
    if (actionLower.includes('contact') || actionLower.includes('notify')) {
      return ActionType.COMMUNICATION;
    }
    if (actionLower.includes('adjust') || actionLower.includes('modify')) {
      return ActionType.MODIFICATION;
    }
    
    return ActionType.OTHER;
  }

  /**
   * Check if an action can be automated
   */
  private isAutomatedAction(action: string): boolean {
    const actionLower = action.toLowerCase();
    return actionLower.includes('reassign') || 
           actionLower.includes('swap') || 
           actionLower.includes('adjust') ||
           actionLower.includes('remove');
  }

  /**
   * Get action priority based on action type and violation severity
   */
  private getActionPriority(action: string, severity: Severity): number {
    const basePriority = severity === Severity.CRITICAL ? 4 : 
                        severity === Severity.ERROR ? 3 :
                        severity === Severity.WARNING ? 2 : 1;
    
    const actionBonus = this.isAutomatedAction(action) ? 1 : 0;
    
    return basePriority + actionBonus;
  }

  /**
   * Estimate effort required to resolve violation
   */
  private estimateEffort(violation: ConstraintViolation): EffortLevel {
    const affectedCount = violation.affectedAssignments.length;
    const actionCount = violation.suggestedActions.length;
    
    if (affectedCount === 1 && actionCount === 1 && this.isAutomatedAction(violation.suggestedActions[0])) {
      return EffortLevel.LOW;
    }
    
    if (affectedCount <= 3 && actionCount <= 2) {
      return EffortLevel.MEDIUM;
    }
    
    return EffortLevel.HIGH;
  }
}

/**
 * Validation summary for a set of assignments
 */
export interface ValidationSummary {
  totalAssignments: number;
  validAssignments: number;
  invalidAssignments: number;
  violationSummary: import('./ViolationReporter.js').ViolationSummary;
  isValid: boolean;
  canProceed: boolean;
}

/**
 * Suggested fix for a violation
 */
export interface SuggestedFix {
  violationId: string;
  severity: Severity;
  description: string;
  actions: FixAction[];
  affectedAssignments: string[];
  estimatedEffort: EffortLevel;
  canAutoResolve: boolean;
}

/**
 * Individual fix action
 */
export interface FixAction {
  id: string;
  description: string;
  type: ActionType;
  automated: boolean;
  priority: number;
}

/**
 * Types of fix actions
 */
export enum ActionType {
  REASSIGNMENT = 'reassignment',
  REMOVAL = 'removal',
  APPROVAL = 'approval',
  COMMUNICATION = 'communication',
  MODIFICATION = 'modification',
  OTHER = 'other'
}

/**
 * Effort levels for fixes
 */
export enum EffortLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}
import { Constraint } from './base/Constraint.js';
import { ViolationDetector, ValidationSummary } from './base/ViolationDetector.js';
import { ViolationReporter } from './base/ViolationReporter.js';
import { ViolationMessageGenerator, MessageContext } from './base/ViolationMessageGenerator.js';
import { ConstraintViolation } from './base/ConstraintViolation.js';
import { ValidationContext } from './base/ValidationContext.js';
import { Assignment } from '../models/Assignment.js';
import { ConstraintType, Severity } from '../types/index.js';

/**
 * Central manager for constraint validation and violation reporting
 */
export class ConstraintManager {
  private detector: ViolationDetector;
  private constraints: Map<string, Constraint> = new Map();

  constructor(constraints: Constraint[] = []) {
    this.detector = new ViolationDetector(constraints);
    
    // Index constraints by ID
    for (const constraint of constraints) {
      this.constraints.set(constraint.id, constraint);
    }
  }

  /**
   * Add a constraint to the manager
   */
  public addConstraint(constraint: Constraint): void {
    this.constraints.set(constraint.id, constraint);
    this.detector.addConstraint(constraint);
  }

  /**
   * Remove a constraint from the manager
   */
  public removeConstraint(constraintId: string): void {
    this.constraints.delete(constraintId);
    this.detector.removeConstraint(constraintId);
  }

  /**
   * Get all registered constraints
   */
  public getConstraints(): Constraint[] {
    return Array.from(this.constraints.values());
  }

  /**
   * Get constraints by type
   */
  public getConstraintsByType(type: ConstraintType): Constraint[] {
    return this.getConstraints().filter(c => c.type === type);
  }

  /**
   * Get hard constraints
   */
  public getHardConstraints(): Constraint[] {
    return this.getConstraintsByType(ConstraintType.HARD);
  }

  /**
   * Get soft constraints
   */
  public getSoftConstraints(): Constraint[] {
    return this.getConstraintsByType(ConstraintType.SOFT);
  }

  /**
   * Validate a single assignment
   */
  public validateAssignment(
    assignment: Assignment,
    context: ValidationContext
  ): ConstraintViolation[] {
    return this.detector.detectViolationsForAssignment(assignment, context);
  }

  /**
   * Validate multiple assignments
   */
  public validateAssignments(
    assignments: Assignment[],
    context: ValidationContext
  ): ConstraintViolation[] {
    return this.detector.detectViolationsForAssignments(assignments, context);
  }

  /**
   * Generate comprehensive violation report
   */
  public generateViolationReport(
    assignments: Assignment[],
    context: ValidationContext
  ): ViolationReporter {
    return this.detector.generateViolationReport(assignments, context);
  }

  /**
   * Check if assignments are valid (no blocking violations)
   */
  public areAssignmentsValid(
    assignments: Assignment[],
    context: ValidationContext
  ): boolean {
    return this.detector.areAssignmentsValid(assignments, context);
  }

  /**
   * Get validation summary
   */
  public getValidationSummary(
    assignments: Assignment[],
    context: ValidationContext
  ): ValidationSummary {
    return this.detector.getValidationSummary(assignments, context);
  }

  /**
   * Create user-friendly violation with context
   */
  public createUserFriendlyViolation(
    constraintId: string,
    severity: Severity,
    affectedAssignments: string[],
    messageContext?: MessageContext
  ): ConstraintViolation {
    return ViolationMessageGenerator.createUserFriendlyViolation(
      constraintId,
      severity,
      affectedAssignments,
      messageContext
    );
  }

  /**
   * Format violations for display
   */
  public formatViolationsForDisplay(
    violations: ConstraintViolation[],
    messageContext?: MessageContext
  ) {
    return violations.map(violation => 
      ViolationMessageGenerator.formatViolationForDisplay(violation, messageContext)
    );
  }

  /**
   * Get suggested fixes for violations
   */
  public getSuggestedFixes(violations: ConstraintViolation[]) {
    return this.detector.getSuggestedFixes(violations);
  }

  /**
   * Validate assignments and return formatted results
   */
  public validateAndFormat(
    assignments: Assignment[],
    context: ValidationContext,
    messageContext?: MessageContext
  ) {
    const violations = this.validateAssignments(assignments, context);
    const summary = this.getValidationSummary(assignments, context);
    const formattedViolations = this.formatViolationsForDisplay(violations, messageContext);
    const suggestedFixes = this.getSuggestedFixes(violations);

    return {
      summary,
      violations: formattedViolations,
      suggestedFixes,
      isValid: summary.isValid,
      canProceed: summary.canProceed
    };
  }

  /**
   * Get constraint metadata for reporting
   */
  public getConstraintMetadata() {
    return this.getConstraints().map(constraint => constraint.getMetadata());
  }

  /**
   * Enable/disable a constraint
   */
  public setConstraintEnabled(constraintId: string, enabled: boolean): boolean {
    const constraint = this.constraints.get(constraintId);
    if (!constraint) {
      return false;
    }

    // Note: This would require extending the Constraint class to support enable/disable
    // For now, we'll remove/add the constraint
    if (enabled) {
      this.detector.addConstraint(constraint);
    } else {
      this.detector.removeConstraint(constraintId);
    }

    return true;
  }

  /**
   * Get violations by severity level
   */
  public getViolationsBySeverity(
    assignments: Assignment[],
    context: ValidationContext,
    severity: Severity
  ): ConstraintViolation[] {
    const violations = this.validateAssignments(assignments, context);
    return violations.filter(v => v.severity === severity);
  }

  /**
   * Get blocking violations only
   */
  public getBlockingViolations(
    assignments: Assignment[],
    context: ValidationContext
  ): ConstraintViolation[] {
    const violations = this.validateAssignments(assignments, context);
    return violations.filter(v => v.isBlocking());
  }

  /**
   * Check if specific constraint is violated
   */
  public isConstraintViolated(
    constraintId: string,
    assignments: Assignment[],
    context: ValidationContext
  ): boolean {
    const violations = this.validateAssignments(assignments, context);
    return violations.some(v => v.constraintId === constraintId);
  }

  /**
   * Get violations for specific assignments
   */
  public getViolationsForAssignments(
    assignmentIds: string[],
    assignments: Assignment[],
    context: ValidationContext
  ): ConstraintViolation[] {
    const violations = this.validateAssignments(assignments, context);
    return violations.filter(v => 
      v.affectedAssignments.some(id => assignmentIds.includes(id))
    );
  }

  /**
   * Get constraint statistics
   */
  public getConstraintStatistics() {
    const constraints = this.getConstraints();
    const hardCount = constraints.filter(c => c.isHard()).length;
    const softCount = constraints.filter(c => c.isSoft()).length;

    return {
      total: constraints.length,
      hard: hardCount,
      soft: softCount,
      enabled: constraints.filter(c => c.isEnabled()).length,
      byPriority: this.groupConstraintsByPriority(constraints)
    };
  }

  /**
   * Group constraints by priority
   */
  private groupConstraintsByPriority(constraints: Constraint[]) {
    const groups: Record<number, number> = {};
    
    for (const constraint of constraints) {
      groups[constraint.priority] = (groups[constraint.priority] || 0) + 1;
    }

    return groups;
  }
}
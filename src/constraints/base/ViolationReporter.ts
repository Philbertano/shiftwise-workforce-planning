import { ConstraintViolation } from './ConstraintViolation.js';
import { Severity } from '../../types/index.js';

/**
 * Violation reporting and aggregation system
 */
export class ViolationReporter {
  private violations: ConstraintViolation[] = [];

  /**
   * Add a violation to the report
   */
  public addViolation(violation: ConstraintViolation): void {
    this.violations.push(violation);
  }

  /**
   * Add multiple violations to the report
   */
  public addViolations(violations: ConstraintViolation[]): void {
    this.violations.push(...violations);
  }

  /**
   * Clear all violations
   */
  public clear(): void {
    this.violations = [];
  }

  /**
   * Get all violations
   */
  public getViolations(): ConstraintViolation[] {
    return [...this.violations];
  }

  /**
   * Get violations by severity
   */
  public getViolationsBySeverity(severity: Severity): ConstraintViolation[] {
    return this.violations.filter(v => v.severity === severity);
  }

  /**
   * Get critical violations
   */
  public getCriticalViolations(): ConstraintViolation[] {
    return this.getViolationsBySeverity(Severity.CRITICAL);
  }

  /**
   * Get error violations
   */
  public getErrorViolations(): ConstraintViolation[] {
    return this.getViolationsBySeverity(Severity.ERROR);
  }

  /**
   * Get warning violations
   */
  public getWarningViolations(): ConstraintViolation[] {
    return this.getViolationsBySeverity(Severity.WARNING);
  }

  /**
   * Get info violations
   */
  public getInfoViolations(): ConstraintViolation[] {
    return this.getViolationsBySeverity(Severity.INFO);
  }

  /**
   * Get blocking violations (critical and error)
   */
  public getBlockingViolations(): ConstraintViolation[] {
    return this.violations.filter(v => v.isBlocking());
  }

  /**
   * Check if there are any blocking violations
   */
  public hasBlockingViolations(): boolean {
    return this.violations.some(v => v.isBlocking());
  }

  /**
   * Get violations sorted by severity (most severe first)
   */
  public getViolationsSortedBySeverity(): ConstraintViolation[] {
    return [...this.violations].sort((a, b) => b.getSeverityLevel() - a.getSeverityLevel());
  }

  /**
   * Get violations grouped by constraint ID
   */
  public getViolationsGroupedByConstraint(): Map<string, ConstraintViolation[]> {
    const grouped = new Map<string, ConstraintViolation[]>();
    
    for (const violation of this.violations) {
      const existing = grouped.get(violation.constraintId) || [];
      existing.push(violation);
      grouped.set(violation.constraintId, existing);
    }
    
    return grouped;
  }

  /**
   * Get violations affecting specific assignments
   */
  public getViolationsForAssignments(assignmentIds: string[]): ConstraintViolation[] {
    return this.violations.filter(v => 
      v.affectedAssignments.some(id => assignmentIds.includes(id))
    );
  }

  /**
   * Get summary statistics
   */
  public getSummary(): ViolationSummary {
    const total = this.violations.length;
    const critical = this.getCriticalViolations().length;
    const error = this.getErrorViolations().length;
    const warning = this.getWarningViolations().length;
    const info = this.getInfoViolations().length;
    const blocking = this.getBlockingViolations().length;

    const affectedAssignments = new Set<string>();
    const constraintTypes = new Set<string>();

    for (const violation of this.violations) {
      violation.affectedAssignments.forEach(id => affectedAssignments.add(id));
      constraintTypes.add(violation.constraintId);
    }

    return {
      total,
      critical,
      error,
      warning,
      info,
      blocking,
      affectedAssignmentCount: affectedAssignments.size,
      uniqueConstraintCount: constraintTypes.size,
      hasBlockingViolations: blocking > 0
    };
  }

  /**
   * Generate a formatted report
   */
  public generateReport(): ViolationReport {
    const summary = this.getSummary();
    const violationsByConstraint = this.getViolationsGroupedByConstraint();
    const sortedViolations = this.getViolationsSortedBySeverity();

    return {
      summary,
      violations: sortedViolations.map(v => v.getSummary()),
      violationsByConstraint: Array.from(violationsByConstraint.entries()).map(([constraintId, violations]) => ({
        constraintId,
        count: violations.length,
        maxSeverity: Math.max(...violations.map(v => v.getSeverityLevel())),
        violations: violations.map(v => v.getSummary())
      })),
      generatedAt: new Date()
    };
  }

  /**
   * Get user-friendly messages for all violations
   */
  public getUserFriendlyMessages(): UserFriendlyMessage[] {
    return this.violations.map(violation => ({
      id: `${violation.constraintId}-${violation.timestamp.getTime()}`,
      severity: violation.severity,
      title: this.generateTitle(violation),
      message: violation.message,
      suggestedActions: violation.suggestedActions,
      affectedCount: violation.affectedAssignments.length,
      timestamp: violation.timestamp
    }));
  }

  /**
   * Generate user-friendly title for a violation
   */
  private generateTitle(violation: ConstraintViolation): string {
    const severityText = violation.severity.charAt(0).toUpperCase() + violation.severity.slice(1);
    const constraintName = this.getConstraintDisplayName(violation.constraintId);
    
    return `${severityText}: ${constraintName}`;
  }

  /**
   * Get display name for constraint ID
   */
  private getConstraintDisplayName(constraintId: string): string {
    const displayNames: Record<string, string> = {
      'skill-matching': 'Skill Requirements',
      'availability': 'Employee Availability',
      'labor-law': 'Labor Law Compliance',
      'fairness': 'Workload Fairness',
      'preference': 'Employee Preferences',
      'continuity': 'Shift Continuity'
    };

    return displayNames[constraintId] || constraintId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Check if violations can be resolved automatically
   */
  public getAutoResolvableViolations(): ConstraintViolation[] {
    return this.violations.filter(violation => 
      violation.suggestedActions.some(action => 
        action.toLowerCase().includes('reassign') || 
        action.toLowerCase().includes('swap') ||
        action.toLowerCase().includes('adjust')
      )
    );
  }

  /**
   * Get violations that require manual intervention
   */
  public getManualInterventionViolations(): ConstraintViolation[] {
    return this.violations.filter(violation => 
      violation.suggestedActions.some(action => 
        action.toLowerCase().includes('contact') || 
        action.toLowerCase().includes('approve') ||
        action.toLowerCase().includes('review')
      )
    );
  }
}

/**
 * Summary of violations
 */
export interface ViolationSummary {
  total: number;
  critical: number;
  error: number;
  warning: number;
  info: number;
  blocking: number;
  affectedAssignmentCount: number;
  uniqueConstraintCount: number;
  hasBlockingViolations: boolean;
}

/**
 * Detailed violation report
 */
export interface ViolationReport {
  summary: ViolationSummary;
  violations: Array<{
    constraintId: string;
    severity: Severity;
    message: string;
    affectedCount: number;
    actionCount: number;
    timestamp: Date;
  }>;
  violationsByConstraint: Array<{
    constraintId: string;
    count: number;
    maxSeverity: number;
    violations: Array<{
      constraintId: string;
      severity: Severity;
      message: string;
      affectedCount: number;
      actionCount: number;
      timestamp: Date;
    }>;
  }>;
  generatedAt: Date;
}

/**
 * User-friendly violation message
 */
export interface UserFriendlyMessage {
  id: string;
  severity: Severity;
  title: string;
  message: string;
  suggestedActions: string[];
  affectedCount: number;
  timestamp: Date;
}
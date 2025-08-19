import { Severity } from '../../types/index.js';

/**
 * Represents a constraint violation with details and suggested actions
 */
export class ConstraintViolation {
  public readonly constraintId: string;
  public readonly severity: Severity;
  public readonly message: string;
  public readonly affectedAssignments: string[];
  public readonly suggestedActions: string[];
  public readonly timestamp: Date;

  constructor(
    constraintId: string,
    severity: Severity,
    message: string,
    affectedAssignments: string[],
    suggestedActions: string[]
  ) {
    this.constraintId = constraintId;
    this.severity = severity;
    this.message = message;
    this.affectedAssignments = affectedAssignments;
    this.suggestedActions = suggestedActions;
    this.timestamp = new Date();
  }

  /**
   * Check if this is a critical violation
   */
  public isCritical(): boolean {
    return this.severity === Severity.CRITICAL;
  }

  /**
   * Check if this is an error violation
   */
  public isError(): boolean {
    return this.severity === Severity.ERROR;
  }

  /**
   * Check if this is a warning violation
   */
  public isWarning(): boolean {
    return this.severity === Severity.WARNING;
  }

  /**
   * Check if this is an info violation
   */
  public isInfo(): boolean {
    return this.severity === Severity.INFO;
  }

  /**
   * Check if this violation blocks assignment (critical or error)
   */
  public isBlocking(): boolean {
    return this.severity === Severity.CRITICAL || this.severity === Severity.ERROR;
  }

  /**
   * Get severity level as numeric value for sorting (higher = more severe)
   */
  public getSeverityLevel(): number {
    switch (this.severity) {
      case Severity.CRITICAL: return 4;
      case Severity.ERROR: return 3;
      case Severity.WARNING: return 2;
      case Severity.INFO: return 1;
      default: return 0;
    }
  }

  /**
   * Get a formatted message with severity prefix
   */
  public getFormattedMessage(): string {
    const prefix = this.severity.toUpperCase();
    return `[${prefix}] ${this.message}`;
  }

  /**
   * Get violation summary for reporting
   */
  public getSummary(): {
    constraintId: string;
    severity: Severity;
    message: string;
    affectedCount: number;
    actionCount: number;
    timestamp: Date;
  } {
    return {
      constraintId: this.constraintId,
      severity: this.severity,
      message: this.message,
      affectedCount: this.affectedAssignments.length,
      actionCount: this.suggestedActions.length,
      timestamp: this.timestamp
    };
  }

  /**
   * Convert to plain object for serialization
   */
  public toJSON(): Record<string, any> {
    return {
      constraintId: this.constraintId,
      severity: this.severity,
      message: this.message,
      affectedAssignments: this.affectedAssignments,
      suggestedActions: this.suggestedActions,
      timestamp: this.timestamp
    };
  }

  /**
   * Create a copy with updated message
   */
  public withMessage(newMessage: string): ConstraintViolation {
    return new ConstraintViolation(
      this.constraintId,
      this.severity,
      newMessage,
      this.affectedAssignments,
      this.suggestedActions
    );
  }

  /**
   * Create a copy with additional suggested actions
   */
  public withAdditionalActions(additionalActions: string[]): ConstraintViolation {
    return new ConstraintViolation(
      this.constraintId,
      this.severity,
      this.message,
      this.affectedAssignments,
      [...this.suggestedActions, ...additionalActions]
    );
  }

  /**
   * Create a copy with different severity
   */
  public withSeverity(newSeverity: Severity): ConstraintViolation {
    return new ConstraintViolation(
      this.constraintId,
      newSeverity,
      this.message,
      this.affectedAssignments,
      this.suggestedActions
    );
  }
}
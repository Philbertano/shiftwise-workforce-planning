import { ConstraintType, Severity } from '../../types/index.js';
import { ConstraintValidator } from './ConstraintValidator.js';

/**
 * Base constraint class that defines the structure and behavior of all constraints
 */
export abstract class Constraint {
  public readonly id: string;
  public readonly name: string;
  public readonly type: ConstraintType;
  public readonly priority: number;
  public readonly description: string;
  public readonly validator: ConstraintValidator;

  constructor(
    id: string,
    name: string,
    type: ConstraintType,
    priority: number,
    description: string,
    validator: ConstraintValidator
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.priority = priority;
    this.description = description;
    this.validator = validator;
  }

  /**
   * Get the severity level for violations of this constraint
   */
  public abstract getSeverity(): Severity;

  /**
   * Check if this constraint is enabled
   */
  public isEnabled(): boolean {
    return true; // Default implementation - can be overridden
  }

  /**
   * Get weight for soft constraints (0-1, where 1 is most important)
   */
  public getWeight(): number {
    return this.type === ConstraintType.HARD ? 1.0 : this.priority / 100;
  }

  /**
   * Check if this is a hard constraint
   */
  public isHard(): boolean {
    return this.type === ConstraintType.HARD;
  }

  /**
   * Check if this is a soft constraint
   */
  public isSoft(): boolean {
    return this.type === ConstraintType.SOFT;
  }

  /**
   * Get constraint metadata for reporting
   */
  public getMetadata(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      priority: this.priority,
      description: this.description,
      severity: this.getSeverity(),
      weight: this.getWeight(),
      enabled: this.isEnabled()
    };
  }
}
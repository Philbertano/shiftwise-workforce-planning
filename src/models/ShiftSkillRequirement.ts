import { z } from 'zod';
import { Priority } from '../types/index.js';

// Validation schemas
const ShiftSkillRequirementSchema = z.object({
  id: z.string().min(1, 'Skill requirement ID is required'),
  staffingRequirementId: z.string().min(1, 'Staffing requirement ID is required'),
  skillId: z.string().min(1, 'Skill ID is required'),
  minLevel: z.number().min(1, 'Minimum level must be at least 1').max(3, 'Maximum level is 3'),
  requiredCount: z.number().min(1, 'Required count must be at least 1'),
  mandatory: z.boolean(),
  priority: z.nativeEnum(Priority),
  createdAt: z.date(),
  updatedAt: z.date()
});

export class ShiftSkillRequirement {
  public readonly id: string;
  public readonly staffingRequirementId: string;
  public readonly skillId: string;
  public readonly minLevel: number;
  public readonly requiredCount: number;
  public readonly mandatory: boolean;
  public readonly priority: Priority;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(data: {
    id: string;
    staffingRequirementId: string;
    skillId: string;
    minLevel: number;
    requiredCount: number;
    mandatory?: boolean;
    priority: Priority;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const now = new Date();
    const skillRequirementData = {
      ...data,
      mandatory: data.mandatory ?? true,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };

    // Validate the data
    const validated = ShiftSkillRequirementSchema.parse(skillRequirementData);
    
    // Additional business rule validations
    this.validateBusinessRules(validated);

    // Assign validated properties
    this.id = validated.id;
    this.staffingRequirementId = validated.staffingRequirementId;
    this.skillId = validated.skillId;
    this.minLevel = validated.minLevel;
    this.requiredCount = validated.requiredCount;
    this.mandatory = validated.mandatory;
    this.priority = validated.priority;
    this.createdAt = validated.createdAt;
    this.updatedAt = validated.updatedAt;
  }

  private validateBusinessRules(data: z.infer<typeof ShiftSkillRequirementSchema>): void {
    // Validate reasonable required count
    if (data.requiredCount > 10) {
      throw new Error('Required count cannot exceed 10 per skill');
    }

    // Validate that critical priority skills should typically be mandatory
    if (data.priority === Priority.CRITICAL && !data.mandatory) {
      console.warn(`Critical priority skill ${data.skillId} is not mandatory - this may cause planning issues`);
    }
  }

  /**
   * Check if an employee meets this skill requirement
   */
  public isMetByEmployee(employeeSkillLevel: number | null): boolean {
    if (employeeSkillLevel === null) {
      return !this.mandatory; // Only optional skills can be unmet
    }
    return employeeSkillLevel >= this.minLevel;
  }

  /**
   * Get the skill gap for a given employee skill level
   */
  public getSkillGap(employeeSkillLevel: number | null): number {
    if (employeeSkillLevel === null) {
      return this.mandatory ? this.minLevel : 0;
    }
    return Math.max(0, this.minLevel - employeeSkillLevel);
  }

  /**
   * Get the priority weight for optimization algorithms
   */
  public getPriorityWeight(): number {
    const baseWeight = this.mandatory ? 10 : 5;
    const priorityMultiplier = this.getPriorityMultiplier();
    return baseWeight * priorityMultiplier;
  }

  private getPriorityMultiplier(): number {
    switch (this.priority) {
      case Priority.CRITICAL:
        return 4;
      case Priority.HIGH:
        return 3;
      case Priority.MEDIUM:
        return 2;
      case Priority.LOW:
        return 1;
      default:
        return 1;
    }
  }

  /**
   * Check if this skill requirement is critical for operations
   */
  public isCritical(): boolean {
    return this.mandatory && (this.priority === Priority.CRITICAL || this.priority === Priority.HIGH);
  }

  /**
   * Get a description of this skill requirement
   */
  public getDescription(): string {
    const mandatoryText = this.mandatory ? 'Required' : 'Preferred';
    const levelText = `Level ${this.minLevel}+`;
    const countText = this.requiredCount > 1 ? ` (${this.requiredCount} people)` : '';
    const priorityText = this.priority !== Priority.MEDIUM ? ` [${this.priority.toUpperCase()}]` : '';
    
    return `${mandatoryText}: ${levelText}${countText}${priorityText}`;
  }

  /**
   * Calculate compatibility score with an employee's skill level
   */
  public calculateCompatibilityScore(employeeSkillLevel: number | null): number {
    if (employeeSkillLevel === null) {
      return this.mandatory ? 0 : 0.3; // Small score for optional skills
    }

    if (employeeSkillLevel < this.minLevel) {
      return this.mandatory ? 0 : 0.1; // Very low score for insufficient skill
    }

    // Perfect match gets full score
    if (employeeSkillLevel === this.minLevel) {
      return 1.0;
    }

    // Higher skill levels get bonus points but with diminishing returns
    const bonus = Math.min(0.3, (employeeSkillLevel - this.minLevel) * 0.1);
    return 1.0 + bonus;
  }

  /**
   * Check if this requirement conflicts with another skill requirement
   */
  public conflictsWith(other: ShiftSkillRequirement): boolean {
    // Same skill for same staffing requirement
    if (this.staffingRequirementId === other.staffingRequirementId && this.skillId === other.skillId) {
      return true;
    }
    return false;
  }

  /**
   * Create a copy with updated properties
   */
  public update(updates: Partial<Omit<ShiftSkillRequirement, 'id' | 'staffingRequirementId' | 'createdAt'>>): ShiftSkillRequirement {
    return new ShiftSkillRequirement({
      id: this.id,
      staffingRequirementId: this.staffingRequirementId,
      skillId: updates.skillId ?? this.skillId,
      minLevel: updates.minLevel ?? this.minLevel,
      requiredCount: updates.requiredCount ?? this.requiredCount,
      mandatory: updates.mandatory ?? this.mandatory,
      priority: updates.priority ?? this.priority,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }

  /**
   * Convert to plain object for serialization
   */
  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      staffingRequirementId: this.staffingRequirementId,
      skillId: this.skillId,
      minLevel: this.minLevel,
      requiredCount: this.requiredCount,
      mandatory: this.mandatory,
      priority: this.priority,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
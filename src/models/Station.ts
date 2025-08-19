import { z } from 'zod';
import { Priority, RequiredSkill } from '../types/index.js';

// Validation schemas
const RequiredSkillSchema = z.object({
  skillId: z.string().min(1, 'Skill ID is required'),
  minLevel: z.number().min(1, 'Minimum level must be at least 1'),
  count: z.number().min(1, 'Count must be at least 1'),
  mandatory: z.boolean()
});

const StationSchema = z.object({
  id: z.string().min(1, 'Station ID is required'),
  name: z.string().min(1, 'Station name is required').max(100, 'Name too long'),
  line: z.string().min(1, 'Line is required').max(50, 'Line name too long'),
  requiredSkills: z.array(RequiredSkillSchema),
  priority: z.nativeEnum(Priority),
  location: z.string().max(200, 'Location too long').optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export class Station {
  public readonly id: string;
  public readonly name: string;
  public readonly line: string;
  public readonly requiredSkills: RequiredSkill[];
  public readonly priority: Priority;
  public readonly location?: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(data: {
    id: string;
    name: string;
    line: string;
    requiredSkills: RequiredSkill[];
    priority: Priority;
    location?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const now = new Date();
    const stationData = {
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };

    // Validate the data
    const validated = StationSchema.parse(stationData);
    
    // Additional business rule validations
    this.validateBusinessRules(validated);

    // Assign validated properties
    this.id = validated.id;
    this.name = validated.name;
    this.line = validated.line;
    this.requiredSkills = validated.requiredSkills;
    this.priority = validated.priority;
    this.location = validated.location;
    this.createdAt = validated.createdAt;
    this.updatedAt = validated.updatedAt;
  }

  private validateBusinessRules(data: z.infer<typeof StationSchema>): void {
    // Validate that there's at least one required skill
    if (data.requiredSkills.length === 0) {
      throw new Error('Station must have at least one required skill');
    }

    // Validate no duplicate skill requirements
    const skillIds = data.requiredSkills.map(skill => skill.skillId);
    const uniqueSkillIds = new Set(skillIds);
    if (skillIds.length !== uniqueSkillIds.size) {
      throw new Error('Station cannot have duplicate skill requirements');
    }

    // Validate that at least one skill is mandatory for critical stations
    if (data.priority === Priority.CRITICAL) {
      const hasMandatorySkill = data.requiredSkills.some(skill => skill.mandatory);
      if (!hasMandatorySkill) {
        throw new Error('Critical stations must have at least one mandatory skill');
      }
    }

    // Validate reasonable skill counts
    const totalRequiredCount = data.requiredSkills.reduce((total, skill) => total + skill.count, 0);
    if (totalRequiredCount > 10) {
      throw new Error('Total required skill count cannot exceed 10 per station');
    }
  }

  /**
   * Get all mandatory skills for this station
   */
  public getMandatorySkills(): RequiredSkill[] {
    return this.requiredSkills.filter(skill => skill.mandatory);
  }

  /**
   * Get all optional skills for this station
   */
  public getOptionalSkills(): RequiredSkill[] {
    return this.requiredSkills.filter(skill => !skill.mandatory);
  }

  /**
   * Get the total number of people required for this station
   */
  public getTotalRequiredCount(): number {
    return this.requiredSkills.reduce((total, skill) => total + skill.count, 0);
  }

  /**
   * Get the minimum number of people required (mandatory skills only)
   */
  public getMinimumRequiredCount(): number {
    return this.getMandatorySkills().reduce((total, skill) => total + skill.count, 0);
  }

  /**
   * Check if a skill is required for this station
   */
  public requiresSkill(skillId: string): boolean {
    return this.requiredSkills.some(skill => skill.skillId === skillId);
  }

  /**
   * Get the required level for a specific skill
   */
  public getRequiredLevel(skillId: string): number | null {
    const skill = this.requiredSkills.find(skill => skill.skillId === skillId);
    return skill ? skill.minLevel : null;
  }

  /**
   * Check if a skill requirement is mandatory
   */
  public isSkillMandatory(skillId: string): boolean {
    const skill = this.requiredSkills.find(skill => skill.skillId === skillId);
    return skill ? skill.mandatory : false;
  }

  /**
   * Get the required count for a specific skill
   */
  public getRequiredCount(skillId: string): number {
    const skill = this.requiredSkills.find(skill => skill.skillId === skillId);
    return skill ? skill.count : 0;
  }

  /**
   * Check if this station is critical
   */
  public isCritical(): boolean {
    return this.priority === Priority.CRITICAL;
  }

  /**
   * Check if this station is high priority or above
   */
  public isHighPriority(): boolean {
    return this.priority === Priority.HIGH || this.priority === Priority.CRITICAL;
  }

  /**
   * Get skills grouped by mandatory/optional
   */
  public getSkillsByType(): { mandatory: RequiredSkill[]; optional: RequiredSkill[] } {
    return {
      mandatory: this.getMandatorySkills(),
      optional: this.getOptionalSkills()
    };
  }

  /**
   * Create a copy with updated properties
   */
  public update(updates: Partial<Omit<Station, 'id' | 'createdAt'>>): Station {
    return new Station({
      id: this.id,
      name: updates.name ?? this.name,
      line: updates.line ?? this.line,
      requiredSkills: updates.requiredSkills ?? this.requiredSkills,
      priority: updates.priority ?? this.priority,
      location: updates.location ?? this.location,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }

  /**
   * Add a required skill to this station
   */
  public addRequiredSkill(skill: RequiredSkill): Station {
    // Check if skill already exists
    if (this.requiresSkill(skill.skillId)) {
      throw new Error(`Skill ${skill.skillId} is already required for this station`);
    }

    return new Station({
      id: this.id,
      name: this.name,
      line: this.line,
      requiredSkills: [...this.requiredSkills, skill],
      priority: this.priority,
      location: this.location,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }

  /**
   * Remove a required skill from this station
   */
  public removeRequiredSkill(skillId: string): Station {
    const updatedSkills = this.requiredSkills.filter(skill => skill.skillId !== skillId);
    
    if (updatedSkills.length === this.requiredSkills.length) {
      throw new Error(`Skill ${skillId} is not required for this station`);
    }

    return new Station({
      id: this.id,
      name: this.name,
      line: this.line,
      requiredSkills: updatedSkills,
      priority: this.priority,
      location: this.location,
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
      name: this.name,
      line: this.line,
      requiredSkills: this.requiredSkills,
      priority: this.priority,
      location: this.location,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
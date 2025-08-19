import { z } from 'zod';
import { SkillCategory } from '../types/index.js';

// Validation schema
const SkillSchema = z.object({
  id: z.string().min(1, 'Skill ID is required'),
  name: z.string().min(1, 'Skill name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  levelScale: z.number().min(1, 'Level scale must be at least 1').max(10, 'Level scale cannot exceed 10'),
  category: z.nativeEnum(SkillCategory),
  createdAt: z.date(),
  updatedAt: z.date()
});

export class Skill {
  public readonly id: string;
  public readonly name: string;
  public readonly description?: string;
  public readonly levelScale: number;
  public readonly category: SkillCategory;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(data: {
    id: string;
    name: string;
    description?: string;
    levelScale: number;
    category: SkillCategory;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const now = new Date();
    const skillData = {
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };

    // Validate the data
    const validated = SkillSchema.parse(skillData);
    
    // Additional business rule validations
    this.validateBusinessRules(validated);

    // Assign validated properties
    this.id = validated.id;
    this.name = validated.name;
    this.description = validated.description;
    this.levelScale = validated.levelScale;
    this.category = validated.category;
    this.createdAt = validated.createdAt;
    this.updatedAt = validated.updatedAt;
  }

  private validateBusinessRules(data: z.infer<typeof SkillSchema>): void {
    // Validate skill name uniqueness (would be enforced at repository level)
    if (data.name.trim() !== data.name) {
      throw new Error('Skill name cannot have leading or trailing whitespace');
    }

    // Category-specific validations
    if (data.category === SkillCategory.SAFETY && data.levelScale < 2) {
      throw new Error('Safety skills must have at least 2 levels for proper certification tracking');
    }
  }

  /**
   * Check if a given level is valid for this skill
   */
  public isValidLevel(level: number): boolean {
    return Number.isInteger(level) && level >= 1 && level <= this.levelScale;
  }

  /**
   * Get level description based on the level number
   */
  public getLevelDescription(level: number): string {
    if (!this.isValidLevel(level)) {
      throw new Error(`Invalid level ${level} for skill ${this.name}`);
    }

    const levelDescriptions: Record<number, string> = {
      1: 'Beginner',
      2: 'Intermediate',
      3: 'Advanced',
      4: 'Expert',
      5: 'Master'
    };

    return levelDescriptions[level] || `Level ${level}`;
  }

  /**
   * Check if this skill is critical (safety or quality related)
   */
  public isCritical(): boolean {
    return this.category === SkillCategory.SAFETY || this.category === SkillCategory.QUALITY;
  }

  /**
   * Create a copy with updated properties
   */
  public update(updates: Partial<Omit<Skill, 'id' | 'createdAt'>>): Skill {
    return new Skill({
      id: this.id,
      name: updates.name ?? this.name,
      description: updates.description ?? this.description,
      levelScale: updates.levelScale ?? this.levelScale,
      category: updates.category ?? this.category,
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
      description: this.description,
      levelScale: this.levelScale,
      category: this.category,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
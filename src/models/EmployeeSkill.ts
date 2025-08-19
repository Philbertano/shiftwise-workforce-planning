import { z } from 'zod';
import { isAfter, isBefore, addDays } from 'date-fns';

// Validation schema
const EmployeeSkillSchema = z.object({
  id: z.string().min(1, 'EmployeeSkill ID is required'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  skillId: z.string().min(1, 'Skill ID is required'),
  level: z.number().min(1, 'Skill level must be at least 1'),
  validUntil: z.date().optional(),
  certificationId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export class EmployeeSkill {
  public readonly id: string;
  public readonly employeeId: string;
  public readonly skillId: string;
  public readonly level: number;
  public readonly validUntil?: Date;
  public readonly certificationId?: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(data: {
    id: string;
    employeeId: string;
    skillId: string;
    level: number;
    validUntil?: Date;
    certificationId?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const now = new Date();
    const employeeSkillData = {
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };

    // Validate the data
    const validated = EmployeeSkillSchema.parse(employeeSkillData);
    
    // Additional business rule validations
    this.validateBusinessRules(validated);

    // Assign validated properties
    this.id = validated.id;
    this.employeeId = validated.employeeId;
    this.skillId = validated.skillId;
    this.level = validated.level;
    this.validUntil = validated.validUntil;
    this.certificationId = validated.certificationId;
    this.createdAt = validated.createdAt;
    this.updatedAt = validated.updatedAt;
  }

  private validateBusinessRules(data: z.infer<typeof EmployeeSkillSchema>): void {
    // Note: We allow past dates for testing expired skills
    // In production, you might want to warn but not prevent creation of expired skills

    // Validate certification ID format if provided
    if (data.certificationId && data.certificationId.trim() !== data.certificationId) {
      throw new Error('Certification ID cannot have leading or trailing whitespace');
    }

    // Level must be positive
    if (data.level <= 0) {
      throw new Error('Skill level must be positive');
    }
  }

  /**
   * Check if the skill certification is currently valid
   */
  public isValid(asOfDate: Date = new Date()): boolean {
    if (!this.validUntil) {
      return true; // No expiry date means it's always valid
    }
    return isAfter(this.validUntil, asOfDate) || this.validUntil.getTime() === asOfDate.getTime();
  }

  /**
   * Check if the skill certification is expired
   */
  public isExpired(asOfDate: Date = new Date()): boolean {
    return !this.isValid(asOfDate);
  }

  /**
   * Check if the skill certification is expiring soon (within specified days)
   */
  public isExpiringSoon(withinDays: number = 30, asOfDate: Date = new Date()): boolean {
    if (!this.validUntil) {
      return false; // No expiry date means it won't expire
    }
    
    const expiryThreshold = addDays(asOfDate, withinDays);
    return isBefore(this.validUntil, expiryThreshold) && this.isValid(asOfDate);
  }

  /**
   * Get days until expiry (negative if expired)
   */
  public getDaysUntilExpiry(asOfDate: Date = new Date()): number | null {
    if (!this.validUntil) {
      return null; // No expiry date
    }
    
    const diffTime = this.validUntil.getTime() - asOfDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if this skill meets the minimum level requirement
   */
  public meetsMinimumLevel(requiredLevel: number): boolean {
    return this.level >= requiredLevel;
  }

  /**
   * Check if this skill meets requirements (level and validity)
   */
  public meetsRequirement(requiredLevel: number, asOfDate: Date = new Date()): boolean {
    return this.meetsMinimumLevel(requiredLevel) && this.isValid(asOfDate);
  }

  /**
   * Create a copy with updated properties
   */
  public update(updates: Partial<Omit<EmployeeSkill, 'id' | 'employeeId' | 'skillId' | 'createdAt'>>): EmployeeSkill {
    return new EmployeeSkill({
      id: this.id,
      employeeId: this.employeeId,
      skillId: this.skillId,
      level: updates.level ?? this.level,
      validUntil: updates.validUntil ?? this.validUntil,
      certificationId: updates.certificationId ?? this.certificationId,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }

  /**
   * Renew the skill certification with a new expiry date
   */
  public renew(newValidUntil: Date, newCertificationId?: string): EmployeeSkill {
    if (isBefore(newValidUntil, new Date())) {
      throw new Error('New expiry date cannot be in the past');
    }

    return new EmployeeSkill({
      id: this.id,
      employeeId: this.employeeId,
      skillId: this.skillId,
      level: this.level,
      validUntil: newValidUntil,
      certificationId: newCertificationId ?? this.certificationId,
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
      employeeId: this.employeeId,
      skillId: this.skillId,
      level: this.level,
      validUntil: this.validUntil,
      certificationId: this.certificationId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
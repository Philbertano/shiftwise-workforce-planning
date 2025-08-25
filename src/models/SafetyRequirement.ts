import { z } from 'zod';
import { SafetyCategory, SafetyLevel } from '../types/index.js';

// Validation schemas
const SafetyRequirementSchema = z.object({
  id: z.string().min(1, 'Safety requirement ID is required'),
  name: z.string().min(1, 'Safety requirement name is required').max(100, 'Name too long'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  category: z.nativeEnum(SafetyCategory),
  level: z.nativeEnum(SafetyLevel),
  certificationRequired: z.boolean(),
  certificationValidityDays: z.number().min(1, 'Certification validity must be positive').optional(),
  trainingRequired: z.boolean(),
  equipmentRequired: z.array(z.string()),
  active: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export class SafetyRequirement {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly category: SafetyCategory;
  public readonly level: SafetyLevel;
  public readonly certificationRequired: boolean;
  public readonly certificationValidityDays?: number;
  public readonly trainingRequired: boolean;
  public readonly equipmentRequired: string[];
  public readonly active: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(data: {
    id: string;
    name: string;
    description: string;
    category: SafetyCategory;
    level: SafetyLevel;
    certificationRequired: boolean;
    certificationValidityDays?: number;
    trainingRequired: boolean;
    equipmentRequired: string[];
    active: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const now = new Date();
    const safetyReqData = {
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };

    // Validate the data
    const validated = SafetyRequirementSchema.parse(safetyReqData);
    
    // Additional business rule validations
    this.validateBusinessRules(validated);

    // Assign validated properties
    this.id = validated.id;
    this.name = validated.name;
    this.description = validated.description;
    this.category = validated.category;
    this.level = validated.level;
    this.certificationRequired = validated.certificationRequired;
    this.certificationValidityDays = validated.certificationValidityDays;
    this.trainingRequired = validated.trainingRequired;
    this.equipmentRequired = validated.equipmentRequired;
    this.active = validated.active;
    this.createdAt = validated.createdAt;
    this.updatedAt = validated.updatedAt;
  }

  private validateBusinessRules(data: z.infer<typeof SafetyRequirementSchema>): void {
    // If certification is required, validity days should be specified
    if (data.certificationRequired && !data.certificationValidityDays) {
      throw new Error('Certification validity days must be specified when certification is required');
    }

    // If certification is not required, validity days should not be specified
    if (!data.certificationRequired && data.certificationValidityDays) {
      throw new Error('Certification validity days should not be specified when certification is not required');
    }

    // Validate reasonable certification validity (30 days to 5 years)
    if (data.certificationValidityDays) {
      if (data.certificationValidityDays < 30 || data.certificationValidityDays > 1825) {
        throw new Error('Certification validity must be between 30 days and 5 years');
      }
    }

    // Validate equipment required array has no duplicates
    const uniqueEquipment = new Set(data.equipmentRequired);
    if (data.equipmentRequired.length !== uniqueEquipment.size) {
      throw new Error('Required equipment cannot contain duplicates');
    }

    // Validate reasonable limits on equipment array
    if (data.equipmentRequired.length > 10) {
      throw new Error('Safety requirement cannot require more than 10 pieces of equipment');
    }

    // Validate that expert level requirements should have certification or training
    if (data.level === SafetyLevel.EXPERT && !data.certificationRequired && !data.trainingRequired) {
      throw new Error('Expert level safety requirements must require either certification or training');
    }
  }

  /**
   * Check if safety requirement is high risk (advanced or expert level)
   */
  public isHighRisk(): boolean {
    return this.level === SafetyLevel.ADVANCED || this.level === SafetyLevel.EXPERT;
  }

  /**
   * Check if safety requirement is critical (expert level)
   */
  public isCritical(): boolean {
    return this.level === SafetyLevel.EXPERT;
  }

  /**
   * Check if certification is currently valid for a given date
   */
  public isCertificationValid(certificationDate: Date, checkDate: Date = new Date()): boolean {
    if (!this.certificationRequired || !this.certificationValidityDays) {
      return true; // No certification required
    }

    const expiryDate = new Date(certificationDate.getTime() + (this.certificationValidityDays * 24 * 60 * 60 * 1000));
    return checkDate <= expiryDate;
  }

  /**
   * Get certification expiry date
   */
  public getCertificationExpiryDate(certificationDate: Date): Date | null {
    if (!this.certificationRequired || !this.certificationValidityDays) {
      return null;
    }

    return new Date(certificationDate.getTime() + (this.certificationValidityDays * 24 * 60 * 60 * 1000));
  }

  /**
   * Get days until certification expires
   */
  public getDaysUntilCertificationExpiry(certificationDate: Date, checkDate: Date = new Date()): number | null {
    const expiryDate = this.getCertificationExpiryDate(certificationDate);
    if (!expiryDate) return null;

    const diffTime = expiryDate.getTime() - checkDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if certification is expiring soon (within 30 days)
   */
  public isCertificationExpiringSoon(certificationDate: Date, checkDate: Date = new Date()): boolean {
    const daysUntilExpiry = this.getDaysUntilCertificationExpiry(certificationDate, checkDate);
    return daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }

  /**
   * Check if specific equipment is required
   */
  public requiresEquipment(equipmentName: string): boolean {
    return this.equipmentRequired.includes(equipmentName);
  }

  /**
   * Get safety requirement priority score (higher for more critical requirements)
   */
  public getPriorityScore(): number {
    let score = 0;
    
    // Base score by level
    switch (this.level) {
      case SafetyLevel.BASIC:
        score += 1;
        break;
      case SafetyLevel.INTERMEDIATE:
        score += 2;
        break;
      case SafetyLevel.ADVANCED:
        score += 3;
        break;
      case SafetyLevel.EXPERT:
        score += 4;
        break;
    }

    // Additional score for certification requirement
    if (this.certificationRequired) {
      score += 2;
    }

    // Additional score for training requirement
    if (this.trainingRequired) {
      score += 1;
    }

    // Additional score for critical categories
    const criticalCategories = [
      SafetyCategory.LOCKOUT_TAGOUT,
      SafetyCategory.CONFINED_SPACE,
      SafetyCategory.HAZMAT,
      SafetyCategory.ELECTRICAL
    ];
    if (criticalCategories.includes(this.category)) {
      score += 2;
    }

    return score;
  }

  /**
   * Create a copy with updated properties
   */
  public update(updates: Partial<Omit<SafetyRequirement, 'id' | 'createdAt'>>): SafetyRequirement {
    return new SafetyRequirement({
      id: this.id,
      name: updates.name ?? this.name,
      description: updates.description ?? this.description,
      category: updates.category ?? this.category,
      level: updates.level ?? this.level,
      certificationRequired: updates.certificationRequired ?? this.certificationRequired,
      certificationValidityDays: updates.certificationValidityDays ?? this.certificationValidityDays,
      trainingRequired: updates.trainingRequired ?? this.trainingRequired,
      equipmentRequired: updates.equipmentRequired ?? this.equipmentRequired,
      active: updates.active ?? this.active,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }

  /**
   * Add required equipment
   */
  public addRequiredEquipment(equipmentName: string): SafetyRequirement {
    if (this.equipmentRequired.includes(equipmentName)) {
      throw new Error(`Equipment ${equipmentName} is already required for this safety requirement`);
    }

    return this.update({
      equipmentRequired: [...this.equipmentRequired, equipmentName]
    });
  }

  /**
   * Remove required equipment
   */
  public removeRequiredEquipment(equipmentName: string): SafetyRequirement {
    const updatedEquipment = this.equipmentRequired.filter(eq => eq !== equipmentName);
    
    if (updatedEquipment.length === this.equipmentRequired.length) {
      throw new Error(`Equipment ${equipmentName} is not required for this safety requirement`);
    }

    return this.update({
      equipmentRequired: updatedEquipment
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
      category: this.category,
      level: this.level,
      certificationRequired: this.certificationRequired,
      certificationValidityDays: this.certificationValidityDays,
      trainingRequired: this.trainingRequired,
      equipmentRequired: this.equipmentRequired,
      active: this.active,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
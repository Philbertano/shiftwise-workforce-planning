import { z } from 'zod';
import { ContractType } from '../types/index.js';

// Validation schemas
const NightShiftRestrictionsSchema = z.object({
  maxConsecutiveNights: z.number().min(1).optional(),
  minRestAfterNights: z.number().min(8).optional(),
  maxNightsPerWeek: z.number().min(1).optional(),
  requireMedicalClearance: z.boolean().optional()
});

const WorkingHourConstraintSchema = z.object({
  id: z.string().min(1, 'Working hour constraint ID is required'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  maxConsecutiveDays: z.number().min(1, 'Max consecutive days must be at least 1').max(14, 'Max consecutive days cannot exceed 14'),
  minRestDays: z.number().min(1, 'Min rest days must be at least 1').max(7, 'Min rest days cannot exceed 7'),
  maxHoursPerWeek: z.number().min(1, 'Max hours per week must be at least 1').max(80, 'Max hours per week cannot exceed 80'),
  maxHoursPerDay: z.number().min(1, 'Max hours per day must be at least 1').max(16, 'Max hours per day cannot exceed 16'),
  minHoursBetweenShifts: z.number().min(0, 'Min hours between shifts cannot be negative').max(24, 'Min hours between shifts cannot exceed 24'),
  allowBackToBackShifts: z.boolean(),
  weekendWorkAllowed: z.boolean(),
  nightShiftRestrictions: NightShiftRestrictionsSchema.optional(),
  contractTypes: z.array(z.nativeEnum(ContractType)),
  active: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export interface NightShiftRestrictions {
  maxConsecutiveNights?: number;
  minRestAfterNights?: number;
  maxNightsPerWeek?: number;
  requireMedicalClearance?: boolean;
}

export class WorkingHourConstraint {
  public readonly id: string;
  public readonly name: string;
  public readonly description?: string;
  public readonly maxConsecutiveDays: number;
  public readonly minRestDays: number;
  public readonly maxHoursPerWeek: number;
  public readonly maxHoursPerDay: number;
  public readonly minHoursBetweenShifts: number;
  public readonly allowBackToBackShifts: boolean;
  public readonly weekendWorkAllowed: boolean;
  public readonly nightShiftRestrictions?: NightShiftRestrictions;
  public readonly contractTypes: ContractType[];
  public readonly active: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(data: {
    id: string;
    name: string;
    description?: string;
    maxConsecutiveDays: number;
    minRestDays: number;
    maxHoursPerWeek: number;
    maxHoursPerDay: number;
    minHoursBetweenShifts: number;
    allowBackToBackShifts?: boolean;
    weekendWorkAllowed?: boolean;
    nightShiftRestrictions?: NightShiftRestrictions;
    contractTypes: ContractType[];
    active?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const now = new Date();
    const constraintData = {
      ...data,
      allowBackToBackShifts: data.allowBackToBackShifts ?? false,
      weekendWorkAllowed: data.weekendWorkAllowed ?? true,
      active: data.active ?? true,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };

    // Validate the data
    const validated = WorkingHourConstraintSchema.parse(constraintData);
    
    // Additional business rule validations
    this.validateBusinessRules(validated);

    // Assign validated properties
    this.id = validated.id;
    this.name = validated.name;
    this.description = validated.description;
    this.maxConsecutiveDays = validated.maxConsecutiveDays;
    this.minRestDays = validated.minRestDays;
    this.maxHoursPerWeek = validated.maxHoursPerWeek;
    this.maxHoursPerDay = validated.maxHoursPerDay;
    this.minHoursBetweenShifts = validated.minHoursBetweenShifts;
    this.allowBackToBackShifts = validated.allowBackToBackShifts;
    this.weekendWorkAllowed = validated.weekendWorkAllowed;
    this.nightShiftRestrictions = validated.nightShiftRestrictions;
    this.contractTypes = validated.contractTypes;
    this.active = validated.active;
    this.createdAt = validated.createdAt;
    this.updatedAt = validated.updatedAt;
  }

  private validateBusinessRules(data: z.infer<typeof WorkingHourConstraintSchema>): void {
    // Validate that contract types array is not empty
    if (data.contractTypes.length === 0) {
      throw new Error('At least one contract type must be specified');
    }

    // Validate logical consistency
    if (!data.allowBackToBackShifts && data.minHoursBetweenShifts < 8) {
      throw new Error('If back-to-back shifts are not allowed, minimum hours between shifts should be at least 8');
    }

    // Validate reasonable constraints for different contract types
    if (data.contractTypes.includes(ContractType.PART_TIME) && data.maxHoursPerWeek > 32) {
      console.warn('Part-time contract with more than 32 hours per week may not be appropriate');
    }

    // Validate night shift restrictions if present
    if (data.nightShiftRestrictions) {
      const restrictions = data.nightShiftRestrictions;
      if (restrictions.maxConsecutiveNights && restrictions.maxConsecutiveNights > data.maxConsecutiveDays) {
        throw new Error('Max consecutive nights cannot exceed max consecutive days');
      }
      if (restrictions.minRestAfterNights && restrictions.minRestAfterNights < data.minHoursBetweenShifts) {
        throw new Error('Min rest after nights should be at least the minimum hours between shifts');
      }
    }
  }

  /**
   * Check if this constraint applies to a specific contract type
   */
  public appliesTo(contractType: ContractType): boolean {
    return this.contractTypes.includes(contractType);
  }

  /**
   * Check if weekend work is allowed under this constraint
   */
  public allowsWeekendWork(): boolean {
    return this.weekendWorkAllowed;
  }

  /**
   * Check if back-to-back shifts are allowed
   */
  public allowsBackToBackShifts(): boolean {
    return this.allowBackToBackShifts;
  }

  /**
   * Get the maximum allowed consecutive working days
   */
  public getMaxConsecutiveDays(): number {
    return this.maxConsecutiveDays;
  }

  /**
   * Get the minimum required rest days
   */
  public getMinRestDays(): number {
    return this.minRestDays;
  }

  /**
   * Check if a daily hour count violates this constraint
   */
  public violatesDailyHours(hours: number): boolean {
    return hours > this.maxHoursPerDay;
  }

  /**
   * Check if a weekly hour count violates this constraint
   */
  public violatesWeeklyHours(hours: number): boolean {
    return hours > this.maxHoursPerWeek;
  }

  /**
   * Check if the time between shifts violates this constraint
   */
  public violatesRestPeriod(hoursBetween: number): boolean {
    return hoursBetween < this.minHoursBetweenShifts;
  }

  /**
   * Get night shift restrictions if any
   */
  public getNightShiftRestrictions(): NightShiftRestrictions | null {
    return this.nightShiftRestrictions || null;
  }

  /**
   * Check if night shift restrictions apply
   */
  public hasNightShiftRestrictions(): boolean {
    return !!this.nightShiftRestrictions;
  }

  /**
   * Validate a sequence of consecutive working days
   */
  public validateConsecutiveDays(consecutiveDays: number): {
    valid: boolean;
    message?: string;
  } {
    if (consecutiveDays <= this.maxConsecutiveDays) {
      return { valid: true };
    }
    
    return {
      valid: false,
      message: `Consecutive working days (${consecutiveDays}) exceeds maximum allowed (${this.maxConsecutiveDays})`
    };
  }

  /**
   * Calculate the recommended rest period after a number of consecutive days
   */
  public getRecommendedRestPeriod(consecutiveDays: number): number {
    if (consecutiveDays <= 3) {
      return this.minRestDays;
    }
    
    // Longer work periods require proportionally longer rest
    return Math.min(7, Math.ceil(consecutiveDays / 3) * this.minRestDays);
  }

  /**
   * Get a summary of this constraint for display
   */
  public getSummary(): string {
    const parts = [
      `Max ${this.maxConsecutiveDays} consecutive days`,
      `Min ${this.minRestDays} rest days`,
      `Max ${this.maxHoursPerDay}h/day`,
      `Max ${this.maxHoursPerWeek}h/week`,
      `Min ${this.minHoursBetweenShifts}h between shifts`
    ];

    if (!this.weekendWorkAllowed) {
      parts.push('No weekend work');
    }

    if (!this.allowBackToBackShifts) {
      parts.push('No back-to-back shifts');
    }

    return parts.join(', ');
  }

  /**
   * Create a copy with updated properties
   */
  public update(updates: Partial<Omit<WorkingHourConstraint, 'id' | 'createdAt'>>): WorkingHourConstraint {
    return new WorkingHourConstraint({
      id: this.id,
      name: updates.name ?? this.name,
      description: updates.description ?? this.description,
      maxConsecutiveDays: updates.maxConsecutiveDays ?? this.maxConsecutiveDays,
      minRestDays: updates.minRestDays ?? this.minRestDays,
      maxHoursPerWeek: updates.maxHoursPerWeek ?? this.maxHoursPerWeek,
      maxHoursPerDay: updates.maxHoursPerDay ?? this.maxHoursPerDay,
      minHoursBetweenShifts: updates.minHoursBetweenShifts ?? this.minHoursBetweenShifts,
      allowBackToBackShifts: updates.allowBackToBackShifts ?? this.allowBackToBackShifts,
      weekendWorkAllowed: updates.weekendWorkAllowed ?? this.weekendWorkAllowed,
      nightShiftRestrictions: updates.nightShiftRestrictions ?? this.nightShiftRestrictions,
      contractTypes: updates.contractTypes ?? this.contractTypes,
      active: updates.active ?? this.active,
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
      maxConsecutiveDays: this.maxConsecutiveDays,
      minRestDays: this.minRestDays,
      maxHoursPerWeek: this.maxHoursPerWeek,
      maxHoursPerDay: this.maxHoursPerDay,
      minHoursBetweenShifts: this.minHoursBetweenShifts,
      allowBackToBackShifts: this.allowBackToBackShifts,
      weekendWorkAllowed: this.weekendWorkAllowed,
      nightShiftRestrictions: this.nightShiftRestrictions,
      contractTypes: this.contractTypes,
      active: this.active,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
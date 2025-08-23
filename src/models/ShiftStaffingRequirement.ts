import { z } from 'zod';
import { Priority } from '../types/index.js';

// Validation schemas
const ShiftStaffingRequirementSchema = z.object({
  id: z.string().min(1, 'Staffing requirement ID is required'),
  stationId: z.string().min(1, 'Station ID is required'),
  shiftTemplateId: z.string().min(1, 'Shift template ID is required'),
  minEmployees: z.number().min(1, 'Minimum employees must be at least 1'),
  maxEmployees: z.number().min(1, 'Maximum employees must be at least 1'),
  optimalEmployees: z.number().min(1, 'Optimal employees must be at least 1'),
  priority: z.nativeEnum(Priority),
  effectiveFrom: z.date(),
  effectiveUntil: z.date().optional(),
  active: z.boolean(),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export class ShiftStaffingRequirement {
  public readonly id: string;
  public readonly stationId: string;
  public readonly shiftTemplateId: string;
  public readonly minEmployees: number;
  public readonly maxEmployees: number;
  public readonly optimalEmployees: number;
  public readonly priority: Priority;
  public readonly effectiveFrom: Date;
  public readonly effectiveUntil?: Date;
  public readonly active: boolean;
  public readonly notes?: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(data: {
    id: string;
    stationId: string;
    shiftTemplateId: string;
    minEmployees: number;
    maxEmployees: number;
    optimalEmployees: number;
    priority: Priority;
    effectiveFrom: Date;
    effectiveUntil?: Date;
    active?: boolean;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const now = new Date();
    const staffingData = {
      ...data,
      active: data.active ?? true,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };

    // Validate the data
    const validated = ShiftStaffingRequirementSchema.parse(staffingData);
    
    // Additional business rule validations
    this.validateBusinessRules(validated);

    // Assign validated properties
    this.id = validated.id;
    this.stationId = validated.stationId;
    this.shiftTemplateId = validated.shiftTemplateId;
    this.minEmployees = validated.minEmployees;
    this.maxEmployees = validated.maxEmployees;
    this.optimalEmployees = validated.optimalEmployees;
    this.priority = validated.priority;
    this.effectiveFrom = validated.effectiveFrom;
    this.effectiveUntil = validated.effectiveUntil;
    this.active = validated.active;
    this.notes = validated.notes;
    this.createdAt = validated.createdAt;
    this.updatedAt = validated.updatedAt;
  }

  private validateBusinessRules(data: z.infer<typeof ShiftStaffingRequirementSchema>): void {
    // Validate employee count relationships
    if (data.maxEmployees < data.minEmployees) {
      throw new Error('Maximum employees cannot be less than minimum employees');
    }

    if (data.optimalEmployees < data.minEmployees || data.optimalEmployees > data.maxEmployees) {
      throw new Error('Optimal employees must be between minimum and maximum employees');
    }

    // Validate date ranges
    if (data.effectiveUntil && data.effectiveUntil <= data.effectiveFrom) {
      throw new Error('Effective until date must be after effective from date');
    }

    // Validate reasonable employee counts
    if (data.maxEmployees > 20) {
      throw new Error('Maximum employees per shift cannot exceed 20');
    }

    // Validate effective dates are not too far in the past
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (data.effectiveFrom < oneYearAgo) {
      throw new Error('Effective from date cannot be more than one year in the past');
    }
  }

  /**
   * Check if this requirement is currently active for a given date
   */
  public isActiveForDate(date: Date): boolean {
    if (!this.active) {
      return false;
    }

    if (date < this.effectiveFrom) {
      return false;
    }

    if (this.effectiveUntil && date > this.effectiveUntil) {
      return false;
    }

    return true;
  }

  /**
   * Get the staffing gap for a given employee count
   */
  public getStaffingGap(currentEmployees: number): number {
    if (currentEmployees >= this.minEmployees) {
      return 0;
    }
    return this.minEmployees - currentEmployees;
  }

  /**
   * Get the overstaffing amount for a given employee count
   */
  public getOverstaffing(currentEmployees: number): number {
    if (currentEmployees <= this.maxEmployees) {
      return 0;
    }
    return currentEmployees - this.maxEmployees;
  }

  /**
   * Check if the current staffing level is optimal
   */
  public isOptimalStaffing(currentEmployees: number): boolean {
    return currentEmployees === this.optimalEmployees;
  }

  /**
   * Check if the current staffing level is acceptable (within min/max range)
   */
  public isAcceptableStaffing(currentEmployees: number): boolean {
    return currentEmployees >= this.minEmployees && currentEmployees <= this.maxEmployees;
  }

  /**
   * Get staffing status for a given employee count
   */
  public getStaffingStatus(currentEmployees: number): {
    status: 'understaffed' | 'optimal' | 'acceptable' | 'overstaffed';
    gap: number;
    message: string;
  } {
    if (currentEmployees < this.minEmployees) {
      const gap = this.minEmployees - currentEmployees;
      return {
        status: 'understaffed',
        gap,
        message: `Need ${gap} more employee${gap > 1 ? 's' : ''} to meet minimum requirement`
      };
    }

    if (currentEmployees > this.maxEmployees) {
      const excess = currentEmployees - this.maxEmployees;
      return {
        status: 'overstaffed',
        gap: -excess,
        message: `${excess} employee${excess > 1 ? 's' : ''} over maximum capacity`
      };
    }

    if (currentEmployees === this.optimalEmployees) {
      return {
        status: 'optimal',
        gap: 0,
        message: 'Optimal staffing level achieved'
      };
    }

    return {
      status: 'acceptable',
      gap: this.optimalEmployees - currentEmployees,
      message: `Acceptable staffing level (${currentEmployees}/${this.optimalEmployees} optimal)`
    };
  }

  /**
   * Get the priority weight for optimization algorithms
   */
  public getPriorityWeight(): number {
    switch (this.priority) {
      case Priority.CRITICAL:
        return 10;
      case Priority.HIGH:
        return 7;
      case Priority.MEDIUM:
        return 4;
      case Priority.LOW:
        return 1;
      default:
        return 1;
    }
  }

  /**
   * Check if this requirement conflicts with another requirement
   */
  public conflictsWith(other: ShiftStaffingRequirement): boolean {
    // Same station and shift template
    if (this.stationId !== other.stationId || this.shiftTemplateId !== other.shiftTemplateId) {
      return false;
    }

    // Check for date range overlap
    const thisStart = this.effectiveFrom;
    const thisEnd = this.effectiveUntil || new Date('2099-12-31');
    const otherStart = other.effectiveFrom;
    const otherEnd = other.effectiveUntil || new Date('2099-12-31');

    return thisStart <= otherEnd && otherStart <= thisEnd;
  }

  /**
   * Create a copy with updated properties
   */
  public update(updates: Partial<Omit<ShiftStaffingRequirement, 'id' | 'createdAt'>>): ShiftStaffingRequirement {
    return new ShiftStaffingRequirement({
      id: this.id,
      stationId: updates.stationId ?? this.stationId,
      shiftTemplateId: updates.shiftTemplateId ?? this.shiftTemplateId,
      minEmployees: updates.minEmployees ?? this.minEmployees,
      maxEmployees: updates.maxEmployees ?? this.maxEmployees,
      optimalEmployees: updates.optimalEmployees ?? this.optimalEmployees,
      priority: updates.priority ?? this.priority,
      effectiveFrom: updates.effectiveFrom ?? this.effectiveFrom,
      effectiveUntil: updates.effectiveUntil ?? this.effectiveUntil,
      active: updates.active ?? this.active,
      notes: updates.notes ?? this.notes,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }

  /**
   * Deactivate this requirement
   */
  public deactivate(): ShiftStaffingRequirement {
    return this.update({ active: false });
  }

  /**
   * Convert to plain object for serialization
   */
  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      stationId: this.stationId,
      shiftTemplateId: this.shiftTemplateId,
      minEmployees: this.minEmployees,
      maxEmployees: this.maxEmployees,
      optimalEmployees: this.optimalEmployees,
      priority: this.priority,
      effectiveFrom: this.effectiveFrom,
      effectiveUntil: this.effectiveUntil,
      active: this.active,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
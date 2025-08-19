import { z } from 'zod';
import { ShiftType, BreakRule } from '../types/index.js';

// Validation schemas
const BreakRuleSchema = z.object({
  duration: z.number().min(5, 'Break duration must be at least 5 minutes').max(120, 'Break duration cannot exceed 2 hours'),
  startAfter: z.number().min(0, 'Start after must be non-negative'),
  paid: z.boolean()
});

const ShiftTemplateSchema = z.object({
  id: z.string().min(1, 'ShiftTemplate ID is required'),
  name: z.string().min(1, 'Shift template name is required').max(100, 'Name too long'),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'),
  breakRules: z.array(BreakRuleSchema),
  shiftType: z.nativeEnum(ShiftType),
  createdAt: z.date(),
  updatedAt: z.date()
});

export class ShiftTemplate {
  public readonly id: string;
  public readonly name: string;
  public readonly startTime: string;
  public readonly endTime: string;
  public readonly breakRules: BreakRule[];
  public readonly shiftType: ShiftType;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(data: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    breakRules: BreakRule[];
    shiftType: ShiftType;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const now = new Date();
    const shiftTemplateData = {
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };

    // Validate the data
    const validated = ShiftTemplateSchema.parse(shiftTemplateData);
    
    // Additional business rule validations
    this.validateBusinessRules(validated);

    // Assign validated properties
    this.id = validated.id;
    this.name = validated.name;
    this.startTime = validated.startTime;
    this.endTime = validated.endTime;
    this.breakRules = validated.breakRules;
    this.shiftType = validated.shiftType;
    this.createdAt = validated.createdAt;
    this.updatedAt = validated.updatedAt;
  }

  private validateBusinessRules(data: z.infer<typeof ShiftTemplateSchema>): void {
    const shiftDuration = this.calculateShiftDuration(data.startTime, data.endTime);
    
    // Validate shift duration is reasonable
    if (shiftDuration < 2) {
      throw new Error('Shift duration must be at least 2 hours');
    }
    
    if (shiftDuration > 16) {
      throw new Error('Shift duration cannot exceed 16 hours');
    }

    // Validate break rules
    const totalBreakTime = data.breakRules.reduce((total, rule) => total + rule.duration, 0);
    const shiftMinutes = shiftDuration * 60;
    
    if (totalBreakTime >= shiftMinutes) {
      throw new Error('Total break time cannot exceed shift duration');
    }

    // Validate break timing
    for (const breakRule of data.breakRules) {
      if (breakRule.startAfter >= shiftMinutes) {
        throw new Error('Break cannot start after shift ends');
      }
      
      if (breakRule.startAfter + breakRule.duration > shiftMinutes) {
        throw new Error('Break cannot extend beyond shift end time');
      }
    }

    // Validate shift type consistency
    this.validateShiftTypeConsistency(data.startTime, data.endTime, data.shiftType);
  }

  private calculateShiftDuration(startTime: string, endTime: string): number {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;
    
    // Handle overnight shifts
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }
    
    return (endMinutes - startMinutes) / 60;
  }

  private validateShiftTypeConsistency(startTime: string, endTime: string, shiftType: ShiftType): void {
    const [startHour] = startTime.split(':').map(Number);
    const [endHour] = endTime.split(':').map(Number);
    
    switch (shiftType) {
      case ShiftType.DAY:
        if (startHour < 6 || startHour > 14) {
          throw new Error('Day shifts should typically start between 6:00 and 14:00');
        }
        break;
      case ShiftType.NIGHT:
        if (startHour < 22 && startHour > 6) {
          throw new Error('Night shifts should typically start between 22:00 and 6:00');
        }
        break;
      case ShiftType.SWING:
        if (startHour < 14 || startHour > 22) {
          throw new Error('Swing shifts should typically start between 14:00 and 22:00');
        }
        break;
      // Weekend shifts can have any timing
    }
  }

  /**
   * Get the total duration of the shift in hours
   */
  public getDuration(): number {
    return this.calculateShiftDuration(this.startTime, this.endTime);
  }

  /**
   * Get the total break time in minutes
   */
  public getTotalBreakTime(): number {
    return this.breakRules.reduce((total, rule) => total + rule.duration, 0);
  }

  /**
   * Get the total paid break time in minutes
   */
  public getPaidBreakTime(): number {
    return this.breakRules
      .filter(rule => rule.paid)
      .reduce((total, rule) => total + rule.duration, 0);
  }

  /**
   * Get the working time (shift duration minus unpaid breaks) in hours
   */
  public getWorkingTime(): number {
    const unpaidBreakTime = this.breakRules
      .filter(rule => !rule.paid)
      .reduce((total, rule) => total + rule.duration, 0);
    
    return this.getDuration() - (unpaidBreakTime / 60);
  }

  /**
   * Check if this is an overnight shift
   */
  public isOvernightShift(): boolean {
    const [startHour] = this.startTime.split(':').map(Number);
    const [endHour] = this.endTime.split(':').map(Number);
    return endHour <= startHour;
  }

  /**
   * Get break rules sorted by start time
   */
  public getBreakRulesSorted(): BreakRule[] {
    return [...this.breakRules].sort((a, b) => a.startAfter - b.startAfter);
  }

  /**
   * Check if shift template is suitable for a specific contract type
   */
  public isSuitableForContractType(maxHoursPerDay: number): boolean {
    return this.getDuration() <= maxHoursPerDay;
  }

  /**
   * Create a copy with updated properties
   */
  public update(updates: Partial<Omit<ShiftTemplate, 'id' | 'createdAt'>>): ShiftTemplate {
    return new ShiftTemplate({
      id: this.id,
      name: updates.name ?? this.name,
      startTime: updates.startTime ?? this.startTime,
      endTime: updates.endTime ?? this.endTime,
      breakRules: updates.breakRules ?? this.breakRules,
      shiftType: updates.shiftType ?? this.shiftType,
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
      startTime: this.startTime,
      endTime: this.endTime,
      breakRules: this.breakRules,
      shiftType: this.shiftType,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
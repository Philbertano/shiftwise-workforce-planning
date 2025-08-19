import { z } from 'zod';
import { ContractType, EmployeePreferences } from '../types/index.js';

// Validation schemas
const EmployeePreferencesSchema = z.object({
  preferredShifts: z.array(z.enum(['day', 'night', 'swing', 'weekend'])),
  preferredStations: z.array(z.string()),
  maxConsecutiveDays: z.number().min(1).max(14).optional(),
  preferredDaysOff: z.array(z.number().min(0).max(6))
}).optional();

const EmployeeSchema = z.object({
  id: z.string().min(1, 'Employee ID is required'),
  name: z.string().min(1, 'Employee name is required').max(100, 'Name too long'),
  contractType: z.nativeEnum(ContractType),
  weeklyHours: z.number().min(1, 'Weekly hours must be positive').max(80, 'Weekly hours cannot exceed 80'),
  maxHoursPerDay: z.number().min(1, 'Max hours per day must be positive').max(24, 'Cannot exceed 24 hours per day'),
  minRestHours: z.number().min(8, 'Minimum rest must be at least 8 hours').max(24, 'Rest hours cannot exceed 24'),
  team: z.string().min(1, 'Team is required'),
  active: z.boolean(),
  preferences: EmployeePreferencesSchema,
  createdAt: z.date(),
  updatedAt: z.date()
});

export class Employee {
  public readonly id: string;
  public readonly name: string;
  public readonly contractType: ContractType;
  public readonly weeklyHours: number;
  public readonly maxHoursPerDay: number;
  public readonly minRestHours: number;
  public readonly team: string;
  public readonly active: boolean;
  public readonly preferences?: EmployeePreferences;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(data: {
    id: string;
    name: string;
    contractType: ContractType;
    weeklyHours: number;
    maxHoursPerDay: number;
    minRestHours: number;
    team: string;
    active: boolean;
    preferences?: EmployeePreferences;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const now = new Date();
    const employeeData = {
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };

    // Validate the data
    const validated = EmployeeSchema.parse(employeeData);
    
    // Additional business rule validations
    this.validateBusinessRules(validated);

    // Assign validated properties
    this.id = validated.id;
    this.name = validated.name;
    this.contractType = validated.contractType;
    this.weeklyHours = validated.weeklyHours;
    this.maxHoursPerDay = validated.maxHoursPerDay;
    this.minRestHours = validated.minRestHours;
    this.team = validated.team;
    this.active = validated.active;
    this.preferences = validated.preferences;
    this.createdAt = validated.createdAt;
    this.updatedAt = validated.updatedAt;
  }

  private validateBusinessRules(data: z.infer<typeof EmployeeSchema>): void {
    // Validate max hours per day doesn't exceed weekly hours
    if (data.maxHoursPerDay * 7 < data.weeklyHours) {
      throw new Error('Weekly hours cannot be achieved with the specified max hours per day');
    }

    // Validate contract type specific rules
    if (data.contractType === ContractType.PART_TIME && data.weeklyHours > 30) {
      throw new Error('Part-time employees cannot work more than 30 hours per week');
    }

    if (data.contractType === ContractType.FULL_TIME && data.weeklyHours < 35) {
      throw new Error('Full-time employees must work at least 35 hours per week');
    }

    // Validate preferences if provided
    if (data.preferences?.maxConsecutiveDays) {
      const maxPossibleDays = Math.ceil(data.weeklyHours / 8); // Assuming 8-hour shifts
      if (data.preferences.maxConsecutiveDays > maxPossibleDays) {
        throw new Error('Max consecutive days exceeds what is possible with weekly hours');
      }
    }
  }

  /**
   * Check if employee is available for a specific date and time
   */
  public isAvailableForShift(date: Date, shiftStart: string, shiftEnd: string): boolean {
    if (!this.active) {
      return false;
    }

    // Additional availability logic would be implemented here
    // This is a placeholder for the basic check
    return true;
  }

  /**
   * Calculate daily hours for a shift
   */
  public calculateShiftHours(shiftStart: string, shiftEnd: string): number {
    const [startHour, startMin] = shiftStart.split(':').map(Number);
    const [endHour, endMin] = shiftEnd.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;
    
    // Handle overnight shifts
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }
    
    return (endMinutes - startMinutes) / 60;
  }

  /**
   * Check if shift hours would violate daily limit
   */
  public wouldViolateDailyLimit(shiftStart: string, shiftEnd: string): boolean {
    const shiftHours = this.calculateShiftHours(shiftStart, shiftEnd);
    return shiftHours > this.maxHoursPerDay;
  }

  /**
   * Create a copy with updated properties
   */
  public update(updates: Partial<Omit<Employee, 'id' | 'createdAt'>>): Employee {
    return new Employee({
      id: this.id,
      name: updates.name ?? this.name,
      contractType: updates.contractType ?? this.contractType,
      weeklyHours: updates.weeklyHours ?? this.weeklyHours,
      maxHoursPerDay: updates.maxHoursPerDay ?? this.maxHoursPerDay,
      minRestHours: updates.minRestHours ?? this.minRestHours,
      team: updates.team ?? this.team,
      active: updates.active ?? this.active,
      preferences: updates.preferences ?? this.preferences,
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
      contractType: this.contractType,
      weeklyHours: this.weeklyHours,
      maxHoursPerDay: this.maxHoursPerDay,
      minRestHours: this.minRestHours,
      team: this.team,
      active: this.active,
      preferences: this.preferences,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
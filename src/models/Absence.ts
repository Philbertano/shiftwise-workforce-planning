import { z } from 'zod';
import { AbsenceType } from '../types/index.js';
import { isAfter, isBefore, isSameDay, isWithinInterval, addDays, subDays } from 'date-fns';

// Validation schema
const AbsenceSchema = z.object({
  id: z.string().min(1, 'Absence ID is required'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  type: z.nativeEnum(AbsenceType),
  dateStart: z.date(),
  dateEnd: z.date(),
  approved: z.boolean(),
  approvedBy: z.string().optional(),
  reason: z.string().max(500, 'Reason too long').optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export class Absence {
  public readonly id: string;
  public readonly employeeId: string;
  public readonly type: AbsenceType;
  public readonly dateStart: Date;
  public readonly dateEnd: Date;
  public readonly approved: boolean;
  public readonly approvedBy?: string;
  public readonly reason?: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(data: {
    id: string;
    employeeId: string;
    type: AbsenceType;
    dateStart: Date;
    dateEnd: Date;
    approved: boolean;
    approvedBy?: string;
    reason?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const now = new Date();
    const absenceData = {
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };

    // Validate the data
    const validated = AbsenceSchema.parse(absenceData);
    
    // Additional business rule validations
    this.validateBusinessRules(validated);

    // Assign validated properties
    this.id = validated.id;
    this.employeeId = validated.employeeId;
    this.type = validated.type;
    this.dateStart = validated.dateStart;
    this.dateEnd = validated.dateEnd;
    this.approved = validated.approved;
    this.approvedBy = validated.approvedBy;
    this.reason = validated.reason;
    this.createdAt = validated.createdAt;
    this.updatedAt = validated.updatedAt;
  }

  private validateBusinessRules(data: z.infer<typeof AbsenceSchema>): void {
    // Validate date range
    if (isAfter(data.dateStart, data.dateEnd)) {
      throw new Error('Start date cannot be after end date');
    }

    // Validate approval requirements
    if (data.approved && !data.approvedBy) {
      throw new Error('Approved by is required when absence is approved');
    }

    if (!data.approved && data.approvedBy) {
      throw new Error('Cannot have approver when absence is not approved');
    }

    // Validate absence duration limits
    const durationDays = this.calculateDurationDays(data.dateStart, data.dateEnd);
    
    if (durationDays > 365) {
      throw new Error('Absence duration cannot exceed 365 days');
    }

    // Type-specific validations
    this.validateTypeSpecificRules(data.type, durationDays, data.reason);

    // Validate future date restrictions for certain types
    if (data.type === AbsenceType.SICK && isAfter(data.dateStart, addDays(new Date(), 7))) {
      throw new Error('Sick leave cannot be scheduled more than 7 days in advance');
    }
  }

  private validateTypeSpecificRules(type: AbsenceType, durationDays: number, reason?: string): void {
    switch (type) {
      case AbsenceType.VACATION:
        if (durationDays > 30) {
          throw new Error('Vacation absence cannot exceed 30 days');
        }
        break;
      
      case AbsenceType.SICK:
        if (durationDays > 90) {
          throw new Error('Sick leave absence cannot exceed 90 days');
        }
        break;
      
      case AbsenceType.TRAINING:
        if (durationDays > 14) {
          throw new Error('Training absence cannot exceed 14 days');
        }
        if (!reason) {
          throw new Error('Training absences must include a reason');
        }
        break;
      
      case AbsenceType.PERSONAL:
        if (durationDays > 5) {
          throw new Error('Personal absence cannot exceed 5 days');
        }
        break;
    }
  }

  private calculateDurationDays(startDate: Date, endDate: Date): number {
    // Use date-fns for more reliable date calculations
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const diffTime = end.getTime() - start.getTime();
    const daysDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return daysDiff + 1; // +1 to include both start and end dates
  }

  /**
   * Get the duration of the absence in days
   */
  public getDurationDays(): number {
    return this.calculateDurationDays(this.dateStart, this.dateEnd);
  }

  /**
   * Check if absence is currently active
   */
  public isActive(asOfDate: Date = new Date()): boolean {
    return isWithinInterval(asOfDate, { start: this.dateStart, end: this.dateEnd });
  }

  /**
   * Check if absence is in the future
   */
  public isFuture(asOfDate: Date = new Date()): boolean {
    return isAfter(this.dateStart, asOfDate);
  }

  /**
   * Check if absence is in the past
   */
  public isPast(asOfDate: Date = new Date()): boolean {
    return isBefore(this.dateEnd, asOfDate);
  }

  /**
   * Check if absence is pending approval
   */
  public isPendingApproval(): boolean {
    return !this.approved;
  }

  /**
   * Check if absence requires approval based on type and duration
   */
  public requiresApproval(): boolean {
    // All absences require approval except single-day sick leave
    if (this.type === AbsenceType.SICK && this.getDurationDays() === 1) {
      return false;
    }
    return true;
  }

  /**
   * Check if absence conflicts with a specific date
   */
  public conflictsWithDate(date: Date): boolean {
    return isWithinInterval(date, { start: this.dateStart, end: this.dateEnd });
  }

  /**
   * Check if absence conflicts with another absence (same employee, overlapping dates)
   */
  public conflictsWith(other: Absence): boolean {
    // Different employees cannot conflict
    if (this.employeeId !== other.employeeId) {
      return false;
    }

    // Same absence cannot conflict with itself
    if (this.id === other.id) {
      return false;
    }

    // Check for date overlap
    return this.hasDateOverlap(other);
  }

  /**
   * Check if this absence overlaps with another absence's date range
   */
  private hasDateOverlap(other: Absence): boolean {
    return (
      isWithinInterval(this.dateStart, { start: other.dateStart, end: other.dateEnd }) ||
      isWithinInterval(this.dateEnd, { start: other.dateStart, end: other.dateEnd }) ||
      isWithinInterval(other.dateStart, { start: this.dateStart, end: this.dateEnd }) ||
      isWithinInterval(other.dateEnd, { start: this.dateStart, end: this.dateEnd })
    );
  }

  /**
   * Get the notice period for this absence type
   */
  public getRequiredNoticeDays(): number {
    switch (this.type) {
      case AbsenceType.VACATION:
        return this.getDurationDays() > 5 ? 14 : 7; // 2 weeks for long vacations, 1 week for short
      case AbsenceType.TRAINING:
        return 7;
      case AbsenceType.PERSONAL:
        return 3;
      case AbsenceType.SICK:
        return 0; // No advance notice required for sick leave
      default:
        return 7;
    }
  }

  /**
   * Check if absence was submitted with adequate notice
   */
  public hasAdequateNotice(submissionDate: Date = this.createdAt): boolean {
    const requiredNoticeDays = this.getRequiredNoticeDays();
    const noticeDays = Math.ceil((this.dateStart.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24));
    return noticeDays >= requiredNoticeDays;
  }

  /**
   * Get absence priority for scheduling conflicts
   */
  public getPriority(): number {
    switch (this.type) {
      case AbsenceType.SICK:
        return 1; // Highest priority
      case AbsenceType.TRAINING:
        return 2;
      case AbsenceType.VACATION:
        return 3;
      case AbsenceType.PERSONAL:
        return 4; // Lowest priority
      default:
        return 5;
    }
  }

  /**
   * Check if absence can be cancelled
   */
  public canBeCancelled(asOfDate: Date = new Date()): boolean {
    // Cannot cancel if already started or past
    if (this.isActive(asOfDate) || this.isPast(asOfDate)) {
      return false;
    }

    // Sick leave can always be cancelled if in future
    if (this.type === AbsenceType.SICK) {
      return true;
    }

    // Other types can be cancelled if more than 24 hours in advance
    const hoursUntilStart = (this.dateStart.getTime() - asOfDate.getTime()) / (1000 * 60 * 60);
    return hoursUntilStart > 24;
  }

  /**
   * Approve the absence
   */
  public approve(approvedBy: string): Absence {
    if (this.approved) {
      throw new Error('Absence is already approved');
    }

    return new Absence({
      id: this.id,
      employeeId: this.employeeId,
      type: this.type,
      dateStart: this.dateStart,
      dateEnd: this.dateEnd,
      approved: true,
      approvedBy,
      reason: this.reason,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }

  /**
   * Reject the absence (remove approval)
   */
  public reject(): Absence {
    return new Absence({
      id: this.id,
      employeeId: this.employeeId,
      type: this.type,
      dateStart: this.dateStart,
      dateEnd: this.dateEnd,
      approved: false,
      approvedBy: undefined,
      reason: this.reason,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }

  /**
   * Update the absence dates
   */
  public updateDates(newStartDate: Date, newEndDate: Date): Absence {
    return new Absence({
      id: this.id,
      employeeId: this.employeeId,
      type: this.type,
      dateStart: newStartDate,
      dateEnd: newEndDate,
      approved: false, // Reset approval when dates change
      approvedBy: undefined,
      reason: this.reason,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }

  /**
   * Update the absence reason
   */
  public updateReason(newReason: string): Absence {
    return new Absence({
      id: this.id,
      employeeId: this.employeeId,
      type: this.type,
      dateStart: this.dateStart,
      dateEnd: this.dateEnd,
      approved: this.approved,
      approvedBy: this.approvedBy,
      reason: newReason,
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
      type: this.type,
      dateStart: this.dateStart,
      dateEnd: this.dateEnd,
      approved: this.approved,
      approvedBy: this.approvedBy,
      reason: this.reason,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
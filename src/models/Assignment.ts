import { z } from 'zod';
import { AssignmentStatus } from '../types/index.js';
import { isAfter, isBefore, isSameDay } from 'date-fns';

// Validation schema
const AssignmentSchema = z.object({
  id: z.string().min(1, 'Assignment ID is required'),
  demandId: z.string().min(1, 'Demand ID is required'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  status: z.nativeEnum(AssignmentStatus),
  score: z.number().min(0, 'Score must be non-negative').max(100, 'Score cannot exceed 100'),
  explanation: z.string().max(1000, 'Explanation too long').optional(),
  createdAt: z.date(),
  createdBy: z.string().min(1, 'Created by is required'),
  updatedAt: z.date()
});

export class Assignment {
  public readonly id: string;
  public readonly demandId: string;
  public readonly employeeId: string;
  public readonly status: AssignmentStatus;
  public readonly score: number;
  public readonly explanation?: string;
  public readonly createdAt: Date;
  public readonly createdBy: string;
  public readonly updatedAt: Date;

  constructor(data: {
    id: string;
    demandId: string;
    employeeId: string;
    status: AssignmentStatus;
    score: number;
    explanation?: string;
    createdAt?: Date;
    createdBy: string;
    updatedAt?: Date;
  }) {
    const now = new Date();
    const assignmentData = {
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };

    // Validate the data
    const validated = AssignmentSchema.parse(assignmentData);
    
    // Additional business rule validations
    this.validateBusinessRules(validated);

    // Assign validated properties
    this.id = validated.id;
    this.demandId = validated.demandId;
    this.employeeId = validated.employeeId;
    this.status = validated.status;
    this.score = validated.score;
    this.explanation = validated.explanation;
    this.createdAt = validated.createdAt;
    this.createdBy = validated.createdBy;
    this.updatedAt = validated.updatedAt;
  }

  private validateBusinessRules(data: z.infer<typeof AssignmentSchema>): void {
    // Validate explanation is provided for low scores
    if (data.score < 50 && !data.explanation) {
      throw new Error('Explanation is required for assignments with score below 50');
    }

    // Validate status transitions (basic validation)
    if (data.status === AssignmentStatus.CONFIRMED && data.score < 30) {
      throw new Error('Cannot confirm assignment with score below 30');
    }

    // Validate explanation length for meaningful content
    if (data.explanation && data.explanation.trim().length < 10) {
      throw new Error('Explanation must be at least 10 characters long');
    }
  }

  /**
   * Check if assignment is active (proposed or confirmed)
   */
  public isActive(): boolean {
    return this.status === AssignmentStatus.PROPOSED || this.status === AssignmentStatus.CONFIRMED;
  }

  /**
   * Check if assignment is confirmed
   */
  public isConfirmed(): boolean {
    return this.status === AssignmentStatus.CONFIRMED;
  }

  /**
   * Check if assignment is rejected
   */
  public isRejected(): boolean {
    return this.status === AssignmentStatus.REJECTED;
  }

  /**
   * Check if assignment is proposed (pending approval)
   */
  public isProposed(): boolean {
    return this.status === AssignmentStatus.PROPOSED;
  }

  /**
   * Check if assignment has a good score (above threshold)
   */
  public hasGoodScore(threshold: number = 70): boolean {
    return this.score >= threshold;
  }

  /**
   * Check if assignment needs attention (low score or no explanation)
   */
  public needsAttention(): boolean {
    return this.score < 50 || (this.score < 70 && !this.explanation);
  }

  /**
   * Get score category based on score value
   */
  public getScoreCategory(): 'excellent' | 'good' | 'fair' | 'poor' {
    if (this.score >= 90) return 'excellent';
    if (this.score >= 70) return 'good';
    if (this.score >= 50) return 'fair';
    return 'poor';
  }

  /**
   * Create a copy with updated status
   */
  public updateStatus(newStatus: AssignmentStatus, updatedBy: string, explanation?: string): Assignment {
    // Validate status transition
    this.validateStatusTransition(this.status, newStatus);

    return new Assignment({
      id: this.id,
      demandId: this.demandId,
      employeeId: this.employeeId,
      status: newStatus,
      score: this.score,
      explanation: explanation || this.explanation,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      updatedAt: new Date()
    });
  }

  /**
   * Create a copy with updated score and explanation
   */
  public updateScore(newScore: number, explanation?: string): Assignment {
    if (newScore < 0 || newScore > 100) {
      throw new Error('Score must be between 0 and 100');
    }

    return new Assignment({
      id: this.id,
      demandId: this.demandId,
      employeeId: this.employeeId,
      status: this.status,
      score: newScore,
      explanation: explanation || this.explanation,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      updatedAt: new Date()
    });
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(currentStatus: AssignmentStatus, newStatus: AssignmentStatus): void {
    const validTransitions: Record<AssignmentStatus, AssignmentStatus[]> = {
      [AssignmentStatus.PROPOSED]: [AssignmentStatus.CONFIRMED, AssignmentStatus.REJECTED],
      [AssignmentStatus.CONFIRMED]: [AssignmentStatus.REJECTED], // Can reject confirmed assignments
      [AssignmentStatus.REJECTED]: [] // Cannot transition from rejected
    };

    const allowedTransitions = validTransitions[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Check if assignment conflicts with another assignment (same employee, overlapping time)
   */
  public conflictsWith(other: Assignment, demandDate: Date, shiftStart: string, shiftEnd: string, 
                      otherDemandDate: Date, otherShiftStart: string, otherShiftEnd: string): boolean {
    // Different employees cannot conflict
    if (this.employeeId !== other.employeeId) {
      return false;
    }

    // Same assignment cannot conflict with itself
    if (this.id === other.id) {
      return false;
    }

    // Only active assignments can conflict
    if (!this.isActive() || !other.isActive()) {
      return false;
    }

    // Check if dates are the same or consecutive
    if (!isSameDay(demandDate, otherDemandDate)) {
      // For different days, check if shifts are overnight and overlap
      return this.checkOvernightConflict(demandDate, shiftStart, shiftEnd, otherDemandDate, otherShiftStart, otherShiftEnd);
    }

    // Same day - check time overlap
    return this.checkTimeOverlap(shiftStart, shiftEnd, otherShiftStart, otherShiftEnd);
  }

  /**
   * Check for overnight shift conflicts
   */
  private checkOvernightConflict(date1: Date, start1: string, end1: string, 
                                date2: Date, start2: string, end2: string): boolean {
    // This is a simplified check - in practice you'd need more sophisticated date/time handling
    const isOvernight1 = this.isOvernightShift(start1, end1);
    const isOvernight2 = this.isOvernightShift(start2, end2);
    
    if (!isOvernight1 && !isOvernight2) {
      return false; // No overnight shifts, no conflict across days
    }

    // More complex logic would be needed for full overnight conflict detection
    return false;
  }

  /**
   * Check if shift is overnight (end time before start time)
   */
  private isOvernightShift(startTime: string, endTime: string): boolean {
    const [startHour] = startTime.split(':').map(Number);
    const [endHour] = endTime.split(':').map(Number);
    return endHour <= startHour;
  }

  /**
   * Check for time overlap between two shifts
   */
  private checkTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const start1Minutes = this.timeToMinutes(start1);
    const end1Minutes = this.timeToMinutes(end1);
    const start2Minutes = this.timeToMinutes(start2);
    const end2Minutes = this.timeToMinutes(end2);

    // Handle overnight shifts
    const end1Adjusted = end1Minutes <= start1Minutes ? end1Minutes + 24 * 60 : end1Minutes;
    const end2Adjusted = end2Minutes <= start2Minutes ? end2Minutes + 24 * 60 : end2Minutes;

    // Check for overlap
    return start1Minutes < end2Adjusted && start2Minutes < end1Adjusted;
  }

  /**
   * Convert time string to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convert to plain object for serialization
   */
  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      demandId: this.demandId,
      employeeId: this.employeeId,
      status: this.status,
      score: this.score,
      explanation: this.explanation,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      updatedAt: this.updatedAt
    };
  }
}
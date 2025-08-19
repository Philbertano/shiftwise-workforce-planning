import {
  IAbsenceService,
  ConflictResult,
  AbsenceImpact,
  AbsenceConflict
} from './interfaces.js';
import {
  Absence,
  Employee,
  ShiftDemand,
  Assignment,
  DateRange,
  AbsenceType,
  Priority
} from '../types/index.js';
import { IAbsenceRepository } from '../repositories/absence.repository.js';
import { AssignmentRepository } from '../repositories/assignment.repository.js';
import { EmployeeRepository } from '../repositories/employee.repository.js';
import { ShiftDemandRepository } from '../repositories/shift-demand.repository.js';
import { isWithinInterval, differenceInDays, addDays } from 'date-fns';

/**
 * Service for managing absences with conflict detection and impact analysis
 */
export class AbsenceService implements IAbsenceService {
  private absenceRepo: IAbsenceRepository;
  private assignmentRepo: AssignmentRepository;
  private employeeRepo: EmployeeRepository;
  private demandRepo: ShiftDemandRepository;

  constructor(
    absenceRepo: IAbsenceRepository,
    assignmentRepo: AssignmentRepository,
    employeeRepo: EmployeeRepository,
    demandRepo: ShiftDemandRepository
  ) {
    this.absenceRepo = absenceRepo;
    this.assignmentRepo = assignmentRepo;
    this.employeeRepo = employeeRepo;
    this.demandRepo = demandRepo;
  }

  /**
   * Create a new absence with validation and conflict checking
   */
  async createAbsence(absence: Omit<Absence, 'id' | 'createdAt' | 'updatedAt'>): Promise<Absence> {
    // Validate business rules
    await this.validateAbsenceRules(absence);

    // Check for conflicts
    const conflicts = await this.checkConflicts({
      ...absence,
      id: 'temp',
      createdAt: new Date(),
      updatedAt: new Date()
    } as Absence);

    // If there are blocking conflicts, reject the creation
    const blockingConflicts = conflicts.conflicts.filter(c => c.severity === 'error');
    if (blockingConflicts.length > 0) {
      throw new Error(`Cannot create absence: ${blockingConflicts.map(c => c.description).join(', ')}`);
    }

    // Create the absence
    return this.absenceRepo.create(absence);
  }

  /**
   * Get absences for an employee within a date range
   */
  async getAbsences(employeeId: string, dateRange: DateRange): Promise<Absence[]> {
    return this.absenceRepo.findByDateRange(dateRange.start, dateRange.end)
      .then(absences => absences.filter(a => a.employeeId === employeeId));
  }

  /**
   * Approve an absence
   */
  async approveAbsence(absenceId: string, approvedBy: string): Promise<Absence> {
    const absence = await this.absenceRepo.findById(absenceId);
    if (!absence) {
      throw new Error('Absence not found');
    }

    if (absence.approved) {
      throw new Error('Absence is already approved');
    }

    // Check if approval is still valid (no new conflicts)
    const conflicts = await this.checkConflicts(absence);
    const blockingConflicts = conflicts.conflicts.filter(c => c.severity === 'error');
    
    if (blockingConflicts.length > 0) {
      throw new Error(`Cannot approve absence due to conflicts: ${blockingConflicts.map(c => c.description).join(', ')}`);
    }

    return this.absenceRepo.approveAbsence(absenceId, approvedBy);
  }

  /**
   * Check for conflicts with an absence
   */
  async checkConflicts(absence: Absence): Promise<ConflictResult> {
    const conflicts: AbsenceConflict[] = [];

    // Check for overlapping absences
    const overlappingAbsences = await this.absenceRepo.findConflicting(
      absence.employeeId,
      absence.dateStart,
      absence.dateEnd
    );

    if (overlappingAbsences.length > 0) {
      conflicts.push({
        type: 'assignment_overlap',
        description: `Overlaps with ${overlappingAbsences.length} existing absence(s)`,
        severity: 'error',
        resolution: 'Adjust dates to avoid overlap or cancel conflicting absences'
      });
    }

    // Check notice period requirements
    const noticeConflict = this.checkNoticeRequirements(absence);
    if (noticeConflict) {
      conflicts.push(noticeConflict);
    }

    // Check for blackout periods (if implemented)
    const blackoutConflict = await this.checkBlackoutPeriods(absence);
    if (blackoutConflict) {
      conflicts.push(blackoutConflict);
    }

    // Get affected assignments
    const affectedAssignments = await this.getAffectedAssignments(absence);

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      affectedAssignments
    };
  }

  /**
   * Get impact analysis for an absence
   */
  async getAbsenceImpact(absenceId: string): Promise<AbsenceImpact> {
    const absence = await this.absenceRepo.findById(absenceId);
    if (!absence) {
      throw new Error('Absence not found');
    }

    return this.calculateAbsenceImpact(absence);
  }

  /**
   * Calculate impact of an absence
   */
  private async calculateAbsenceImpact(absence: Absence): Promise<AbsenceImpact> {
    // Get affected demands (assignments that would be impacted)
    const affectedDemands = await this.getAffectedDemands(absence);
    
    // Calculate coverage reduction
    const totalDemands = await this.getTotalDemandsInPeriod(absence.dateStart, absence.dateEnd);
    const coverageReduction = totalDemands > 0 ? (affectedDemands.length / totalDemands) * 100 : 0;

    // Find alternative employees
    const alternativeEmployees = await this.findAlternativeEmployees(absence, affectedDemands);

    // Generate risk assessment
    const riskAssessment = this.generateRiskAssessment(absence, affectedDemands, alternativeEmployees);

    return {
      affectedDemands,
      coverageReduction,
      alternativeEmployees,
      riskAssessment
    };
  }

  /**
   * Get affected assignments for an absence
   */
  private async getAffectedAssignments(absence: Absence): Promise<Assignment[]> {
    // Find assignments for this employee during the absence period
    const assignments = await this.assignmentRepo.findByEmployeeAndDateRange(
      absence.employeeId,
      absence.dateStart,
      absence.dateEnd
    );

    return assignments.filter(assignment => assignment.status !== 'rejected');
  }

  /**
   * Get affected demands for an absence
   */
  private async getAffectedDemands(absence: Absence): Promise<ShiftDemand[]> {
    const assignments = await this.getAffectedAssignments(absence);
    const demandIds = assignments.map(a => a.demandId);
    
    const demands: ShiftDemand[] = [];
    for (const demandId of demandIds) {
      const demand = await this.demandRepo.findById(demandId);
      if (demand) {
        demands.push(demand);
      }
    }
    
    return demands;
  }

  /**
   * Get total demands in a period
   */
  private async getTotalDemandsInPeriod(startDate: Date, endDate: Date): Promise<number> {
    const demands = await this.demandRepo.findByDateRange(startDate, endDate);
    return demands.length;
  }

  /**
   * Find alternative employees for affected demands
   */
  private async findAlternativeEmployees(absence: Absence, affectedDemands: ShiftDemand[]): Promise<Employee[]> {
    // This is a simplified implementation
    // In practice, you'd check skills, availability, and other constraints
    const allEmployees = await this.employeeRepo.findAll();
    
    return allEmployees.filter(emp => 
      emp.id !== absence.employeeId && 
      emp.active &&
      emp.contractType !== 'temporary' // Prefer permanent staff as alternatives
    ).slice(0, 5); // Return top 5 alternatives
  }

  /**
   * Generate risk assessment
   */
  private generateRiskAssessment(
    absence: Absence, 
    affectedDemands: ShiftDemand[], 
    alternatives: Employee[]
  ): string {
    const criticalDemands = affectedDemands.filter(d => d.priority === Priority.CRITICAL).length;
    const highDemands = affectedDemands.filter(d => d.priority === Priority.HIGH).length;
    
    if (criticalDemands > 0) {
      return `CRITICAL: ${criticalDemands} critical demands affected. Immediate action required.`;
    } else if (highDemands > 2) {
      return `HIGH: ${highDemands} high-priority demands affected. Alternative coverage needed.`;
    } else if (affectedDemands.length > 5) {
      return `MEDIUM: ${affectedDemands.length} demands affected. Monitor coverage closely.`;
    } else if (alternatives.length < 2) {
      return `MEDIUM: Limited alternative employees available.`;
    } else {
      return `LOW: Minimal impact expected with adequate alternatives available.`;
    }
  }

  /**
   * Validate absence business rules
   */
  private async validateAbsenceRules(absence: Omit<Absence, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    // Check if employee exists and is active
    const employee = await this.employeeRepo.findById(absence.employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }
    if (!employee.active) {
      throw new Error('Cannot create absence for inactive employee');
    }

    // Validate date range
    if (absence.dateStart > absence.dateEnd) {
      throw new Error('Start date cannot be after end date');
    }

    // Check maximum absence duration by type
    const duration = differenceInDays(absence.dateEnd, absence.dateStart) + 1;
    const maxDurations = {
      [AbsenceType.VACATION]: 30,
      [AbsenceType.SICK]: 90,
      [AbsenceType.TRAINING]: 14,
      [AbsenceType.PERSONAL]: 5
    };

    if (duration > maxDurations[absence.type]) {
      throw new Error(`${absence.type} absence cannot exceed ${maxDurations[absence.type]} days`);
    }

    // Check if absence is too far in the future (except for vacation)
    if (absence.type !== AbsenceType.VACATION) {
      const maxFutureDays = absence.type === AbsenceType.TRAINING ? 90 : 30;
      const daysDiff = differenceInDays(absence.dateStart, new Date());
      
      if (daysDiff > maxFutureDays) {
        throw new Error(`${absence.type} absence cannot be scheduled more than ${maxFutureDays} days in advance`);
      }
    }
  }

  /**
   * Check notice requirements
   */
  private checkNoticeRequirements(absence: Absence): AbsenceConflict | null {
    const requiredNoticeDays = this.getRequiredNoticeDays(absence.type);
    const actualNoticeDays = differenceInDays(absence.dateStart, absence.createdAt);
    
    if (actualNoticeDays < requiredNoticeDays) {
      return {
        type: 'insufficient_notice',
        description: `Insufficient notice: ${actualNoticeDays} days provided, ${requiredNoticeDays} required`,
        severity: absence.type === AbsenceType.SICK ? 'warning' : 'error',
        resolution: absence.type === AbsenceType.SICK 
          ? 'Sick leave may be approved with reduced notice'
          : `Provide at least ${requiredNoticeDays} days notice`
      };
    }
    
    return null;
  }

  /**
   * Get required notice days by absence type
   */
  private getRequiredNoticeDays(type: AbsenceType): number {
    switch (type) {
      case AbsenceType.VACATION: return 14;
      case AbsenceType.TRAINING: return 7;
      case AbsenceType.PERSONAL: return 3;
      case AbsenceType.SICK: return 0;
      default: return 7;
    }
  }

  /**
   * Check for blackout periods
   */
  private async checkBlackoutPeriods(absence: Absence): Promise<AbsenceConflict | null> {
    // This is a placeholder for blackout period checking
    // In practice, you'd have a blackout periods configuration
    
    // Example: No vacation during December for retail
    if (absence.type === AbsenceType.VACATION) {
      const month = absence.dateStart.getMonth();
      if (month === 11) { // December
        return {
          type: 'blackout_period',
          description: 'Vacation requests not allowed during December blackout period',
          severity: 'error',
          resolution: 'Schedule vacation outside of blackout period'
        };
      }
    }
    
    return null;
  }
}
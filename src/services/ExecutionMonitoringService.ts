// Execution monitoring service for tracking assignment execution and real-time updates

import {
  ExecutionStatus,
  ExecutionStatusType,
  PlanExecutionSummary,
  Plan,
  PlanStatus
} from '../types/plan.js';
import { Assignment, AssignmentStatus, CoverageStatus } from '../types/index.js';
import { IExecutionStatusRepository } from '../repositories/execution-status.repository.js';
import { IPlanRepository } from '../repositories/plan.repository.js';
import { IAssignmentRepository } from '../repositories/assignment.repository.js';
import { AuditService } from './AuditService.js';
import { AuditAction } from '../types/index.js';

export interface IExecutionMonitoringService {
  updateAssignmentStatus(
    assignmentId: string,
    status: ExecutionStatusType,
    updatedBy: string,
    options?: {
      notes?: string;
      actualStartTime?: Date;
      actualEndTime?: Date;
    }
  ): Promise<ExecutionStatus>;
  
  getPlanExecutionSummary(planId: string): Promise<PlanExecutionSummary>;
  getAssignmentExecutionHistory(assignmentId: string): Promise<ExecutionStatus[]>;
  getRealTimeCoverage(planId: string): Promise<CoverageStatus>;
  handleLastMinuteChange(
    assignmentId: string,
    changeType: 'cancel' | 'modify' | 'replace',
    updatedBy: string,
    options?: {
      reason?: string;
      replacementEmployeeId?: string;
      newStartTime?: Date;
      newEndTime?: Date;
    }
  ): Promise<{
    originalAssignment: Assignment;
    updatedAssignment?: Assignment;
    replacementAssignment?: Assignment;
    impactAnalysis: {
      affectedStations: string[];
      coverageImpact: number;
      recommendedActions: string[];
    };
  }>;
  
  getExecutionAlerts(planId: string): Promise<{
    noShows: ExecutionStatus[];
    lateStarts: ExecutionStatus[];
    earlyEnds: ExecutionStatus[];
    coverageGaps: {
      stationId: string;
      shiftTime: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }[];
  }>;
  
  triggerReplanningForGaps(
    planId: string,
    gapDemandIds: string[],
    triggeredBy: string
  ): Promise<{
    newAssignments: Assignment[];
    updatedCoverage: CoverageStatus;
  }>;
}

export class ExecutionMonitoringService implements IExecutionMonitoringService {
  constructor(
    private executionStatusRepository: IExecutionStatusRepository,
    private planRepository: IPlanRepository,
    private assignmentRepository: IAssignmentRepository,
    private auditService: AuditService
  ) {}

  /**
   * Update the execution status of an assignment
   */
  async updateAssignmentStatus(
    assignmentId: string,
    status: ExecutionStatusType,
    updatedBy: string,
    options?: {
      notes?: string;
      actualStartTime?: Date;
      actualEndTime?: Date;
    }
  ): Promise<ExecutionStatus> {
    const assignment = await this.assignmentRepository.findById(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    if (assignment.status !== AssignmentStatus.CONFIRMED) {
      throw new Error('Can only update execution status for confirmed assignments');
    }

    // Validate status transitions
    this.validateStatusTransition(status, options);

    const executionStatus = await this.executionStatusRepository.updateAssignmentStatus(
      assignmentId,
      status,
      updatedBy,
      options?.notes,
      options?.actualStartTime,
      options?.actualEndTime
    );

    // Log the status update
    await this.auditService.logAction({
      action: AuditAction.UPDATE,
      entityType: 'execution_status',
      entityId: assignmentId,
      userId: updatedBy,
      changes: {
        status,
        notes: options?.notes,
        actualStartTime: options?.actualStartTime,
        actualEndTime: options?.actualEndTime
      }
    });

    // If this is a no-show or cancellation, trigger coverage analysis
    if (status === ExecutionStatusType.NO_SHOW || status === ExecutionStatusType.CANCELLED) {
      await this.handleCoverageGap(assignmentId, updatedBy);
    }

    return executionStatus;
  }

  /**
   * Get execution summary for a plan
   */
  async getPlanExecutionSummary(planId: string): Promise<PlanExecutionSummary> {
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    return this.executionStatusRepository.getPlanExecutionSummary(planId);
  }

  /**
   * Get execution history for an assignment
   */
  async getAssignmentExecutionHistory(assignmentId: string): Promise<ExecutionStatus[]> {
    return this.executionStatusRepository.findByAssignment(assignmentId);
  }

  /**
   * Get real-time coverage status for a plan
   */
  async getRealTimeCoverage(planId: string): Promise<CoverageStatus> {
    const plan = await this.planRepository.findWithAssignments(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    const executionStatuses = await this.executionStatusRepository.findByPlan(planId);
    const executionMap = new Map(executionStatuses.map(es => [es.assignmentId, es]));

    // Calculate real-time coverage based on execution status
    let activeAssignments = 0;
    let totalDemands = plan.assignments.length;

    for (const assignment of plan.assignments) {
      const execution = executionMap.get(assignment.id);
      
      if (!execution) {
        // No execution status yet, assume scheduled
        activeAssignments++;
      } else if (execution.status === ExecutionStatusType.COMPLETED || 
                 execution.status === ExecutionStatusType.IN_PROGRESS) {
        activeAssignments++;
      }
      // NO_SHOW and CANCELLED don't count as active
    }

    const coveragePercentage = totalDemands > 0 ? (activeAssignments / totalDemands) * 100 : 0;

    // Identify current gaps
    const gaps = plan.assignments
      .filter(assignment => {
        const execution = executionMap.get(assignment.id);
        return execution?.status === ExecutionStatusType.NO_SHOW || 
               execution?.status === ExecutionStatusType.CANCELLED;
      })
      .map(assignment => ({
        demandId: assignment.demandId,
        stationName: 'Unknown Station', // Would need to join with station data
        shiftTime: 'Unknown Time', // Would need to join with shift template data
        criticality: 'high' as any,
        reason: executionMap.get(assignment.id)?.status === ExecutionStatusType.NO_SHOW 
          ? 'Employee no-show' 
          : 'Assignment cancelled',
        suggestedActions: ['Find replacement', 'Redistribute workload', 'Notify supervisor']
      }));

    return {
      totalDemands,
      filledDemands: activeAssignments,
      coveragePercentage,
      gaps,
      riskLevel: this.calculateRiskLevel(coveragePercentage, gaps.length)
    };
  }

  /**
   * Handle last-minute changes to assignments
   */
  async handleLastMinuteChange(
    assignmentId: string,
    changeType: 'cancel' | 'modify' | 'replace',
    updatedBy: string,
    options?: {
      reason?: string;
      replacementEmployeeId?: string;
      newStartTime?: Date;
      newEndTime?: Date;
    }
  ): Promise<{
    originalAssignment: Assignment;
    updatedAssignment?: Assignment;
    replacementAssignment?: Assignment;
    impactAnalysis: {
      affectedStations: string[];
      coverageImpact: number;
      recommendedActions: string[];
    };
  }> {
    const originalAssignment = await this.assignmentRepository.findById(assignmentId);
    if (!originalAssignment) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    let updatedAssignment: Assignment | undefined;
    let replacementAssignment: Assignment | undefined;

    switch (changeType) {
      case 'cancel':
        // Update execution status to cancelled
        await this.updateAssignmentStatus(
          assignmentId,
          ExecutionStatusType.CANCELLED,
          updatedBy,
          { notes: options?.reason }
        );
        break;

      case 'modify':
        // Update assignment with new times (would need to modify assignment model)
        updatedAssignment = await this.assignmentRepository.update(assignmentId, {
          updatedAt: new Date()
          // In a full implementation, would update start/end times
        });
        
        await this.updateAssignmentStatus(
          assignmentId,
          ExecutionStatusType.MODIFIED,
          updatedBy,
          { 
            notes: `Modified: ${options?.reason}`,
            actualStartTime: options?.newStartTime,
            actualEndTime: options?.newEndTime
          }
        );
        break;

      case 'replace':
        if (!options?.replacementEmployeeId) {
          throw new Error('Replacement employee ID required for replace operation');
        }

        // Cancel original assignment
        await this.updateAssignmentStatus(
          assignmentId,
          ExecutionStatusType.CANCELLED,
          updatedBy,
          { notes: `Replaced: ${options.reason}` }
        );

        // Create replacement assignment (simplified - would need full assignment creation logic)
        replacementAssignment = await this.assignmentRepository.create({
          id: `replacement_${Date.now()}`,
          demandId: originalAssignment.demandId,
          employeeId: options.replacementEmployeeId,
          status: AssignmentStatus.CONFIRMED,
          score: 50, // Default score for emergency replacement
          explanation: `Emergency replacement for ${originalAssignment.employeeId}`,
          createdBy: updatedBy,
          updatedAt: new Date()
        });
        break;
    }

    // Analyze impact
    const impactAnalysis = await this.analyzeChangeImpact(originalAssignment, changeType);

    // Log the change
    await this.auditService.logAction({
      action: AuditAction.UPDATE,
      entityType: 'assignment',
      entityId: assignmentId,
      userId: updatedBy,
      changes: {
        changeType,
        reason: options?.reason,
        replacementEmployeeId: options?.replacementEmployeeId,
        newStartTime: options?.newStartTime,
        newEndTime: options?.newEndTime
      }
    });

    return {
      originalAssignment,
      updatedAssignment,
      replacementAssignment,
      impactAnalysis
    };
  }

  /**
   * Get execution alerts for a plan
   */
  async getExecutionAlerts(planId: string): Promise<{
    noShows: ExecutionStatus[];
    lateStarts: ExecutionStatus[];
    earlyEnds: ExecutionStatus[];
    coverageGaps: {
      stationId: string;
      shiftTime: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }[];
  }> {
    const executionStatuses = await this.executionStatusRepository.findByPlan(planId);

    const noShows = executionStatuses.filter(es => es.status === ExecutionStatusType.NO_SHOW);
    
    // For late starts and early ends, we'd need to compare actual times with scheduled times
    // This is simplified for now
    const lateStarts = executionStatuses.filter(es => 
      es.status === ExecutionStatusType.IN_PROGRESS && 
      es.actualStartTime && 
      this.isLateStart(es.actualStartTime)
    );

    const earlyEnds = executionStatuses.filter(es => 
      es.status === ExecutionStatusType.COMPLETED && 
      es.actualEndTime && 
      this.isEarlyEnd(es.actualEndTime)
    );

    // Coverage gaps would be calculated based on cancelled/no-show assignments
    const coverageGaps = executionStatuses
      .filter(es => es.status === ExecutionStatusType.NO_SHOW || es.status === ExecutionStatusType.CANCELLED)
      .map(es => ({
        stationId: 'unknown', // Would need to join with assignment/demand/station data
        shiftTime: 'unknown', // Would need to join with shift template data
        severity: 'high' as const
      }));

    return {
      noShows,
      lateStarts,
      earlyEnds,
      coverageGaps
    };
  }

  /**
   * Trigger re-planning for coverage gaps
   */
  async triggerReplanningForGaps(
    planId: string,
    gapDemandIds: string[],
    triggeredBy: string
  ): Promise<{
    newAssignments: Assignment[];
    updatedCoverage: CoverageStatus;
  }> {
    // This would integrate with the planning service to generate new assignments
    // For now, return empty results
    const newAssignments: Assignment[] = [];
    const updatedCoverage = await this.getRealTimeCoverage(planId);

    // Log the re-planning trigger
    await this.auditService.logAction({
      action: AuditAction.CREATE,
      entityType: 'replanning',
      entityId: planId,
      userId: triggeredBy,
      changes: {
        gapDemandIds,
        reason: 'Coverage gap detected'
      }
    });

    return {
      newAssignments,
      updatedCoverage
    };
  }

  /**
   * Validate execution status transitions
   */
  private validateStatusTransition(
    status: ExecutionStatusType,
    options?: { actualStartTime?: Date; actualEndTime?: Date }
  ): void {
    switch (status) {
      case ExecutionStatusType.IN_PROGRESS:
        if (!options?.actualStartTime) {
          throw new Error('Actual start time required for in-progress status');
        }
        break;
      
      case ExecutionStatusType.COMPLETED:
        if (!options?.actualEndTime) {
          throw new Error('Actual end time required for completed status');
        }
        break;
    }
  }

  /**
   * Handle coverage gap when assignment is cancelled or no-show
   */
  private async handleCoverageGap(assignmentId: string, updatedBy: string): Promise<void> {
    // This would trigger alerts and potentially automatic re-planning
    // For now, just log the gap
    await this.auditService.logAction({
      action: AuditAction.CREATE,
      entityType: 'coverage_gap',
      entityId: assignmentId,
      userId: updatedBy,
      changes: {
        reason: 'Assignment cancelled or no-show'
      }
    });
  }

  /**
   * Analyze the impact of a last-minute change
   */
  private async analyzeChangeImpact(
    assignment: Assignment,
    changeType: string
  ): Promise<{
    affectedStations: string[];
    coverageImpact: number;
    recommendedActions: string[];
  }> {
    // Simplified impact analysis
    const affectedStations = ['unknown']; // Would need to get from assignment/demand data
    const coverageImpact = changeType === 'cancel' ? -10 : 0; // Percentage impact
    
    const recommendedActions: string[] = [];
    if (changeType === 'cancel') {
      recommendedActions.push('Find replacement employee');
      recommendedActions.push('Redistribute workload to other employees');
      recommendedActions.push('Notify station supervisor');
    }

    return {
      affectedStations,
      coverageImpact,
      recommendedActions
    };
  }

  /**
   * Calculate risk level based on coverage
   */
  private calculateRiskLevel(coveragePercentage: number, gapCount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (gapCount > 5 || coveragePercentage < 75) return 'critical';
    if (gapCount > 2 || coveragePercentage < 90) return 'high';
    if (gapCount > 0 || coveragePercentage < 95) return 'medium';
    return 'low';
  }

  /**
   * Check if start time is late (simplified)
   */
  private isLateStart(actualStartTime: Date): boolean {
    // Would compare with scheduled start time
    // For now, assume any start after current time is late
    return false;
  }

  /**
   * Check if end time is early (simplified)
   */
  private isEarlyEnd(actualEndTime: Date): boolean {
    // Would compare with scheduled end time
    // For now, assume any end before current time is early
    return false;
  }
}
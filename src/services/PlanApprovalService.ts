// Plan approval service for managing plan review and commitment workflow

import {
  Plan,
  PlanStatus,
  PlanApprovalRequest,
  PlanCommitRequest,
  PlanCommitResult,
  PlanCommitError,
  PlanDiff,
  AssignmentDiff,
  PlanReviewData
} from '../types/plan.js';
import { Assignment, AssignmentStatus } from '../types/index.js';
import { IPlanRepository } from '../repositories/plan.repository.js';
import { IAssignmentRepository } from '../repositories/assignment.repository.js';
import { AuditService } from './AuditService.js';
import { AuditAction } from '../types/index.js';

export interface IPlanApprovalService {
  reviewPlan(planId: string): Promise<PlanReviewData>;
  approvePlan(request: PlanApprovalRequest): Promise<Plan>;
  commitPlan(request: PlanCommitRequest): Promise<PlanCommitResult>;
  rejectPlan(planId: string, rejectedBy: string, reason?: string): Promise<Plan>;
  comparePlans(planId1: string, planId2?: string): Promise<PlanDiff>;
  getPlanHistory(planId: string): Promise<Plan[]>;
}

export class PlanApprovalService implements IPlanApprovalService {
  constructor(
    private planRepository: IPlanRepository,
    private assignmentRepository: IAssignmentRepository,
    private auditService: AuditService
  ) {}

  /**
   * Get plan review data including diff and impact analysis
   */
  async reviewPlan(planId: string): Promise<PlanReviewData> {
    const plan = await this.planRepository.findWithAssignments(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    // Get current committed plan for comparison (if any)
    const currentPlans = await this.planRepository.findByStatus(PlanStatus.COMMITTED);
    const currentPlan = currentPlans.find(p => 
      p.dateRange.start <= plan.dateRange.end && 
      p.dateRange.end >= plan.dateRange.start
    );

    let diff: PlanDiff | undefined;
    if (currentPlan) {
      diff = await this.comparePlans(planId, currentPlan.id);
    }

    const impactAnalysis = await this.analyzeImpact(plan);

    return {
      plan,
      diff,
      impactAnalysis
    };
  }

  /**
   * Approve a plan (all or selected assignments)
   */
  async approvePlan(request: PlanApprovalRequest): Promise<Plan> {
    const plan = await this.planRepository.findWithAssignments(request.planId);
    if (!plan) {
      throw new Error(`Plan ${request.planId} not found`);
    }

    if (plan.status === PlanStatus.COMMITTED) {
      throw new Error('Cannot approve a committed plan');
    }

    // Determine which assignments to approve
    const assignmentsToApprove = request.assignmentIds 
      ? plan.assignments.filter(a => request.assignmentIds!.includes(a.id))
      : plan.assignments;

    // Determine which assignments to reject
    const assignmentsToReject = request.rejectedAssignmentIds
      ? plan.assignments.filter(a => request.rejectedAssignmentIds!.includes(a.id))
      : [];

    // Update assignment statuses
    for (const assignment of assignmentsToApprove) {
      if (assignment.status === AssignmentStatus.PROPOSED) {
        await this.assignmentRepository.update(assignment.id, {
          status: AssignmentStatus.CONFIRMED,
          updatedAt: new Date()
        });
      }
    }

    for (const assignment of assignmentsToReject) {
      if (assignment.status === AssignmentStatus.PROPOSED) {
        await this.assignmentRepository.update(assignment.id, {
          status: AssignmentStatus.REJECTED,
          updatedAt: new Date()
        });
      }
    }

    // Update plan status
    const approvedCount = assignmentsToApprove.length;
    const totalCount = plan.assignments.length;
    const rejectedCount = assignmentsToReject.length;

    let newStatus: PlanStatus;
    if (approvedCount === totalCount) {
      newStatus = PlanStatus.APPROVED;
    } else if (approvedCount > 0) {
      newStatus = PlanStatus.PARTIALLY_APPROVED;
    } else {
      newStatus = PlanStatus.REJECTED;
    }

    const updatedPlan = await this.planRepository.updateStatus(
      request.planId, 
      newStatus, 
      request.approvedBy
    );

    // Log approval action
    await this.auditService.logAction({
      action: AuditAction.APPROVE,
      entityType: 'plan',
      entityId: request.planId,
      userId: request.approvedBy,
      changes: {
        status: { from: plan.status, to: newStatus },
        approvedAssignments: assignmentsToApprove.map(a => a.id),
        rejectedAssignments: assignmentsToReject.map(a => a.id),
        comments: request.comments
      }
    });

    return updatedPlan;
  }

  /**
   * Commit approved plan assignments
   */
  async commitPlan(request: PlanCommitRequest): Promise<PlanCommitResult> {
    const plan = await this.planRepository.findWithAssignments(request.planId);
    if (!plan) {
      throw new Error(`Plan ${request.planId} not found`);
    }

    if (plan.status !== PlanStatus.APPROVED && plan.status !== PlanStatus.PARTIALLY_APPROVED) {
      throw new Error('Can only commit approved plans');
    }

    // Get assignments to commit
    const assignmentsToCommit = request.assignmentIds
      ? plan.assignments.filter(a => 
          request.assignmentIds!.includes(a.id) && 
          a.status === AssignmentStatus.CONFIRMED
        )
      : plan.assignments.filter(a => a.status === AssignmentStatus.CONFIRMED);

    const committedAssignments: Assignment[] = [];
    const skippedAssignments: Assignment[] = [];
    const errors: PlanCommitError[] = [];

    // Validate and commit each assignment
    for (const assignment of assignmentsToCommit) {
      try {
        // Check for conflicts with other committed assignments
        const conflicts = await this.checkAssignmentConflicts(assignment);
        if (conflicts.length > 0) {
          errors.push({
            assignmentId: assignment.id,
            error: `Conflicts with existing assignments: ${conflicts.map(c => c.id).join(', ')}`,
            severity: 'error'
          });
          skippedAssignments.push(assignment);
          continue;
        }

        // Assignment is valid, keep it as confirmed
        committedAssignments.push(assignment);
      } catch (error) {
        errors.push({
          assignmentId: assignment.id,
          error: error.message,
          severity: 'error'
        });
        skippedAssignments.push(assignment);
      }
    }

    // Update plan status to committed
    const committedAt = new Date();
    await this.planRepository.commitPlan(
      request.planId, 
      request.committedBy, 
      request.effectiveDate
    );

    // Log commit action
    await this.auditService.logAction({
      action: AuditAction.COMMIT,
      entityType: 'plan',
      entityId: request.planId,
      userId: request.committedBy,
      changes: {
        committedAssignments: committedAssignments.map(a => a.id),
        skippedAssignments: skippedAssignments.map(a => a.id),
        errors: errors,
        effectiveDate: request.effectiveDate
      }
    });

    return {
      planId: request.planId,
      committedAssignments,
      skippedAssignments,
      errors,
      committedAt
    };
  }

  /**
   * Reject a plan
   */
  async rejectPlan(planId: string, rejectedBy: string, reason?: string): Promise<Plan> {
    const plan = await this.planRepository.findWithAssignments(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    if (plan.status === PlanStatus.COMMITTED) {
      throw new Error('Cannot reject a committed plan');
    }

    // Update all proposed assignments to rejected
    for (const assignment of plan.assignments) {
      if (assignment.status === AssignmentStatus.PROPOSED) {
        await this.assignmentRepository.update(assignment.id, {
          status: AssignmentStatus.REJECTED,
          updatedAt: new Date()
        });
      }
    }

    const updatedPlan = await this.planRepository.updateStatus(
      planId, 
      PlanStatus.REJECTED, 
      rejectedBy
    );

    // Log rejection
    await this.auditService.logAction({
      action: AuditAction.REJECT,
      entityType: 'plan',
      entityId: planId,
      userId: rejectedBy,
      changes: {
        status: { from: plan.status, to: PlanStatus.REJECTED },
        reason
      }
    });

    return updatedPlan;
  }

  /**
   * Compare two plans and return differences
   */
  async comparePlans(planId1: string, planId2?: string): Promise<PlanDiff> {
    const plan1 = await this.planRepository.findWithAssignments(planId1);
    if (!plan1) {
      throw new Error(`Plan ${planId1} not found`);
    }

    let plan2: Plan | null = null;
    if (planId2) {
      plan2 = await this.planRepository.findWithAssignments(planId2);
      if (!plan2) {
        throw new Error(`Plan ${planId2} not found`);
      }
    }

    const assignmentDiffs = this.calculateAssignmentDiffs(
      plan1.assignments, 
      plan2?.assignments || []
    );

    const coverageChanges = {
      totalDemands: {
        old: plan2?.coverageStatus.totalDemands || 0,
        new: plan1.coverageStatus.totalDemands
      },
      filledDemands: {
        old: plan2?.coverageStatus.filledDemands || 0,
        new: plan1.coverageStatus.filledDemands
      },
      coveragePercentage: {
        old: plan2?.coverageStatus.coveragePercentage || 0,
        new: plan1.coverageStatus.coveragePercentage
      }
    };

    const summary = {
      addedAssignments: assignmentDiffs.filter(d => d.type === 'added').length,
      removedAssignments: assignmentDiffs.filter(d => d.type === 'removed').length,
      modifiedAssignments: assignmentDiffs.filter(d => d.type === 'modified').length
    };

    return {
      planId: planId1,
      comparedWith: planId2,
      assignmentDiffs,
      coverageChanges,
      summary
    };
  }

  /**
   * Get plan history (versions/changes over time)
   */
  async getPlanHistory(planId: string): Promise<Plan[]> {
    // For now, just return the current plan
    // In a full implementation, this would return all versions of the plan
    const plan = await this.planRepository.findWithAssignments(planId);
    return plan ? [plan] : [];
  }

  /**
   * Calculate differences between two sets of assignments
   */
  private calculateAssignmentDiffs(
    newAssignments: Assignment[], 
    oldAssignments: Assignment[]
  ): AssignmentDiff[] {
    const diffs: AssignmentDiff[] = [];
    const oldAssignmentMap = new Map(oldAssignments.map(a => [a.id, a]));
    const newAssignmentMap = new Map(newAssignments.map(a => [a.id, a]));

    // Find added and modified assignments
    for (const newAssignment of newAssignments) {
      const oldAssignment = oldAssignmentMap.get(newAssignment.id);
      
      if (!oldAssignment) {
        // Added assignment
        diffs.push({
          assignmentId: newAssignment.id,
          type: 'added',
          current: newAssignment
        });
      } else {
        // Check for modifications
        const changes = this.getAssignmentChanges(oldAssignment, newAssignment);
        if (changes.length > 0) {
          diffs.push({
            assignmentId: newAssignment.id,
            type: 'modified',
            current: newAssignment,
            previous: oldAssignment,
            changes
          });
        }
      }
    }

    // Find removed assignments
    for (const oldAssignment of oldAssignments) {
      if (!newAssignmentMap.has(oldAssignment.id)) {
        diffs.push({
          assignmentId: oldAssignment.id,
          type: 'removed',
          previous: oldAssignment
        });
      }
    }

    return diffs;
  }

  /**
   * Get changes between two assignments
   */
  private getAssignmentChanges(oldAssignment: Assignment, newAssignment: Assignment): {
    field: string;
    oldValue: any;
    newValue: any;
  }[] {
    const changes: { field: string; oldValue: any; newValue: any }[] = [];

    if (oldAssignment.status !== newAssignment.status) {
      changes.push({
        field: 'status',
        oldValue: oldAssignment.status,
        newValue: newAssignment.status
      });
    }

    if (oldAssignment.score !== newAssignment.score) {
      changes.push({
        field: 'score',
        oldValue: oldAssignment.score,
        newValue: newAssignment.score
      });
    }

    if (oldAssignment.explanation !== newAssignment.explanation) {
      changes.push({
        field: 'explanation',
        oldValue: oldAssignment.explanation,
        newValue: newAssignment.explanation
      });
    }

    return changes;
  }

  /**
   * Analyze the impact of a plan
   */
  private async analyzeImpact(plan: Plan): Promise<{
    affectedEmployees: string[];
    affectedStations: string[];
    riskAssessment: string;
    recommendations: string[];
  }> {
    const affectedEmployees = [...new Set(plan.assignments.map(a => a.employeeId))];
    
    // Get station information from assignments (would need to join with demands/stations)
    const affectedStations: string[] = []; // Placeholder
    
    let riskAssessment = 'Low';
    const recommendations: string[] = [];

    // Assess risk based on coverage and violations
    if (plan.coverageStatus.coveragePercentage < 90) {
      riskAssessment = 'High';
      recommendations.push('Review coverage gaps and consider additional staffing');
    }

    if (plan.violations.length > 0) {
      riskAssessment = 'Medium';
      recommendations.push('Address constraint violations before committing');
    }

    if (plan.assignments.some(a => a.score < 50)) {
      recommendations.push('Review low-scoring assignments for potential improvements');
    }

    return {
      affectedEmployees,
      affectedStations,
      riskAssessment,
      recommendations
    };
  }

  /**
   * Check for conflicts with existing committed assignments
   */
  private async checkAssignmentConflicts(assignment: Assignment): Promise<Assignment[]> {
    // This would check for overlapping assignments for the same employee
    // For now, return empty array (no conflicts)
    return [];
  }
}
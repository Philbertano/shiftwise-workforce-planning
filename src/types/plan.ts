// Plan-specific types for commitment and execution tracking

import { Assignment, AssignmentStatus, CoverageStatus, ConstraintViolation } from './index.js';

export interface Plan {
  id: string;
  name?: string;
  description?: string;
  status: PlanStatus;
  assignments: Assignment[];
  coverageStatus: CoverageStatus;
  violations: ConstraintViolation[];
  dateRange: {
    start: Date;
    end: Date;
  };
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  committedAt?: Date;
  committedBy?: string;
  metadata?: Record<string, any>;
}

export enum PlanStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  PARTIALLY_APPROVED = 'partially_approved',
  APPROVED = 'approved',
  COMMITTED = 'committed',
  REJECTED = 'rejected',
  ARCHIVED = 'archived'
}

export interface PlanApprovalRequest {
  planId: string;
  assignmentIds?: string[]; // If not provided, approve all assignments
  rejectedAssignmentIds?: string[];
  comments?: string;
  approvedBy: string;
}

export interface PlanCommitRequest {
  planId: string;
  assignmentIds?: string[]; // If not provided, commit all approved assignments
  committedBy: string;
  effectiveDate?: Date; // When the plan becomes active
}

export interface PlanCommitResult {
  planId: string;
  committedAssignments: Assignment[];
  skippedAssignments: Assignment[];
  errors: PlanCommitError[];
  committedAt: Date;
}

export interface PlanCommitError {
  assignmentId: string;
  error: string;
  severity: 'warning' | 'error';
}

export interface AssignmentDiff {
  assignmentId: string;
  type: 'added' | 'removed' | 'modified';
  current?: Assignment;
  previous?: Assignment;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface PlanDiff {
  planId: string;
  comparedWith?: string; // ID of plan being compared to
  assignmentDiffs: AssignmentDiff[];
  coverageChanges: {
    totalDemands: { old: number; new: number };
    filledDemands: { old: number; new: number };
    coveragePercentage: { old: number; new: number };
  };
  summary: {
    addedAssignments: number;
    removedAssignments: number;
    modifiedAssignments: number;
  };
}

export interface PlanReviewData {
  plan: Plan;
  diff?: PlanDiff;
  impactAnalysis: {
    affectedEmployees: string[];
    affectedStations: string[];
    riskAssessment: string;
    recommendations: string[];
  };
}

export interface ExecutionStatus {
  planId: string;
  assignmentId: string;
  status: ExecutionStatusType;
  actualStartTime?: Date;
  actualEndTime?: Date;
  notes?: string;
  updatedAt: Date;
  updatedBy: string;
}

export enum ExecutionStatusType {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
  CANCELLED = 'cancelled',
  MODIFIED = 'modified'
}

export interface PlanExecutionSummary {
  planId: string;
  totalAssignments: number;
  completedAssignments: number;
  inProgressAssignments: number;
  cancelledAssignments: number;
  noShowAssignments: number;
  completionRate: number;
  onTimeRate: number;
  lastUpdated: Date;
}
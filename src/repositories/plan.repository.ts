// Plan repository for managing plan persistence and retrieval

import { BaseRepository } from './base.js';
import { Plan, PlanStatus, PlanDiff, ExecutionStatus, ExecutionStatusType } from '../types/plan.js';
import { Assignment, AssignmentStatus } from '../types/index.js';

export interface IPlanRepository extends BaseRepository<Plan> {
  findByStatus(status: PlanStatus): Promise<Plan[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Plan[]>;
  findByCreator(createdBy: string): Promise<Plan[]>;
  updateStatus(planId: string, status: PlanStatus, updatedBy: string): Promise<Plan>;
  commitPlan(planId: string, committedBy: string, effectiveDate?: Date): Promise<Plan>;
  getAssignmentsForPlan(planId: string): Promise<Assignment[]>;
  updatePlanAssignments(planId: string, assignments: Assignment[]): Promise<void>;
  createPlanFromAssignments(assignments: Assignment[], createdBy: string, metadata?: Record<string, any>): Promise<Plan>;
}

export class PlanRepository extends BaseRepository<Plan> implements IPlanRepository {
  constructor() {
    super('plans');
  }

  protected mapRowToEntity(row: any): Plan {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status as PlanStatus,
      assignments: [], // Will be loaded separately
      coverageStatus: JSON.parse(row.coverage_status || '{}'),
      violations: JSON.parse(row.violations || '[]'),
      dateRange: {
        start: this.deserializeValue(row.date_start, 'date'),
        end: this.deserializeValue(row.date_end, 'date')
      },
      createdAt: this.deserializeValue(row.created_at, 'date'),
      createdBy: row.created_by,
      updatedAt: this.deserializeValue(row.updated_at, 'date'),
      committedAt: row.committed_at ? this.deserializeValue(row.committed_at, 'date') : undefined,
      committedBy: row.committed_by,
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  protected getColumnMapping(): Record<string, string> {
    return {
      coverageStatus: 'coverage_status',
      dateRange: 'date_range',
      createdAt: 'created_at',
      createdBy: 'created_by',
      updatedAt: 'updated_at',
      committedAt: 'committed_at',
      committedBy: 'committed_by'
    };
  }

  async findByStatus(status: PlanStatus): Promise<Plan[]> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE status = ?
      ORDER BY created_at DESC
    `;
    const plans = await this.findByQuery(sql, [status]);
    
    // Load assignments for each plan
    for (const plan of plans) {
      plan.assignments = await this.getAssignmentsForPlan(plan.id);
    }
    
    return plans;
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Plan[]> {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE date_start <= ? AND date_end >= ?
      ORDER BY created_at DESC
    `;
    const plans = await this.findByQuery(sql, [endStr, startStr]);
    
    // Load assignments for each plan
    for (const plan of plans) {
      plan.assignments = await this.getAssignmentsForPlan(plan.id);
    }
    
    return plans;
  }

  async findByCreator(createdBy: string): Promise<Plan[]> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE created_by = ?
      ORDER BY created_at DESC
    `;
    const plans = await this.findByQuery(sql, [createdBy]);
    
    // Load assignments for each plan
    for (const plan of plans) {
      plan.assignments = await this.getAssignmentsForPlan(plan.id);
    }
    
    return plans;
  }

  async updateStatus(planId: string, status: PlanStatus, updatedBy: string): Promise<Plan> {
    const updateData: Partial<Plan> = {
      status,
      updatedAt: new Date()
    };

    if (status === PlanStatus.COMMITTED) {
      updateData.committedAt = new Date();
      updateData.committedBy = updatedBy;
    }

    const updated = await this.update(planId, updateData);
    updated.assignments = await this.getAssignmentsForPlan(planId);
    return updated;
  }

  async commitPlan(planId: string, committedBy: string, effectiveDate?: Date): Promise<Plan> {
    const plan = await this.updateStatus(planId, PlanStatus.COMMITTED, committedBy);
    
    // Update all approved assignments to confirmed status
    const sql = `
      UPDATE assignments 
      SET status = ?, updated_at = ?
      WHERE id IN (
        SELECT assignment_id FROM plan_assignments 
        WHERE plan_id = ?
      )
      AND status = ?
    `;
    
    await this.executeQuery(sql, [
      AssignmentStatus.CONFIRMED,
      new Date().toISOString(),
      planId,
      AssignmentStatus.PROPOSED
    ]);

    return plan;
  }

  async getAssignmentsForPlan(planId: string): Promise<Assignment[]> {
    const sql = `
      SELECT 
        a.*,
        pa.added_at as plan_added_at
      FROM assignments a
      JOIN plan_assignments pa ON a.id = pa.assignment_id
      WHERE pa.plan_id = ?
      ORDER BY a.created_at
    `;
    
    const rows = await this.executeQuery(sql, [planId]);
    return rows.map(row => ({
      id: row.id,
      demandId: row.demand_id,
      employeeId: row.employee_id,
      status: row.status as AssignmentStatus,
      score: row.score,
      explanation: row.explanation,
      createdAt: this.deserializeValue(row.created_at, 'date'),
      createdBy: row.created_by,
      updatedAt: this.deserializeValue(row.updated_at, 'date')
    }));
  }

  async updatePlanAssignments(planId: string, assignments: Assignment[]): Promise<void> {
    await this.withTransaction(async () => {
      // Remove existing plan assignments
      await this.executeQuery('DELETE FROM plan_assignments WHERE plan_id = ?', [planId]);
      
      // Add new assignments
      for (const assignment of assignments) {
        await this.executeQuery(
          'INSERT INTO plan_assignments (plan_id, assignment_id, added_at) VALUES (?, ?, ?)',
          [planId, assignment.id, new Date().toISOString()]
        );
      }
    });
  }

  async createPlanFromAssignments(
    assignments: Assignment[], 
    createdBy: string, 
    metadata?: Record<string, any>
  ): Promise<Plan> {
    // Calculate date range from assignments
    const dates = assignments.map(a => {
      // This would need to be joined with shift_demands to get actual dates
      // For now, use current date as placeholder
      return new Date();
    });
    
    const dateStart = new Date(Math.min(...dates.map(d => d.getTime())));
    const dateEnd = new Date(Math.max(...dates.map(d => d.getTime())));

    const planData = {
      id: this.generateId(),
      name: `Plan ${new Date().toISOString().split('T')[0]}`,
      status: PlanStatus.DRAFT,
      assignments: [],
      coverageStatus: {
        totalDemands: 0,
        filledDemands: assignments.length,
        coveragePercentage: 0,
        gaps: [],
        riskLevel: 'low' as any
      },
      violations: [],
      dateRange: {
        start: dateStart,
        end: dateEnd
      },
      createdAt: new Date(),
      createdBy,
      updatedAt: new Date(),
      metadata: metadata || {}
    };

    const plan = await this.create(planData);
    await this.updatePlanAssignments(plan.id, assignments);
    plan.assignments = assignments;
    
    return plan;
  }

  async findWithAssignments(planId: string): Promise<Plan | null> {
    const plan = await this.findById(planId);
    if (!plan) return null;
    
    plan.assignments = await this.getAssignmentsForPlan(planId);
    return plan;
  }

  private generateId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
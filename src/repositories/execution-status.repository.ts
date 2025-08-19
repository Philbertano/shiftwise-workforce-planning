// Execution status repository for tracking assignment execution

import { BaseRepository } from './base.js';
import { ExecutionStatus, ExecutionStatusType, PlanExecutionSummary } from '../types/plan.js';

export interface IExecutionStatusRepository extends BaseRepository<ExecutionStatus> {
  findByPlan(planId: string): Promise<ExecutionStatus[]>;
  findByAssignment(assignmentId: string): Promise<ExecutionStatus[]>;
  updateAssignmentStatus(
    assignmentId: string, 
    status: ExecutionStatusType, 
    updatedBy: string,
    notes?: string,
    actualStartTime?: Date,
    actualEndTime?: Date
  ): Promise<ExecutionStatus>;
  getPlanExecutionSummary(planId: string): Promise<PlanExecutionSummary>;
  getExecutionStats(startDate: Date, endDate: Date): Promise<{
    totalAssignments: number;
    completionRate: number;
    onTimeRate: number;
    noShowRate: number;
    byStatus: { status: ExecutionStatusType; count: number }[];
  }>;
}

export class ExecutionStatusRepository extends BaseRepository<ExecutionStatus> implements IExecutionStatusRepository {
  constructor() {
    super('execution_status');
  }

  protected mapRowToEntity(row: any): ExecutionStatus {
    return {
      planId: row.plan_id,
      assignmentId: row.assignment_id,
      status: row.status as ExecutionStatusType,
      actualStartTime: row.actual_start_time ? this.deserializeValue(row.actual_start_time, 'date') : undefined,
      actualEndTime: row.actual_end_time ? this.deserializeValue(row.actual_end_time, 'date') : undefined,
      notes: row.notes,
      updatedAt: this.deserializeValue(row.updated_at, 'date'),
      updatedBy: row.updated_by
    };
  }

  protected getColumnMapping(): Record<string, string> {
    return {
      planId: 'plan_id',
      assignmentId: 'assignment_id',
      actualStartTime: 'actual_start_time',
      actualEndTime: 'actual_end_time',
      updatedAt: 'updated_at',
      updatedBy: 'updated_by'
    };
  }

  async findByPlan(planId: string): Promise<ExecutionStatus[]> {
    const sql = `
      SELECT 
        es.*,
        a.employee_id,
        e.name as employee_name,
        sd.date,
        s.name as station_name,
        st.name as shift_name,
        st.start_time,
        st.end_time
      FROM ${this.tableName} es
      JOIN assignments a ON es.assignment_id = a.id
      JOIN employees e ON a.employee_id = e.id
      JOIN shift_demands sd ON a.demand_id = sd.id
      JOIN stations s ON sd.station_id = s.id
      JOIN shift_templates st ON sd.shift_template_id = st.id
      WHERE es.plan_id = ?
      ORDER BY sd.date, st.start_time, e.name
    `;
    return this.findByQuery(sql, [planId]);
  }

  async findByAssignment(assignmentId: string): Promise<ExecutionStatus[]> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE assignment_id = ?
      ORDER BY updated_at DESC
    `;
    return this.findByQuery(sql, [assignmentId]);
  }

  async updateAssignmentStatus(
    assignmentId: string,
    status: ExecutionStatusType,
    updatedBy: string,
    notes?: string,
    actualStartTime?: Date,
    actualEndTime?: Date
  ): Promise<ExecutionStatus> {
    // First, get the plan ID for this assignment
    const planSql = `
      SELECT pa.plan_id 
      FROM plan_assignments pa 
      WHERE pa.assignment_id = ?
      LIMIT 1
    `;
    const planResult = await this.executeQuery(planSql, [assignmentId]);
    
    if (planResult.length === 0) {
      throw new Error(`No plan found for assignment ${assignmentId}`);
    }
    
    const planId = planResult[0].plan_id;

    const executionStatus: ExecutionStatus = {
      planId,
      assignmentId,
      status,
      actualStartTime,
      actualEndTime,
      notes,
      updatedAt: new Date(),
      updatedBy
    };

    // Check if execution status already exists
    const existing = await this.findByAssignment(assignmentId);
    
    if (existing.length > 0) {
      // Update existing record
      const sql = `
        UPDATE ${this.tableName}
        SET status = ?, actual_start_time = ?, actual_end_time = ?, notes = ?, updated_at = ?, updated_by = ?
        WHERE assignment_id = ?
      `;
      
      await this.executeQuery(sql, [
        status,
        actualStartTime?.toISOString(),
        actualEndTime?.toISOString(),
        notes,
        executionStatus.updatedAt.toISOString(),
        updatedBy,
        assignmentId
      ]);
    } else {
      // Create new record
      const sql = `
        INSERT INTO ${this.tableName} (plan_id, assignment_id, status, actual_start_time, actual_end_time, notes, updated_at, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await this.executeQuery(sql, [
        planId,
        assignmentId,
        status,
        actualStartTime?.toISOString(),
        actualEndTime?.toISOString(),
        notes,
        executionStatus.updatedAt.toISOString(),
        updatedBy
      ]);
    }

    return executionStatus;
  }

  async getPlanExecutionSummary(planId: string): Promise<PlanExecutionSummary> {
    const sql = `
      SELECT 
        COUNT(*) as total_assignments,
        SUM(CASE WHEN es.status = 'completed' THEN 1 ELSE 0 END) as completed_assignments,
        SUM(CASE WHEN es.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_assignments,
        SUM(CASE WHEN es.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_assignments,
        SUM(CASE WHEN es.status = 'no_show' THEN 1 ELSE 0 END) as no_show_assignments,
        MAX(es.updated_at) as last_updated
      FROM plan_assignments pa
      LEFT JOIN ${this.tableName} es ON pa.assignment_id = es.assignment_id
      WHERE pa.plan_id = ?
    `;

    const result = await this.executeQuery(sql, [planId]);
    const row = result[0];

    const totalAssignments = row.total_assignments || 0;
    const completedAssignments = row.completed_assignments || 0;
    const inProgressAssignments = row.in_progress_assignments || 0;
    const cancelledAssignments = row.cancelled_assignments || 0;
    const noShowAssignments = row.no_show_assignments || 0;

    const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;
    
    // Calculate on-time rate (assignments that started within 15 minutes of scheduled time)
    const onTimeSql = `
      SELECT COUNT(*) as on_time_count
      FROM ${this.tableName} es
      JOIN assignments a ON es.assignment_id = a.id
      JOIN shift_demands sd ON a.demand_id = sd.id
      JOIN shift_templates st ON sd.shift_template_id = st.id
      WHERE es.plan_id = ?
      AND es.status IN ('completed', 'in_progress')
      AND es.actual_start_time IS NOT NULL
      AND ABS(
        (CAST(SUBSTR(st.start_time, 1, 2) AS INTEGER) * 60 + CAST(SUBSTR(st.start_time, 4, 2) AS INTEGER)) -
        (CAST(strftime('%H', es.actual_start_time) AS INTEGER) * 60 + CAST(strftime('%M', es.actual_start_time) AS INTEGER))
      ) <= 15
    `;

    const onTimeResult = await this.executeQuery(onTimeSql, [planId]);
    const onTimeCount = onTimeResult[0]?.on_time_count || 0;
    const startedAssignments = completedAssignments + inProgressAssignments;
    const onTimeRate = startedAssignments > 0 ? (onTimeCount / startedAssignments) * 100 : 0;

    return {
      planId,
      totalAssignments,
      completedAssignments,
      inProgressAssignments,
      cancelledAssignments,
      noShowAssignments,
      completionRate: Math.round(completionRate * 100) / 100,
      onTimeRate: Math.round(onTimeRate * 100) / 100,
      lastUpdated: row.last_updated ? this.deserializeValue(row.last_updated, 'date') : new Date()
    };
  }

  async getExecutionStats(startDate: Date, endDate: Date): Promise<{
    totalAssignments: number;
    completionRate: number;
    onTimeRate: number;
    noShowRate: number;
    byStatus: { status: ExecutionStatusType; count: number }[];
  }> {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Get overall stats
    const statsSql = `
      SELECT 
        COUNT(*) as total_assignments,
        SUM(CASE WHEN es.status = 'completed' THEN 1 ELSE 0 END) as completed_assignments,
        SUM(CASE WHEN es.status = 'no_show' THEN 1 ELSE 0 END) as no_show_assignments
      FROM ${this.tableName} es
      JOIN assignments a ON es.assignment_id = a.id
      JOIN shift_demands sd ON a.demand_id = sd.id
      WHERE sd.date BETWEEN ? AND ?
    `;

    const statsResult = await this.executeQuery(statsSql, [startStr, endStr]);
    const statsRow = statsResult[0];

    const totalAssignments = statsRow.total_assignments || 0;
    const completedAssignments = statsRow.completed_assignments || 0;
    const noShowAssignments = statsRow.no_show_assignments || 0;

    const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;
    const noShowRate = totalAssignments > 0 ? (noShowAssignments / totalAssignments) * 100 : 0;

    // Get by status breakdown
    const statusSql = `
      SELECT 
        COALESCE(es.status, 'scheduled') as status,
        COUNT(*) as count
      FROM assignments a
      JOIN shift_demands sd ON a.demand_id = sd.id
      LEFT JOIN ${this.tableName} es ON a.id = es.assignment_id
      WHERE sd.date BETWEEN ? AND ?
      AND a.status = 'confirmed'
      GROUP BY COALESCE(es.status, 'scheduled')
    `;

    const statusResult = await this.executeQuery(statusSql, [startStr, endStr]);
    const byStatus = statusResult.map(row => ({
      status: row.status as ExecutionStatusType,
      count: row.count
    }));

    // Calculate on-time rate (simplified for now)
    const onTimeRate = completionRate * 0.9; // Placeholder calculation

    return {
      totalAssignments,
      completionRate: Math.round(completionRate * 100) / 100,
      onTimeRate: Math.round(onTimeRate * 100) / 100,
      noShowRate: Math.round(noShowRate * 100) / 100,
      byStatus
    };
  }
}
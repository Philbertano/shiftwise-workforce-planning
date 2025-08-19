// Absence repository implementation

import { BaseRepository } from './base';
import { Absence, AbsenceType } from '../types';

export interface IAbsenceRepository extends BaseRepository<Absence> {
  findByEmployee(employeeId: string): Promise<Absence[]>;
  findByType(type: AbsenceType): Promise<Absence[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Absence[]>;
  findPendingApproval(): Promise<Absence[]>;
  findConflicting(employeeId: string, startDate: Date, endDate: Date): Promise<Absence[]>;
  findActiveAbsences(date?: Date): Promise<Absence[]>;
  approveAbsence(absenceId: string, approvedBy: string): Promise<Absence>;
  rejectAbsence(absenceId: string, approvedBy: string): Promise<Absence>;
}

export class AbsenceRepository extends BaseRepository<Absence> implements IAbsenceRepository {
  constructor() {
    super('absences');
  }

  protected mapRowToEntity(row: any): Absence {
    return {
      id: row.id,
      employeeId: row.employee_id,
      type: row.type as AbsenceType,
      dateStart: this.deserializeValue(row.date_start, 'date'),
      dateEnd: this.deserializeValue(row.date_end, 'date'),
      approved: this.deserializeValue(row.approved, 'boolean'),
      approvedBy: row.approved_by,
      reason: row.reason,
      createdAt: this.deserializeValue(row.created_at, 'date'),
      updatedAt: this.deserializeValue(row.updated_at, 'date')
    };
  }

  protected getColumnMapping(): Record<string, string> {
    return {
      employeeId: 'employee_id',
      dateStart: 'date_start',
      dateEnd: 'date_end',
      approvedBy: 'approved_by',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };
  }

  async findByEmployee(employeeId: string): Promise<Absence[]> {
    const sql = `
      SELECT a.*, e.name as employee_name
      FROM ${this.tableName} a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.employee_id = ?
      ORDER BY a.date_start DESC
    `;
    return this.findByQuery(sql, [employeeId]);
  }

  async findByType(type: AbsenceType): Promise<Absence[]> {
    const sql = `
      SELECT a.*, e.name as employee_name
      FROM ${this.tableName} a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.type = ?
      ORDER BY a.date_start DESC
    `;
    return this.findByQuery(sql, [type]);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Absence[]> {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    const sql = `
      SELECT a.*, e.name as employee_name
      FROM ${this.tableName} a
      JOIN employees e ON a.employee_id = e.id
      WHERE (a.date_start <= ? AND a.date_end >= ?)
      OR (a.date_start BETWEEN ? AND ?)
      OR (a.date_end BETWEEN ? AND ?)
      ORDER BY a.date_start, e.name
    `;
    return this.findByQuery(sql, [endStr, startStr, startStr, endStr, startStr, endStr]);
  }

  async findPendingApproval(): Promise<Absence[]> {
    const sql = `
      SELECT a.*, e.name as employee_name, e.team
      FROM ${this.tableName} a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.approved = 0
      ORDER BY a.created_at ASC
    `;
    return this.findByQuery(sql);
  }

  async findByApprovalStatus(approved: boolean): Promise<Absence[]> {
    const sql = `
      SELECT a.*, e.name as employee_name, e.team
      FROM ${this.tableName} a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.approved = ?
      ORDER BY a.created_at ASC
    `;
    return this.findByQuery(sql, [approved ? 1 : 0]);
  }

  async findOverlapping(employeeId: string, startDate: Date, endDate: Date): Promise<Absence[]> {
    return this.findConflicting(employeeId, startDate, endDate);
  }

  async updateApproval(absenceId: string, approved: boolean, approvedBy?: string): Promise<Absence> {
    if (approved) {
      return this.approveAbsence(absenceId, approvedBy!);
    } else {
      return this.rejectAbsence(absenceId, approvedBy!);
    }
  }

  async findConflicting(employeeId: string, startDate: Date, endDate: Date): Promise<Absence[]> {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE employee_id = ?
      AND approved = 1
      AND (
        (date_start <= ? AND date_end >= ?) OR
        (date_start BETWEEN ? AND ?) OR
        (date_end BETWEEN ? AND ?)
      )
    `;
    return this.findByQuery(sql, [employeeId, endStr, startStr, startStr, endStr, startStr, endStr]);
  }

  async findActiveAbsences(date?: Date): Promise<Absence[]> {
    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split('T')[0];
    
    const sql = `
      SELECT a.*, e.name as employee_name, e.team
      FROM ${this.tableName} a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.approved = 1
      AND a.date_start <= ?
      AND a.date_end >= ?
      AND e.active = 1
      ORDER BY e.name
    `;
    return this.findByQuery(sql, [dateStr, dateStr]);
  }

  async approveAbsence(absenceId: string, approvedBy: string): Promise<Absence> {
    const absence = await this.findById(absenceId);
    if (!absence) {
      throw new Error(`Absence ${absenceId} not found`);
    }

    if (absence.approved) {
      throw new Error(`Absence ${absenceId} is already approved`);
    }

    return this.update(absenceId, {
      approved: true,
      approvedBy,
      updatedAt: new Date()
    });
  }

  async rejectAbsence(absenceId: string, approvedBy: string): Promise<Absence> {
    // For rejection, we could either delete the record or mark it as rejected
    // Here we'll delete it, but in production you might want a 'rejected' status
    await this.delete(absenceId);
    
    // Return the original absence for reference
    const absence = await this.findById(absenceId);
    if (!absence) {
      throw new Error(`Absence ${absenceId} not found after rejection`);
    }
    
    return absence;
  }

  async getAbsenceStats(startDate: Date, endDate: Date): Promise<{
    totalAbsences: number;
    byType: { type: AbsenceType; count: number; days: number }[];
    byEmployee: { employeeId: string; employeeName: string; count: number; days: number }[];
    pendingApproval: number;
    avgDuration: number;
  }> {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    // Total absences and average duration
    const totalSql = `
      SELECT 
        COUNT(*) as count,
        AVG(julianday(date_end) - julianday(date_start) + 1) as avg_duration
      FROM ${this.tableName}
      WHERE approved = 1
      AND date_start <= ? AND date_end >= ?
    `;
    
    const totalResult = await this.executeQuery(totalSql, [endStr, startStr]);
    const totalAbsences = totalResult[0]?.count || 0;
    const avgDuration = Math.round((totalResult[0]?.avg_duration || 0) * 100) / 100;

    // By type
    const typeSql = `
      SELECT 
        type,
        COUNT(*) as count,
        SUM(julianday(date_end) - julianday(date_start) + 1) as total_days
      FROM ${this.tableName}
      WHERE approved = 1
      AND date_start <= ? AND date_end >= ?
      GROUP BY type
      ORDER BY count DESC
    `;
    
    const typeResult = await this.executeQuery(typeSql, [endStr, startStr]);
    const byType = typeResult.map(row => ({
      type: row.type as AbsenceType,
      count: row.count,
      days: Math.round(row.total_days)
    }));

    // By employee
    const employeeSql = `
      SELECT 
        a.employee_id,
        e.name as employee_name,
        COUNT(*) as count,
        SUM(julianday(a.date_end) - julianday(a.date_start) + 1) as total_days
      FROM ${this.tableName} a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.approved = 1
      AND a.date_start <= ? AND a.date_end >= ?
      GROUP BY a.employee_id, e.name
      ORDER BY count DESC
    `;
    
    const employeeResult = await this.executeQuery(employeeSql, [endStr, startStr]);
    const byEmployee = employeeResult.map(row => ({
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      count: row.count,
      days: Math.round(row.total_days)
    }));

    // Pending approval
    const pendingResult = await this.executeQuery(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE approved = 0`
    );
    const pendingApproval = pendingResult[0]?.count || 0;

    return {
      totalAbsences,
      byType,
      byEmployee,
      pendingApproval,
      avgDuration
    };
  }

  async getUpcomingAbsences(days: number = 30): Promise<Absence[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    
    const todayStr = today.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];
    
    const sql = `
      SELECT a.*, e.name as employee_name, e.team
      FROM ${this.tableName} a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.approved = 1
      AND a.date_start BETWEEN ? AND ?
      AND e.active = 1
      ORDER BY a.date_start, e.name
    `;
    
    return this.findByQuery(sql, [todayStr, futureStr]);
  }

  async checkAbsenceImpact(employeeId: string, startDate: Date, endDate: Date): Promise<{
    conflictingAssignments: number;
    affectedStations: string[];
    impactLevel: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    // Find conflicting assignments
    const assignmentSql = `
      SELECT 
        COUNT(*) as count,
        COUNT(DISTINCT sd.station_id) as station_count,
        GROUP_CONCAT(DISTINCT s.name) as station_names
      FROM assignments a
      JOIN shift_demands sd ON a.demand_id = sd.id
      JOIN stations s ON sd.station_id = s.id
      WHERE a.employee_id = ?
      AND a.status IN ('proposed', 'confirmed')
      AND sd.date BETWEEN ? AND ?
    `;
    
    const result = await this.executeQuery(assignmentSql, [employeeId, startStr, endStr]);
    const conflictingAssignments = result[0]?.count || 0;
    const stationCount = result[0]?.station_count || 0;
    const affectedStations = result[0]?.station_names ? result[0].station_names.split(',') : [];
    
    // Determine impact level
    let impactLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (conflictingAssignments === 0) {
      impactLevel = 'low';
    } else if (conflictingAssignments <= 2 && stationCount <= 1) {
      impactLevel = 'medium';
    } else if (conflictingAssignments <= 5 && stationCount <= 2) {
      impactLevel = 'high';
    } else {
      impactLevel = 'critical';
    }
    
    return {
      conflictingAssignments,
      affectedStations,
      impactLevel
    };
  }
}
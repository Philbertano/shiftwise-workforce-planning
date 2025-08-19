// Assignment repository implementation

import { BaseRepository } from './base';
import { Assignment, AssignmentStatus } from '../types';

export interface IAssignmentRepository extends BaseRepository<Assignment> {
  findByEmployee(employeeId: string): Promise<Assignment[]>;
  findByDemand(demandId: string): Promise<Assignment[]>;
  findByStatus(status: AssignmentStatus): Promise<Assignment[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Assignment[]>;
  findConflicting(employeeId: string, date: Date, shiftStart: string, shiftEnd: string): Promise<Assignment[]>;
  getEmployeeSchedule(employeeId: string, startDate: Date, endDate: Date): Promise<{
    date: Date;
    assignments: Assignment[];
    totalHours: number;
  }[]>;
  commitAssignments(assignmentIds: string[], userId: string): Promise<Assignment[]>;
}

export class AssignmentRepository extends BaseRepository<Assignment> implements IAssignmentRepository {
  constructor() {
    super('assignments');
  }

  protected mapRowToEntity(row: any): Assignment {
    return {
      id: row.id,
      demandId: row.demand_id,
      employeeId: row.employee_id,
      status: row.status as AssignmentStatus,
      score: row.score,
      explanation: row.explanation,
      createdAt: this.deserializeValue(row.created_at, 'date'),
      createdBy: row.created_by,
      updatedAt: this.deserializeValue(row.updated_at, 'date')
    };
  }

  protected getColumnMapping(): Record<string, string> {
    return {
      demandId: 'demand_id',
      employeeId: 'employee_id',
      createdBy: 'created_by',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };
  }

  async findByEmployee(employeeId: string): Promise<Assignment[]> {
    const sql = `
      SELECT 
        a.*,
        sd.date,
        s.name as station_name,
        st.name as shift_name,
        st.start_time,
        st.end_time
      FROM ${this.tableName} a
      JOIN shift_demands sd ON a.demand_id = sd.id
      JOIN stations s ON sd.station_id = s.id
      JOIN shift_templates st ON sd.shift_template_id = st.id
      WHERE a.employee_id = ?
      ORDER BY sd.date DESC, st.start_time
    `;
    return this.findByQuery(sql, [employeeId]);
  }

  async findByDemand(demandId: string): Promise<Assignment[]> {
    const sql = `
      SELECT 
        a.*,
        e.name as employee_name
      FROM ${this.tableName} a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.demand_id = ?
      ORDER BY a.score DESC, e.name
    `;
    return this.findByQuery(sql, [demandId]);
  }

  async findByStatus(status: AssignmentStatus): Promise<Assignment[]> {
    const sql = `
      SELECT 
        a.*,
        e.name as employee_name,
        sd.date,
        s.name as station_name,
        st.name as shift_name
      FROM ${this.tableName} a
      JOIN employees e ON a.employee_id = e.id
      JOIN shift_demands sd ON a.demand_id = sd.id
      JOIN stations s ON sd.station_id = s.id
      JOIN shift_templates st ON sd.shift_template_id = st.id
      WHERE a.status = ?
      ORDER BY sd.date DESC, s.name
    `;
    return this.findByQuery(sql, [status]);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Assignment[]> {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    const sql = `
      SELECT 
        a.*,
        e.name as employee_name,
        sd.date,
        s.name as station_name,
        st.name as shift_name,
        st.start_time,
        st.end_time
      FROM ${this.tableName} a
      JOIN employees e ON a.employee_id = e.id
      JOIN shift_demands sd ON a.demand_id = sd.id
      JOIN stations s ON sd.station_id = s.id
      JOIN shift_templates st ON sd.shift_template_id = st.id
      WHERE sd.date BETWEEN ? AND ?
      ORDER BY sd.date, e.name, st.start_time
    `;
    return this.findByQuery(sql, [startStr, endStr]);
  }

  async findConflicting(employeeId: string, date: Date, shiftStart: string, shiftEnd: string): Promise<Assignment[]> {
    const dateStr = date.toISOString().split('T')[0];
    
    const sql = `
      SELECT 
        a.*,
        sd.date,
        s.name as station_name,
        st.name as shift_name,
        st.start_time,
        st.end_time
      FROM ${this.tableName} a
      JOIN shift_demands sd ON a.demand_id = sd.id
      JOIN stations s ON sd.station_id = s.id
      JOIN shift_templates st ON sd.shift_template_id = st.id
      WHERE a.employee_id = ?
      AND a.status IN ('proposed', 'confirmed')
      AND sd.date = ?
      AND (
        (st.start_time <= ? AND st.end_time > ?) OR
        (st.start_time < ? AND st.end_time >= ?) OR
        (st.start_time >= ? AND st.end_time <= ?)
      )
    `;
    
    return this.findByQuery(sql, [
      employeeId, dateStr,
      shiftStart, shiftStart,
      shiftEnd, shiftEnd,
      shiftStart, shiftEnd
    ]);
  }

  async getEmployeeSchedule(employeeId: string, startDate: Date, endDate: Date): Promise<{
    date: Date;
    assignments: Assignment[];
    totalHours: number;
  }[]> {
    const assignments = await this.findByDateRange(startDate, endDate);
    const employeeAssignments = assignments.filter(a => a.employeeId === employeeId);
    
    // Group by date
    const scheduleMap = new Map<string, Assignment[]>();
    
    employeeAssignments.forEach(assignment => {
      const dateKey = (assignment as any).date;
      if (!scheduleMap.has(dateKey)) {
        scheduleMap.set(dateKey, []);
      }
      scheduleMap.get(dateKey)!.push(assignment);
    });
    
    // Calculate hours for each day
    const schedule = Array.from(scheduleMap.entries()).map(([dateStr, dayAssignments]) => {
      const totalHours = dayAssignments.reduce((total, assignment) => {
        const startTime = (assignment as any).start_time;
        const endTime = (assignment as any).end_time;
        
        if (startTime && endTime) {
          const startMinutes = this.timeToMinutes(startTime);
          const endMinutes = this.timeToMinutes(endTime);
          let duration = endMinutes - startMinutes;
          
          if (duration < 0) {
            duration += 24 * 60; // Handle overnight shifts
          }
          
          return total + (duration / 60);
        }
        
        return total;
      }, 0);
      
      return {
        date: new Date(dateStr),
        assignments: dayAssignments,
        totalHours: Math.round(totalHours * 100) / 100
      };
    });
    
    return schedule.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async commitAssignments(assignmentIds: string[], userId: string): Promise<Assignment[]> {
    if (assignmentIds.length === 0) {
      return [];
    }

    const results: Assignment[] = [];
    
    await this.withTransaction(async (ctx) => {
      for (const assignmentId of assignmentIds) {
        const assignment = await this.findById(assignmentId);
        if (!assignment) {
          throw new Error(`Assignment ${assignmentId} not found`);
        }

        if (assignment.status !== AssignmentStatus.PROPOSED) {
          throw new Error(`Assignment ${assignmentId} is not in proposed status`);
        }

        const updatedAssignment = await this.update(assignmentId, {
          status: AssignmentStatus.CONFIRMED,
          updatedAt: new Date()
        });

        results.push(updatedAssignment);
      }
    });

    return results;
  }

  async getAssignmentStats(startDate: Date, endDate: Date): Promise<{
    totalAssignments: number;
    byStatus: { status: AssignmentStatus; count: number }[];
    byEmployee: { employeeId: string; employeeName: string; count: number; totalHours: number }[];
    avgScore: number;
  }> {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    // Total assignments
    const totalSql = `
      SELECT COUNT(*) as count, AVG(score) as avg_score
      FROM ${this.tableName} a
      JOIN shift_demands sd ON a.demand_id = sd.id
      WHERE sd.date BETWEEN ? AND ?
    `;
    
    const totalResult = await this.executeQuery(totalSql, [startStr, endStr]);
    const totalAssignments = totalResult[0]?.count || 0;
    const avgScore = Math.round((totalResult[0]?.avg_score || 0) * 100) / 100;

    // By status
    const statusSql = `
      SELECT a.status, COUNT(*) as count
      FROM ${this.tableName} a
      JOIN shift_demands sd ON a.demand_id = sd.id
      WHERE sd.date BETWEEN ? AND ?
      GROUP BY a.status
    `;
    
    const statusResult = await this.executeQuery(statusSql, [startStr, endStr]);
    const byStatus = statusResult.map(row => ({
      status: row.status as AssignmentStatus,
      count: row.count
    }));

    // By employee
    const employeeSql = `
      SELECT 
        a.employee_id,
        e.name as employee_name,
        COUNT(*) as count,
        SUM(
          CASE 
            WHEN st.end_time > st.start_time THEN
              (CAST(SUBSTR(st.end_time, 1, 2) AS INTEGER) * 60 + CAST(SUBSTR(st.end_time, 4, 2) AS INTEGER)) -
              (CAST(SUBSTR(st.start_time, 1, 2) AS INTEGER) * 60 + CAST(SUBSTR(st.start_time, 4, 2) AS INTEGER))
            ELSE
              (CAST(SUBSTR(st.end_time, 1, 2) AS INTEGER) * 60 + CAST(SUBSTR(st.end_time, 4, 2) AS INTEGER) + 1440) -
              (CAST(SUBSTR(st.start_time, 1, 2) AS INTEGER) * 60 + CAST(SUBSTR(st.start_time, 4, 2) AS INTEGER))
          END
        ) / 60.0 as total_hours
      FROM ${this.tableName} a
      JOIN employees e ON a.employee_id = e.id
      JOIN shift_demands sd ON a.demand_id = sd.id
      JOIN shift_templates st ON sd.shift_template_id = st.id
      WHERE sd.date BETWEEN ? AND ?
      AND a.status IN ('proposed', 'confirmed')
      GROUP BY a.employee_id, e.name
      ORDER BY count DESC
    `;
    
    const employeeResult = await this.executeQuery(employeeSql, [startStr, endStr]);
    const byEmployee = employeeResult.map(row => ({
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      count: row.count,
      totalHours: Math.round((row.total_hours || 0) * 100) / 100
    }));

    return {
      totalAssignments,
      byStatus,
      byEmployee,
      avgScore
    };
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  async findOverlappingAssignments(employeeId: string, date: Date): Promise<Assignment[]> {
    const dateStr = date.toISOString().split('T')[0];
    
    const sql = `
      SELECT 
        a1.*,
        sd1.date,
        s1.name as station_name,
        st1.name as shift_name,
        st1.start_time,
        st1.end_time
      FROM ${this.tableName} a1
      JOIN shift_demands sd1 ON a1.demand_id = sd1.id
      JOIN stations s1 ON sd1.station_id = s1.id
      JOIN shift_templates st1 ON sd1.shift_template_id = st1.id
      WHERE a1.employee_id = ?
      AND a1.status IN ('proposed', 'confirmed')
      AND sd1.date = ?
      AND EXISTS (
        SELECT 1 FROM ${this.tableName} a2
        JOIN shift_demands sd2 ON a2.demand_id = sd2.id
        JOIN shift_templates st2 ON sd2.shift_template_id = st2.id
        WHERE a2.employee_id = a1.employee_id
        AND a2.id != a1.id
        AND a2.status IN ('proposed', 'confirmed')
        AND sd2.date = sd1.date
        AND (
          (st1.start_time < st2.end_time AND st1.end_time > st2.start_time)
        )
      )
      ORDER BY st1.start_time
    `;
    
    return this.findByQuery(sql, [employeeId, dateStr]);
  }
}
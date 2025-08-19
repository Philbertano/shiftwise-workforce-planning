// Employee repository implementation

import { BaseRepository } from './base';
import { Employee, ContractType, EmployeePreferences } from '../types';

export interface IEmployeeRepository extends BaseRepository<Employee> {
  findByTeam(team: string): Promise<Employee[]>;
  findActive(): Promise<Employee[]>;
  findByContractType(contractType: ContractType): Promise<Employee[]>;
  findAvailable(date: Date, shiftStart: string, shiftEnd: string): Promise<Employee[]>;
}

export class EmployeeRepository extends BaseRepository<Employee> implements IEmployeeRepository {
  constructor() {
    super('employees');
  }

  protected mapRowToEntity(row: any): Employee {
    return {
      id: row.id,
      name: row.name,
      contractType: row.contract_type as ContractType,
      weeklyHours: row.weekly_hours,
      maxHoursPerDay: row.max_hours_per_day,
      minRestHours: row.min_rest_hours,
      team: row.team,
      active: Boolean(row.active),
      preferences: this.deserializeValue(row.preferences, 'json') as EmployeePreferences,
      createdAt: this.deserializeValue(row.created_at, 'date'),
      updatedAt: this.deserializeValue(row.updated_at, 'date')
    };
  }

  protected getColumnMapping(): Record<string, string> {
    return {
      contractType: 'contract_type',
      weeklyHours: 'weekly_hours',
      maxHoursPerDay: 'max_hours_per_day',
      minRestHours: 'min_rest_hours',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };
  }

  async findByTeam(team: string): Promise<Employee[]> {
    const sql = `SELECT * FROM ${this.tableName} WHERE team = ? AND active = 1 ORDER BY name`;
    const rows = await this.executeQuery(sql, [team]);
    return rows.map(row => this.mapRowToEntity(row));
  }

  async findActive(): Promise<Employee[]> {
    const sql = `SELECT * FROM ${this.tableName} WHERE active = 1 ORDER BY name`;
    const rows = await this.executeQuery(sql);
    return rows.map(row => this.mapRowToEntity(row));
  }

  async findByContractType(contractType: ContractType): Promise<Employee[]> {
    const sql = `SELECT * FROM ${this.tableName} WHERE contract_type = ? AND active = 1 ORDER BY name`;
    const rows = await this.executeQuery(sql, [contractType]);
    return rows.map(row => this.mapRowToEntity(row));
  }

  async findAvailable(date: Date, shiftStart: string, shiftEnd: string): Promise<Employee[]> {
    // Find employees who are not on absence and don't have conflicting assignments
    const sql = `
      SELECT e.* FROM ${this.tableName} e
      WHERE e.active = 1
      AND e.id NOT IN (
        -- Exclude employees on absence
        SELECT DISTINCT a.employee_id 
        FROM absences a 
        WHERE a.approved = 1 
        AND ? BETWEEN a.date_start AND a.date_end
      )
      AND e.id NOT IN (
        -- Exclude employees with conflicting assignments
        SELECT DISTINCT ass.employee_id
        FROM assignments ass
        JOIN shift_demands sd ON ass.demand_id = sd.id
        JOIN shift_templates st ON sd.shift_template_id = st.id
        WHERE ass.status IN ('proposed', 'confirmed')
        AND sd.date = ?
        AND (
          (st.start_time <= ? AND st.end_time > ?) OR
          (st.start_time < ? AND st.end_time >= ?) OR
          (st.start_time >= ? AND st.end_time <= ?)
        )
      )
      ORDER BY e.name
    `;
    
    const dateStr = date.toISOString().split('T')[0];
    const rows = await this.executeQuery(sql, [
      dateStr, dateStr, 
      shiftStart, shiftStart,
      shiftEnd, shiftEnd,
      shiftStart, shiftEnd
    ]);
    
    return rows.map(row => this.mapRowToEntity(row));
  }

  async getEmployeeWorkload(employeeId: string, weekStart: Date): Promise<{
    weeklyHours: number;
    consecutiveDays: number;
    lastShiftEnd?: Date;
  }> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Calculate weekly hours
    const weeklyHoursSql = `
      SELECT COALESCE(SUM(
        (CAST(SUBSTR(st.end_time, 1, 2) AS INTEGER) * 60 + CAST(SUBSTR(st.end_time, 4, 2) AS INTEGER)) -
        (CAST(SUBSTR(st.start_time, 1, 2) AS INTEGER) * 60 + CAST(SUBSTR(st.start_time, 4, 2) AS INTEGER))
      ) / 60.0, 0) as weekly_hours
      FROM assignments a
      JOIN shift_demands sd ON a.demand_id = sd.id
      JOIN shift_templates st ON sd.shift_template_id = st.id
      WHERE a.employee_id = ?
      AND a.status IN ('confirmed', 'proposed')
      AND sd.date BETWEEN ? AND ?
    `;

    const weeklyResult = await this.executeQuery(weeklyHoursSql, [
      employeeId,
      weekStart.toISOString().split('T')[0],
      weekEnd.toISOString().split('T')[0]
    ]);

    // Calculate consecutive days (simplified - looking back 14 days)
    const lookbackDate = new Date(weekStart);
    lookbackDate.setDate(lookbackDate.getDate() - 14);

    const consecutiveSql = `
      SELECT sd.date
      FROM assignments a
      JOIN shift_demands sd ON a.demand_id = sd.id
      WHERE a.employee_id = ?
      AND a.status IN ('confirmed', 'proposed')
      AND sd.date >= ?
      ORDER BY sd.date DESC
    `;

    const consecutiveResult = await this.executeQuery(consecutiveSql, [
      employeeId,
      lookbackDate.toISOString().split('T')[0]
    ]);

    // Count consecutive days from most recent
    let consecutiveDays = 0;
    let lastDate: Date | null = null;

    for (const row of consecutiveResult) {
      const currentDate = new Date(row.date);
      
      if (lastDate === null) {
        consecutiveDays = 1;
        lastDate = currentDate;
      } else {
        const dayDiff = Math.abs((lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff === 1) {
          consecutiveDays++;
          lastDate = currentDate;
        } else {
          break;
        }
      }
    }

    return {
      weeklyHours: weeklyResult[0]?.weekly_hours || 0,
      consecutiveDays,
      lastShiftEnd: lastDate || undefined
    };
  }
}
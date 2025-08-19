// Shift demand repository implementation

import { BaseRepository } from './base';
import { ShiftDemand, Priority } from '../types';

export interface IShiftDemandRepository extends BaseRepository<ShiftDemand> {
  findByDate(date: Date): Promise<ShiftDemand[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<ShiftDemand[]>;
  findByStation(stationId: string): Promise<ShiftDemand[]>;
  findByShiftTemplate(shiftTemplateId: string): Promise<ShiftDemand[]>;
  findByPriority(priority: Priority): Promise<ShiftDemand[]>;
  findUnfilled(date?: Date): Promise<ShiftDemand[]>;
  getDemandSummary(startDate: Date, endDate: Date): Promise<{
    totalDemands: number;
    totalPositions: number;
    byPriority: { priority: Priority; count: number; positions: number }[];
    byStation: { stationId: string; stationName: string; count: number; positions: number }[];
  }>;
}

export class ShiftDemandRepository extends BaseRepository<ShiftDemand> implements IShiftDemandRepository {
  constructor() {
    super('shift_demands');
  }

  protected mapRowToEntity(row: any): ShiftDemand {
    return {
      id: row.id,
      date: this.deserializeValue(row.date, 'date'),
      stationId: row.station_id,
      shiftTemplateId: row.shift_template_id,
      requiredCount: row.required_count,
      priority: row.priority as Priority,
      notes: row.notes,
      createdAt: this.deserializeValue(row.created_at, 'date'),
      updatedAt: this.deserializeValue(row.updated_at, 'date')
    };
  }

  protected getColumnMapping(): Record<string, string> {
    return {
      stationId: 'station_id',
      shiftTemplateId: 'shift_template_id',
      requiredCount: 'required_count',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };
  }

  async findByDate(date: Date): Promise<ShiftDemand[]> {
    const dateStr = date.toISOString().split('T')[0];
    const sql = `
      SELECT sd.*, s.name as station_name, st.name as shift_name
      FROM ${this.tableName} sd
      JOIN stations s ON sd.station_id = s.id
      JOIN shift_templates st ON sd.shift_template_id = st.id
      WHERE sd.date = ?
      ORDER BY s.name, st.start_time
    `;
    return this.findByQuery(sql, [dateStr]);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<ShiftDemand[]> {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    const sql = `
      SELECT sd.*, s.name as station_name, st.name as shift_name
      FROM ${this.tableName} sd
      JOIN stations s ON sd.station_id = s.id
      JOIN shift_templates st ON sd.shift_template_id = st.id
      WHERE sd.date BETWEEN ? AND ?
      ORDER BY sd.date, s.name, st.start_time
    `;
    return this.findByQuery(sql, [startStr, endStr]);
  }

  async findByStation(stationId: string): Promise<ShiftDemand[]> {
    const sql = `
      SELECT sd.*, st.name as shift_name, st.start_time, st.end_time
      FROM ${this.tableName} sd
      JOIN shift_templates st ON sd.shift_template_id = st.id
      WHERE sd.station_id = ?
      ORDER BY sd.date DESC, st.start_time
    `;
    return this.findByQuery(sql, [stationId]);
  }

  async findByShiftTemplate(shiftTemplateId: string): Promise<ShiftDemand[]> {
    const sql = `
      SELECT sd.*, s.name as station_name
      FROM ${this.tableName} sd
      JOIN stations s ON sd.station_id = s.id
      WHERE sd.shift_template_id = ?
      ORDER BY sd.date DESC, s.name
    `;
    return this.findByQuery(sql, [shiftTemplateId]);
  }

  async findByPriority(priority: Priority): Promise<ShiftDemand[]> {
    const sql = `
      SELECT sd.*, s.name as station_name, st.name as shift_name
      FROM ${this.tableName} sd
      JOIN stations s ON sd.station_id = s.id
      JOIN shift_templates st ON sd.shift_template_id = st.id
      WHERE sd.priority = ?
      ORDER BY sd.date DESC, s.name
    `;
    return this.findByQuery(sql, [priority]);
  }

  async findUnfilled(date?: Date): Promise<ShiftDemand[]> {
    let sql = `
      SELECT 
        sd.*,
        s.name as station_name,
        st.name as shift_name,
        st.start_time,
        st.end_time,
        COALESCE(assigned.count, 0) as assigned_count,
        (sd.required_count - COALESCE(assigned.count, 0)) as unfilled_count
      FROM ${this.tableName} sd
      JOIN stations s ON sd.station_id = s.id
      JOIN shift_templates st ON sd.shift_template_id = st.id
      LEFT JOIN (
        SELECT 
          demand_id, 
          COUNT(*) as count
        FROM assignments 
        WHERE status IN ('proposed', 'confirmed')
        GROUP BY demand_id
      ) assigned ON sd.id = assigned.demand_id
      WHERE sd.required_count > COALESCE(assigned.count, 0)
    `;
    
    const params: any[] = [];
    
    if (date) {
      sql += ` AND sd.date = ?`;
      params.push(date.toISOString().split('T')[0]);
    }
    
    sql += ` ORDER BY sd.priority DESC, sd.date, s.name`;
    
    return this.findByQuery(sql, params);
  }

  async getDemandSummary(startDate: Date, endDate: Date): Promise<{
    totalDemands: number;
    totalPositions: number;
    byPriority: { priority: Priority; count: number; positions: number }[];
    byStation: { stationId: string; stationName: string; count: number; positions: number }[];
  }> {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    // Get total summary
    const totalSql = `
      SELECT 
        COUNT(*) as total_demands,
        SUM(required_count) as total_positions
      FROM ${this.tableName}
      WHERE date BETWEEN ? AND ?
    `;
    
    const totalResult = await this.executeQuery(totalSql, [startStr, endStr]);
    const totalDemands = totalResult[0]?.total_demands || 0;
    const totalPositions = totalResult[0]?.total_positions || 0;

    // Get by priority
    const prioritySql = `
      SELECT 
        priority,
        COUNT(*) as count,
        SUM(required_count) as positions
      FROM ${this.tableName}
      WHERE date BETWEEN ? AND ?
      GROUP BY priority
      ORDER BY 
        CASE priority 
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END
    `;
    
    const priorityResult = await this.executeQuery(prioritySql, [startStr, endStr]);
    const byPriority = priorityResult.map(row => ({
      priority: row.priority as Priority,
      count: row.count,
      positions: row.positions
    }));

    // Get by station
    const stationSql = `
      SELECT 
        sd.station_id,
        s.name as station_name,
        COUNT(*) as count,
        SUM(sd.required_count) as positions
      FROM ${this.tableName} sd
      JOIN stations s ON sd.station_id = s.id
      WHERE sd.date BETWEEN ? AND ?
      GROUP BY sd.station_id, s.name
      ORDER BY positions DESC
    `;
    
    const stationResult = await this.executeQuery(stationSql, [startStr, endStr]);
    const byStation = stationResult.map(row => ({
      stationId: row.station_id,
      stationName: row.station_name,
      count: row.count,
      positions: row.positions
    }));

    return {
      totalDemands,
      totalPositions,
      byPriority,
      byStation
    };
  }

  async getCoverageStatus(date: Date): Promise<{
    demandId: string;
    stationName: string;
    shiftName: string;
    requiredCount: number;
    assignedCount: number;
    coveragePercentage: number;
    priority: Priority;
  }[]> {
    const dateStr = date.toISOString().split('T')[0];
    
    const sql = `
      SELECT 
        sd.id as demand_id,
        s.name as station_name,
        st.name as shift_name,
        sd.required_count,
        COALESCE(assigned.count, 0) as assigned_count,
        sd.priority,
        ROUND((COALESCE(assigned.count, 0) * 100.0 / sd.required_count), 2) as coverage_percentage
      FROM ${this.tableName} sd
      JOIN stations s ON sd.station_id = s.id
      JOIN shift_templates st ON sd.shift_template_id = st.id
      LEFT JOIN (
        SELECT 
          demand_id, 
          COUNT(*) as count
        FROM assignments 
        WHERE status IN ('proposed', 'confirmed')
        GROUP BY demand_id
      ) assigned ON sd.id = assigned.demand_id
      WHERE sd.date = ?
      ORDER BY coverage_percentage ASC, sd.priority DESC
    `;
    
    const rows = await this.executeQuery(sql, [dateStr]);
    
    return rows.map(row => ({
      demandId: row.demand_id,
      stationName: row.station_name,
      shiftName: row.shift_name,
      requiredCount: row.required_count,
      assignedCount: row.assigned_count,
      coveragePercentage: row.coverage_percentage,
      priority: row.priority as Priority
    }));
  }

  async getWeeklyDemandPattern(): Promise<{
    dayOfWeek: number;
    dayName: string;
    avgDemands: number;
    avgPositions: number;
  }[]> {
    // This is a simplified version - in production you'd want more sophisticated date handling
    const sql = `
      SELECT 
        CAST(strftime('%w', date) AS INTEGER) as day_of_week,
        COUNT(*) as total_demands,
        SUM(required_count) as total_positions,
        COUNT(DISTINCT date) as unique_dates
      FROM ${this.tableName}
      WHERE date >= date('now', '-30 days')
      GROUP BY CAST(strftime('%w', date) AS INTEGER)
      ORDER BY day_of_week
    `;
    
    const rows = await this.executeQuery(sql);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return rows.map(row => ({
      dayOfWeek: row.day_of_week,
      dayName: dayNames[row.day_of_week],
      avgDemands: Math.round((row.total_demands / row.unique_dates) * 100) / 100,
      avgPositions: Math.round((row.total_positions / row.unique_dates) * 100) / 100
    }));
  }
}
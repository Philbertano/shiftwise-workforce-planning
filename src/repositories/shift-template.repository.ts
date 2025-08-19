// Shift template repository implementation

import { BaseRepository } from './base';
import { ShiftTemplate, ShiftType, BreakRule } from '../types';

export interface IShiftTemplateRepository extends BaseRepository<ShiftTemplate> {
  findByType(shiftType: ShiftType): Promise<ShiftTemplate[]>;
  findByName(name: string): Promise<ShiftTemplate | null>;
  findByTimeRange(startTime: string, endTime: string): Promise<ShiftTemplate[]>;
  findOverlapping(startTime: string, endTime: string): Promise<ShiftTemplate[]>;
}

export class ShiftTemplateRepository extends BaseRepository<ShiftTemplate> implements IShiftTemplateRepository {
  constructor() {
    super('shift_templates');
  }

  protected mapRowToEntity(row: any): ShiftTemplate {
    return {
      id: row.id,
      name: row.name,
      startTime: row.start_time,
      endTime: row.end_time,
      breakRules: this.deserializeValue(row.break_rules, 'json') as BreakRule[],
      shiftType: row.shift_type as ShiftType,
      createdAt: this.deserializeValue(row.created_at, 'date'),
      updatedAt: this.deserializeValue(row.updated_at, 'date')
    };
  }

  protected getColumnMapping(): Record<string, string> {
    return {
      startTime: 'start_time',
      endTime: 'end_time',
      breakRules: 'break_rules',
      shiftType: 'shift_type',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };
  }

  async findByType(shiftType: ShiftType): Promise<ShiftTemplate[]> {
    const sql = `SELECT * FROM ${this.tableName} WHERE shift_type = ? ORDER BY start_time`;
    return this.findByQuery(sql, [shiftType]);
  }

  async findByName(name: string): Promise<ShiftTemplate | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE name = ? LIMIT 1`;
    return this.findOneByQuery(sql, [name]);
  }

  async findByTimeRange(startTime: string, endTime: string): Promise<ShiftTemplate[]> {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE start_time >= ? AND end_time <= ? 
      ORDER BY start_time
    `;
    return this.findByQuery(sql, [startTime, endTime]);
  }

  async findOverlapping(startTime: string, endTime: string): Promise<ShiftTemplate[]> {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE (start_time < ? AND end_time > ?) 
      OR (start_time < ? AND end_time > ?)
      OR (start_time >= ? AND end_time <= ?)
      ORDER BY start_time
    `;
    return this.findByQuery(sql, [endTime, startTime, startTime, endTime, startTime, endTime]);
  }

  async getShiftDuration(id: string): Promise<number> {
    const template = await this.findById(id);
    if (!template) {
      throw new Error(`Shift template ${id} not found`);
    }

    const startMinutes = this.timeToMinutes(template.startTime);
    const endMinutes = this.timeToMinutes(template.endTime);
    
    // Handle overnight shifts
    let duration = endMinutes - startMinutes;
    if (duration < 0) {
      duration += 24 * 60; // Add 24 hours
    }

    // Subtract break time
    const totalBreakTime = template.breakRules.reduce((total, rule) => total + rule.duration, 0);
    
    return duration - totalBreakTime;
  }

  async getShiftsByDuration(minMinutes: number, maxMinutes: number): Promise<ShiftTemplate[]> {
    const templates = await this.findAll();
    
    return templates.filter(template => {
      const startMinutes = this.timeToMinutes(template.startTime);
      const endMinutes = this.timeToMinutes(template.endTime);
      
      let duration = endMinutes - startMinutes;
      if (duration < 0) {
        duration += 24 * 60;
      }

      const totalBreakTime = template.breakRules.reduce((total, rule) => total + rule.duration, 0);
      const workingDuration = duration - totalBreakTime;
      
      return workingDuration >= minMinutes && workingDuration <= maxMinutes;
    });
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  async getTypeSummary(): Promise<{ type: ShiftType; count: number; avgDuration: number }[]> {
    const sql = `
      SELECT shift_type, COUNT(*) as count
      FROM ${this.tableName}
      GROUP BY shift_type
      ORDER BY shift_type
    `;
    
    const rows = await this.executeQuery(sql);
    const results = [];
    
    for (const row of rows) {
      const templates = await this.findByType(row.shift_type as ShiftType);
      const totalDuration = await Promise.all(
        templates.map(t => this.getShiftDuration(t.id))
      );
      
      const avgDuration = totalDuration.reduce((sum, duration) => sum + duration, 0) / totalDuration.length;
      
      results.push({
        type: row.shift_type as ShiftType,
        count: row.count,
        avgDuration: Math.round(avgDuration)
      });
    }
    
    return results;
  }
}
import { BaseRepository } from './base.js';
import { ShiftStaffingRequirement } from '../models/ShiftStaffingRequirement.js';
import { Priority } from '../types/index.js';

export class ShiftStaffingRequirementRepository extends BaseRepository<ShiftStaffingRequirement> {
  constructor() {
    super('shift_staffing_requirements');
  }

  protected mapRowToEntity(row: any): ShiftStaffingRequirement {
    return new ShiftStaffingRequirement({
      id: row.id,
      stationId: row.station_id,
      shiftTemplateId: row.shift_template_id,
      minEmployees: row.min_employees,
      maxEmployees: row.max_employees,
      optimalEmployees: row.optimal_employees,
      priority: row.priority as Priority,
      effectiveFrom: new Date(row.effective_from),
      effectiveUntil: row.effective_until ? new Date(row.effective_until) : undefined,
      active: Boolean(row.active),
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }

  protected mapEntityToRow(entity: ShiftStaffingRequirement): Record<string, any> {
    return {
      id: entity.id,
      station_id: entity.stationId,
      shift_template_id: entity.shiftTemplateId,
      min_employees: entity.minEmployees,
      max_employees: entity.maxEmployees,
      optimal_employees: entity.optimalEmployees,
      priority: entity.priority,
      effective_from: entity.effectiveFrom.toISOString().split('T')[0],
      effective_until: entity.effectiveUntil?.toISOString().split('T')[0] || null,
      active: entity.active,
      notes: entity.notes,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString()
    };
  }

  /**
   * Find staffing requirements for a specific station and shift template
   */
  async findByStationAndShift(stationId: string, shiftTemplateId: string): Promise<ShiftStaffingRequirement[]> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE station_id = ? AND shift_template_id = ? AND active = 1
      ORDER BY effective_from DESC
    `;
    
    const rows = await this.db.query(query, [stationId, shiftTemplateId]);
    return rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * Find active staffing requirements for a specific date
   */
  async findActiveForDate(date: Date): Promise<ShiftStaffingRequirement[]> {
    const dateStr = date.toISOString().split('T')[0];
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE active = 1 
      AND effective_from <= ? 
      AND (effective_until IS NULL OR effective_until >= ?)
      ORDER BY station_id, shift_template_id, priority DESC
    `;
    
    const rows = await this.db.query(query, [dateStr, dateStr]);
    return rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * Find staffing requirements for a specific station on a specific date
   */
  async findByStationForDate(stationId: string, date: Date): Promise<ShiftStaffingRequirement[]> {
    const dateStr = date.toISOString().split('T')[0];
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE station_id = ? AND active = 1 
      AND effective_from <= ? 
      AND (effective_until IS NULL OR effective_until >= ?)
      ORDER BY shift_template_id, priority DESC
    `;
    
    const rows = await this.db.query(query, [stationId, dateStr, dateStr]);
    return rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * Find staffing requirements by priority level
   */
  async findByPriority(priority: Priority): Promise<ShiftStaffingRequirement[]> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE priority = ? AND active = 1
      ORDER BY station_id, shift_template_id
    `;
    
    const rows = await this.db.query(query, [priority]);
    return rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * Find conflicting staffing requirements (same station/shift with overlapping dates)
   */
  async findConflicts(requirement: ShiftStaffingRequirement): Promise<ShiftStaffingRequirement[]> {
    const effectiveFromStr = requirement.effectiveFrom.toISOString().split('T')[0];
    const effectiveUntilStr = requirement.effectiveUntil?.toISOString().split('T')[0] || '2099-12-31';
    
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE station_id = ? AND shift_template_id = ? AND active = 1 AND id != ?
      AND effective_from <= ? 
      AND (effective_until IS NULL OR effective_until >= ?)
      ORDER BY effective_from
    `;
    
    const rows = await this.db.query(query, [
      requirement.stationId, 
      requirement.shiftTemplateId, 
      requirement.id,
      effectiveUntilStr,
      effectiveFromStr
    ]);
    
    return rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * Get staffing requirements summary by station
   */
  async getStationSummary(): Promise<Array<{
    stationId: string;
    stationName: string;
    totalRequirements: number;
    activeRequirements: number;
    criticalRequirements: number;
  }>> {
    const query = `
      SELECT 
        ssr.station_id,
        s.name as station_name,
        COUNT(*) as total_requirements,
        SUM(CASE WHEN ssr.active = 1 THEN 1 ELSE 0 END) as active_requirements,
        SUM(CASE WHEN ssr.active = 1 AND ssr.priority = 'critical' THEN 1 ELSE 0 END) as critical_requirements
      FROM ${this.tableName} ssr
      JOIN stations s ON ssr.station_id = s.id
      GROUP BY ssr.station_id, s.name
      ORDER BY s.name
    `;
    
    const rows = await this.db.query(query, []);
    return rows.map(row => ({
      stationId: row.station_id,
      stationName: row.station_name,
      totalRequirements: row.total_requirements,
      activeRequirements: row.active_requirements,
      criticalRequirements: row.critical_requirements
    }));
  }

  /**
   * Deactivate all requirements for a station/shift combination
   */
  async deactivateByStationAndShift(stationId: string, shiftTemplateId: string): Promise<number> {
    const query = `
      UPDATE ${this.tableName} 
      SET active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE station_id = ? AND shift_template_id = ? AND active = 1
    `;
    
    await this.db.run(query, [stationId, shiftTemplateId]);
    // Note: DatabaseManager doesn't return changes count, so we return 1 for success
    return 1;
  }

  /**
   * Find requirements that are expiring soon
   */
  async findExpiringSoon(daysAhead: number = 30): Promise<ShiftStaffingRequirement[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE active = 1 
      AND effective_until IS NOT NULL 
      AND effective_until <= ?
      ORDER BY effective_until ASC
    `;
    
    const rows = await this.db.query(query, [futureDateStr]);
    return rows.map(row => this.mapRowToEntity(row));
  }
}
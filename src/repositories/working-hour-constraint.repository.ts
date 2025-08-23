import { BaseRepository } from './base.js';
import { WorkingHourConstraint, NightShiftRestrictions } from '../models/WorkingHourConstraint.js';
import { ContractType } from '../types/index.js';

export class WorkingHourConstraintRepository extends BaseRepository<WorkingHourConstraint> {
  constructor() {
    super('working_hour_constraints');
  }

  protected mapRowToEntity(row: any): WorkingHourConstraint {
    return new WorkingHourConstraint({
      id: row.id,
      name: row.name,
      description: row.description,
      maxConsecutiveDays: row.max_consecutive_days,
      minRestDays: row.min_rest_days,
      maxHoursPerWeek: row.max_hours_per_week,
      maxHoursPerDay: row.max_hours_per_day,
      minHoursBetweenShifts: row.min_hours_between_shifts,
      allowBackToBackShifts: Boolean(row.allow_back_to_back_shifts),
      weekendWorkAllowed: Boolean(row.weekend_work_allowed),
      nightShiftRestrictions: row.night_shift_restrictions ? JSON.parse(row.night_shift_restrictions) : undefined,
      contractTypes: JSON.parse(row.contract_types) as ContractType[],
      active: Boolean(row.active),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }

  protected mapEntityToRow(entity: WorkingHourConstraint): Record<string, any> {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      max_consecutive_days: entity.maxConsecutiveDays,
      min_rest_days: entity.minRestDays,
      max_hours_per_week: entity.maxHoursPerWeek,
      max_hours_per_day: entity.maxHoursPerDay,
      min_hours_between_shifts: entity.minHoursBetweenShifts,
      allow_back_to_back_shifts: entity.allowBackToBackShifts,
      weekend_work_allowed: entity.weekendWorkAllowed,
      night_shift_restrictions: entity.nightShiftRestrictions ? JSON.stringify(entity.nightShiftRestrictions) : null,
      contract_types: JSON.stringify(entity.contractTypes),
      active: entity.active,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString()
    };
  }

  /**
   * Find constraints applicable to a specific contract type
   */
  async findByContractType(contractType: ContractType): Promise<WorkingHourConstraint[]> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE active = 1 AND contract_types LIKE ?
      ORDER BY name
    `;
    
    // Use LIKE to search within the JSON array
    const searchPattern = `%"${contractType}"%`;
    
    const rows = await this.db.query(query, [searchPattern]);
    const constraints = rows
      .map(row => this.mapRowToEntity(row))
      .filter(constraint => constraint.appliesTo(contractType));
    
    return constraints;
  }

  /**
   * Find active constraints
   */
  async findActive(): Promise<WorkingHourConstraint[]> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE active = 1
      ORDER BY name
    `;
    
    const rows = await this.db.query(query, []);
    return rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * Find constraints by name pattern
   */
  async findByNamePattern(pattern: string): Promise<WorkingHourConstraint[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE name LIKE ? AND active = 1
        ORDER BY name
      `;
      
      this.db.all(query, [`%${pattern}%`], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        const constraints = rows.map(row => this.mapRowToEntity(row));
        resolve(constraints);
      });
    });
  }

  /**
   * Find constraints with night shift restrictions
   */
  async findWithNightShiftRestrictions(): Promise<WorkingHourConstraint[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE night_shift_restrictions IS NOT NULL AND active = 1
        ORDER BY name
      `;
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        const constraints = rows.map(row => this.mapRowToEntity(row));
        resolve(constraints);
      });
    });
  }

  /**
   * Find constraints that don't allow weekend work
   */
  async findNoWeekendWork(): Promise<WorkingHourConstraint[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE weekend_work_allowed = 0 AND active = 1
        ORDER BY name
      `;
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        const constraints = rows.map(row => this.mapRowToEntity(row));
        resolve(constraints);
      });
    });
  }

  /**
   * Find constraints that don't allow back-to-back shifts
   */
  async findNoBackToBackShifts(): Promise<WorkingHourConstraint[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE allow_back_to_back_shifts = 0 AND active = 1
        ORDER BY name
      `;
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        const constraints = rows.map(row => this.mapRowToEntity(row));
        resolve(constraints);
      });
    });
  }

  /**
   * Get constraint statistics by contract type
   */
  async getStatisticsByContractType(): Promise<Array<{
    contractType: ContractType;
    constraintCount: number;
    avgMaxHoursPerDay: number;
    avgMaxHoursPerWeek: number;
    avgMaxConsecutiveDays: number;
    nightShiftRestrictionsCount: number;
  }>> {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM ${this.tableName} WHERE active = 1`;
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        const constraints = rows.map(row => this.mapRowToEntity(row));
        const stats = new Map<ContractType, {
          count: number;
          totalMaxHoursPerDay: number;
          totalMaxHoursPerWeek: number;
          totalMaxConsecutiveDays: number;
          nightShiftRestrictionsCount: number;
        }>();
        
        // Initialize stats for all contract types
        Object.values(ContractType).forEach(contractType => {
          stats.set(contractType, {
            count: 0,
            totalMaxHoursPerDay: 0,
            totalMaxHoursPerWeek: 0,
            totalMaxConsecutiveDays: 0,
            nightShiftRestrictionsCount: 0
          });
        });
        
        // Aggregate statistics
        constraints.forEach(constraint => {
          constraint.contractTypes.forEach(contractType => {
            const stat = stats.get(contractType)!;
            stat.count++;
            stat.totalMaxHoursPerDay += constraint.maxHoursPerDay;
            stat.totalMaxHoursPerWeek += constraint.maxHoursPerWeek;
            stat.totalMaxConsecutiveDays += constraint.maxConsecutiveDays;
            if (constraint.hasNightShiftRestrictions()) {
              stat.nightShiftRestrictionsCount++;
            }
          });
        });
        
        // Convert to result format
        const results = Array.from(stats.entries()).map(([contractType, stat]) => ({
          contractType,
          constraintCount: stat.count,
          avgMaxHoursPerDay: stat.count > 0 ? Math.round((stat.totalMaxHoursPerDay / stat.count) * 10) / 10 : 0,
          avgMaxHoursPerWeek: stat.count > 0 ? Math.round((stat.totalMaxHoursPerWeek / stat.count) * 10) / 10 : 0,
          avgMaxConsecutiveDays: stat.count > 0 ? Math.round((stat.totalMaxConsecutiveDays / stat.count) * 10) / 10 : 0,
          nightShiftRestrictionsCount: stat.nightShiftRestrictionsCount
        }));
        
        resolve(results);
      });
    });
  }

  /**
   * Find the most restrictive constraint for a contract type
   */
  async findMostRestrictive(contractType: ContractType): Promise<WorkingHourConstraint | null> {
    const constraints = await this.findByContractType(contractType);
    
    if (constraints.length === 0) {
      return null;
    }
    
    // Find the constraint with the lowest limits (most restrictive)
    return constraints.reduce((mostRestrictive, current) => {
      const restrictiveScore = (constraint: WorkingHourConstraint) => {
        return (
          (20 - constraint.maxHoursPerDay) * 4 +
          (80 - constraint.maxHoursPerWeek) +
          (14 - constraint.maxConsecutiveDays) * 2 +
          constraint.minHoursBetweenShifts +
          (constraint.allowBackToBackShifts ? 0 : 5) +
          (constraint.weekendWorkAllowed ? 0 : 3) +
          (constraint.hasNightShiftRestrictions() ? 5 : 0)
        );
      };
      
      return restrictiveScore(current) > restrictiveScore(mostRestrictive) ? current : mostRestrictive;
    });
  }

  /**
   * Deactivate constraint by name
   */
  async deactivateByName(name: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE ${this.tableName} 
        SET active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE name = ? AND active = 1
      `;
      
      this.db.run(query, [name], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes > 0);
      });
    });
  }

  /**
   * Find constraints that might be conflicting (same contract types, different rules)
   */
  async findPotentialConflicts(): Promise<Array<{
    contractType: ContractType;
    constraints: WorkingHourConstraint[];
    conflictType: string;
  }>> {
    const allConstraints = await this.findActive();
    const conflicts: Array<{
      contractType: ContractType;
      constraints: WorkingHourConstraint[];
      conflictType: string;
    }> = [];
    
    // Group constraints by contract type
    const constraintsByType = new Map<ContractType, WorkingHourConstraint[]>();
    
    allConstraints.forEach(constraint => {
      constraint.contractTypes.forEach(contractType => {
        if (!constraintsByType.has(contractType)) {
          constraintsByType.set(contractType, []);
        }
        constraintsByType.get(contractType)!.push(constraint);
      });
    });
    
    // Check for conflicts within each contract type
    constraintsByType.forEach((constraints, contractType) => {
      if (constraints.length < 2) return;
      
      // Check for conflicting hour limits
      const maxHoursPerDay = constraints.map(c => c.maxHoursPerDay);
      const maxHoursPerWeek = constraints.map(c => c.maxHoursPerWeek);
      
      if (Math.max(...maxHoursPerDay) - Math.min(...maxHoursPerDay) > 4) {
        conflicts.push({
          contractType,
          constraints,
          conflictType: 'Conflicting daily hour limits'
        });
      }
      
      if (Math.max(...maxHoursPerWeek) - Math.min(...maxHoursPerWeek) > 20) {
        conflicts.push({
          contractType,
          constraints,
          conflictType: 'Conflicting weekly hour limits'
        });
      }
      
      // Check for conflicting weekend work policies
      const weekendPolicies = constraints.map(c => c.weekendWorkAllowed);
      if (weekendPolicies.includes(true) && weekendPolicies.includes(false)) {
        conflicts.push({
          contractType,
          constraints,
          conflictType: 'Conflicting weekend work policies'
        });
      }
    });
    
    return conflicts;
  }
}
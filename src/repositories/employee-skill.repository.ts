// Employee skill repository implementation

import { BaseRepository } from './base';
import { EmployeeSkill } from '../types';

export interface IEmployeeSkillRepository extends BaseRepository<EmployeeSkill> {
  findByEmployee(employeeId: string): Promise<EmployeeSkill[]>;
  findBySkill(skillId: string): Promise<EmployeeSkill[]>;
  findByEmployeeAndSkill(employeeId: string, skillId: string): Promise<EmployeeSkill | null>;
  findExpiringCertifications(withinDays: number): Promise<EmployeeSkill[]>;
  findByMinLevel(skillId: string, minLevel: number): Promise<EmployeeSkill[]>;
  getEmployeeSkillMatrix(employeeIds?: string[]): Promise<{
    employeeId: string;
    skills: { skillId: string; skillName: string; level: number; validUntil?: Date }[];
  }[]>;
}

export class EmployeeSkillRepository extends BaseRepository<EmployeeSkill> implements IEmployeeSkillRepository {
  constructor() {
    super('employee_skills');
  }

  protected mapRowToEntity(row: any): EmployeeSkill {
    return {
      id: row.id,
      employeeId: row.employee_id,
      skillId: row.skill_id,
      level: row.level,
      validUntil: row.valid_until ? this.deserializeValue(row.valid_until, 'date') : undefined,
      certificationId: row.certification_id,
      createdAt: this.deserializeValue(row.created_at, 'date'),
      updatedAt: this.deserializeValue(row.updated_at, 'date')
    };
  }

  protected getColumnMapping(): Record<string, string> {
    return {
      employeeId: 'employee_id',
      skillId: 'skill_id',
      validUntil: 'valid_until',
      certificationId: 'certification_id',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };
  }

  async findByEmployee(employeeId: string): Promise<EmployeeSkill[]> {
    const sql = `
      SELECT es.*, s.name as skill_name 
      FROM ${this.tableName} es
      JOIN skills s ON es.skill_id = s.id
      WHERE es.employee_id = ? 
      ORDER BY s.name
    `;
    return this.findByQuery(sql, [employeeId]);
  }

  async findBySkill(skillId: string): Promise<EmployeeSkill[]> {
    const sql = `
      SELECT es.*, e.name as employee_name 
      FROM ${this.tableName} es
      JOIN employees e ON es.employee_id = e.id
      WHERE es.skill_id = ? AND e.active = 1
      ORDER BY e.name
    `;
    return this.findByQuery(sql, [skillId]);
  }

  async findByEmployeeAndSkill(employeeId: string, skillId: string): Promise<EmployeeSkill | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE employee_id = ? AND skill_id = ? LIMIT 1`;
    return this.findOneByQuery(sql, [employeeId, skillId]);
  }

  async findExpiringCertifications(withinDays: number): Promise<EmployeeSkill[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + withinDays);
    
    const sql = `
      SELECT es.*, e.name as employee_name, s.name as skill_name
      FROM ${this.tableName} es
      JOIN employees e ON es.employee_id = e.id
      JOIN skills s ON es.skill_id = s.id
      WHERE es.valid_until IS NOT NULL 
      AND es.valid_until <= ?
      AND e.active = 1
      ORDER BY es.valid_until ASC
    `;
    
    return this.findByQuery(sql, [futureDate.toISOString().split('T')[0]]);
  }

  async findByMinLevel(skillId: string, minLevel: number): Promise<EmployeeSkill[]> {
    const sql = `
      SELECT es.*, e.name as employee_name
      FROM ${this.tableName} es
      JOIN employees e ON es.employee_id = e.id
      WHERE es.skill_id = ? 
      AND es.level >= ?
      AND e.active = 1
      AND (es.valid_until IS NULL OR es.valid_until > CURRENT_DATE)
      ORDER BY es.level DESC, e.name
    `;
    
    return this.findByQuery(sql, [skillId, minLevel]);
  }

  async getEmployeeSkillMatrix(employeeIds?: string[]): Promise<{
    employeeId: string;
    skills: { skillId: string; skillName: string; level: number; validUntil?: Date }[];
  }[]> {
    let sql = `
      SELECT 
        es.employee_id,
        es.skill_id,
        s.name as skill_name,
        es.level,
        es.valid_until
      FROM ${this.tableName} es
      JOIN skills s ON es.skill_id = s.id
      JOIN employees e ON es.employee_id = e.id
      WHERE e.active = 1
    `;
    
    const params: any[] = [];
    
    if (employeeIds && employeeIds.length > 0) {
      const placeholders = employeeIds.map(() => '?').join(',');
      sql += ` AND es.employee_id IN (${placeholders})`;
      params.push(...employeeIds);
    }
    
    sql += ` ORDER BY es.employee_id, s.name`;
    
    const rows = await this.executeQuery(sql, params);
    
    // Group by employee
    const matrix = new Map<string, { skillId: string; skillName: string; level: number; validUntil?: Date }[]>();
    
    for (const row of rows) {
      if (!matrix.has(row.employee_id)) {
        matrix.set(row.employee_id, []);
      }
      
      matrix.get(row.employee_id)!.push({
        skillId: row.skill_id,
        skillName: row.skill_name,
        level: row.level,
        validUntil: row.valid_until ? new Date(row.valid_until) : undefined
      });
    }
    
    return Array.from(matrix.entries()).map(([employeeId, skills]) => ({
      employeeId,
      skills
    }));
  }

  async getSkillCoverage(skillId: string): Promise<{
    totalEmployees: number;
    employeesWithSkill: number;
    levelDistribution: { level: number; count: number }[];
    averageLevel: number;
  }> {
    // Get total active employees
    const totalResult = await this.executeQuery(
      'SELECT COUNT(*) as count FROM employees WHERE active = 1'
    );
    const totalEmployees = totalResult[0]?.count || 0;

    // Get employees with this skill
    const skillResult = await this.executeQuery(`
      SELECT COUNT(*) as count, AVG(level) as avg_level
      FROM ${this.tableName} es
      JOIN employees e ON es.employee_id = e.id
      WHERE es.skill_id = ? AND e.active = 1
      AND (es.valid_until IS NULL OR es.valid_until > CURRENT_DATE)
    `, [skillId]);
    
    const employeesWithSkill = skillResult[0]?.count || 0;
    const averageLevel = skillResult[0]?.avg_level || 0;

    // Get level distribution
    const levelResult = await this.executeQuery(`
      SELECT level, COUNT(*) as count
      FROM ${this.tableName} es
      JOIN employees e ON es.employee_id = e.id
      WHERE es.skill_id = ? AND e.active = 1
      AND (es.valid_until IS NULL OR es.valid_until > CURRENT_DATE)
      GROUP BY level
      ORDER BY level
    `, [skillId]);

    const levelDistribution = levelResult.map(row => ({
      level: row.level,
      count: row.count
    }));

    return {
      totalEmployees,
      employeesWithSkill,
      levelDistribution,
      averageLevel: Math.round(averageLevel * 100) / 100
    };
  }
}
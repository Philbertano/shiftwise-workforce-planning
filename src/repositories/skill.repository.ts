// Skill repository implementation

import { BaseRepository } from './base';
import { Skill, SkillCategory } from '../types';

export interface ISkillRepository extends BaseRepository<Skill> {
  findByCategory(category: SkillCategory): Promise<Skill[]>;
  findByName(name: string): Promise<Skill | null>;
  findByNamePattern(pattern: string): Promise<Skill[]>;
  findWithLevelScale(levelScale: number): Promise<Skill[]>;
}

export class SkillRepository extends BaseRepository<Skill> implements ISkillRepository {
  constructor() {
    super('skills');
  }

  protected mapRowToEntity(row: any): Skill {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      levelScale: row.level_scale,
      category: row.category as SkillCategory,
      createdAt: this.deserializeValue(row.created_at, 'date'),
      updatedAt: this.deserializeValue(row.updated_at, 'date')
    };
  }

  protected getColumnMapping(): Record<string, string> {
    return {
      levelScale: 'level_scale',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };
  }

  async findByCategory(category: SkillCategory): Promise<Skill[]> {
    const sql = `SELECT * FROM ${this.tableName} WHERE category = ? ORDER BY name`;
    return this.findByQuery(sql, [category]);
  }

  async findByName(name: string): Promise<Skill | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE name = ? LIMIT 1`;
    return this.findOneByQuery(sql, [name]);
  }

  async findByNamePattern(pattern: string): Promise<Skill[]> {
    const sql = `SELECT * FROM ${this.tableName} WHERE name LIKE ? ORDER BY name`;
    return this.findByQuery(sql, [`%${pattern}%`]);
  }

  async findWithLevelScale(levelScale: number): Promise<Skill[]> {
    const sql = `SELECT * FROM ${this.tableName} WHERE level_scale = ? ORDER BY name`;
    return this.findByQuery(sql, [levelScale]);
  }

  async getCategorySummary(): Promise<{ category: SkillCategory; count: number }[]> {
    const sql = `
      SELECT category, COUNT(*) as count 
      FROM ${this.tableName} 
      GROUP BY category 
      ORDER BY category
    `;
    
    const rows = await this.executeQuery(sql);
    return rows.map(row => ({
      category: row.category as SkillCategory,
      count: row.count
    }));
  }
}
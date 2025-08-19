// Base repository interface and implementation for ShiftWise

import { DatabaseManager, QueryResult, TransactionContext } from '../database/config';

export interface IBaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(limit?: number, offset?: number): Promise<T[]>;
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: string, updates: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  findBy(criteria: Partial<T>, limit?: number, offset?: number): Promise<T[]>;
  count(criteria?: Partial<T>): Promise<number>;
  exists(id: string): Promise<boolean>;
  bulkCreate(entities: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<T[]>;
  bulkUpdate(updates: { id: string; data: Partial<T> }[]): Promise<T[]>;
  bulkDelete(ids: string[]): Promise<void>;
}

export interface RepositoryOptions {
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export abstract class BaseRepository<T> implements IBaseRepository<T> {
  protected db: DatabaseManager;
  protected tableName: string;

  constructor(tableName: string) {
    this.db = DatabaseManager.getInstance();
    this.tableName = tableName;
  }

  async findById(id: string): Promise<T | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const rows = await this.db.query(sql, [id]);
    
    if (rows.length === 0) {
      return null;
    }
    
    return this.mapRowToEntity(rows[0]);
  }

  async findAll(limit?: number, offset?: number): Promise<T[]> {
    let sql = `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`;
    const params: any[] = [];
    
    if (limit) {
      sql += ` LIMIT ?`;
      params.push(limit);
      
      if (offset) {
        sql += ` OFFSET ?`;
        params.push(offset);
      }
    }
    
    const rows = await this.db.query(sql, params);
    return rows.map(row => this.mapRowToEntity(row));
  }

  async create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const id = this.generateId();
    const now = new Date();
    
    const entityWithMeta = {
      ...entity,
      id,
      createdAt: now,
      updatedAt: now
    } as T;

    const { sql, values } = this.buildInsertQuery(entityWithMeta);
    await this.db.run(sql, values);
    
    return entityWithMeta;
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Entity with id ${id} not found in ${this.tableName}`);
    }

    const updatedEntity = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    } as T;

    const { sql, values } = this.buildUpdateQuery(id, updatedEntity);
    await this.db.run(sql, values);
    
    return updatedEntity;
  }

  async delete(id: string): Promise<void> {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    await this.db.run(sql, [id]);
  }

  async findBy(criteria: Partial<T>, limit?: number, offset?: number): Promise<T[]> {
    const { whereClause, values } = this.buildWhereClause(criteria);
    let sql = `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY created_at DESC`;
    
    if (limit) {
      sql += ` LIMIT ?`;
      values.push(limit);
      
      if (offset) {
        sql += ` OFFSET ?`;
        values.push(offset);
      }
    }
    
    const rows = await this.db.query(sql, values);
    return rows.map(row => this.mapRowToEntity(row));
  }

  async count(criteria?: Partial<T>): Promise<number> {
    const { whereClause, values } = criteria ? this.buildWhereClause(criteria) : { whereClause: '', values: [] };
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`;
    
    const rows = await this.db.query(sql, values);
    return rows[0]?.count || 0;
  }

  async exists(id: string): Promise<boolean> {
    const sql = `SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`;
    const rows = await this.db.query(sql, [id]);
    return rows.length > 0;
  }

  async bulkCreate(entities: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<T[]> {
    if (entities.length === 0) {
      return [];
    }

    const results: T[] = [];
    
    await this.db.transaction(async (ctx) => {
      for (const entity of entities) {
        const id = this.generateId();
        const now = new Date();
        
        const entityWithMeta = {
          ...entity,
          id,
          createdAt: now,
          updatedAt: now
        } as T;

        const { sql, values } = this.buildInsertQuery(entityWithMeta);
        await ctx.run(sql, values);
        results.push(entityWithMeta);
      }
    });

    return results;
  }

  async bulkUpdate(updates: { id: string; data: Partial<T> }[]): Promise<T[]> {
    if (updates.length === 0) {
      return [];
    }

    const results: T[] = [];
    
    await this.db.transaction(async (ctx) => {
      for (const update of updates) {
        const existing = await this.findById(update.id);
        if (!existing) {
          throw new Error(`Entity with id ${update.id} not found in ${this.tableName}`);
        }

        const updatedEntity = {
          ...existing,
          ...update.data,
          updatedAt: new Date()
        } as T;

        const { sql, values } = this.buildUpdateQuery(update.id, updatedEntity);
        await ctx.run(sql, values);
        results.push(updatedEntity);
      }
    });

    return results;
  }

  async bulkDelete(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const placeholders = ids.map(() => '?').join(',');
    const sql = `DELETE FROM ${this.tableName} WHERE id IN (${placeholders})`;
    await this.db.run(sql, ids);
  }

  // Protected helper methods to be implemented by concrete repositories
  protected abstract mapRowToEntity(row: any): T;
  protected abstract getColumnMapping(): Record<string, string>;

  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  protected buildInsertQuery(entity: T): { sql: string; values: any[] } {
    const columnMapping = this.getColumnMapping();
    const columns: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];

    Object.entries(entity as any).forEach(([key, value]) => {
      const columnName = columnMapping[key] || this.camelToSnake(key);
      columns.push(columnName);
      placeholders.push('?');
      values.push(this.serializeValue(value));
    });

    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    return { sql, values };
  }

  protected buildUpdateQuery(id: string, entity: T): { sql: string; values: any[] } {
    const columnMapping = this.getColumnMapping();
    const setParts: string[] = [];
    const values: any[] = [];

    Object.entries(entity as any).forEach(([key, value]) => {
      if (key !== 'id') {
        const columnName = columnMapping[key] || this.camelToSnake(key);
        setParts.push(`${columnName} = ?`);
        values.push(this.serializeValue(value));
      }
    });

    values.push(id);
    const sql = `UPDATE ${this.tableName} SET ${setParts.join(', ')} WHERE id = ?`;
    return { sql, values };
  }

  protected buildWhereClause(criteria: Partial<T>): { whereClause: string; values: any[] } {
    if (Object.keys(criteria).length === 0) {
      return { whereClause: '', values: [] };
    }

    const columnMapping = this.getColumnMapping();
    const conditions: string[] = [];
    const values: any[] = [];

    Object.entries(criteria).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const columnName = columnMapping[key] || this.camelToSnake(key);
        conditions.push(`${columnName} = ?`);
        values.push(this.serializeValue(value));
      }
    });

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, values };
  }

  protected camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  protected snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  protected serializeValue(value: any): any {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return value;
  }

  protected deserializeValue(value: any, type: 'date' | 'json' | 'boolean' | 'number' | 'string'): any {
    if (value === null || value === undefined) {
      return value;
    }

    switch (type) {
      case 'date':
        return new Date(value);
      case 'json':
        return typeof value === 'string' ? JSON.parse(value) : value;
      case 'boolean':
        return Boolean(value);
      case 'number':
        return Number(value);
      default:
        return value;
    }
  }

  // Utility methods for complex queries
  protected async executeQuery(sql: string, params: any[] = []): Promise<any[]> {
    return this.db.query(sql, params);
  }

  protected async executeCommand(sql: string, params: any[] = []): Promise<void> {
    return this.db.run(sql, params);
  }

  // Transaction support
  async withTransaction<R>(callback: (ctx: TransactionContext) => Promise<R>): Promise<R> {
    return this.db.transaction(callback);
  }

  // Advanced query methods
  protected async findByQuery(sql: string, params: any[] = []): Promise<T[]> {
    const rows = await this.executeQuery(sql, params);
    return rows.map(row => this.mapRowToEntity(row));
  }

  protected async findOneByQuery(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.executeQuery(sql, params);
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  protected async executeScalar<R>(sql: string, params: any[] = []): Promise<R | null> {
    const rows = await this.executeQuery(sql, params);
    if (rows.length === 0) {
      return null;
    }
    
    const firstRow = rows[0];
    const firstKey = Object.keys(firstRow)[0];
    return firstRow[firstKey] as R;
  }

  // Pagination helper
  async findWithPagination(
    criteria: Partial<T> = {},
    options: RepositoryOptions = {}
  ): Promise<{ items: T[]; total: number; hasMore: boolean }> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;
    
    // Get total count
    const total = await this.count(criteria);
    
    // Get items
    const { whereClause, values } = this.buildWhereClause(criteria);
    const orderClause = `ORDER BY ${orderBy} ${orderDirection}`;
    const sql = `SELECT * FROM ${this.tableName} ${whereClause} ${orderClause} LIMIT ? OFFSET ?`;
    
    const rows = await this.executeQuery(sql, [...values, limit, offset]);
    const items = rows.map(row => this.mapRowToEntity(row));
    
    const hasMore = offset + items.length < total;
    
    return { items, total, hasMore };
  }
}
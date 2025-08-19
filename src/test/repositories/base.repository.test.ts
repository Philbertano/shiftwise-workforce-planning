// Base repository unit tests

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BaseRepository } from '../../repositories/base';
import { DatabaseManager } from '../../database/config';

// Test entity interface
interface TestEntity {
  id: string;
  name: string;
  value: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Concrete test repository
class TestRepository extends BaseRepository<TestEntity> {
  constructor() {
    super('test_entities');
  }

  protected mapRowToEntity(row: any): TestEntity {
    return {
      id: row.id,
      name: row.name,
      value: row.value,
      active: Boolean(row.active),
      createdAt: this.deserializeValue(row.created_at, 'date'),
      updatedAt: this.deserializeValue(row.updated_at, 'date')
    };
  }

  protected getColumnMapping(): Record<string, string> {
    return {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let dbManager: DatabaseManager;

  beforeEach(async () => {
    // Use in-memory SQLite for testing
    process.env.DATABASE_URL = 'sqlite::memory:';
    
    dbManager = DatabaseManager.getInstance();
    await dbManager.connect();
    
    // Create test table
    await dbManager.run(`
      CREATE TABLE test_entities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        value INTEGER NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    repository = new TestRepository();
  });

  afterEach(async () => {
    await dbManager.close();
  });

  describe('create', () => {
    it('should create a new entity', async () => {
      const entityData = {
        name: 'Test Entity',
        value: 42,
        active: true
      };

      const created = await repository.create(entityData);

      expect(created.id).toBeDefined();
      expect(created.name).toBe(entityData.name);
      expect(created.value).toBe(entityData.value);
      expect(created.active).toBe(entityData.active);
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('findById', () => {
    it('should find entity by id', async () => {
      const created = await repository.create({
        name: 'Test Entity',
        value: 42,
        active: true
      });

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe(created.name);
    });

    it('should return null for non-existent id', async () => {
      const found = await repository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all entities', async () => {
      await repository.create({ name: 'Entity 1', value: 1, active: true });
      await repository.create({ name: 'Entity 2', value: 2, active: true });
      await repository.create({ name: 'Entity 3', value: 3, active: false });

      const all = await repository.findAll();

      expect(all).toHaveLength(3);
      // Order by created_at DESC, so most recent first
      const names = all.map(e => e.name);
      expect(names).toContain('Entity 1');
      expect(names).toContain('Entity 2');
      expect(names).toContain('Entity 3');
    });

    it('should respect limit parameter', async () => {
      await repository.create({ name: 'Entity 1', value: 1, active: true });
      await repository.create({ name: 'Entity 2', value: 2, active: true });
      await repository.create({ name: 'Entity 3', value: 3, active: false });

      const limited = await repository.findAll(2);

      expect(limited).toHaveLength(2);
    });

    it('should respect limit and offset parameters', async () => {
      await repository.create({ name: 'Entity 1', value: 1, active: true });
      await repository.create({ name: 'Entity 2', value: 2, active: true });
      await repository.create({ name: 'Entity 3', value: 3, active: false });

      const paginated = await repository.findAll(1, 1);

      expect(paginated).toHaveLength(1);
      expect(paginated[0].name).toBe('Entity 2');
    });
  });

  describe('update', () => {
    it('should update existing entity', async () => {
      const created = await repository.create({
        name: 'Original Name',
        value: 42,
        active: true
      });

      // Add small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updated = await repository.update(created.id, {
        name: 'Updated Name',
        value: 100
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.value).toBe(100);
      expect(updated.active).toBe(true); // Unchanged
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('should throw error for non-existent entity', async () => {
      await expect(
        repository.update('non-existent-id', { name: 'Updated' })
      ).rejects.toThrow('Entity with id non-existent-id not found');
    });
  });

  describe('delete', () => {
    it('should delete entity', async () => {
      const created = await repository.create({
        name: 'To Delete',
        value: 42,
        active: true
      });

      await repository.delete(created.id);

      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });
  });

  describe('findBy', () => {
    beforeEach(async () => {
      await repository.create({ name: 'Active Entity', value: 100, active: true });
      await repository.create({ name: 'Inactive Entity', value: 200, active: false });
      await repository.create({ name: 'Another Active', value: 100, active: true });
    });

    it('should find entities by single criteria', async () => {
      const activeEntities = await repository.findBy({ active: true });

      expect(activeEntities).toHaveLength(2);
      expect(activeEntities.every(e => e.active)).toBe(true);
    });

    it('should find entities by multiple criteria', async () => {
      const entities = await repository.findBy({ active: true, value: 100 });

      expect(entities).toHaveLength(2);
      expect(entities.every(e => e.active && e.value === 100)).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      const entities = await repository.findBy({ value: 999 });

      expect(entities).toHaveLength(0);
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      await repository.create({ name: 'Entity 1', value: 100, active: true });
      await repository.create({ name: 'Entity 2', value: 200, active: false });
      await repository.create({ name: 'Entity 3', value: 100, active: true });
    });

    it('should count all entities', async () => {
      const count = await repository.count();
      expect(count).toBe(3);
    });

    it('should count entities by criteria', async () => {
      const activeCount = await repository.count({ active: true });
      expect(activeCount).toBe(2);

      const valueCount = await repository.count({ value: 100 });
      expect(valueCount).toBe(2);
    });
  });

  describe('exists', () => {
    it('should return true for existing entity', async () => {
      const created = await repository.create({
        name: 'Test Entity',
        value: 42,
        active: true
      });

      const exists = await repository.exists(created.id);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent entity', async () => {
      const exists = await repository.exists('non-existent-id');
      expect(exists).toBe(false);
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple entities', async () => {
      const entities = [
        { name: 'Entity 1', value: 1, active: true },
        { name: 'Entity 2', value: 2, active: false },
        { name: 'Entity 3', value: 3, active: true }
      ];

      const created = await repository.bulkCreate(entities);

      expect(created).toHaveLength(3);
      expect(created.every(e => e.id)).toBe(true);
      expect(created.map(e => e.name)).toEqual(['Entity 1', 'Entity 2', 'Entity 3']);
    });

    it('should handle empty array', async () => {
      const created = await repository.bulkCreate([]);
      expect(created).toHaveLength(0);
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple entities', async () => {
      const entity1 = await repository.create({ name: 'Entity 1', value: 1, active: true });
      const entity2 = await repository.create({ name: 'Entity 2', value: 2, active: true });
      const entity3 = await repository.create({ name: 'Entity 3', value: 3, active: true });

      await repository.bulkDelete([entity1.id, entity2.id]);

      const remaining = await repository.findAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(entity3.id);
    });

    it('should handle empty array', async () => {
      await repository.bulkDelete([]);
      // Should not throw error
    });
  });

  describe('findWithPagination', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 10; i++) {
        await repository.create({
          name: `Entity ${i}`,
          value: i,
          active: i % 2 === 0
        });
      }
    });

    it('should return paginated results', async () => {
      const result = await repository.findWithPagination({}, { limit: 3, offset: 2 });

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(10);
      expect(result.hasMore).toBe(true);
    });

    it('should filter by criteria', async () => {
      const result = await repository.findWithPagination(
        { active: true },
        { limit: 2 }
      );

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(5); // 5 active entities
      expect(result.items.every(e => e.active)).toBe(true);
    });

    it('should indicate no more results', async () => {
      const result = await repository.findWithPagination({}, { limit: 20 });

      expect(result.items).toHaveLength(10);
      expect(result.total).toBe(10);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('withTransaction', () => {
    it('should commit successful transaction', async () => {
      await repository.withTransaction(async (ctx) => {
        await ctx.run(
          'INSERT INTO test_entities (id, name, value, active) VALUES (?, ?, ?, ?)',
          ['test-1', 'Transaction Test', 42, 1]
        );
      });

      const found = await repository.findById('test-1');
      expect(found).toBeDefined();
      expect(found!.name).toBe('Transaction Test');
    });

    it('should rollback failed transaction', async () => {
      try {
        await repository.withTransaction(async (ctx) => {
          await ctx.run(
            'INSERT INTO test_entities (id, name, value, active) VALUES (?, ?, ?, ?)',
            ['test-2', 'Transaction Test', 42, 1]
          );
          
          // Force an error
          throw new Error('Transaction failed');
        });
      } catch (error) {
        // Expected error
      }

      const found = await repository.findById('test-2');
      expect(found).toBeNull();
    });
  });
});
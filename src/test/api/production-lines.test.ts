import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { app } from '../../index';
import { Database } from 'sqlite3';
import { ProductionLine } from '../../models/ProductionLine';

describe('Production Lines API', () => {
  let db: Database;

  beforeEach(async () => {
    // Setup test database
    db = new Database(':memory:');
    
    // Create tables
    await new Promise<void>((resolve, reject) => {
      db.exec(`
        CREATE TABLE production_lines (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          takt_time INTEGER,
          capacity INTEGER,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE quality_checkpoints (
          id TEXT PRIMARY KEY,
          production_line_id TEXT,
          name TEXT NOT NULL,
          required BOOLEAN DEFAULT false,
          sequence_order INTEGER,
          FOREIGN KEY (production_line_id) REFERENCES production_lines(id)
        );
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      db.close(() => resolve());
    });
  });

  describe('GET /api/production-lines', () => {
    it('returns empty array when no production lines exist', async () => {
      const response = await request(app)
        .get('/api/production-lines')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('returns all production lines', async () => {
      // Insert test data
      await new Promise<void>((resolve, reject) => {
        db.run(`
          INSERT INTO production_lines (id, name, type, takt_time, capacity)
          VALUES ('line1', 'Assembly Line A', 'assembly', 45, 10)
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const response = await request(app)
        .get('/api/production-lines')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: 'line1',
        name: 'Assembly Line A',
        type: 'assembly',
        taktTime: 45,
        capacity: 10
      });
    });

    it('filters production lines by type', async () => {
      // Insert test data
      await new Promise<void>((resolve, reject) => {
        db.serialize(() => {
          db.run(`INSERT INTO production_lines (id, name, type) VALUES ('line1', 'Assembly Line A', 'assembly')`);
          db.run(`INSERT INTO production_lines (id, name, type) VALUES ('line2', 'Paint Shop B', 'paint')`, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });

      const response = await request(app)
        .get('/api/production-lines?type=assembly')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].type).toBe('assembly');
    });
  });

  describe('GET /api/production-lines/:id', () => {
    it('returns production line by ID', async () => {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          INSERT INTO production_lines (id, name, type, takt_time, capacity)
          VALUES ('line1', 'Assembly Line A', 'assembly', 45, 10)
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const response = await request(app)
        .get('/api/production-lines/line1')
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'line1',
        name: 'Assembly Line A',
        type: 'assembly',
        taktTime: 45,
        capacity: 10
      });
    });

    it('returns 404 for non-existent production line', async () => {
      const response = await request(app)
        .get('/api/production-lines/nonexistent')
        .expect(404);

      expect(response.body.error).toBe('Production line not found');
    });
  });

  describe('POST /api/production-lines', () => {
    it('creates new production line successfully', async () => {
      const newLine = {
        name: 'Paint Shop B',
        type: 'paint',
        taktTime: 60,
        capacity: 8
      };

      const response = await request(app)
        .post('/api/production-lines')
        .send(newLine)
        .expect(201);

      expect(response.body).toMatchObject(newLine);
      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('active');
    });

    it('validates required fields', async () => {
      const invalidLine = {
        type: 'assembly'
        // Missing name
      };

      const response = await request(app)
        .post('/api/production-lines')
        .send(invalidLine)
        .expect(400);

      expect(response.body.error).toContain('name is required');
    });

    it('validates production line type', async () => {
      const invalidLine = {
        name: 'Test Line',
        type: 'invalid_type'
      };

      const response = await request(app)
        .post('/api/production-lines')
        .send(invalidLine)
        .expect(400);

      expect(response.body.error).toContain('Invalid production line type');
    });

    it('creates production line with quality checkpoints', async () => {
      const newLine = {
        name: 'Assembly Line C',
        type: 'assembly',
        taktTime: 50,
        capacity: 12,
        qualityCheckpoints: [
          { name: 'Visual Inspection', required: true, sequenceOrder: 1 },
          { name: 'Torque Check', required: true, sequenceOrder: 2 }
        ]
      };

      const response = await request(app)
        .post('/api/production-lines')
        .send(newLine)
        .expect(201);

      expect(response.body.qualityCheckpoints).toHaveLength(2);
      expect(response.body.qualityCheckpoints[0].name).toBe('Visual Inspection');
    });
  });

  describe('PUT /api/production-lines/:id', () => {
    beforeEach(async () => {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          INSERT INTO production_lines (id, name, type, takt_time, capacity)
          VALUES ('line1', 'Assembly Line A', 'assembly', 45, 10)
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    it('updates production line successfully', async () => {
      const updates = {
        name: 'Updated Assembly Line A',
        taktTime: 50,
        capacity: 12
      };

      const response = await request(app)
        .put('/api/production-lines/line1')
        .send(updates)
        .expect(200);

      expect(response.body).toMatchObject(updates);
      expect(response.body.id).toBe('line1');
    });

    it('returns 404 for non-existent production line', async () => {
      const updates = { name: 'Updated Name' };

      await request(app)
        .put('/api/production-lines/nonexistent')
        .send(updates)
        .expect(404);
    });

    it('validates update data', async () => {
      const invalidUpdates = {
        taktTime: -10 // Invalid negative value
      };

      const response = await request(app)
        .put('/api/production-lines/line1')
        .send(invalidUpdates)
        .expect(400);

      expect(response.body.error).toContain('Takt time must be positive');
    });
  });

  describe('DELETE /api/production-lines/:id', () => {
    beforeEach(async () => {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          INSERT INTO production_lines (id, name, type, takt_time, capacity)
          VALUES ('line1', 'Assembly Line A', 'assembly', 45, 10)
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    it('deletes production line successfully', async () => {
      await request(app)
        .delete('/api/production-lines/line1')
        .expect(204);

      // Verify deletion
      await request(app)
        .get('/api/production-lines/line1')
        .expect(404);
    });

    it('returns 404 for non-existent production line', async () => {
      await request(app)
        .delete('/api/production-lines/nonexistent')
        .expect(404);
    });

    it('prevents deletion when production line has active stations', async () => {
      // Add station referencing this production line
      await new Promise<void>((resolve, reject) => {
        db.run(`
          CREATE TABLE stations (
            id TEXT PRIMARY KEY,
            name TEXT,
            production_line_id TEXT,
            FOREIGN KEY (production_line_id) REFERENCES production_lines(id)
          );
          INSERT INTO stations (id, name, production_line_id) 
          VALUES ('station1', 'Station 1', 'line1');
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const response = await request(app)
        .delete('/api/production-lines/line1')
        .expect(409);

      expect(response.body.error).toContain('Cannot delete production line with active stations');
    });
  });

  describe('GET /api/production-lines/:id/status', () => {
    beforeEach(async () => {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          INSERT INTO production_lines (id, name, type, takt_time, capacity)
          VALUES ('line1', 'Assembly Line A', 'assembly', 45, 10)
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    it('returns production line status', async () => {
      const response = await request(app)
        .get('/api/production-lines/line1/status')
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'line1',
        status: expect.any(String),
        efficiency: expect.any(Number),
        currentShift: expect.any(String),
        staffingLevel: expect.any(Number),
        lastUpdate: expect.any(String)
      });
    });
  });

  describe('GET /api/production-lines/:id/metrics', () => {
    beforeEach(async () => {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          INSERT INTO production_lines (id, name, type, takt_time, capacity)
          VALUES ('line1', 'Assembly Line A', 'assembly', 45, 10)
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    it('returns production line metrics', async () => {
      const response = await request(app)
        .get('/api/production-lines/line1/metrics?period=7d')
        .expect(200);

      expect(response.body).toHaveProperty('efficiency');
      expect(response.body).toHaveProperty('output');
      expect(response.body).toHaveProperty('quality');
      expect(Array.isArray(response.body.efficiency)).toBe(true);
    });

    it('validates period parameter', async () => {
      const response = await request(app)
        .get('/api/production-lines/line1/metrics?period=invalid')
        .expect(400);

      expect(response.body.error).toContain('Invalid period');
    });
  });
});
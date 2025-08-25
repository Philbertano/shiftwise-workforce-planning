import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { app } from '../../index';
import { Database } from 'sqlite3';

describe('Equipment API', () => {
  let db: Database;

  beforeEach(async () => {
    // Setup test database
    db = new Database(':memory:');
    
    // Create tables
    await new Promise<void>((resolve, reject) => {
      db.exec(`
        CREATE TABLE equipment (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          station_id TEXT,
          status TEXT DEFAULT 'operational',
          last_maintenance DATETIME,
          next_maintenance DATETIME,
          specifications TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE stations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL
        );

        INSERT INTO stations (id, name) VALUES ('station1', 'Assembly Station 1');
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

  describe('GET /api/equipment', () => {
    it('returns empty array when no equipment exists', async () => {
      const response = await request(app)
        .get('/api/equipment')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('returns all equipment', async () => {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          INSERT INTO equipment (id, name, type, station_id, specifications)
          VALUES ('eq1', 'Welding Robot #1', 'welding_robot', 'station1', '{"power": "15kW"}')
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const response = await request(app)
        .get('/api/equipment')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: 'eq1',
        name: 'Welding Robot #1',
        type: 'welding_robot',
        stationId: 'station1',
        specifications: { power: '15kW' }
      });
    });

    it('filters equipment by station ID', async () => {
      await new Promise<void>((resolve, reject) => {
        db.serialize(() => {
          db.run(`INSERT INTO equipment (id, name, type, station_id) VALUES ('eq1', 'Robot 1', 'welding_robot', 'station1')`);
          db.run(`INSERT INTO equipment (id, name, type, station_id) VALUES ('eq2', 'Robot 2', 'welding_robot', 'station2')`, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });

      const response = await request(app)
        .get('/api/equipment?stationId=station1')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].stationId).toBe('station1');
    });

    it('filters equipment by type', async () => {
      await new Promise<void>((resolve, reject) => {
        db.serialize(() => {
          db.run(`INSERT INTO equipment (id, name, type) VALUES ('eq1', 'Welding Robot', 'welding_robot')`);
          db.run(`INSERT INTO equipment (id, name, type) VALUES ('eq2', 'Paint Sprayer', 'paint_sprayer')`, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });

      const response = await request(app)
        .get('/api/equipment?type=welding_robot')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].type).toBe('welding_robot');
    });
  });

  describe('GET /api/equipment/:id', () => {
    it('returns equipment by ID', async () => {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          INSERT INTO equipment (id, name, type, station_id, specifications)
          VALUES ('eq1', 'Welding Robot #1', 'welding_robot', 'station1', '{"power": "15kW"}')
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const response = await request(app)
        .get('/api/equipment/eq1')
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'eq1',
        name: 'Welding Robot #1',
        type: 'welding_robot',
        stationId: 'station1',
        specifications: { power: '15kW' }
      });
    });

    it('returns 404 for non-existent equipment', async () => {
      const response = await request(app)
        .get('/api/equipment/nonexistent')
        .expect(404);

      expect(response.body.error).toBe('Equipment not found');
    });
  });

  describe('POST /api/equipment', () => {
    it('creates new equipment successfully', async () => {
      const newEquipment = {
        name: 'Paint Sprayer #2',
        type: 'paint_sprayer',
        stationId: 'station1',
        specifications: {
          pressure: '30 PSI',
          flowRate: '200 ml/min'
        }
      };

      const response = await request(app)
        .post('/api/equipment')
        .send(newEquipment)
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'Paint Sprayer #2',
        type: 'paint_sprayer',
        stationId: 'station1',
        specifications: {
          pressure: '30 PSI',
          flowRate: '200 ml/min'
        }
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('operational');
    });

    it('validates required fields', async () => {
      const invalidEquipment = {
        type: 'welding_robot'
        // Missing name
      };

      const response = await request(app)
        .post('/api/equipment')
        .send(invalidEquipment)
        .expect(400);

      expect(response.body.error).toContain('name is required');
    });

    it('validates equipment type', async () => {
      const invalidEquipment = {
        name: 'Test Equipment',
        type: 'invalid_type'
      };

      const response = await request(app)
        .post('/api/equipment')
        .send(invalidEquipment)
        .expect(400);

      expect(response.body.error).toContain('Invalid equipment type');
    });

    it('validates station exists when stationId provided', async () => {
      const newEquipment = {
        name: 'Test Equipment',
        type: 'welding_robot',
        stationId: 'nonexistent_station'
      };

      const response = await request(app)
        .post('/api/equipment')
        .send(newEquipment)
        .expect(400);

      expect(response.body.error).toContain('Station not found');
    });
  });

  describe('PUT /api/equipment/:id', () => {
    beforeEach(async () => {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          INSERT INTO equipment (id, name, type, station_id, status)
          VALUES ('eq1', 'Welding Robot #1', 'welding_robot', 'station1', 'operational')
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    it('updates equipment successfully', async () => {
      const updates = {
        name: 'Updated Welding Robot #1',
        status: 'maintenance'
      };

      const response = await request(app)
        .put('/api/equipment/eq1')
        .send(updates)
        .expect(200);

      expect(response.body).toMatchObject(updates);
      expect(response.body.id).toBe('eq1');
    });

    it('returns 404 for non-existent equipment', async () => {
      const updates = { name: 'Updated Name' };

      await request(app)
        .put('/api/equipment/nonexistent')
        .send(updates)
        .expect(404);
    });

    it('validates status values', async () => {
      const invalidUpdates = {
        status: 'invalid_status'
      };

      const response = await request(app)
        .put('/api/equipment/eq1')
        .send(invalidUpdates)
        .expect(400);

      expect(response.body.error).toContain('Invalid status');
    });
  });

  describe('DELETE /api/equipment/:id', () => {
    beforeEach(async () => {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          INSERT INTO equipment (id, name, type, station_id)
          VALUES ('eq1', 'Welding Robot #1', 'welding_robot', 'station1')
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    it('deletes equipment successfully', async () => {
      await request(app)
        .delete('/api/equipment/eq1')
        .expect(204);

      // Verify deletion
      await request(app)
        .get('/api/equipment/eq1')
        .expect(404);
    });

    it('returns 404 for non-existent equipment', async () => {
      await request(app)
        .delete('/api/equipment/nonexistent')
        .expect(404);
    });
  });

  describe('GET /api/equipment/:id/status', () => {
    beforeEach(async () => {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          INSERT INTO equipment (id, name, type, status)
          VALUES ('eq1', 'Welding Robot #1', 'welding_robot', 'operational')
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    it('returns equipment status', async () => {
      const response = await request(app)
        .get('/api/equipment/eq1/status')
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'eq1',
        status: 'operational',
        uptime: expect.any(Number),
        lastCheck: expect.any(String),
        alerts: expect.any(Array),
        performance: expect.objectContaining({
          efficiency: expect.any(Number),
          output: expect.any(Number),
          quality: expect.any(Number)
        })
      });
    });
  });

  describe('PUT /api/equipment/:id/status', () => {
    beforeEach(async () => {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          INSERT INTO equipment (id, name, type, status)
          VALUES ('eq1', 'Welding Robot #1', 'welding_robot', 'operational')
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    it('updates equipment status successfully', async () => {
      const statusUpdate = {
        status: 'maintenance',
        notes: 'Scheduled maintenance'
      };

      const response = await request(app)
        .put('/api/equipment/eq1/status')
        .send(statusUpdate)
        .expect(200);

      expect(response.body).toMatchObject(statusUpdate);
    });
  });

  describe('GET /api/equipment/maintenance/schedule', () => {
    it('returns maintenance schedule', async () => {
      const response = await request(app)
        .get('/api/equipment/maintenance/schedule')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('filters by equipment ID', async () => {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          INSERT INTO equipment (id, name, type, next_maintenance)
          VALUES ('eq1', 'Robot 1', 'welding_robot', '2024-02-15T10:00:00Z')
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const response = await request(app)
        .get('/api/equipment/maintenance/schedule?equipmentId=eq1')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].equipmentId).toBe('eq1');
    });
  });

  describe('POST /api/equipment/maintenance/schedule', () => {
    beforeEach(async () => {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          INSERT INTO equipment (id, name, type)
          VALUES ('eq1', 'Welding Robot #1', 'welding_robot')
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    it('schedules maintenance successfully', async () => {
      const maintenanceData = {
        equipmentId: 'eq1',
        type: 'preventive',
        scheduledDate: '2024-02-15T14:00:00Z',
        description: 'Quarterly inspection',
        priority: 'high'
      };

      const response = await request(app)
        .post('/api/equipment/maintenance/schedule')
        .send(maintenanceData)
        .expect(201);

      expect(response.body).toMatchObject(maintenanceData);
      expect(response.body.id).toBeDefined();
    });

    it('validates required fields', async () => {
      const invalidData = {
        type: 'preventive'
        // Missing equipmentId and scheduledDate
      };

      const response = await request(app)
        .post('/api/equipment/maintenance/schedule')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('equipmentId is required');
    });

    it('validates equipment exists', async () => {
      const maintenanceData = {
        equipmentId: 'nonexistent',
        type: 'preventive',
        scheduledDate: '2024-02-15T14:00:00Z'
      };

      const response = await request(app)
        .post('/api/equipment/maintenance/schedule')
        .send(maintenanceData)
        .expect(400);

      expect(response.body.error).toContain('Equipment not found');
    });
  });
});
// Integration tests for Planning API endpoints

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { planningRoutes } from '../../api/routes/planning';
import { DatabaseManager } from '../../database/config';
import { runMigrations } from '../../database/migrate';
import { PlanningStrategy, UserRole } from '../../types';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/planning', planningRoutes);

const createTestToken = (roles: UserRole[] = [UserRole.SHIFT_LEADER]) => {
  const payload = {
    userId: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    roles
  };
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret');
};

describe('Planning API Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    
    await runMigrations();
    const dbManager = DatabaseManager.getInstance();
    await dbManager.connect();
    
    authToken = createTestToken();
  });

  afterAll(async () => {
    const dbManager = DatabaseManager.getInstance();
    await dbManager.close();
  });

  describe('POST /api/planning/generate', () => {
    const validPlanRequest = {
      dateRange: {
        start: '2024-01-15',
        end: '2024-01-21'
      },
      strategy: PlanningStrategy.BALANCED
    };

    it('should generate a plan with valid request', async () => {
      const response = await request(app)
        .post('/api/planning/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validPlanRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('assignments');
      expect(response.body.data).toHaveProperty('coverageStatus');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/planning/generate')
        .send(validPlanRequest)
        .expect(401);
    });

    it('should require appropriate role', async () => {
      const employeeToken = createTestToken([UserRole.EMPLOYEE]);
      
      await request(app)
        .post('/api/planning/generate')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(validPlanRequest)
        .expect(403);
    });

    it('should validate request format', async () => {
      const invalidRequest = {
        dateRange: {
          start: '2024-01-15',
          end: '2024-01-10' // End before start
        }
      };

      const response = await request(app)
        .post('/api/planning/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/planning/coverage/status', () => {
    it('should return coverage status', async () => {
      const response = await request(app)
        .get('/api/planning/coverage/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalDemands');
      expect(response.body.data).toHaveProperty('filledDemands');
      expect(response.body.data).toHaveProperty('coveragePercentage');
      expect(response.body.data).toHaveProperty('gaps');
      expect(response.body.data).toHaveProperty('riskLevel');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/planning/coverage/status')
        .expect(401);
    });
  });

  describe('GET /api/planning/coverage/heatmap', () => {
    it('should return heatmap data with date range', async () => {
      const response = await request(app)
        .get('/api/planning/coverage/heatmap')
        .query({
          dateStart: '2024-01-15',
          dateEnd: '2024-01-21'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dates');
      expect(response.body.data).toHaveProperty('stations');
      expect(response.body.data).toHaveProperty('coverageMatrix');
    });

    it('should require date range for heatmap', async () => {
      const response = await request(app)
        .get('/api/planning/coverage/heatmap')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/planning', () => {
    it('should return list of plans', async () => {
      const response = await request(app)
        .get('/api/planning')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/planning')
        .query({ status: 'proposed' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/planning/:id', () => {
    it('should return 404 for non-existent plan', async () => {
      const response = await request(app)
        .get('/api/planning/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/planning/:id/commit', () => {
    it('should require SHIFT_LEADER or ADMIN role', async () => {
      const hrToken = createTestToken([UserRole.HR_PLANNER]);
      
      await request(app)
        .post('/api/planning/test-id/commit')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({})
        .expect(403);
    });

    it('should return 404 for non-existent plan', async () => {
      const response = await request(app)
        .post('/api/planning/non-existent-id/commit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/planning/:id', () => {
    it('should require SHIFT_LEADER or ADMIN role', async () => {
      const hrToken = createTestToken([UserRole.HR_PLANNER]);
      
      await request(app)
        .delete('/api/planning/test-id')
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent plan', async () => {
      const response = await request(app)
        .delete('/api/planning/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});
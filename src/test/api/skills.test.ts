// Integration tests for Skills API endpoints

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { skillRoutes } from '../../api/routes/skills';
import { DatabaseManager } from '../../database/config';
import { runMigrations } from '../../database/migrate';
import { SkillCategory, UserRole } from '../../types';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/skills', skillRoutes);

const createTestToken = (roles: UserRole[] = [UserRole.ADMIN]) => {
  const payload = {
    userId: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    roles
  };
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret');
};

describe('Skills API Integration Tests', () => {
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

  beforeEach(async () => {
    const dbManager = DatabaseManager.getInstance();
    await dbManager.run('DELETE FROM skills');
  });

  describe('GET /api/skills', () => {
    it('should return empty array when no skills exist', async () => {
      const response = await request(app)
        .get('/api/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/skills')
        .expect(401);
    });
  });

  describe('POST /api/skills', () => {
    const validSkill = {
      name: 'Machine Operation',
      description: 'Operating production machinery',
      levelScale: 3,
      category: SkillCategory.TECHNICAL
    };

    it('should create a new skill with valid data', async () => {
      const response = await request(app)
        .post('/api/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validSkill)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: validSkill.name,
        description: validSkill.description,
        levelScale: validSkill.levelScale,
        category: validSkill.category
      });
      expect(response.body.data.id).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidSkill = {
        name: 'Test Skill'
        // Missing category
      };

      const response = await request(app)
        .post('/api/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidSkill)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require HR_PLANNER or ADMIN role', async () => {
      const employeeToken = createTestToken([UserRole.EMPLOYEE]);
      
      await request(app)
        .post('/api/skills')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(validSkill)
        .expect(403);
    });
  });

  describe('GET /api/skills/:id', () => {
    it('should return 404 for non-existent skill', async () => {
      const response = await request(app)
        .get('/api/skills/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/skills/:id', () => {
    it('should require ADMIN role', async () => {
      const hrToken = createTestToken([UserRole.HR_PLANNER]);
      
      await request(app)
        .delete('/api/skills/test-id')
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(403);
    });
  });
});
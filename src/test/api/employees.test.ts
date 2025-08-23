// Integration tests for Employee API endpoints

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { employeeRoutes } from '../../api/routes/employees';
import { DatabaseManager } from '../../database/config';
import { runMigrations } from '../../database/migrate';
import { ContractType, UserRole } from '../../types';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/employees', employeeRoutes);

// Mock JWT token for testing
const createTestToken = (roles: UserRole[] = [UserRole.ADMIN]) => {
  const payload = {
    userId: 'test-user-id',
    username: 'testuser',
    role: roles[0], // Use first role as primary role
    active: true
  };
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret');
};

describe('Employee API Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    // Set up test database
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
    // Clean up test data before each test
    const dbManager = DatabaseManager.getInstance();
    await dbManager.run('DELETE FROM employees');
  });

  describe('GET /api/employees', () => {
    it('should return empty array when no employees exist', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/employees')
        .expect(401);
    });

    it('should require appropriate role', async () => {
      const employeeToken = createTestToken([UserRole.EMPLOYEE]);
      
      await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });
  });

  describe('POST /api/employees', () => {
    const validEmployee = {
      name: 'John Doe',
      contractType: ContractType.FULL_TIME,
      weeklyHours: 40,
      maxHoursPerDay: 8,
      minRestHours: 12,
      team: 'Production A',
      active: true
    };

    it('should create a new employee with valid data', async () => {
      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validEmployee)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: validEmployee.name,
        contractType: validEmployee.contractType,
        weeklyHours: validEmployee.weeklyHours,
        team: validEmployee.team
      });
      expect(response.body.data.id).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidEmployee = {
        name: 'John Doe'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidEmployee)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate field constraints', async () => {
      const invalidEmployee = {
        ...validEmployee,
        name: 'A', // Too short
        weeklyHours: 70 // Too high
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidEmployee)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require HR_PLANNER or ADMIN role', async () => {
      const shiftLeaderToken = createTestToken([UserRole.SHIFT_LEADER]);
      
      await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${shiftLeaderToken}`)
        .send(validEmployee)
        .expect(403);
    });
  });

  describe('GET /api/employees/:id', () => {
    it('should return 404 for non-existent employee', async () => {
      const response = await request(app)
        .get('/api/employees/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/employees/:id', () => {
    it('should return 404 for non-existent employee', async () => {
      const updateData = { name: 'Updated Name' };
      
      const response = await request(app)
        .put('/api/employees/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/employees/:id', () => {
    it('should require ADMIN role', async () => {
      const hrToken = createTestToken([UserRole.HR_PLANNER]);
      
      await request(app)
        .delete('/api/employees/test-id')
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(403);
    });
  });
});
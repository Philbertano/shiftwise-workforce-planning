import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { DatabaseManager } from '../../database/config';
import jwt from 'jsonwebtoken';

describe('Security Tests - Authentication and Authorization', () => {
  let adminToken: string;
  let plannerToken: string;
  let viewerToken: string;
  let invalidToken: string;

  beforeAll(async () => {
    // Initialize test database
    await DatabaseManager.initialize();
    await DatabaseManager.runMigrations();

    // Create test users with different roles
    await DatabaseManager.query(`
      INSERT INTO users (id, username, email, role, active) VALUES 
      ('admin-1', 'test-admin', 'admin@test.com', 'admin', true),
      ('planner-1', 'test-planner', 'planner@test.com', 'planner', true),
      ('viewer-1', 'test-viewer', 'viewer@test.com', 'viewer', true),
      ('inactive-1', 'test-inactive', 'inactive@test.com', 'planner', false)
    `);

    // Get authentication tokens
    const adminAuth = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test-admin', password: 'test-password' });
    adminToken = adminAuth.body.token;

    const plannerAuth = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test-planner', password: 'test-password' });
    plannerToken = plannerAuth.body.token;

    const viewerAuth = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test-viewer', password: 'test-password' });
    viewerToken = viewerAuth.body.token;

    // Create invalid token
    invalidToken = jwt.sign({ userId: 'fake-user', role: 'admin' }, 'wrong-secret');
  });

  afterAll(async () => {
    await DatabaseManager.close();
  });

  describe('Authentication Tests', () => {
    it('should reject requests without authentication token', async () => {
      await request(app)
        .get('/api/employees')
        .expect(401);

      await request(app)
        .post('/api/plan/generate')
        .send({ dateRange: { start: '2024-01-15', end: '2024-01-15' } })
        .expect(401);
    });

    it('should reject requests with invalid tokens', async () => {
      await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      await request(app)
        .get('/api/employees')
        .set('Authorization', 'Bearer invalid-token-format')
        .expect(401);
    });

    it('should reject requests with expired tokens', async () => {
      const expiredToken = jwt.sign(
        { userId: 'test-user', role: 'planner', exp: Math.floor(Date.now() / 1000) - 3600 },
        process.env.JWT_SECRET || 'test-secret'
      );

      await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should reject requests from inactive users', async () => {
      const inactiveAuth = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test-inactive', password: 'test-password' })
        .expect(401);

      expect(inactiveAuth.body.error).toContain('inactive');
    });

    it('should handle malformed authorization headers', async () => {
      await request(app)
        .get('/api/employees')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      await request(app)
        .get('/api/employees')
        .set('Authorization', 'Bearer')
        .expect(401);
    });
  });

  describe('Authorization Tests - Role-Based Access Control', () => {
    describe('Admin Role', () => {
      it('should allow admin access to all endpoints', async () => {
        // Employee management
        await request(app)
          .get('/api/employees')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        await request(app)
          .post('/api/employees')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Test Employee',
            contractType: 'full-time',
            weeklyHours: 40
          })
          .expect(201);

        // Planning operations
        await request(app)
          .post('/api/plan/generate')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            dateRange: { start: '2024-01-15', end: '2024-01-15' },
            stationIds: []
          })
          .expect(200);

        // System configuration
        await request(app)
          .get('/api/system/config')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });
    });

    describe('Planner Role', () => {
      it('should allow planner access to planning and employee data', async () => {
        // Can view employees
        await request(app)
          .get('/api/employees')
          .set('Authorization', `Bearer ${plannerToken}`)
          .expect(200);

        // Can generate plans
        await request(app)
          .post('/api/plan/generate')
          .set('Authorization', `Bearer ${plannerToken}`)
          .send({
            dateRange: { start: '2024-01-15', end: '2024-01-15' },
            stationIds: []
          })
          .expect(200);

        // Can manage absences
        await request(app)
          .post('/api/absence')
          .set('Authorization', `Bearer ${plannerToken}`)
          .send({
            employeeId: 'test-employee-1',
            type: 'vacation',
            dateStart: '2024-01-20',
            dateEnd: '2024-01-20'
          })
          .expect(201);
      });

      it('should deny planner access to admin-only endpoints', async () => {
        // Cannot access system configuration
        await request(app)
          .get('/api/system/config')
          .set('Authorization', `Bearer ${plannerToken}`)
          .expect(403);

        // Cannot delete employees
        await request(app)
          .delete('/api/employees/test-employee-1')
          .set('Authorization', `Bearer ${plannerToken}`)
          .expect(403);

        // Cannot access audit logs
        await request(app)
          .get('/api/audit/logs')
          .set('Authorization', `Bearer ${plannerToken}`)
          .expect(403);
      });
    });

    describe('Viewer Role', () => {
      it('should allow viewer read-only access', async () => {
        // Can view employees
        await request(app)
          .get('/api/employees')
          .set('Authorization', `Bearer ${viewerToken}`)
          .expect(200);

        // Can view coverage
        await request(app)
          .get('/api/coverage')
          .set('Authorization', `Bearer ${viewerToken}`)
          .expect(200);

        // Can view plans
        await request(app)
          .get('/api/plans')
          .set('Authorization', `Bearer ${viewerToken}`)
          .expect(200);
      });

      it('should deny viewer write access', async () => {
        // Cannot create employees
        await request(app)
          .post('/api/employees')
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({
            name: 'Test Employee',
            contractType: 'full-time'
          })
          .expect(403);

        // Cannot generate plans
        await request(app)
          .post('/api/plan/generate')
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({
            dateRange: { start: '2024-01-15', end: '2024-01-15' }
          })
          .expect(403);

        // Cannot commit plans
        await request(app)
          .post('/api/plan/commit')
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({
            planId: 'test-plan-1',
            assignments: []
          })
          .expect(403);
      });
    });
  });

  describe('Data Protection Tests', () => {
    it('should not expose sensitive data in responses', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${plannerToken}`)
        .expect(200);

      // Check that sensitive fields are not exposed
      if (response.body.employees && response.body.employees.length > 0) {
        const employee = response.body.employees[0];
        expect(employee).not.toHaveProperty('password');
        expect(employee).not.toHaveProperty('ssn');
        expect(employee).not.toHaveProperty('bankAccount');
      }
    });

    it('should prevent SQL injection attacks', async () => {
      const maliciousInput = "'; DROP TABLE employees; --";
      
      const response = await request(app)
        .get(`/api/employees?search=${encodeURIComponent(maliciousInput)}`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .expect(200);

      // Should not cause an error and should return safe results
      expect(response.body).toHaveProperty('employees');
      
      // Verify table still exists by making another query
      await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${plannerToken}`)
        .expect(200);
    });

    it('should sanitize user input', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: xssPayload,
          contractType: 'full-time',
          weeklyHours: 40
        })
        .expect(201);

      // Name should be sanitized
      expect(response.body.name).not.toContain('<script>');
      expect(response.body.name).not.toContain('alert');
    });

    it('should enforce rate limiting', async () => {
      const requests = [];
      
      // Make many rapid requests
      for (let i = 0; i < 100; i++) {
        requests.push(
          request(app)
            .get('/api/employees')
            .set('Authorization', `Bearer ${plannerToken}`)
        );
      }

      const responses = await Promise.allSettled(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(
        (result) => result.status === 'fulfilled' && result.value.status === 429
      );
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Session Management', () => {
    it('should handle concurrent sessions properly', async () => {
      // Login from multiple "devices"
      const session1 = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test-planner', password: 'test-password' })
        .expect(200);

      const session2 = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test-planner', password: 'test-password' })
        .expect(200);

      // Both sessions should work
      await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${session1.body.token}`)
        .expect(200);

      await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${session2.body.token}`)
        .expect(200);
    });

    it('should invalidate tokens on logout', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test-planner', password: 'test-password' })
        .expect(200);

      const token = loginResponse.body.token;

      // Token should work initially
      await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Token should no longer work
      await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });

  describe('Audit Logging', () => {
    it('should log all security-relevant events', async () => {
      // Perform various operations
      await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Audit Test Employee',
          contractType: 'full-time',
          weeklyHours: 40
        })
        .expect(201);

      await request(app)
        .post('/api/plan/generate')
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          dateRange: { start: '2024-01-15', end: '2024-01-15' }
        })
        .expect(200);

      // Check audit logs (admin only)
      const auditResponse = await request(app)
        .get('/api/audit/logs?limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(auditResponse.body).toHaveProperty('logs');
      expect(auditResponse.body.logs).toBeInstanceOf(Array);
      expect(auditResponse.body.logs.length).toBeGreaterThan(0);

      // Verify log entries contain required fields
      const logEntry = auditResponse.body.logs[0];
      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).toHaveProperty('userId');
      expect(logEntry).toHaveProperty('action');
      expect(logEntry).toHaveProperty('resource');
    });
  });
});
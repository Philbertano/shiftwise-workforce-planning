// Integration tests for Authentication API endpoints

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authRoutes } from '../../api/routes/auth';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Authentication API Integration Tests', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'admin@shiftwise.com',
        password: 'admin123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user).toMatchObject({
        email: loginData.email,
        name: 'System Administrator'
      });
    });

    it('should reject invalid credentials', async () => {
      const loginData = {
        email: 'admin@shiftwise.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should validate request format', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123' // Too short
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      // Get a refresh token first
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@shiftwise.com',
          password: 'admin123'
        });
      
      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should refresh token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('expiresIn');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@shiftwise.com',
          password: 'admin123'
        });
      
      accessToken = loginResponse.body.data.accessToken;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        email: 'admin@shiftwise.com',
        name: 'System Administrator'
      });
      expect(response.body.data).toHaveProperty('permissions');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@shiftwise.com',
          password: 'admin123'
        });
      
      accessToken = loginResponse.body.data.accessToken;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/auth/logout')
        .expect(401);
    });
  });
});
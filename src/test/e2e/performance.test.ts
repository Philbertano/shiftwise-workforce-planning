import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { DatabaseManager } from '../../database/config';
import { generateLargeDataset } from '../fixtures/large-dataset';
import { performance } from 'perf_hooks';

describe('Performance Tests - 200 Employees, 10 Stations', () => {
  let authToken: string;
  let largeDataset: any;

  beforeAll(async () => {
    // Initialize test database
    await DatabaseManager.initialize();
    await DatabaseManager.runMigrations();
    
    // Generate large realistic dataset
    console.log('Generating large dataset (200 employees, 10 stations)...');
    largeDataset = await generateLargeDataset({
      employeeCount: 200,
      stationCount: 10,
      skillCount: 25,
      shiftTemplateCount: 4
    });

    // Authenticate test user
    const authResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'test-planner',
        password: 'test-password'
      });
    
    authToken = authResponse.body.token;
  });

  afterAll(async () => {
    await DatabaseManager.close();
  });

  describe('Constraint Solver Performance', () => {
    it('should generate plan within 3 seconds for 200 employees across 10 stations', async () => {
      const startTime = performance.now();

      const planRequest = {
        dateRange: {
          start: '2024-01-20',
          end: '2024-01-20'
        },
        stationIds: largeDataset.stations.map((s: any) => s.id),
        shiftTemplateIds: largeDataset.shiftTemplates.map((s: any) => s.id)
      };

      const response = await request(app)
        .post('/api/plan/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(planRequest)
        .expect(200);

      const endTime = performance.now();
      const executionTime = (endTime - startTime) / 1000; // Convert to seconds

      console.log(`Plan generation took ${executionTime.toFixed(2)} seconds`);
      
      // Requirement: Sub-3-second generation
      expect(executionTime).toBeLessThan(3);
      
      // Verify plan quality
      expect(response.body).toHaveProperty('assignments');
      expect(response.body.assignments).toBeInstanceOf(Array);
      expect(response.body.assignments.length).toBeGreaterThan(0);
      
      // Verify coverage metrics
      expect(response.body).toHaveProperty('coverage');
      expect(response.body.coverage.overallPercentage).toBeGreaterThan(70);
    });

    it('should handle concurrent plan generation requests', async () => {
      const concurrentRequests = 5;
      const promises: Promise<any>[] = [];

      const planRequest = {
        dateRange: {
          start: '2024-01-21',
          end: '2024-01-21'
        },
        stationIds: largeDataset.stations.slice(0, 5).map((s: any) => s.id),
        shiftTemplateIds: [largeDataset.shiftTemplates[0].id]
      };

      const startTime = performance.now();

      // Create concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/api/plan/generate')
            .set('Authorization', `Bearer ${authToken}`)
            .send(planRequest)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = (endTime - startTime) / 1000;

      console.log(`${concurrentRequests} concurrent requests completed in ${totalTime.toFixed(2)} seconds`);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('assignments');
      });

      // Average time per request should still be reasonable
      const avgTimePerRequest = totalTime / concurrentRequests;
      expect(avgTimePerRequest).toBeLessThan(5);
    });

    it('should optimize assignments efficiently for large datasets', async () => {
      // First generate a basic plan
      const initialPlan = await request(app)
        .post('/api/plan/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dateRange: { start: '2024-01-22', end: '2024-01-22' },
          stationIds: largeDataset.stations.map((s: any) => s.id),
          strategy: 'basic'
        })
        .expect(200);

      const startTime = performance.now();

      // Run optimization
      const optimizationResponse = await request(app)
        .post('/api/plan/optimize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: initialPlan.body.planId,
          objectives: ['fairness', 'preferences', 'continuity']
        })
        .expect(200);

      const endTime = performance.now();
      const optimizationTime = (endTime - startTime) / 1000;

      console.log(`Optimization took ${optimizationTime.toFixed(2)} seconds`);

      // Optimization should complete within reasonable time
      expect(optimizationTime).toBeLessThan(10);
      
      // Should show improvement metrics
      expect(optimizationResponse.body).toHaveProperty('improvements');
      expect(optimizationResponse.body).toHaveProperty('optimizedAssignments');
    });
  });

  describe('Database Performance', () => {
    it('should handle complex queries efficiently', async () => {
      const startTime = performance.now();

      // Complex query involving multiple joins
      const response = await request(app)
        .get('/api/employees/qualifications?includeExpiring=true&stationFilter=all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = performance.now();
      const queryTime = (endTime - startTime) / 1000;

      console.log(`Complex qualification query took ${queryTime.toFixed(3)} seconds`);

      // Should complete within 1 second
      expect(queryTime).toBeLessThan(1);
      expect(response.body).toHaveProperty('employees');
      expect(response.body.employees.length).toBe(200);
    });

    it('should handle bulk operations efficiently', async () => {
      const startTime = performance.now();

      // Bulk update employee qualifications
      const bulkUpdate = {
        updates: largeDataset.employees.slice(0, 50).map((emp: any) => ({
          employeeId: emp.id,
          skillId: largeDataset.skills[0].id,
          level: 2,
          validUntil: '2024-12-31'
        }))
      };

      const response = await request(app)
        .post('/api/employees/qualifications/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkUpdate)
        .expect(200);

      const endTime = performance.now();
      const bulkTime = (endTime - startTime) / 1000;

      console.log(`Bulk update of 50 qualifications took ${bulkTime.toFixed(3)} seconds`);

      // Should complete within 2 seconds
      expect(bulkTime).toBeLessThan(2);
      expect(response.body).toHaveProperty('updatedCount');
      expect(response.body.updatedCount).toBe(50);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not exceed memory limits during large operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform memory-intensive operation
      const response = await request(app)
        .post('/api/plan/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dateRange: { start: '2024-01-23', end: '2024-01-27' }, // 5 days
          stationIds: largeDataset.stations.map((s: any) => s.id),
          shiftTemplateIds: largeDataset.shiftTemplates.map((s: any) => s.id)
        })
        .expect(200);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB

      console.log(`Memory increase: ${memoryIncrease.toFixed(2)} MB`);

      // Should not increase memory by more than 100MB
      expect(memoryIncrease).toBeLessThan(100);
      expect(response.body).toHaveProperty('assignments');
    });

    it('should clean up resources after operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform multiple operations
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/plan/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            dateRange: { start: `2024-01-${24 + i}`, end: `2024-01-${24 + i}` },
            stationIds: largeDataset.stations.slice(0, 3).map((s: any) => s.id)
          })
          .expect(200);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB

      console.log(`Memory increase after 5 operations: ${memoryIncrease.toFixed(2)} MB`);

      // Memory should not grow excessively
      expect(memoryIncrease).toBeLessThan(50);
    });
  });
});
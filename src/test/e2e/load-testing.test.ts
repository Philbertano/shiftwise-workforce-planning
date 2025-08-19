import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { DatabaseManager } from '../../database/config';
import { generateLargeDataset } from '../fixtures/large-dataset';
import { performance } from 'perf_hooks';

describe('Load Testing - Constraint Solver Performance Requirements', () => {
  let authToken: string;
  let largeDataset: any;

  beforeAll(async () => {
    // Initialize test database
    await DatabaseManager.initialize();
    await DatabaseManager.runMigrations();
    
    // Generate large realistic dataset
    console.log('Generating large dataset for load testing...');
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

  describe('Constraint Solver Load Tests', () => {
    it('should handle peak load scenarios within performance requirements', async () => {
      const concurrentUsers = 10;
      const requestsPerUser = 5;
      const totalRequests = concurrentUsers * requestsPerUser;
      
      console.log(`Starting load test: ${concurrentUsers} concurrent users, ${requestsPerUser} requests each`);
      
      const startTime = performance.now();
      const promises: Promise<any>[] = [];

      // Simulate concurrent users making planning requests
      for (let user = 0; user < concurrentUsers; user++) {
        for (let req = 0; req < requestsPerUser; req++) {
          const planRequest = {
            dateRange: {
              start: `2024-01-${15 + (user * requestsPerUser + req) % 15}`,
              end: `2024-01-${15 + (user * requestsPerUser + req) % 15}`
            },
            stationIds: largeDataset.stations.slice(
              user % 3, 
              (user % 3) + 3
            ).map((s: any) => s.id),
            shiftTemplateIds: [largeDataset.shiftTemplates[user % 4].id]
          };

          promises.push(
            request(app)
              .post('/api/plan/generate')
              .set('Authorization', `Bearer ${authToken}`)
              .send(planRequest)
          );
        }
      }

      const responses = await Promise.allSettled(promises);
      const endTime = performance.now();
      const totalTime = (endTime - startTime) / 1000;

      console.log(`Load test completed in ${totalTime.toFixed(2)} seconds`);
      console.log(`Average time per request: ${(totalTime / totalRequests).toFixed(3)} seconds`);

      // Analyze results
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const failed = responses.filter(r => r.status === 'rejected' || r.value.status !== 200);

      console.log(`Successful requests: ${successful.length}/${totalRequests}`);
      console.log(`Failed requests: ${failed.length}/${totalRequests}`);

      // Performance requirements
      expect(successful.length / totalRequests).toBeGreaterThan(0.95); // 95% success rate
      expect(totalTime / totalRequests).toBeLessThan(5); // Average under 5 seconds per request
      
      // Verify response quality for successful requests
      const sampleResponse = (successful[0] as any).value;
      expect(sampleResponse.body).toHaveProperty('assignments');
      expect(sampleResponse.body.assignments).toBeInstanceOf(Array);
    });

    it('should maintain performance under sustained load', async () => {
      const duration = 30; // seconds
      const requestInterval = 1000; // ms
      const expectedRequests = duration;
      
      console.log(`Starting sustained load test for ${duration} seconds`);
      
      const results: any[] = [];
      const startTime = performance.now();
      
      // Create sustained load
      for (let i = 0; i < expectedRequests; i++) {
        setTimeout(async () => {
          const requestStart = performance.now();
          
          try {
            const response = await request(app)
              .post('/api/plan/generate')
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                dateRange: {
                  start: `2024-02-${(i % 28) + 1}`,
                  end: `2024-02-${(i % 28) + 1}`
                },
                stationIds: largeDataset.stations.slice(0, 5).map((s: any) => s.id),
                shiftTemplateIds: [largeDataset.shiftTemplates[i % 4].id]
              });

            const requestEnd = performance.now();
            results.push({
              success: response.status === 200,
              duration: (requestEnd - requestStart) / 1000,
              timestamp: requestEnd - startTime
            });
          } catch (error) {
            const requestEnd = performance.now();
            results.push({
              success: false,
              duration: (requestEnd - requestStart) / 1000,
              timestamp: requestEnd - startTime,
              error: error.message
            });
          }
        }, i * requestInterval);
      }

      // Wait for all requests to complete
      await new Promise(resolve => setTimeout(resolve, (duration + 5) * 1000));

      console.log(`Sustained load test completed. Processed ${results.length} requests`);

      // Analyze sustained performance
      const successfulResults = results.filter(r => r.success);
      const averageResponseTime = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
      const maxResponseTime = Math.max(...successfulResults.map(r => r.duration));
      const successRate = successfulResults.length / results.length;

      console.log(`Success rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(`Average response time: ${averageResponseTime.toFixed(3)}s`);
      console.log(`Max response time: ${maxResponseTime.toFixed(3)}s`);

      // Performance assertions
      expect(successRate).toBeGreaterThan(0.9); // 90% success rate under sustained load
      expect(averageResponseTime).toBeLessThan(3); // Average under 3 seconds
      expect(maxResponseTime).toBeLessThan(10); // No request over 10 seconds
    });

    it('should handle memory pressure gracefully', async () => {
      const memoryIntensiveRequests = 20;
      const promises: Promise<any>[] = [];

      console.log(`Starting memory pressure test with ${memoryIntensiveRequests} large requests`);

      const initialMemory = process.memoryUsage();

      // Create memory-intensive requests (large date ranges)
      for (let i = 0; i < memoryIntensiveRequests; i++) {
        const planRequest = {
          dateRange: {
            start: '2024-03-01',
            end: '2024-03-07' // Full week
          },
          stationIds: largeDataset.stations.map((s: any) => s.id), // All stations
          shiftTemplateIds: largeDataset.shiftTemplates.map((s: any) => s.id) // All shifts
        };

        promises.push(
          request(app)
            .post('/api/plan/generate')
            .set('Authorization', `Bearer ${authToken}`)
            .send(planRequest)
        );
      }

      const responses = await Promise.allSettled(promises);
      const finalMemory = process.memoryUsage();

      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB
      console.log(`Memory increase during test: ${memoryIncrease.toFixed(2)} MB`);

      // Analyze results
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const outOfMemory = responses.filter(r => 
        r.status === 'rejected' || 
        (r.value && r.value.status === 500 && r.value.body.error?.includes('memory'))
      );

      console.log(`Successful requests: ${successful.length}/${memoryIntensiveRequests}`);
      console.log(`Out of memory errors: ${outOfMemory.length}/${memoryIntensiveRequests}`);

      // Memory management assertions
      expect(memoryIncrease).toBeLessThan(500); // Should not increase by more than 500MB
      expect(successful.length / memoryIntensiveRequests).toBeGreaterThan(0.8); // 80% success rate
      expect(outOfMemory.length).toBeLessThan(3); // Minimal out-of-memory errors
    });

    it('should recover from database connection issues', async () => {
      console.log('Testing database connection recovery');

      // First, verify normal operation
      const normalResponse = await request(app)
        .post('/api/plan/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dateRange: { start: '2024-04-01', end: '2024-04-01' },
          stationIds: largeDataset.stations.slice(0, 3).map((s: any) => s.id)
        })
        .expect(200);

      expect(normalResponse.body).toHaveProperty('assignments');

      // Simulate database connection issues by overwhelming the connection pool
      const overloadPromises: Promise<any>[] = [];
      for (let i = 0; i < 50; i++) {
        overloadPromises.push(
          request(app)
            .get('/api/employees')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const overloadResults = await Promise.allSettled(overloadPromises);
      const timeoutErrors = overloadResults.filter(r => 
        r.status === 'rejected' || 
        (r.value && r.value.status >= 500)
      );

      console.log(`Connection pool stress results: ${timeoutErrors.length} errors out of 50 requests`);

      // Wait for connection pool to recover
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify recovery
      const recoveryResponse = await request(app)
        .post('/api/plan/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dateRange: { start: '2024-04-02', end: '2024-04-02' },
          stationIds: largeDataset.stations.slice(0, 3).map((s: any) => s.id)
        })
        .expect(200);

      expect(recoveryResponse.body).toHaveProperty('assignments');
      console.log('Database connection recovery successful');
    });
  });

  describe('API Endpoint Load Tests', () => {
    it('should handle high-frequency coverage requests', async () => {
      const requestCount = 100;
      const promises: Promise<any>[] = [];

      console.log(`Testing coverage endpoint with ${requestCount} concurrent requests`);

      const startTime = performance.now();

      for (let i = 0; i < requestCount; i++) {
        promises.push(
          request(app)
            .get(`/api/coverage?date=2024-04-${(i % 30) + 1}`)
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.allSettled(promises);
      const endTime = performance.now();
      const totalTime = (endTime - startTime) / 1000;

      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      
      console.log(`Coverage requests completed in ${totalTime.toFixed(2)}s`);
      console.log(`Success rate: ${(successful.length / requestCount * 100).toFixed(1)}%`);

      expect(successful.length / requestCount).toBeGreaterThan(0.95);
      expect(totalTime / requestCount).toBeLessThan(0.1); // Average under 100ms per request
    });

    it('should handle bulk employee operations efficiently', async () => {
      const batchSize = 50;
      const batchCount = 5;

      console.log(`Testing bulk operations: ${batchCount} batches of ${batchSize} employees each`);

      for (let batch = 0; batch < batchCount; batch++) {
        const startTime = performance.now();

        const bulkUpdate = {
          updates: Array.from({ length: batchSize }, (_, i) => ({
            employeeId: largeDataset.employees[batch * batchSize + i].id,
            skillId: largeDataset.skills[i % largeDataset.skills.length].id,
            level: (i % 3) + 1,
            validUntil: '2024-12-31'
          }))
        };

        const response = await request(app)
          .post('/api/employees/qualifications/bulk')
          .set('Authorization', `Bearer ${authToken}`)
          .send(bulkUpdate)
          .expect(200);

        const endTime = performance.now();
        const batchTime = (endTime - startTime) / 1000;

        console.log(`Batch ${batch + 1} completed in ${batchTime.toFixed(3)}s`);

        expect(response.body.updatedCount).toBe(batchSize);
        expect(batchTime).toBeLessThan(5); // Each batch under 5 seconds
      }
    });
  });
});
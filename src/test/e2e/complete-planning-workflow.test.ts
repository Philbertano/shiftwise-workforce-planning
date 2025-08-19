import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { DatabaseManager } from '../../database/config';
import { seedTestData } from '../fixtures/seed-data';

describe('Complete Planning Workflow E2E Tests', () => {
  let authToken: string;
  let testEmployees: any[];
  let testStations: any[];
  let testShifts: any[];

  beforeAll(async () => {
    // Initialize test database
    await DatabaseManager.initialize();
    
    // Run migrations manually
    const { runMigrations } = await import('../../database/migrate');
    await runMigrations();
    
    // Seed test data
    const seedData = await seedTestData();
    testEmployees = seedData.employees;
    testStations = seedData.stations;
    testShifts = seedData.shifts;

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

  beforeEach(async () => {
    // Clean up assignments between tests
    await DatabaseManager.query('DELETE FROM assignments WHERE status = ?', ['proposed']);
  });

  describe('End-to-End Planning Workflow', () => {
    it('should complete full planning workflow from generation to commitment', async () => {
      // Step 1: Generate initial plan
      const planRequest = {
        dateRange: {
          start: '2024-01-15',
          end: '2024-01-15'
        },
        stationIds: testStations.slice(0, 5).map(s => s.id),
        shiftTemplateIds: testShifts.slice(0, 2).map(s => s.id)
      };

      const generateResponse = await request(app)
        .post('/api/plan/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(planRequest)
        .expect(200);

      expect(generateResponse.body).toHaveProperty('planId');
      expect(generateResponse.body).toHaveProperty('assignments');
      expect(generateResponse.body.assignments).toBeInstanceOf(Array);
      expect(generateResponse.body.assignments.length).toBeGreaterThan(0);

      const planId = generateResponse.body.planId;

      // Step 2: Review coverage status
      const coverageResponse = await request(app)
        .get(`/api/coverage?planId=${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(coverageResponse.body).toHaveProperty('heatmap');
      expect(coverageResponse.body).toHaveProperty('gaps');
      expect(coverageResponse.body).toHaveProperty('overallCoverage');

      // Step 3: Get assignment explanations
      const firstAssignment = generateResponse.body.assignments[0];
      const explanationResponse = await request(app)
        .get(`/api/plan/explain/${firstAssignment.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(explanationResponse.body).toHaveProperty('explanation');
      expect(explanationResponse.body.explanation).toContain('skill match');

      // Step 4: Simulate what-if scenario
      const simulationRequest = {
        planId,
        scenario: {
          type: 'absence',
          employeeId: testEmployees[0].id,
          dateRange: {
            start: '2024-01-15',
            end: '2024-01-15'
          }
        }
      };

      const simulationResponse = await request(app)
        .post('/api/plan/simulate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(simulationRequest)
        .expect(200);

      expect(simulationResponse.body).toHaveProperty('impact');
      expect(simulationResponse.body).toHaveProperty('alternativeAssignments');

      // Step 5: Commit approved assignments
      const commitRequest = {
        planId,
        assignments: generateResponse.body.assignments.slice(0, 3).map((a: any) => ({
          id: a.id,
          status: 'approved'
        }))
      };

      const commitResponse = await request(app)
        .post('/api/plan/commit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(commitRequest)
        .expect(200);

      expect(commitResponse.body).toHaveProperty('committedCount');
      expect(commitResponse.body.committedCount).toBe(3);

      // Step 6: Verify execution monitoring
      const monitoringResponse = await request(app)
        .get(`/api/execution/status?date=2024-01-15`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(monitoringResponse.body).toHaveProperty('assignments');
      expect(monitoringResponse.body.assignments.filter((a: any) => a.status === 'confirmed')).toHaveLength(3);
    });

    it('should handle constraint violations during planning', async () => {
      // Create a scenario with intentional constraint violations
      const conflictRequest = {
        dateRange: {
          start: '2024-01-16',
          end: '2024-01-16'
        },
        stationIds: testStations.map(s => s.id), // All stations
        shiftTemplateIds: [testShifts[0].id], // Single shift
        constraints: {
          maxHoursPerDay: 4 // Artificially low to trigger violations
        }
      };

      const response = await request(app)
        .post('/api/plan/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(conflictRequest)
        .expect(200);

      expect(response.body).toHaveProperty('violations');
      expect(response.body.violations).toBeInstanceOf(Array);
      expect(response.body.violations.length).toBeGreaterThan(0);

      // Verify violation details
      const violation = response.body.violations[0];
      expect(violation).toHaveProperty('constraintId');
      expect(violation).toHaveProperty('severity');
      expect(violation).toHaveProperty('message');
      expect(violation).toHaveProperty('suggestedActions');
    });

    it('should support absence management workflow', async () => {
      // Step 1: Submit absence request
      const absenceRequest = {
        employeeId: testEmployees[0].id,
        type: 'vacation',
        dateStart: '2024-01-17',
        dateEnd: '2024-01-17',
        reason: 'Personal vacation day'
      };

      const absenceResponse = await request(app)
        .post('/api/absence')
        .set('Authorization', `Bearer ${authToken}`)
        .send(absenceRequest)
        .expect(201);

      expect(absenceResponse.body).toHaveProperty('id');
      expect(absenceResponse.body).toHaveProperty('conflicts');

      // Step 2: Generate plan considering the absence
      const planWithAbsence = await request(app)
        .post('/api/plan/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dateRange: {
            start: '2024-01-17',
            end: '2024-01-17'
          },
          stationIds: testStations.slice(0, 3).map(s => s.id)
        })
        .expect(200);

      // Verify the absent employee is not assigned
      const absentEmployeeAssignments = planWithAbsence.body.assignments.filter(
        (a: any) => a.employeeId === testEmployees[0].id
      );
      expect(absentEmployeeAssignments).toHaveLength(0);
    });
  });

  describe('AI Assistant Integration', () => {
    it('should handle natural language planning requests', async () => {
      const aiRequest = {
        command: 'Generate a plan for tomorrow with focus on Station A and Station B',
        context: {
          date: '2024-01-18',
          preferences: ['minimize_overtime', 'balance_workload']
        }
      };

      const aiResponse = await request(app)
        .post('/api/ai/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(aiRequest)
        .expect(200);

      expect(aiResponse.body).toHaveProperty('planId');
      expect(aiResponse.body).toHaveProperty('explanation');
      expect(aiResponse.body).toHaveProperty('assignments');
    });

    it('should provide detailed explanations for AI decisions', async () => {
      // First generate a plan
      const planResponse = await request(app)
        .post('/api/plan/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dateRange: { start: '2024-01-19', end: '2024-01-19' },
          stationIds: testStations.slice(0, 2).map(s => s.id)
        })
        .expect(200);

      // Then request AI explanation
      const explanationResponse = await request(app)
        .post('/api/ai/explain')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: planResponse.body.planId,
          question: 'Why was John assigned to Station A instead of Station B?'
        })
        .expect(200);

      expect(explanationResponse.body).toHaveProperty('explanation');
      expect(explanationResponse.body.explanation).toContain('skill');
      expect(explanationResponse.body.explanation.length).toBeGreaterThan(50);
    });
  });
});
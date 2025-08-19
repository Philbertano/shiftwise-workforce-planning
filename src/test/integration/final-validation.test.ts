import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { DatabaseManager } from '../../database/config';
import { runMigrations } from '../../database/migrate';
import { seedComprehensiveData, cleanupComprehensiveData } from '../fixtures/comprehensive-seed-data';

/**
 * Final System Integration Validation
 * 
 * This test suite validates the complete system integration and ensures
 * all critical requirements are met for task 14.1 completion.
 */
describe('Final System Integration Validation', () => {
  let authToken: string;
  let testData: any;

  beforeAll(async () => {
    await DatabaseManager.initialize();
    await runMigrations();
    
    testData = await seedComprehensiveData({
      employeeCount: 30,
      skillCount: 10,
      stationCount: 6,
      shiftTemplateCount: 3,
      daysToSeed: 5
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
    await cleanupComprehensiveData();
    await DatabaseManager.close();
  });

  describe('Core Service Integration', () => {
    it('should validate complete planning workflow integration', async () => {
      // 1. Generate a plan
      const planResponse = await request(app)
        .post('/api/plan/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dateRange: {
            start: '2024-01-15',
            end: '2024-01-15'
          },
          stationIds: testData.stations.slice(0, 4).map((s: any) => s.id)
        })
        .expect(200);

      expect(planResponse.body.planId).toBeDefined();
      expect(planResponse.body.assignments).toBeInstanceOf(Array);

      // 2. Validate constraint system integration
      expect(planResponse.body.violations || []).toBeInstanceOf(Array);
      
      // 3. Test coverage analysis
      const coverageResponse = await request(app)
        .get(`/api/coverage?planId=${planResponse.body.planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(coverageResponse.body.heatmap).toBeDefined();
      expect(coverageResponse.body.overallCoverage).toBeDefined();

      // 4. Test assignment explanations
      if (planResponse.body.assignments.length > 0) {
        const explanationResponse = await request(app)
          .get(`/api/plan/explain/${planResponse.body.assignments[0].id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(explanationResponse.body.explanation).toBeDefined();
      }

      // 5. Test plan commitment
      const commitResponse = await request(app)
        .post('/api/plan/commit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: planResponse.body.planId,
          assignments: planResponse.body.assignments.slice(0, 2).map((a: any) => ({
            id: a.id,
            status: 'approved'
          }))
        })
        .expect(200);

      expect(commitResponse.body.committedCount).toBe(2);
    });

    it('should validate KIRO AI integration', async () => {
      // Test AI-powered plan generation
      const aiPlanResponse = await request(app)
        .post('/api/ai/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          command: 'Generate a balanced plan for tomorrow with focus on critical stations',
          context: {
            date: '2024-01-16',
            preferences: ['balance_workload']
          }
        })
        .expect(200);

      expect(aiPlanResponse.body.planId).toBeDefined();
      expect(aiPlanResponse.body.explanation).toBeDefined();
      expect(aiPlanResponse.body.assignments).toBeInstanceOf(Array);

      // Test AI explanation
      const aiExplanationResponse = await request(app)
        .post('/api/ai/explain')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: aiPlanResponse.body.planId,
          question: 'Why were these assignments made?'
        })
        .expect(200);

      expect(aiExplanationResponse.body.explanation).toBeDefined();
      expect(aiExplanationResponse.body.explanation.length).toBeGreaterThan(50);
    });

    it('should validate absence management integration', async () => {
      // Create an absence
      const absenceResponse = await request(app)
        .post('/api/absence')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeId: testData.employees[0].id,
          type: 'sick',
          dateStart: '2024-01-17',
          dateEnd: '2024-01-17',
          reason: 'Integration test absence'
        })
        .expect(201);

      expect(absenceResponse.body.id).toBeDefined();
      expect(absenceResponse.body.conflicts).toBeInstanceOf(Array);

      // Test simulation with absence
      const simulationResponse = await request(app)
        .post('/api/plan/simulate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scenario: {
            type: 'absence',
            employeeId: testData.employees[0].id,
            dateRange: {
              start: '2024-01-17',
              end: '2024-01-17'
            }
          }
        })
        .expect(200);

      expect(simulationResponse.body.impact).toBeDefined();
      expect(simulationResponse.body.alternativeAssignments).toBeDefined();
    });
  });

  describe('Data Flow Validation', () => {
    it('should maintain data consistency across all operations', async () => {
      // Generate a plan
      const planResponse = await request(app)
        .post('/api/plan/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dateRange: {
            start: '2024-01-18',
            end: '2024-01-18'
          },
          stationIds: testData.stations.slice(0, 3).map((s: any) => s.id)
        })
        .expect(200);

      // Verify assignments exist in database
      const dbAssignments = await DatabaseManager.query(
        'SELECT COUNT(*) as count FROM assignments WHERE demand_id IN (SELECT id FROM shift_demands WHERE date = ?)',
        ['2024-01-18']
      );
      expect(dbAssignments[0].count).toBeGreaterThan(0);

      // Commit some assignments
      await request(app)
        .post('/api/plan/commit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: planResponse.body.planId,
          assignments: planResponse.body.assignments.slice(0, 1).map((a: any) => ({
            id: a.id,
            status: 'approved'
          }))
        })
        .expect(200);

      // Verify status updates in database
      const confirmedAssignments = await DatabaseManager.query(
        'SELECT COUNT(*) as count FROM assignments WHERE status = ? AND demand_id IN (SELECT id FROM shift_demands WHERE date = ?)',
        ['confirmed', '2024-01-18']
      );
      expect(confirmedAssignments[0].count).toBe(1);

      // Verify audit trail
      const auditEntries = await DatabaseManager.query(
        'SELECT COUNT(*) as count FROM audit_logs WHERE entity_type = ? AND action IN (?, ?)',
        ['plan', 'create', 'commit']
      );
      expect(auditEntries[0].count).toBeGreaterThan(0);
    });
  });

  describe('Performance Validation', () => {
    it('should meet performance requirements', async () => {
      const startTime = Date.now();
      
      // Generate plan for all stations (performance test)
      const response = await request(app)
        .post('/api/plan/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dateRange: {
            start: '2024-01-19',
            end: '2024-01-19'
          },
          stationIds: testData.stations.map((s: any) => s.id) // All stations
        })
        .expect(200);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete within 3 seconds (requirement 1.1)
      expect(executionTime).toBeLessThan(3000);
      expect(response.body.assignments).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling Validation', () => {
    it('should handle errors gracefully across all services', async () => {
      // Test with invalid data
      const invalidPlanResponse = await request(app)
        .post('/api/plan/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dateRange: {
            start: '2024-01-20',
            end: '2024-01-20'
          },
          stationIds: ['nonexistent-station']
        })
        .expect(200); // Should still return 200 but with violations

      expect(invalidPlanResponse.body.violations).toBeInstanceOf(Array);
      expect(invalidPlanResponse.body.violations.length).toBeGreaterThan(0);

      // Test invalid absence
      const invalidAbsenceResponse = await request(app)
        .post('/api/absence')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeId: 'nonexistent-employee',
          type: 'sick',
          dateStart: '2024-01-20',
          dateEnd: '2024-01-20',
          reason: 'Error test'
        })
        .expect(400);

      expect(invalidAbsenceResponse.body.error).toBeDefined();

      // Test invalid AI request
      const invalidAiResponse = await request(app)
        .post('/api/ai/explain')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: 'nonexistent-plan',
          question: 'Why?'
        })
        .expect(200); // Should return success: false

      expect(invalidAiResponse.body.success).toBe(false);
    });
  });

  describe('Security and Authorization Validation', () => {
    it('should enforce authentication on protected endpoints', async () => {
      // Test without auth token
      await request(app)
        .post('/api/plan/generate')
        .send({
          dateRange: {
            start: '2024-01-21',
            end: '2024-01-21'
          }
        })
        .expect(401);

      // Test with invalid token
      await request(app)
        .post('/api/plan/generate')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          dateRange: {
            start: '2024-01-21',
            end: '2024-01-21'
          }
        })
        .expect(401);
    });
  });

  describe('Complete Requirements Validation', () => {
    it('should validate all critical requirements are met', async () => {
      // This test validates that the system meets all requirements from the spec
      
      // Requirement 1: Automatic shift plan generation
      const planResponse = await request(app)
        .post('/api/plan/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dateRange: {
            start: '2024-01-22',
            end: '2024-01-22'
          },
          stationIds: testData.stations.slice(0, 5).map((s: any) => s.id)
        })
        .expect(200);

      expect(planResponse.body.planId).toBeDefined();
      expect(planResponse.body.assignments).toBeInstanceOf(Array);

      // Requirement 2: Employee qualifications tracking
      const qualificationsResponse = await request(app)
        .get('/api/employees/qualifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(qualificationsResponse.body).toBeInstanceOf(Array);

      // Requirement 3: Coverage status visualization
      const coverageResponse = await request(app)
        .get(`/api/coverage?planId=${planResponse.body.planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(coverageResponse.body.heatmap).toBeDefined();
      expect(coverageResponse.body.gaps).toBeInstanceOf(Array);

      // Requirement 4: What-if scenario simulation
      const simulationResponse = await request(app)
        .post('/api/plan/simulate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scenario: {
            type: 'absence',
            employeeId: testData.employees[1].id,
            dateRange: {
              start: '2024-01-22',
              end: '2024-01-22'
            }
          }
        })
        .expect(200);

      expect(simulationResponse.body.impact).toBeDefined();

      // Requirement 5: Assignment explanations
      if (planResponse.body.assignments.length > 0) {
        const explanationResponse = await request(app)
          .get(`/api/plan/explain/${planResponse.body.assignments[0].id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(explanationResponse.body.explanation).toBeDefined();
      }

      // Requirement 7: Audit trails
      const auditResponse = await request(app)
        .get(`/api/audit/logs?entityType=plan&entityId=${planResponse.body.planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(auditResponse.body).toBeInstanceOf(Array);
      expect(auditResponse.body.length).toBeGreaterThan(0);

      // Requirement 10: Plan commitment
      const commitResponse = await request(app)
        .post('/api/plan/commit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: planResponse.body.planId,
          assignments: planResponse.body.assignments.slice(0, 1).map((a: any) => ({
            id: a.id,
            status: 'approved'
          }))
        })
        .expect(200);

      expect(commitResponse.body.committedCount).toBe(1);

      console.log('✅ All critical requirements validated successfully');
    });
  });
});
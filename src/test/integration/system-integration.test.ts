import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { DatabaseManager } from '../../database/config';
import { runMigrations } from '../../database/migrate';
import { seedComprehensiveData, cleanupComprehensiveData } from '../fixtures/comprehensive-seed-data';
import { KiroToolsService } from '../../services/KiroToolsService';
import { PlanningService } from '../../services/PlanningService';
import { ConstraintManager } from '../../constraints/ConstraintManager';
import { ExplanationEngine } from '../../services/ExplanationEngine';
import { SimulationService } from '../../services/SimulationService';
import { AuditService } from '../../services/AuditService';
import { AbsenceService } from '../../services/AbsenceService';

describe('System Integration Tests', () => {
  let authToken: string;
  let testData: any;
  let services: {
    planning: PlanningService;
    kiroTools: KiroToolsService;
    audit: AuditService;
    absence: AbsenceService;
    simulation: SimulationService;
    explanation: ExplanationEngine;
    constraints: ConstraintManager;
  };

  beforeAll(async () => {
    // Initialize database and run migrations
    await DatabaseManager.initialize();
    await runMigrations();
    
    // Seed comprehensive test data
    testData = await seedComprehensiveData({
      employeeCount: 50,
      skillCount: 15,
      stationCount: 8,
      shiftTemplateCount: 4,
      daysToSeed: 7
    });

    // Initialize services
    services = {
      constraints: new ConstraintManager(),
      planning: new PlanningService(new ConstraintManager()),
      explanation: new ExplanationEngine(),
      simulation: new SimulationService(new PlanningService(new ConstraintManager())),
      audit: new AuditService(),
      absence: new AbsenceService(),
      kiroTools: new KiroToolsService(
        new PlanningService(new ConstraintManager()),
        new ExplanationEngine(),
        new SimulationService(new PlanningService(new ConstraintManager())),
        new ConstraintManager()
      )
    };

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

  beforeEach(async () => {
    // Clean up any test-specific data between tests
    await DatabaseManager.query('DELETE FROM assignments WHERE created_by = ?', ['integration-test']);
    await DatabaseManager.query('DELETE FROM absences WHERE approved_by = ?', ['integration-test']);
  });

  describe('Service Layer Integration', () => {
    it('should integrate all planning services correctly', async () => {
      // Test planning service with constraint validation
      const planRequest = {
        dateRange: {
          start: new Date('2024-01-15'),
          end: new Date('2024-01-15')
        },
        stationIds: testData.stations.slice(0, 5).map((s: any) => s.id),
        shiftTemplateIds: testData.shifts.slice(0, 2).map((s: any) => s.id)
      };

      const plan = await services.planning.generatePlan(planRequest, 'integration-test');
      
      expect(plan).toBeDefined();
      expect(plan.assignments).toBeInstanceOf(Array);
      expect(plan.assignments.length).toBeGreaterThan(0);
      expect(plan.coverageStatus).toBeDefined();
      expect(plan.violations).toBeInstanceOf(Array);

      // Verify constraint validation was applied
      const violations = await services.constraints.validateAssignments(plan.assignments);
      expect(violations).toEqual(plan.violations);

      // Test explanation generation
      if (plan.assignments.length > 0) {
        const explanation = await services.explanation.explainAssignment(plan.assignments[0]);
        expect(explanation).toBeDefined();
        expect(explanation.reasoning).toBeDefined();
        expect(explanation.factors).toBeInstanceOf(Array);
      }

      // Test audit logging
      const auditEntries = await services.audit.getAuditLog({
        entityType: 'plan',
        entityId: plan.id,
        limit: 10
      });
      expect(auditEntries.length).toBeGreaterThan(0);
      expect(auditEntries[0].action).toBe('plan_generated');
    });

    it('should handle absence impact simulation across services', async () => {
      // First generate a baseline plan
      const baselinePlan = await services.planning.generatePlan({
        dateRange: {
          start: new Date('2024-01-16'),
          end: new Date('2024-01-16')
        },
        stationIds: testData.stations.slice(0, 3).map((s: any) => s.id)
      }, 'integration-test');

      // Create an absence
      const absence = await services.absence.createAbsence({
        employeeId: testData.employees[0].id,
        type: 'sick',
        dateStart: new Date('2024-01-16'),
        dateEnd: new Date('2024-01-16'),
        reason: 'Integration test absence'
      }, 'integration-test');

      expect(absence).toBeDefined();
      expect(absence.conflicts).toBeInstanceOf(Array);

      // Simulate the impact
      const simulation = await services.simulation.simulateAbsence(
        testData.employees[0].id,
        {
          start: new Date('2024-01-16'),
          end: new Date('2024-01-16')
        },
        'sick'
      );

      expect(simulation).toBeDefined();
      expect(simulation.impactAnalysis).toBeDefined();
      expect(simulation.originalCoverage).toBeDefined();
      expect(simulation.simulatedCoverage).toBeDefined();

      // Verify the simulation shows impact
      expect(simulation.impactAnalysis.coverageChange).toBeLessThanOrEqual(0);
      expect(simulation.impactAnalysis.affectedStations).toBeInstanceOf(Array);
    });

    it('should integrate KIRO tools with all backend services', async () => {
      // Test natural language plan generation
      const kiroResult = await services.kiroTools.generatePlan({
        dateRange: {
          start: new Date('2024-01-17'),
          end: new Date('2024-01-17')
        },
        instructions: 'Generate a balanced plan focusing on critical stations with fairness'
      });

      expect(kiroResult.success).toBe(true);
      expect(kiroResult.planId).toBeDefined();
      expect(kiroResult.assignments).toBeInstanceOf(Array);
      expect(kiroResult.explanation).toContain('Generated');

      // Test plan explanation through KIRO
      const explanationResult = await services.kiroTools.explainPlan({
        planId: kiroResult.planId
      });

      expect(explanationResult.success).toBe(true);
      expect(explanationResult.explanation).toBeDefined();
      expect(explanationResult.reasoning).toBeDefined();

      // Test absence simulation through KIRO
      const simulationResult = await services.kiroTools.simulateAbsence({
        employeeId: testData.employees[1].id,
        dateStart: new Date('2024-01-17'),
        dateEnd: new Date('2024-01-17'),
        absenceType: 'vacation'
      });

      expect(simulationResult.success).toBe(true);
      expect(simulationResult.impactSummary).toBeDefined();
      expect(simulationResult.affectedStations).toBeInstanceOf(Array);
      expect(simulationResult.recommendations).toBeInstanceOf(Array);

      // Test optimization suggestions
      const optimizations = await services.kiroTools.suggestOptimizations(kiroResult.planId);
      expect(optimizations).toBeInstanceOf(Array);
    });
  });

  describe('API Layer Integration', () => {
    it('should handle complete planning workflow through API', async () => {
      // Step 1: Generate plan via API
      const planResponse = await request(app)
        .post('/api/plan/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dateRange: {
            start: '2024-01-18',
            end: '2024-01-18'
          },
          stationIds: testData.stations.slice(0, 4).map((s: any) => s.id),
          strategy: 'balanced'
        })
        .expect(200);

      expect(planResponse.body.planId).toBeDefined();
      expect(planResponse.body.assignments).toBeInstanceOf(Array);

      const planId = planResponse.body.planId;

      // Step 2: Get coverage analysis
      const coverageResponse = await request(app)
        .get(`/api/coverage?planId=${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(coverageResponse.body.heatmap).toBeDefined();
      expect(coverageResponse.body.gaps).toBeInstanceOf(Array);
      expect(coverageResponse.body.overallCoverage).toBeDefined();

      // Step 3: Get assignment explanations
      if (planResponse.body.assignments.length > 0) {
        const assignmentId = planResponse.body.assignments[0].id;
        const explanationResponse = await request(app)
          .get(`/api/plan/explain/${assignmentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(explanationResponse.body.explanation).toBeDefined();
      }

      // Step 4: Simulate absence impact
      const simulationResponse = await request(app)
        .post('/api/plan/simulate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId,
          scenario: {
            type: 'absence',
            employeeId: testData.employees[2].id,
            dateRange: {
              start: '2024-01-18',
              end: '2024-01-18'
            }
          }
        })
        .expect(200);

      expect(simulationResponse.body.impact).toBeDefined();
      expect(simulationResponse.body.alternativeAssignments).toBeDefined();

      // Step 5: Commit selected assignments
      const commitResponse = await request(app)
        .post('/api/plan/commit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId,
          assignments: planResponse.body.assignments.slice(0, 2).map((a: any) => ({
            id: a.id,
            status: 'approved'
          }))
        })
        .expect(200);

      expect(commitResponse.body.committedCount).toBe(2);

      // Step 6: Verify execution monitoring
      const monitoringResponse = await request(app)
        .get('/api/execution/status?date=2024-01-18')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(monitoringResponse.body.assignments).toBeInstanceOf(Array);
      const confirmedAssignments = monitoringResponse.body.assignments.filter(
        (a: any) => a.status === 'confirmed'
      );
      expect(confirmedAssignments.length).toBe(2);
    });

    it('should integrate KIRO AI tools through API endpoints', async () => {
      // Test AI-powered plan generation
      const aiPlanResponse = await request(app)
        .post('/api/ai/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          command: 'Generate a plan for tomorrow focusing on Station A and Station B with balanced workload',
          context: {
            date: '2024-01-19',
            preferences: ['balance_workload', 'minimize_overtime']
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
          question: 'Why was this specific assignment made?'
        })
        .expect(200);

      expect(aiExplanationResponse.body.explanation).toBeDefined();
      expect(aiExplanationResponse.body.explanation.length).toBeGreaterThan(50);

      // Test AI absence simulation
      const aiSimulationResponse = await request(app)
        .post('/api/ai/simulate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          command: 'What happens if John Smith is absent tomorrow?',
          employeeId: testData.employees[3].id,
          dateRange: {
            start: '2024-01-19',
            end: '2024-01-19'
          }
        })
        .expect(200);

      expect(aiSimulationResponse.body.impactSummary).toBeDefined();
      expect(aiSimulationResponse.body.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('Data Flow Integration', () => {
    it('should maintain data consistency across all operations', async () => {
      // Create a plan
      const plan = await services.planning.generatePlan({
        dateRange: {
          start: new Date('2024-01-20'),
          end: new Date('2024-01-20')
        },
        stationIds: testData.stations.slice(0, 3).map((s: any) => s.id)
      }, 'integration-test');

      // Verify assignments are created in database
      const dbAssignments = await DatabaseManager.query(
        'SELECT * FROM assignments WHERE demand_id IN (SELECT id FROM shift_demands WHERE date = ?)',
        ['2024-01-20']
      );
      expect(dbAssignments.length).toBeGreaterThan(0);

      // Create an absence that conflicts with assignments
      const conflictingAbsence = await services.absence.createAbsence({
        employeeId: plan.assignments[0].employeeId,
        type: 'sick',
        dateStart: new Date('2024-01-20'),
        dateEnd: new Date('2024-01-20'),
        reason: 'Data consistency test'
      }, 'integration-test');

      // Verify conflict detection
      expect(conflictingAbsence.conflicts).toHaveLength(1);
      expect(conflictingAbsence.conflicts[0].assignmentId).toBe(plan.assignments[0].id);

      // Approve the absence and verify assignment status changes
      await services.absence.approveAbsence(conflictingAbsence.id, 'integration-test');

      // Check that the conflicting assignment is marked as affected
      const updatedAssignment = await DatabaseManager.query(
        'SELECT * FROM assignments WHERE id = ?',
        [plan.assignments[0].id]
      );
      expect(updatedAssignment[0].status).toBe('conflict_detected');

      // Verify audit trail captures all changes
      const auditEntries = await services.audit.getAuditLog({
        entityType: 'assignment',
        entityId: plan.assignments[0].id,
        limit: 10
      });
      expect(auditEntries.length).toBeGreaterThan(1);
      expect(auditEntries.some(entry => entry.action === 'assignment_created')).toBe(true);
      expect(auditEntries.some(entry => entry.action === 'conflict_detected')).toBe(true);
    });

    it('should handle concurrent operations correctly', async () => {
      // Simulate concurrent plan generation for the same date
      const concurrentPromises = Array.from({ length: 3 }, (_, index) =>
        services.planning.generatePlan({
          dateRange: {
            start: new Date('2024-01-21'),
            end: new Date('2024-01-21')
          },
          stationIds: testData.stations.slice(index * 2, (index + 1) * 2).map((s: any) => s.id)
        }, `integration-test-${index}`)
      );

      const results = await Promise.all(concurrentPromises);

      // Verify all plans were generated successfully
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.id).toBeDefined();
        expect(result.assignments).toBeInstanceOf(Array);
      });

      // Verify no duplicate assignments were created
      const allAssignments = results.flatMap(result => result.assignments);
      const employeeAssignments = new Map();
      
      allAssignments.forEach(assignment => {
        const key = `${assignment.employeeId}-${assignment.demandId}`;
        if (employeeAssignments.has(key)) {
          throw new Error(`Duplicate assignment detected: ${key}`);
        }
        employeeAssignments.set(key, assignment);
      });

      // Verify audit logs for all operations
      const auditEntries = await services.audit.getAuditLog({
        action: 'plan_generated',
        dateRange: {
          start: new Date('2024-01-21T00:00:00Z'),
          end: new Date('2024-01-21T23:59:59Z')
        },
        limit: 10
      });
      expect(auditEntries.length).toBe(3);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle service failures gracefully', async () => {
      // Test with invalid employee ID
      const invalidAbsenceResult = await services.absence.createAbsence({
        employeeId: 'nonexistent-employee',
        type: 'vacation',
        dateStart: new Date('2024-01-22'),
        dateEnd: new Date('2024-01-22'),
        reason: 'Error handling test'
      }, 'integration-test').catch(error => error);

      expect(invalidAbsenceResult).toBeInstanceOf(Error);
      expect(invalidAbsenceResult.message).toContain('Employee not found');

      // Test KIRO tools with invalid plan ID
      const invalidExplanation = await services.kiroTools.explainPlan({
        planId: 'nonexistent-plan'
      });

      expect(invalidExplanation.success).toBe(false);
      expect(invalidExplanation.explanation).toBe('');

      // Test constraint validation with invalid data
      const invalidAssignments = [{
        id: 'invalid-assignment',
        demandId: 'nonexistent-demand',
        employeeId: 'nonexistent-employee',
        status: 'proposed' as const,
        score: 0,
        createdAt: new Date(),
        createdBy: 'integration-test'
      }];

      const violations = await services.constraints.validateAssignments(invalidAssignments);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some(v => v.severity === 'error')).toBe(true);
    });

    it('should maintain system stability during partial failures', async () => {
      // Generate a plan with some invalid station IDs
      const mixedValidityPlan = await services.planning.generatePlan({
        dateRange: {
          start: new Date('2024-01-23'),
          end: new Date('2024-01-23')
        },
        stationIds: [
          ...testData.stations.slice(0, 2).map((s: any) => s.id),
          'nonexistent-station-1',
          'nonexistent-station-2'
        ]
      }, 'integration-test');

      // Should still generate assignments for valid stations
      expect(mixedValidityPlan.assignments).toBeInstanceOf(Array);
      expect(mixedValidityPlan.assignments.length).toBeGreaterThan(0);
      
      // Should report issues with invalid stations
      expect(mixedValidityPlan.violations.some(v => 
        v.message.includes('Station not found')
      )).toBe(true);

      // System should remain operational for subsequent requests
      const followupPlan = await services.planning.generatePlan({
        dateRange: {
          start: new Date('2024-01-24'),
          end: new Date('2024-01-24')
        },
        stationIds: testData.stations.slice(0, 2).map((s: any) => s.id)
      }, 'integration-test');

      expect(followupPlan.assignments).toBeInstanceOf(Array);
      expect(followupPlan.violations.length).toBe(0);
    });
  });

  describe('Performance Integration', () => {
    it('should meet performance requirements under load', async () => {
      const startTime = Date.now();
      
      // Generate multiple plans concurrently to simulate load
      const loadTestPromises = Array.from({ length: 5 }, (_, index) =>
        services.planning.generatePlan({
          dateRange: {
            start: new Date(`2024-01-${25 + index}`),
            end: new Date(`2024-01-${25 + index}`)
          },
          stationIds: testData.stations.slice(0, 8).map((s: any) => s.id)
        }, `load-test-${index}`)
      );

      const results = await Promise.all(loadTestPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete all plans within reasonable time (15 seconds for 5 plans)
      expect(totalTime).toBeLessThan(15000);

      // All plans should be generated successfully
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.assignments).toBeInstanceOf(Array);
        expect(result.coverageStatus).toBeDefined();
      });

      // Individual plan generation should meet 3-second requirement
      const individualStartTime = Date.now();
      const singlePlan = await services.planning.generatePlan({
        dateRange: {
          start: new Date('2024-01-30'),
          end: new Date('2024-01-30')
        },
        stationIds: testData.stations.slice(0, 10).map((s: any) => s.id)
      }, 'performance-test');
      const individualEndTime = Date.now();

      expect(individualEndTime - individualStartTime).toBeLessThan(3000);
      expect(singlePlan.assignments).toBeInstanceOf(Array);
    });
  });
});
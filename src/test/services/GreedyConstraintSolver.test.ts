import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GreedyConstraintSolver } from '../../services/GreedyConstraintSolver.js';
import { ConstraintManager } from '../../constraints/ConstraintManager.js';
import {
  SchedulingProblem,
  SolutionResult,
  AssignmentCandidate,
  ScoringContext,
  EmployeeWorkload,
  StationHistory
} from '../../services/interfaces.js';
import {
  Employee,
  ShiftDemand,
  Station,
  ShiftTemplate,
  EmployeeSkill,
  Absence,
  Assignment,
  ContractType,
  Priority,
  ShiftType,
  SkillCategory,
  AssignmentStatus,
  AbsenceType,
  ConstraintType
} from '../../types/index.js';

describe('GreedyConstraintSolver', () => {
  let solver: GreedyConstraintSolver;
  let constraintManager: ConstraintManager;
  let mockEmployees: Employee[];
  let mockDemands: ShiftDemand[];
  let mockStations: Station[];
  let mockShiftTemplates: ShiftTemplate[];
  let mockEmployeeSkills: EmployeeSkill[];
  let mockAbsences: Absence[];

  beforeEach(() => {
    constraintManager = new ConstraintManager([]);
    solver = new GreedyConstraintSolver(constraintManager);

    // Setup mock data
    mockEmployees = [
      {
        id: 'emp1',
        name: 'John Doe',
        contractType: ContractType.FULL_TIME,
        weeklyHours: 40,
        maxHoursPerDay: 8,
        minRestHours: 12,
        team: 'A',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'emp2',
        name: 'Jane Smith',
        contractType: ContractType.FULL_TIME,
        weeklyHours: 40,
        maxHoursPerDay: 8,
        minRestHours: 12,
        team: 'B',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'emp3',
        name: 'Bob Wilson',
        contractType: ContractType.PART_TIME,
        weeklyHours: 20,
        maxHoursPerDay: 6,
        minRestHours: 10,
        team: 'A',
        active: false, // Inactive employee
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockStations = [
      {
        id: 'station1',
        name: 'Assembly Line 1',
        line: 'Production',
        requiredSkills: [
          { skillId: 'skill1', minLevel: 2, count: 1, mandatory: true },
          { skillId: 'skill2', minLevel: 1, count: 1, mandatory: false }
        ],
        priority: Priority.HIGH,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'station2',
        name: 'Quality Control',
        line: 'QC',
        requiredSkills: [
          { skillId: 'skill3', minLevel: 3, count: 1, mandatory: true }
        ],
        priority: Priority.CRITICAL,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockShiftTemplates = [
      {
        id: 'shift1',
        name: 'Day Shift',
        startTime: '08:00',
        endTime: '16:00',
        breakRules: [{ duration: 30, startAfter: 240, paid: true }],
        shiftType: ShiftType.DAY,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'shift2',
        name: 'Night Shift',
        startTime: '22:00',
        endTime: '06:00',
        breakRules: [{ duration: 30, startAfter: 240, paid: true }],
        shiftType: ShiftType.NIGHT,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockEmployeeSkills = [
      {
        id: 'empskill1',
        employeeId: 'emp1',
        skillId: 'skill1',
        level: 3,
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Valid for 1 year
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'empskill2',
        employeeId: 'emp1',
        skillId: 'skill2',
        level: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'empskill3',
        employeeId: 'emp2',
        skillId: 'skill3',
        level: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'empskill4',
        employeeId: 'emp3',
        skillId: 'skill1',
        level: 1, // Below required level
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    mockDemands = [
      {
        id: 'demand1',
        date: tomorrow,
        stationId: 'station1',
        shiftTemplateId: 'shift1',
        requiredCount: 1,
        priority: Priority.HIGH,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'demand2',
        date: tomorrow,
        stationId: 'station2',
        shiftTemplateId: 'shift1',
        requiredCount: 1,
        priority: Priority.CRITICAL,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockAbsences = [
      {
        id: 'absence1',
        employeeId: 'emp2',
        type: AbsenceType.VACATION,
        dateStart: tomorrow,
        dateEnd: tomorrow,
        approved: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  });

  describe('solve', () => {
    it('should successfully solve a simple scheduling problem', async () => {
      const problem: SchedulingProblem = {
        demands: [mockDemands[0]], // Only first demand
        employees: mockEmployees,
        constraints: [],
        objectives: [],
        context: {
          dateRange: { start: new Date(), end: new Date() },
          existingAssignments: [],
          absences: [],
          employeeSkills: mockEmployeeSkills,
          stations: mockStations,
          shiftTemplates: mockShiftTemplates
        }
      };

      const result = await solver.solve(problem);

      expect(result.success).toBe(true);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.iterations).toBeGreaterThan(0);
      expect(result.assignments).toHaveLength(1);
      expect(result.assignments[0].employeeId).toBe('emp1'); // Should assign emp1 who has required skills
      expect(result.assignments[0].demandId).toBe('demand1');
      expect(result.assignments[0].status).toBe(AssignmentStatus.PROPOSED);
    });

    it('should prioritize demands by priority level', async () => {
      const problem: SchedulingProblem = {
        demands: mockDemands, // Both demands
        employees: mockEmployees,
        constraints: [],
        objectives: [],
        context: {
          dateRange: { start: new Date(), end: new Date() },
          existingAssignments: [],
          absences: mockAbsences, // emp2 is on vacation
          employeeSkills: mockEmployeeSkills,
          stations: mockStations,
          shiftTemplates: mockShiftTemplates
        }
      };

      const result = await solver.solve(problem);

      expect(result.success).toBe(true);
      // Should only assign to demand1 since emp2 (who has skill3) is on vacation
      expect(result.assignments).toHaveLength(1);
      expect(result.assignments[0].demandId).toBe('demand1');
    });

    it('should handle case with no qualified candidates', async () => {
      const problem: SchedulingProblem = {
        demands: [mockDemands[1]], // Demand requiring skill3 at level 3
        employees: [mockEmployees[0]], // emp1 doesn't have skill3
        constraints: [],
        objectives: [],
        context: {
          dateRange: { start: new Date(), end: new Date() },
          existingAssignments: [],
          absences: [],
          employeeSkills: mockEmployeeSkills.filter(s => s.employeeId === 'emp1'),
          stations: mockStations,
          shiftTemplates: mockShiftTemplates
        }
      };

      const result = await solver.solve(problem);

      expect(result.success).toBe(true);
      expect(result.assignments).toHaveLength(0); // No assignments possible
    });

    it('should exclude inactive employees', async () => {
      const problem: SchedulingProblem = {
        demands: [mockDemands[0]],
        employees: [mockEmployees[2]], // Only inactive employee
        constraints: [],
        objectives: [],
        context: {
          dateRange: { start: new Date(), end: new Date() },
          existingAssignments: [],
          absences: [],
          employeeSkills: mockEmployeeSkills,
          stations: mockStations,
          shiftTemplates: mockShiftTemplates
        }
      };

      const result = await solver.solve(problem);

      expect(result.success).toBe(true);
      expect(result.assignments).toHaveLength(0); // No assignments due to inactive employee
    });

    it('should handle employees on absence', async () => {
      const problem: SchedulingProblem = {
        demands: [mockDemands[1]], // Demand requiring skill3
        employees: [mockEmployees[1]], // emp2 who has skill3 but is on vacation
        constraints: [],
        objectives: [],
        context: {
          dateRange: { start: new Date(), end: new Date() },
          existingAssignments: [],
          absences: mockAbsences,
          employeeSkills: mockEmployeeSkills,
          stations: mockStations,
          shiftTemplates: mockShiftTemplates
        }
      };

      const result = await solver.solve(problem);

      expect(result.success).toBe(true);
      expect(result.assignments).toHaveLength(0); // No assignments due to absence
    });

    it('should calculate solution score correctly', async () => {
      const problem: SchedulingProblem = {
        demands: [mockDemands[0]],
        employees: mockEmployees,
        constraints: [],
        objectives: [],
        context: {
          dateRange: { start: new Date(), end: new Date() },
          existingAssignments: [],
          absences: [],
          employeeSkills: mockEmployeeSkills,
          stations: mockStations,
          shiftTemplates: mockShiftTemplates
        }
      };

      const result = await solver.solve(problem);

      expect(result.success).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(typeof result.score).toBe('number');
    });
  });

  describe('scoreAssignment', () => {
    it('should score assignment based on multiple factors', async () => {
      const employee = mockEmployees[0];
      const demand = mockDemands[0];
      const workload: EmployeeWorkload = {
        employeeId: employee.id,
        weeklyHours: 20,
        consecutiveDays: 2,
        fairnessScore: 75
      };
      const stationHistory: StationHistory[] = [{
        stationId: demand.stationId,
        employeeId: employee.id,
        assignmentCount: 5,
        proficiencyScore: 80
      }];

      const context: ScoringContext = {
        employee,
        demand,
        existingAssignments: [],
        employeeWorkload: workload,
        stationHistory
      };

      const assignment: Assignment = {
        id: 'test-assignment',
        demandId: demand.id,
        employeeId: employee.id,
        status: AssignmentStatus.PROPOSED,
        score: 0,
        createdAt: new Date(),
        createdBy: 'test',
        updatedAt: new Date()
      };

      const score = await solver.scoreAssignment(assignment, context);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(typeof score).toBe('number');
    });
  });

  describe('validateConstraints', () => {
    it('should validate assignments against constraints', async () => {
      const assignments: Assignment[] = [{
        id: 'test-assignment',
        demandId: mockDemands[0].id,
        employeeId: mockEmployees[0].id,
        status: AssignmentStatus.PROPOSED,
        score: 85,
        createdAt: new Date(),
        createdBy: 'test',
        updatedAt: new Date()
      }];

      const violations = await solver.validateConstraints(assignments);

      expect(Array.isArray(violations)).toBe(true);
      // Currently returns empty array as placeholder
      expect(violations).toHaveLength(0);
    });
  });

  describe('findAlternatives', () => {
    it('should find alternative candidates for a demand', async () => {
      const alternatives = await solver.findAlternatives('demand1', ['emp1']);

      expect(Array.isArray(alternatives)).toBe(true);
      // Currently returns empty array as placeholder
      expect(alternatives).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty demands list', async () => {
      const problem: SchedulingProblem = {
        demands: [],
        employees: mockEmployees,
        constraints: [],
        objectives: [],
        context: {
          dateRange: { start: new Date(), end: new Date() },
          existingAssignments: [],
          absences: [],
          employeeSkills: mockEmployeeSkills,
          stations: mockStations,
          shiftTemplates: mockShiftTemplates
        }
      };

      const result = await solver.solve(problem);

      expect(result.success).toBe(true);
      expect(result.assignments).toHaveLength(0);
      expect(result.score).toBe(0);
    });

    it('should handle empty employees list', async () => {
      const problem: SchedulingProblem = {
        demands: mockDemands,
        employees: [],
        constraints: [],
        objectives: [],
        context: {
          dateRange: { start: new Date(), end: new Date() },
          existingAssignments: [],
          absences: [],
          employeeSkills: [],
          stations: mockStations,
          shiftTemplates: mockShiftTemplates
        }
      };

      const result = await solver.solve(problem);

      expect(result.success).toBe(true);
      expect(result.assignments).toHaveLength(0);
    });

    it('should handle missing station data', async () => {
      const problem: SchedulingProblem = {
        demands: [{
          ...mockDemands[0],
          stationId: 'nonexistent-station'
        }],
        employees: mockEmployees,
        constraints: [],
        objectives: [],
        context: {
          dateRange: { start: new Date(), end: new Date() },
          existingAssignments: [],
          absences: [],
          employeeSkills: mockEmployeeSkills,
          stations: mockStations,
          shiftTemplates: mockShiftTemplates
        }
      };

      const result = await solver.solve(problem);

      expect(result.success).toBe(true);
      expect(result.assignments).toHaveLength(0); // No assignments due to missing station
    });

    it('should handle expired skills', async () => {
      const expiredSkills = [{
        ...mockEmployeeSkills[0],
        validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expired yesterday
      }];

      const problem: SchedulingProblem = {
        demands: [mockDemands[0]],
        employees: [mockEmployees[0]],
        constraints: [],
        objectives: [],
        context: {
          dateRange: { start: new Date(), end: new Date() },
          existingAssignments: [],
          absences: [],
          employeeSkills: expiredSkills,
          stations: mockStations,
          shiftTemplates: mockShiftTemplates
        }
      };

      const result = await solver.solve(problem);

      expect(result.success).toBe(true);
      expect(result.assignments).toHaveLength(0); // No assignments due to expired skills
    });
  });

  describe('performance', () => {
    it('should complete within reasonable time for moderate problem size', async () => {
      // Create larger dataset
      const manyEmployees = Array.from({ length: 50 }, (_, i) => ({
        ...mockEmployees[0],
        id: `emp${i}`,
        name: `Employee ${i}`
      }));

      const manyDemands = Array.from({ length: 20 }, (_, i) => ({
        ...mockDemands[0],
        id: `demand${i}`
      }));

      const manySkills = manyEmployees.map(emp => ({
        ...mockEmployeeSkills[0],
        id: `skill${emp.id}`,
        employeeId: emp.id
      }));

      const problem: SchedulingProblem = {
        demands: manyDemands,
        employees: manyEmployees,
        constraints: [],
        objectives: [],
        context: {
          dateRange: { start: new Date(), end: new Date() },
          existingAssignments: [],
          absences: [],
          employeeSkills: manySkills,
          stations: mockStations,
          shiftTemplates: mockShiftTemplates
        }
      };

      const startTime = Date.now();
      const result = await solver.solve(problem);
      const executionTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.executionTime).toBeLessThan(5000);
    });
  });
});
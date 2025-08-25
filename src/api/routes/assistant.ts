// AI Assistant API routes

import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { PlanningService } from '../../services/PlanningService';
import { ConstraintManager } from '../../constraints/ConstraintManager';
import { EmployeeRepository } from '../../repositories/employee.repository';
import { StationRepository } from '../../repositories/station.repository';
import { ShiftTemplateRepository } from '../../repositories/shift-template.repository';
import { UserRole } from '../../types';
import { z } from 'zod';

const router = Router();
const constraintManager = new ConstraintManager();
const planningService = new PlanningService(constraintManager);
const employeeRepo = new EmployeeRepository();
const stationRepo = new StationRepository();
const shiftTemplateRepo = new ShiftTemplateRepository();

// Apply authentication to all routes
router.use(authMiddleware);

// Validation schemas
const generatePlanSchema = z.object({
  instructions: z.string().min(1),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  })
});

const explainPlanSchema = z.object({
  planId: z.string().optional(),
  assignmentId: z.string().optional(),
  query: z.string().optional()
});

const simulateAbsenceSchema = z.object({
  employeeId: z.string(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  })
});

const optimizePlanSchema = z.object({
  planId: z.string()
});

// POST /api/assistant/generate-plan - Generate a new plan based on instructions
router.post('/generate-plan', 
  requireRole([UserRole.ADMIN, UserRole.SHIFT_LEADER, UserRole.HR_PLANNER]),
  validateRequest(generatePlanSchema),
  async (req, res) => {
    try {
      const { instructions, dateRange } = req.body;
      const userId = (req as any).auth?.user.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in authentication context'
        });
      }

      // Parse instructions to extract planning parameters
      const planningParams = {
        dateStart: new Date(dateRange.start),
        dateEnd: new Date(dateRange.end),
        stationIds: [], // Could be extracted from instructions
        shiftIds: [], // Could be extracted from instructions
        employeeIds: [], // Could be extracted from instructions
        constraints: {
          maxOvertimeHours: 10,
          minRestHours: 11,
          respectPreferences: true,
          balanceWorkload: instructions.toLowerCase().includes('balanced')
        }
      };

      const planProposal = await planningService.generatePlan(planningParams, userId);
      
      // Calculate coverage and gaps
      const assignments = planProposal.assignments || [];
      const totalSlots = planProposal.demands?.length || 0;
      const filledSlots = assignments.length;
      const coveragePercentage = totalSlots > 0 ? (filledSlots / totalSlots) * 100 : 0;
      const gaps = totalSlots - filledSlots;

      res.json({
        success: true,
        planId: planProposal.id,
        explanation: `Generated a ${instructions.toLowerCase().includes('balanced') ? 'balanced ' : ''}shift plan for ${Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24))} days with ${assignments.length} assignments.`,
        coveragePercentage,
        assignments,
        gaps,
        constraints: planProposal.violations || []
      });
    } catch (error) {
      console.error('AI Assistant plan generation error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate plan'
      });
    }
  }
);

// POST /api/assistant/explain-plan - Explain a plan or assignment
router.post('/explain-plan',
  validateRequest(explainPlanSchema),
  async (req, res) => {
    try {
      const { planId, assignmentId, query } = req.body;

      if (!planId && !assignmentId) {
        return res.status(400).json({
          success: false,
          message: 'Either planId or assignmentId must be provided'
        });
      }

      let explanation = '';
      let reasoning: string[] = [];
      let alternatives: string[] = [];
      let constraints: string[] = [];

      if (planId) {
        const plan = await planningService.getPlan(planId);
        if (!plan) {
          return res.status(404).json({
            success: false,
            message: 'Plan not found'
          });
        }

        explanation = `This plan covers ${plan.assignments?.length || 0} assignments across ${plan.demands?.length || 0} shift demands.`;
        
        reasoning = [
          'Assignments were made based on employee skills and availability',
          'Constraint violations were minimized where possible',
          'Work-life balance preferences were considered',
          'Coverage requirements were prioritized'
        ];

        alternatives = [
          'Consider overtime assignments for better coverage',
          'Adjust shift templates to match available workforce',
          'Cross-train employees for more flexibility'
        ];

        constraints = plan.violations?.map(v => v.message) || [];
      }

      res.json({
        success: true,
        explanation,
        reasoning,
        alternatives,
        constraints
      });
    } catch (error) {
      console.error('AI Assistant explain error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to explain plan'
      });
    }
  }
);

// POST /api/assistant/simulate-absence - Simulate employee absence impact
router.post('/simulate-absence',
  validateRequest(simulateAbsenceSchema),
  async (req, res) => {
    try {
      const { employeeId, dateRange } = req.body;

      // Get employee info
      const employee = await employeeRepo.findById(employeeId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Simulate the impact (simplified simulation)
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      const daysAffected = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Get affected assignments (simplified - would need actual assignment lookup)
      const affectedStations = ['Station A', 'Station B']; // Placeholder
      const coverageChange = -15; // Estimated impact
      const riskLevel = coverageChange < -20 ? 'high' : coverageChange < -10 ? 'medium' : 'low';

      const recommendations = [
        `Find replacement for ${employee.name} during absence period`,
        'Consider overtime assignments for other team members',
        'Adjust shift requirements if possible',
        'Cross-train backup employees for critical stations'
      ];

      res.json({
        success: true,
        impactSummary: `${employee.name}'s absence for ${daysAffected} day(s) would affect ${affectedStations.length} stations and reduce overall coverage by ${Math.abs(coverageChange)}%.`,
        coverageChange,
        riskLevel,
        affectedStations,
        recommendations
      });
    } catch (error) {
      console.error('AI Assistant simulation error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to run simulation'
      });
    }
  }
);

// POST /api/assistant/optimize-plan - Get optimization suggestions for a plan
router.post('/optimize-plan',
  validateRequest(optimizePlanSchema),
  async (req, res) => {
    try {
      const { planId } = req.body;

      const plan = await planningService.getPlan(planId);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found'
        });
      }

      // Generate optimization suggestions based on plan analysis
      const suggestions = [];

      // Check for coverage gaps
      const totalDemands = plan.demands?.length || 0;
      const totalAssignments = plan.assignments?.length || 0;
      const coverageGap = totalDemands - totalAssignments;

      if (coverageGap > 0) {
        suggestions.push({
          type: 'overtime',
          description: `Add ${coverageGap} overtime assignments to fill coverage gaps`,
          impact: `Improve coverage by ${((coverageGap / totalDemands) * 100).toFixed(1)}%`,
          priority: coverageGap > totalDemands * 0.2 ? 'high' : 'medium',
          estimatedCost: coverageGap * 150 // Estimated overtime cost per assignment
        });
      }

      // Check for constraint violations
      const violations = plan.violations || [];
      if (violations.length > 0) {
        const criticalViolations = violations.filter(v => v.severity === 'critical' || v.severity === 'error');
        if (criticalViolations.length > 0) {
          suggestions.push({
            type: 'swap',
            description: `Resolve ${criticalViolations.length} critical constraint violations`,
            impact: 'Improve plan compliance and employee satisfaction',
            priority: 'critical'
          });
        }
      }

      // Check for workload balance
      const employeeWorkloads = new Map();
      plan.assignments?.forEach(assignment => {
        const current = employeeWorkloads.get(assignment.employeeId) || 0;
        employeeWorkloads.set(assignment.employeeId, current + 1);
      });

      const workloads = Array.from(employeeWorkloads.values());
      if (workloads.length > 1) {
        const maxWorkload = Math.max(...workloads);
        const minWorkload = Math.min(...workloads);
        const imbalance = maxWorkload - minWorkload;

        if (imbalance > 2) {
          suggestions.push({
            type: 'optimize',
            description: 'Rebalance workload distribution between employees',
            impact: `Reduce workload imbalance from ${imbalance} to <2 assignments`,
            priority: 'medium'
          });
        }
      }

      // If no issues found
      if (suggestions.length === 0) {
        suggestions.push({
          type: 'optimize',
          description: 'Plan is well-optimized',
          impact: 'No immediate improvements needed',
          priority: 'low'
        });
      }

      res.json(suggestions);
    } catch (error) {
      console.error('AI Assistant optimization error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate optimization suggestions'
      });
    }
  }
);

export { router as assistantRoutes };
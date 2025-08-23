import { Router } from 'express';
import { authRoutes } from './auth-mock';
import { employeeRoutes } from './employees';
import { skillRoutes } from './skills';
import { planningRoutes } from './planning-mock';
import { absenceRoutes } from './absences-mock';
import { coverageRoutes } from './coverage';
import { executionMonitoringRoutes } from './execution-monitoring-mock';
import { planApprovalRoutes } from './plan-approval-mock';
import { aiRoutes } from './ai';
import { systemRoutes } from './system';
import { auditRoutes } from './audit';
import { createShiftStaffingRequirementsRouter } from './shift-staffing-requirements';
import { createWorkingHourConstraintsRouter } from './working-hour-constraints';

const router = Router();

// Mount all route modules
router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/skills', skillRoutes);
router.use('/plan', planningRoutes);
router.use('/absence', absenceRoutes);
router.use('/coverage', coverageRoutes);
router.use('/execution', executionMonitoringRoutes);
router.use('/plan-approval', planApprovalRoutes);
router.use('/ai', aiRoutes);
router.use('/system', systemRoutes);
router.use('/audit', auditRoutes);
router.use('/shift-staffing-requirements', createShiftStaffingRequirementsRouter());
router.use('/working-hour-constraints', createWorkingHourConstraintsRouter());

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const { DatabaseManager } = await import('../../database/config');
    const dbManager = DatabaseManager.getInstance();
    const healthCheck = await dbManager.healthCheck();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: healthCheck
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as apiRoutes };
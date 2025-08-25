import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { employeeSchema, employeeUpdateSchema } from '../schemas/employee';
import { EmployeeRepository } from '../../repositories/employee.repository';
import { EmployeeSkillRepository } from '../../repositories/employee-skill.repository';
import { SkillRepository } from '../../repositories/skill.repository';
import { Employee } from '../../models/Employee';
import { ContractType, UserRole } from '../../types';

const router = Router();
const employeeRepo = new EmployeeRepository();
const employeeSkillRepo = new EmployeeSkillRepository();
const skillRepo = new SkillRepository();

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/employees - List all employees with pagination and search
router.get('/', requireRole([UserRole.ADMIN, UserRole.HR_PLANNER, UserRole.SHIFT_LEADER]), async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '50', 
      search = '', 
      team = '', 
      contractType = '', 
      active = 'true' 
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const offset = (pageNum - 1) * limitNum;

    // Build query conditions
    let whereConditions = [];
    let queryParams: any[] = [];

    if (active !== 'all') {
      whereConditions.push('active = ?');
      queryParams.push(active === 'true' ? 1 : 0);
    }

    if (search) {
      whereConditions.push('name LIKE ?');
      queryParams.push(`%${search}%`);
    }

    if (team) {
      whereConditions.push('team = ?');
      queryParams.push(team);
    }

    if (contractType) {
      whereConditions.push('contract_type = ?');
      queryParams.push(contractType);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM employees ${whereClause}`;
    const countResult = await (employeeRepo as any).executeQuery(countSql, queryParams);
    const total = countResult[0]?.total || 0;

    // Get employees with pagination
    const sql = `
      SELECT * FROM employees 
      ${whereClause}
      ORDER BY name ASC 
      LIMIT ? OFFSET ?
    `;
    const employees = await (employeeRepo as any).findByQuery(sql, [...queryParams, limitNum, offset]);

    res.json({
      success: true,
      data: employees,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch employees'
      }
    });
  }
});

// GET /api/employees/qualifications - Get employee qualifications matrix
router.get('/qualifications', async (req, res) => {
  try {
    const { employeeIds } = req.query;
    const ids = employeeIds ? (employeeIds as string).split(',') : undefined;
    
    const matrix = await employeeSkillRepo.getEmployeeSkillMatrix(ids);
    
    res.json({
      employees: matrix
    });
  } catch (error) {
    console.error('Error fetching qualifications:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch qualifications'
      }
    });
  }
});

// POST /api/employees/qualifications/bulk - Bulk update qualifications
router.post('/qualifications/bulk', async (req, res) => {
  try {
    const { updates } = req.body;
    
    if (!Array.isArray(updates)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Updates must be an array'
        }
      });
    }

    let updatedCount = 0;
    const errors: string[] = [];

    for (const update of updates) {
      try {
        const { employeeId, skillId, level, validUntil, certificationId, action = 'upsert' } = update;

        if (!employeeId || !skillId) {
          errors.push(`Missing employeeId or skillId in update: ${JSON.stringify(update)}`);
          continue;
        }

        if (action === 'delete') {
          const existingSkill = await employeeSkillRepo.findByEmployeeAndSkill(employeeId, skillId);
          if (existingSkill) {
            await employeeSkillRepo.delete(existingSkill.id);
            updatedCount++;
          }
        } else {
          const existingSkill = await employeeSkillRepo.findByEmployeeAndSkill(employeeId, skillId);
          
          if (existingSkill) {
            // Update existing
            const updateData: any = {};
            if (level !== undefined) updateData.level = level;
            if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;
            if (certificationId !== undefined) updateData.certificationId = certificationId;
            
            await employeeSkillRepo.update(existingSkill.id, updateData);
            updatedCount++;
          } else {
            // Create new
            if (!level) {
              errors.push(`Level required for new skill assignment: ${employeeId} -> ${skillId}`);
              continue;
            }

            const employeeSkillData = {
              id: `empskill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              employeeId,
              skillId,
              level,
              validUntil: validUntil ? new Date(validUntil) : undefined,
              certificationId
            };

            await employeeSkillRepo.create(employeeSkillData);
            updatedCount++;
          }
        }
      } catch (error) {
        errors.push(`Error processing update ${JSON.stringify(update)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    res.json({
      updatedCount,
      totalRequested: updates.length,
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error bulk updating qualifications:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update qualifications'
      }
    });
  }
});

// GET /api/employees/:id - Get single employee
router.get('/:id', requireRole([UserRole.ADMIN, UserRole.HR_PLANNER, UserRole.SHIFT_LEADER]), async (req, res) => {
  try {
    const employee = await employeeRepo.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Employee not found'
        }
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch employee'
      }
    });
  }
});

// POST /api/employees - Create new employee
router.post('/', requireRole([UserRole.ADMIN, UserRole.HR_PLANNER]), validateRequest(employeeSchema), async (req, res) => {
  try {
    const employeeData = {
      id: `emp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: req.body.name,
      contractType: req.body.contractType as ContractType,
      weeklyHours: req.body.weeklyHours || (req.body.contractType === 'full-time' ? 40 : 20),
      maxHoursPerDay: req.body.maxHoursPerDay || 8,
      minRestHours: req.body.minRestHours || 11,
      team: req.body.team || 'general',
      active: req.body.active !== undefined ? req.body.active : true,
      preferences: req.body.preferences
    };

    // Validate using Employee model
    const employee = new Employee(employeeData);
    
    // Create using repository (returns plain object)
    const savedEmployee = await employeeRepo.create(employee);
    
    res.status(201).json({
      success: true,
      data: savedEmployee
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create employee'
      }
    });
  }
});

// PUT /api/employees/:id - Update employee
router.put('/:id', requireRole([UserRole.ADMIN, UserRole.HR_PLANNER]), validateRequest(employeeUpdateSchema), async (req, res) => {
  try {
    const existingEmployee = await employeeRepo.findById(req.params.id);
    
    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Employee not found'
        }
      });
    }

    // Validate using Employee model
    const employeeModel = new Employee(existingEmployee);
    const updatedEmployeeModel = employeeModel.update(req.body);
    
    const savedEmployee = await employeeRepo.update(req.params.id, updatedEmployeeModel);
    
    res.json({
      success: true,
      data: savedEmployee
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update employee'
      }
    });
  }
});

// DELETE /api/employees/:id - Delete employee (admin only)
router.delete('/:id', requireRole([UserRole.ADMIN]), async (req, res) => {
  try {

    const employee = await employeeRepo.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Employee not found'
        }
      });
    }

    // Check if employee has active assignments
    const activeAssignmentsSql = `
      SELECT COUNT(*) as count 
      FROM assignments a 
      JOIN shift_demands sd ON a.demand_id = sd.id 
      WHERE a.employee_id = ? 
      AND a.status IN ('proposed', 'confirmed') 
      AND sd.date >= CURRENT_DATE
    `;
    const assignmentResult = await (employeeRepo as any).executeQuery(activeAssignmentsSql, [req.params.id]);
    const activeAssignments = assignmentResult[0]?.count || 0;

    if (activeAssignments > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DELETE',
          message: `Cannot delete employee with ${activeAssignments} active assignments. Please remove assignments first.`
        }
      });
    }

    // Soft delete by setting active to false instead of hard delete
    const employeeModel = new Employee(employee);
    const deactivatedEmployee = employeeModel.update({ active: false });
    await employeeRepo.update(req.params.id, deactivatedEmployee);
    
    res.json({ 
      success: true,
      message: 'Employee deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete employee'
      }
    });
  }
});

// GET /api/employees/:id/skills - Get employee skills
router.get('/:id/skills', async (req, res) => {
  try {
    const employee = await employeeRepo.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Employee not found'
        }
      });
    }

    const skills = await employeeSkillRepo.findByEmployee(req.params.id);
    
    res.json({
      employeeId: req.params.id,
      employeeName: employee.name,
      skills: skills.map(skill => ({
        id: skill.id,
        skillId: skill.skillId,
        skillName: (skill as any).skill_name, // From JOIN in repository
        level: skill.level,
        validUntil: skill.validUntil,
        certificationId: skill.certificationId
      }))
    });
  } catch (error) {
    console.error('Error fetching employee skills:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch employee skills'
      }
    });
  }
});

// POST /api/employees/:id/skills - Add skill to employee
router.post('/:id/skills', async (req, res) => {
  try {
    const { skillId, level, validUntil, certificationId } = req.body;

    if (!skillId || !level) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'skillId and level are required'
        }
      });
    }

    if (level < 1 || level > 3) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Skill level must be between 1 and 3'
        }
      });
    }

    // Check if employee exists
    const employee = await employeeRepo.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Employee not found'
        }
      });
    }

    // Check if skill exists
    const skill = await skillRepo.findById(skillId);
    if (!skill) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Skill not found'
        }
      });
    }

    // Check if employee already has this skill
    const existingSkill = await employeeSkillRepo.findByEmployeeAndSkill(req.params.id, skillId);
    if (existingSkill) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Employee already has this skill. Use PUT to update.'
        }
      });
    }

    const employeeSkillData = {
      id: `empskill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      employeeId: req.params.id,
      skillId,
      level,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      certificationId
    };

    const employeeSkill = await employeeSkillRepo.create(employeeSkillData);
    
    res.status(201).json({
      id: employeeSkill.id,
      skillId: employeeSkill.skillId,
      skillName: skill.name,
      level: employeeSkill.level,
      validUntil: employeeSkill.validUntil,
      certificationId: employeeSkill.certificationId
    });
  } catch (error) {
    console.error('Error adding employee skill:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to add employee skill'
      }
    });
  }
});

// PUT /api/employees/:id/skills/:skillId - Update employee skill
router.put('/:id/skills/:skillId', async (req, res) => {
  try {
    const { level, validUntil, certificationId } = req.body;

    if (level && (level < 1 || level > 3)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Skill level must be between 1 and 3'
        }
      });
    }

    const existingSkill = await employeeSkillRepo.findByEmployeeAndSkill(req.params.id, req.params.skillId);
    if (!existingSkill) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Employee skill not found'
        }
      });
    }

    const updateData: any = {};
    if (level !== undefined) updateData.level = level;
    if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;
    if (certificationId !== undefined) updateData.certificationId = certificationId;

    const updatedSkill = await employeeSkillRepo.update(existingSkill.id, updateData);
    
    res.json({
      id: updatedSkill.id,
      skillId: updatedSkill.skillId,
      level: updatedSkill.level,
      validUntil: updatedSkill.validUntil,
      certificationId: updatedSkill.certificationId
    });
  } catch (error) {
    console.error('Error updating employee skill:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update employee skill'
      }
    });
  }
});

// DELETE /api/employees/:id/skills/:skillId - Remove skill from employee
router.delete('/:id/skills/:skillId', async (req, res) => {
  try {
    const existingSkill = await employeeSkillRepo.findByEmployeeAndSkill(req.params.id, req.params.skillId);
    if (!existingSkill) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Employee skill not found'
        }
      });
    }

    await employeeSkillRepo.delete(existingSkill.id);
    
    res.json({ 
      success: true,
      message: 'Employee skill removed successfully'
    });
  } catch (error) {
    console.error('Error removing employee skill:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to remove employee skill'
      }
    });
  }
});

export { router as employeeRoutes };
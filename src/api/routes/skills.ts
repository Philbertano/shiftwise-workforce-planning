import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { SkillRepository } from '../../repositories/skill.repository';
import { Skill } from '../../models/Skill';
import { SkillCategory } from '../../types';

const router = Router();
const skillRepo = new SkillRepository();

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/skills - List all skills with optional filtering
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;

    let skills: Skill[];

    if (category) {
      skills = await skillRepo.findByCategory(category as SkillCategory);
    } else if (search) {
      skills = await skillRepo.findByNamePattern(search as string);
    } else {
      skills = await skillRepo.findAll();
    }

    res.json({
      skills: skills.map(skill => skill.toJSON())
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch skills'
      }
    });
  }
});

// GET /api/skills/:id - Get single skill
router.get('/:id', async (req, res) => {
  try {
    const skill = await skillRepo.findById(req.params.id);
    
    if (!skill) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Skill not found'
        }
      });
    }

    res.json(skill.toJSON());
  } catch (error) {
    console.error('Error fetching skill:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch skill'
      }
    });
  }
});

// POST /api/skills - Create new skill
router.post('/', async (req, res) => {
  try {
    const { name, description, levelScale, category } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name and category are required'
        }
      });
    }

    // Check if skill with same name already exists
    const existingSkill = await skillRepo.findByName(name);
    if (existingSkill) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Skill with this name already exists'
        }
      });
    }

    const skillData = {
      id: `skill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      levelScale: levelScale || 3,
      category: category as SkillCategory
    };

    const skill = new Skill(skillData);
    const savedSkill = await skillRepo.create(skill);
    
    res.status(201).json(savedSkill.toJSON());
  } catch (error) {
    console.error('Error creating skill:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create skill'
      }
    });
  }
});

// PUT /api/skills/:id - Update skill
router.put('/:id', async (req, res) => {
  try {
    const existingSkill = await skillRepo.findById(req.params.id);
    
    if (!existingSkill) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Skill not found'
        }
      });
    }

    const updatedSkill = existingSkill.update(req.body);
    const savedSkill = await skillRepo.update(req.params.id, updatedSkill);
    
    res.json(savedSkill.toJSON());
  } catch (error) {
    console.error('Error updating skill:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update skill'
      }
    });
  }
});

// DELETE /api/skills/:id - Delete skill
router.delete('/:id', async (req, res) => {
  try {
    const skill = await skillRepo.findById(req.params.id);
    
    if (!skill) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Skill not found'
        }
      });
    }

    // Check if skill is used by any employees
    const skillUsageSql = `
      SELECT COUNT(*) as count 
      FROM employee_skills 
      WHERE skill_id = ?
    `;
    const usageResult = await skillRepo.executeQuery(skillUsageSql, [req.params.id]);
    const usageCount = usageResult[0]?.count || 0;

    if (usageCount > 0) {
      return res.status(400).json({
        error: {
          code: 'CANNOT_DELETE',
          message: `Cannot delete skill that is assigned to ${usageCount} employee(s). Please remove skill assignments first.`
        }
      });
    }

    await skillRepo.delete(req.params.id);
    
    res.json({ 
      success: true,
      message: 'Skill deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting skill:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete skill'
      }
    });
  }
});

export { router as skillRoutes };
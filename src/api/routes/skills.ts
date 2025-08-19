import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/skills - List all skills
router.get('/', async (req, res) => {
  try {
    res.json({
      skills: [
        {
          id: 'skill-1',
          name: 'Welding',
          category: 'Technical',
          levelScale: 3
        }
      ]
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch skills'
      }
    });
  }
});

export { router as skillRoutes };
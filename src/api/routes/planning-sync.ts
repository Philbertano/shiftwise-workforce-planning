import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { AssignmentRepository } from '../../repositories/assignment.repository.js'
// import { PlanRepository } from '../../repositories/plan.repository.js'
import { requireAuth } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validation.js'
import { AssignmentStatus } from '../../types/index.js'
import { getPlanningWebSocketManager } from './planning-websocket.js'

const router = Router()
const assignmentRepository = new AssignmentRepository()
// const planRepository = new PlanRepository()

// Validation schemas
const planningChangeSchema = z.object({
  type: z.enum(['add', 'update', 'delete']),
  assignment: z.object({
    id: z.string(),
    demandId: z.string(),
    employeeId: z.string(),
    status: z.nativeEnum(AssignmentStatus),
    score: z.number(),
    explanation: z.string().optional(),
    createdAt: z.string().transform(str => new Date(str)),
    createdBy: z.string()
  }),
  timestamp: z.string().transform(str => new Date(str)),
  id: z.string()
})

const syncRequestSchema = z.object({
  changes: z.array(planningChangeSchema)
})

const snapshotSchema = z.object({
  id: z.string(),
  date: z.string().transform(str => new Date(str)),
  assignments: z.array(z.object({
    id: z.string(),
    demandId: z.string(),
    employeeId: z.string(),
    status: z.nativeEnum(AssignmentStatus),
    score: z.number(),
    explanation: z.string().optional(),
    createdAt: z.string().transform(str => new Date(str)),
    createdBy: z.string()
  })),
  version: z.number(),
  createdAt: z.string().transform(str => new Date(str)),
  conflicts: z.array(z.any()).optional()
})

/**
 * POST /api/planning/sync
 * Synchronize planning changes with the backend
 */
router.post('/sync', requireAuth, validateRequest(syncRequestSchema), async (req: Request, res: Response) => {
  try {
    const { changes } = req.body
    const userId = req.user?.id || 'system'
    
    const results = []
    const conflicts = []

    for (const change of changes) {
      try {
        let result: any
        
        switch (change.type) {
          case 'add':
            // Check if assignment already exists (conflict detection)
            const existing = await assignmentRepository.findById(change.assignment.id)
            if (existing) {
              conflicts.push({
                id: `conflict-${change.id}`,
                type: 'concurrent_modification',
                affectedAssignments: [change.assignment.id],
                message: `Assignment ${change.assignment.id} already exists`
              })
              continue
            }

            // Check for overlapping assignments
            const overlapping = await assignmentRepository.findConflicting(
              change.assignment.employeeId,
              change.timestamp,
              '06:00', // This should come from shift data
              '14:00'  // This should come from shift data
            )

            if (overlapping.length > 0) {
              conflicts.push({
                id: `conflict-${change.id}`,
                type: 'double_booking',
                affectedAssignments: [change.assignment.id, ...overlapping.map(a => a.id)],
                message: `Employee ${change.assignment.employeeId} has conflicting assignments`
              })
              continue
            }

            result = await assignmentRepository.create({
              ...change.assignment,
              createdBy: userId,
              updatedAt: new Date()
            })
            break

          case 'update':
            const currentAssignment = await assignmentRepository.findById(change.assignment.id)
            if (!currentAssignment) {
              conflicts.push({
                id: `conflict-${change.id}`,
                type: 'concurrent_modification',
                affectedAssignments: [change.assignment.id],
                message: `Assignment ${change.assignment.id} not found for update`
              })
              continue
            }

            // Check if assignment was modified by another user
            if (currentAssignment.updatedAt && 
                currentAssignment.updatedAt > change.timestamp) {
              conflicts.push({
                id: `conflict-${change.id}`,
                type: 'concurrent_modification',
                affectedAssignments: [change.assignment.id],
                message: `Assignment ${change.assignment.id} was modified by another user`
              })
              continue
            }

            result = await assignmentRepository.update(change.assignment.id, {
              ...change.assignment,
              updatedAt: new Date()
            })
            break

          case 'delete':
            const assignmentToDelete = await assignmentRepository.findById(change.assignment.id)
            if (!assignmentToDelete) {
              // Assignment already deleted, not a conflict
              continue
            }

            result = await assignmentRepository.delete(change.assignment.id)
            break

          default:
            throw new Error(`Unknown change type: ${change.type}`)
        }

        if (result) {
          results.push({
            changeId: change.id,
            type: change.type,
            assignmentId: change.assignment.id,
            success: true,
            result
          })
        }

      } catch (error) {
        console.error(`Error processing change ${change.id}:`, error)
        results.push({
          changeId: change.id,
          type: change.type,
          assignmentId: change.assignment.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Return results with any conflicts
    const response = {
      success: true,
      processed: results.length,
      conflictCount: conflicts.length,
      results,
      conflicts
    }

    if (conflicts.length > 0) {
      res.status(409).json(response)
    } else {
      res.json(response)
    }

  } catch (error) {
    console.error('Error syncing planning changes:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/planning/data/:date
 * Load planning data for a specific date
 */
router.get('/data/:date', requireAuth, async (req: Request, res: Response) => {
  try {
    const { date } = req.params
    const planningDate = new Date(date)
    
    if (isNaN(planningDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      })
    }

    // Get assignments for the date
    const startDate = new Date(planningDate)
    const endDate = new Date(planningDate)
    endDate.setDate(endDate.getDate() + 1)

    const assignments = await assignmentRepository.findByDateRange(startDate, endDate)

    // For now, return mock data for other fields
    // In a real implementation, you'd fetch stations, shifts, employees, etc.
    const planningData = {
      stations: [], // Would be fetched from station repository
      shifts: [],   // Would be fetched from shift template repository
      employees: [], // Would be fetched from employee repository
      assignments,
      coverageStatus: [], // Would be calculated
      violations: []      // Would be calculated
    }

    res.json(planningData)

  } catch (error) {
    console.error('Error loading planning data:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/planning/snapshots
 * Create a planning snapshot
 */
router.post('/snapshots', requireAuth, validateRequest(snapshotSchema), async (req: Request, res: Response) => {
  try {
    const snapshot = req.body
    const userId = req.user?.id || 'system'

    // Store snapshot in database
    // For now, we'll use a simple JSON storage approach
    // In production, you'd want a proper snapshots table
    
    const snapshotData = {
      ...snapshot,
      createdBy: userId,
      createdAt: new Date()
    }

    // Save assignments in the snapshot
    for (const assignment of snapshot.assignments) {
      await assignmentRepository.create({
        ...assignment,
        createdBy: userId,
        updatedAt: new Date()
      })
    }

    res.json({
      success: true,
      snapshot: snapshotData
    })

  } catch (error) {
    console.error('Error creating snapshot:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/planning/snapshots/:id/restore
 * Restore from a planning snapshot
 */
router.post('/snapshots/:id/restore', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    // In a real implementation, you'd fetch the snapshot from database
    // For now, return a mock response
    
    res.json({
      success: true,
      message: `Snapshot ${id} restored successfully`,
      data: {
        stations: [],
        shifts: [],
        employees: [],
        assignments: [],
        coverageStatus: [],
        violations: []
      }
    })

  } catch (error) {
    console.error('Error restoring snapshot:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/planning/conflicts/:id/resolve
 * Resolve a planning conflict
 */
router.post('/conflicts/:id/resolve', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id: conflictId } = req.params
    const { resolution, userId } = req.body
    
    if (!resolution || !resolution.action) {
      return res.status(400).json({
        success: false,
        error: 'Resolution action is required'
      })
    }

    // Process the resolution based on the action
    let result: any = null
    
    switch (resolution.action) {
      case 'accept_local':
        // Keep the local changes, reject remote
        if (resolution.resolvedAssignment) {
          result = await assignmentRepository.update(
            resolution.resolvedAssignment.id,
            resolution.resolvedAssignment
          )
        }
        break

      case 'accept_remote':
        // Accept remote changes, discard local
        // This would typically involve fetching the remote version
        // For now, we'll just acknowledge the resolution
        result = { action: 'accepted_remote' }
        break

      case 'merge':
        // Attempt to merge both changes
        if (resolution.resolvedAssignment) {
          result = await assignmentRepository.update(
            resolution.resolvedAssignment.id,
            resolution.resolvedAssignment
          )
        }
        break

      case 'manual':
        // User will resolve manually, just acknowledge
        result = { action: 'manual_resolution' }
        break

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown resolution action: ${resolution.action}`
        })
    }

    // Broadcast the resolution to other connected clients
    const wsManager = getPlanningWebSocketManager()
    if (wsManager) {
      // Broadcast to all sessions for now - in production you'd target specific sessions
      wsManager.broadcastToSession('default', {
        type: 'conflict_resolved',
        conflictId,
        resolution,
        userId,
        timestamp: new Date().toISOString()
      })
    }

    res.json({
      success: true,
      conflictId,
      resolution: resolution.action,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error resolving conflict:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/planning/status
 * Get planning service status and metrics
 */
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    const stats = await assignmentRepository.getAssignmentStats(startOfDay, endOfDay)
    
    // Get WebSocket connection stats
    const wsManager = getPlanningWebSocketManager()
    const wsStats = wsManager ? wsManager.getSessionStats() : null

    res.json({
      success: true,
      status: 'operational',
      timestamp: now.toISOString(),
      stats,
      websocket: wsStats
    })

  } catch (error) {
    console.error('Error getting planning status:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router
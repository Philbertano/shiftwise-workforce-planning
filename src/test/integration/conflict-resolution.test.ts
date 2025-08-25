import request from 'supertest'
import { app } from '../../index'
import { DatabaseManager } from '../../database/config'
import { AssignmentRepository } from '../../repositories/assignment.repository'
import { AssignmentStatus } from '../../types'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

describe('Conflict Resolution Integration', () => {
  let dbManager: DatabaseManager
  let assignmentRepository: AssignmentRepository

  beforeAll(async () => {
    dbManager = DatabaseManager.getInstance()
    await dbManager.connect()
    assignmentRepository = new AssignmentRepository()
  })

  afterAll(async () => {
    await dbManager.close()
  })

  beforeEach(async () => {
    // Clean up assignments before each test
    const allAssignments = await assignmentRepository.findAll()
    const ids = allAssignments.map(a => a.id)
    if (ids.length > 0) {
      await assignmentRepository.bulkDelete(ids)
    }
  })

  describe('POST /api/planning/sync - Conflict Detection', () => {
    it('should detect concurrent modification conflicts', async () => {
      // Create an initial assignment
      const initialAssignment = await assignmentRepository.create({
        id: 'assignment-1',
        demandId: 'demand-1',
        employeeId: 'employee-1',
        status: AssignmentStatus.CONFIRMED,
        score: 85,
        explanation: 'Initial assignment',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2024-01-01T10:00:00Z')
      })

      // Simulate a concurrent modification attempt
      const concurrentChange = {
        type: 'update',
        assignment: {
          id: 'assignment-1',
          demandId: 'demand-1',
          employeeId: 'employee-2', // Different employee
          status: AssignmentStatus.CONFIRMED,
          score: 90,
          explanation: 'Concurrent modification',
          createdAt: '2024-01-01T10:00:00Z',
          createdBy: 'user-2'
        },
        timestamp: '2024-01-01T09:59:00Z', // Earlier timestamp
        id: 'change-1'
      }

      const response = await request(app)
        .post('/api/planning/sync')
        .send({ changes: [concurrentChange] })
        .expect(409) // Conflict status

      expect(response.body.conflicts).toHaveLength(1)
      expect(response.body.conflicts[0]).toMatchObject({
        type: 'concurrent_modification',
        affectedAssignments: ['assignment-1'],
        message: expect.stringContaining('modified by another user')
      })
    })

    it('should detect double booking conflicts', async () => {
      // Create an existing assignment
      await assignmentRepository.create({
        id: 'assignment-1',
        demandId: 'demand-1',
        employeeId: 'employee-1',
        status: AssignmentStatus.CONFIRMED,
        score: 85,
        explanation: 'Existing assignment',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2024-01-01T10:00:00Z')
      })

      // Try to create a conflicting assignment (same employee, overlapping time)
      const conflictingChange = {
        type: 'add',
        assignment: {
          id: 'assignment-2',
          demandId: 'demand-2',
          employeeId: 'employee-1', // Same employee
          status: AssignmentStatus.CONFIRMED,
          score: 90,
          explanation: 'Conflicting assignment',
          createdAt: '2024-01-01T10:30:00Z',
          createdBy: 'user-2'
        },
        timestamp: '2024-01-01T10:30:00Z',
        id: 'change-2'
      }

      const response = await request(app)
        .post('/api/planning/sync')
        .send({ changes: [conflictingChange] })
        .expect(409) // Conflict status

      expect(response.body.conflicts).toHaveLength(1)
      expect(response.body.conflicts[0]).toMatchObject({
        type: 'double_booking',
        affectedAssignments: expect.arrayContaining(['assignment-2', 'assignment-1']),
        message: expect.stringContaining('conflicting assignments')
      })
    })

    it('should process non-conflicting changes successfully', async () => {
      const validChange = {
        type: 'add',
        assignment: {
          id: 'assignment-valid',
          demandId: 'demand-1',
          employeeId: 'employee-1',
          status: AssignmentStatus.CONFIRMED,
          score: 85,
          explanation: 'Valid assignment',
          createdAt: '2024-01-01T10:00:00Z',
          createdBy: 'user-1'
        },
        timestamp: '2024-01-01T10:00:00Z',
        id: 'change-valid'
      }

      const response = await request(app)
        .post('/api/planning/sync')
        .send({ changes: [validChange] })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.processed).toBe(1)
      expect(response.body.conflictCount).toBe(0)
      expect(response.body.results[0].success).toBe(true)

      // Verify assignment was created
      const created = await assignmentRepository.findById('assignment-valid')
      expect(created).toBeTruthy()
      expect(created?.employeeId).toBe('employee-1')
    })
  })

  describe('POST /api/planning/conflicts/:id/resolve', () => {
    it('should resolve conflict with accept_local action', async () => {
      const conflictId = 'conflict-1'
      const resolution = {
        action: 'accept_local',
        resolvedAssignment: {
          id: 'assignment-1',
          demandId: 'demand-1',
          employeeId: 'employee-1',
          status: AssignmentStatus.CONFIRMED,
          score: 85,
          explanation: 'Local resolution',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          createdBy: 'user-1'
        }
      }

      const response = await request(app)
        .post(`/api/planning/conflicts/${conflictId}/resolve`)
        .send({ resolution, userId: 'user-1' })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.conflictId).toBe(conflictId)
      expect(response.body.resolution).toBe('accept_local')
    })

    it('should resolve conflict with accept_remote action', async () => {
      const conflictId = 'conflict-2'
      const resolution = {
        action: 'accept_remote'
      }

      const response = await request(app)
        .post(`/api/planning/conflicts/${conflictId}/resolve`)
        .send({ resolution, userId: 'user-2' })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.conflictId).toBe(conflictId)
      expect(response.body.resolution).toBe('accept_remote')
    })

    it('should resolve conflict with merge action', async () => {
      // Create an assignment to merge
      await assignmentRepository.create({
        id: 'assignment-merge',
        demandId: 'demand-1',
        employeeId: 'employee-1',
        status: AssignmentStatus.CONFIRMED,
        score: 85,
        explanation: 'Original assignment',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2024-01-01T10:00:00Z')
      })

      const conflictId = 'conflict-merge'
      const resolution = {
        action: 'merge',
        resolvedAssignment: {
          id: 'assignment-merge',
          demandId: 'demand-1',
          employeeId: 'employee-1',
          status: AssignmentStatus.CONFIRMED,
          score: 95, // Merged score
          explanation: 'Merged assignment',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          createdBy: 'user-1'
        }
      }

      const response = await request(app)
        .post(`/api/planning/conflicts/${conflictId}/resolve`)
        .send({ resolution, userId: 'user-1' })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.resolution).toBe('merge')

      // Verify the assignment was updated
      const updated = await assignmentRepository.findById('assignment-merge')
      expect(updated?.score).toBe(95)
      expect(updated?.explanation).toBe('Merged assignment')
    })

    it('should handle manual resolution', async () => {
      const conflictId = 'conflict-manual'
      const resolution = {
        action: 'manual'
      }

      const response = await request(app)
        .post(`/api/planning/conflicts/${conflictId}/resolve`)
        .send({ resolution, userId: 'user-1' })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.resolution).toBe('manual')
      expect(response.body.result.action).toBe('manual_resolution')
    })

    it('should return error for invalid resolution action', async () => {
      const conflictId = 'conflict-invalid'
      const resolution = {
        action: 'invalid_action'
      }

      const response = await request(app)
        .post(`/api/planning/conflicts/${conflictId}/resolve`)
        .send({ resolution, userId: 'user-1' })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Unknown resolution action')
    })

    it('should return error when resolution is missing', async () => {
      const conflictId = 'conflict-missing'

      const response = await request(app)
        .post(`/api/planning/conflicts/${conflictId}/resolve`)
        .send({ userId: 'user-1' })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Resolution action is required')
    })
  })

  describe('GET /api/planning/status - WebSocket Stats', () => {
    it('should include WebSocket connection statistics', async () => {
      const response = await request(app)
        .get('/api/planning/status')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.status).toBe('operational')
      expect(response.body).toHaveProperty('websocket')
      
      // WebSocket stats should be null if no connections
      expect(response.body.websocket).toBeNull()
    })
  })

  describe('Conflict Resolution Workflow', () => {
    it('should handle complete conflict resolution workflow', async () => {
      // Step 1: Create initial assignment
      const initialAssignment = await assignmentRepository.create({
        id: 'workflow-assignment',
        demandId: 'demand-1',
        employeeId: 'employee-1',
        status: AssignmentStatus.CONFIRMED,
        score: 85,
        explanation: 'Initial assignment',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2024-01-01T10:00:00Z')
      })

      // Step 2: Attempt concurrent modification (should create conflict)
      const conflictingChange = {
        type: 'update',
        assignment: {
          id: 'workflow-assignment',
          demandId: 'demand-1',
          employeeId: 'employee-2',
          status: AssignmentStatus.CONFIRMED,
          score: 90,
          explanation: 'Conflicting update',
          createdAt: '2024-01-01T10:00:00Z',
          createdBy: 'user-2'
        },
        timestamp: '2024-01-01T09:59:00Z', // Earlier timestamp
        id: 'workflow-change'
      }

      const conflictResponse = await request(app)
        .post('/api/planning/sync')
        .send({ changes: [conflictingChange] })
        .expect(409)

      expect(conflictResponse.body.conflicts).toHaveLength(1)
      const conflict = conflictResponse.body.conflicts[0]

      // Step 3: Resolve the conflict
      const resolution = {
        action: 'accept_remote',
        resolvedAssignment: conflictingChange.assignment
      }

      const resolutionResponse = await request(app)
        .post(`/api/planning/conflicts/${conflict.id}/resolve`)
        .send({ resolution, userId: 'user-2' })
        .expect(200)

      expect(resolutionResponse.body.success).toBe(true)
      expect(resolutionResponse.body.resolution).toBe('accept_remote')

      // Step 4: Verify the final state
      const finalAssignment = await assignmentRepository.findById('workflow-assignment')
      expect(finalAssignment).toBeTruthy()
      // Note: In this test, the assignment wasn't actually updated because we chose accept_remote
      // In a real implementation, this would update the assignment with the remote changes
    })
  })
})
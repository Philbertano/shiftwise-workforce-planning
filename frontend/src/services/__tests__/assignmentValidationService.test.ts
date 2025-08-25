import { describe, it, expect } from 'vitest'
import { AssignmentValidationService } from '../assignmentValidationService'
import { Station, Employee, Assignment, RequiredSkill } from '../../types'

describe('AssignmentValidationService', () => {
  const validationService = new AssignmentValidationService()

  const mockStation: Station = {
    id: 'station-1',
    name: 'Assembly Station 1',
    line: 'Line A',
    capacity: 2,
    requiredSkills: [
      {
        skillId: 'welding',
        minLevel: 3,
        count: 1,
        mandatory: true
      }
    ],
    priority: 'high',
    active: true
  }

  const mockEmployee: Employee = {
    id: 'employee-1',
    name: 'John Doe',
    active: true,
    skills: [
      {
        skillId: 'welding',
        level: 4,
        certified: true,
        certificationDate: new Date('2023-01-01')
      }
    ],
    contractType: 'full_time'
  }

  const mockEmployeeNoSkills: Employee = {
    id: 'employee-2',
    name: 'Jane Smith',
    active: true,
    skills: [],
    contractType: 'full_time'
  }

  const mockAssignment: Assignment = {
    id: 'assignment-1',
    demandId: 'demand-1',
    employeeId: 'employee-1',
    status: 'confirmed',
    score: 85,
    createdAt: new Date(),
    createdBy: 'user-1'
  }

  describe('validateAssignment', () => {
    it('should pass validation for valid assignment', () => {
      const context = {
        station: mockStation,
        existingAssignments: [],
        employee: mockEmployee,
        date: new Date(),
        shiftId: 'shift-1'
      }

      const result = validationService.validateAssignment(context)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail validation when capacity is exceeded', () => {
      const context = {
        station: mockStation,
        existingAssignments: [
          { ...mockAssignment, employeeId: 'other-employee-1' }, 
          { ...mockAssignment, id: 'assignment-2', employeeId: 'other-employee-2' }
        ],
        employee: mockEmployee,
        date: new Date(),
        shiftId: 'shift-1'
      }

      const result = validationService.validateAssignment(context)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.type === 'capacity_exceeded')).toBe(true)
      expect(result.errors.find(e => e.type === 'capacity_exceeded')?.message).toContain('capacity exceeded')
    })

    it('should fail validation when employee lacks required skills', () => {
      const context = {
        station: mockStation,
        existingAssignments: [],
        employee: mockEmployeeNoSkills,
        date: new Date(),
        shiftId: 'shift-1'
      }

      const result = validationService.validateAssignment(context)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].type).toBe('skill_mismatch')
      expect(result.errors[0].message).toContain('lacks required skill')
    })

    it('should fail validation when employee is inactive', () => {
      const inactiveEmployee = { ...mockEmployee, active: false }
      const context = {
        station: mockStation,
        existingAssignments: [],
        employee: inactiveEmployee,
        date: new Date(),
        shiftId: 'shift-1'
      }

      const result = validationService.validateAssignment(context)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].type).toBe('employee_unavailable')
      expect(result.errors[0].message).toContain('not active')
    })

    it('should fail validation for duplicate assignment', () => {
      const existingAssignment = { ...mockAssignment, employeeId: mockEmployee.id }
      const context = {
        station: mockStation,
        existingAssignments: [existingAssignment],
        employee: mockEmployee,
        date: new Date(),
        shiftId: 'shift-1'
      }

      const result = validationService.validateAssignment(context)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].type).toBe('duplicate_assignment')
      expect(result.errors[0].message).toContain('already assigned')
    })

    it('should show warning when station capacity is not defined', () => {
      const stationNoCapacity = { ...mockStation, capacity: undefined }
      const context = {
        station: stationNoCapacity,
        existingAssignments: [],
        employee: mockEmployee,
        date: new Date(),
        shiftId: 'shift-1'
      }

      const result = validationService.validateAssignment(context)

      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].message).toContain('capacity not defined')
    })

    it('should show warning when station will be at full capacity', () => {
      const context = {
        station: mockStation,
        existingAssignments: [{ ...mockAssignment, employeeId: 'other-employee' }], // 1 existing, adding 1 more = 2 (full capacity)
        employee: mockEmployee,
        date: new Date(),
        shiftId: 'shift-1'
      }

      const result = validationService.validateAssignment(context)

      expect(result.isValid).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some(w => w.message.includes('full capacity'))).toBe(true)
    })
  })

  describe('getRecoveryActions', () => {
    it('should provide recovery actions for capacity exceeded error', () => {
      const error = {
        type: 'capacity_exceeded' as const,
        message: 'Capacity exceeded',
        severity: 'error' as const
      }

      const actions = validationService.getRecoveryActions(error)

      expect(actions).toContain('Remove an existing assignment')
      expect(actions).toContain('Increase station capacity')
      expect(actions).toContain('Assign to a different station')
    })

    it('should provide recovery actions for skill mismatch error', () => {
      const error = {
        type: 'skill_mismatch' as const,
        message: 'Skill mismatch',
        severity: 'error' as const
      }

      const actions = validationService.getRecoveryActions(error)

      expect(actions).toContain('Select an employee with required skills')
      expect(actions).toContain('Provide training to the employee')
      expect(actions).toContain('Adjust skill requirements')
    })
  })
})
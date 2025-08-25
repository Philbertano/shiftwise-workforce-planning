import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAssignmentValidation } from '../useAssignmentValidation'
import { Station, Employee, Assignment } from '../../types'

describe('useAssignmentValidation', () => {
  const mockStations: Station[] = [
    {
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
  ]

  const mockEmployees: Employee[] = [
    {
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
  ]

  const mockAssignments: Assignment[] = []

  it('should validate assignment successfully', () => {
    const { result } = renderHook(() =>
      useAssignmentValidation({
        stations: mockStations,
        employees: mockEmployees,
        assignments: mockAssignments
      })
    )

    const validationResult = result.current.validateAssignment(
      'station-1',
      'employee-1',
      new Date(),
      'shift-1'
    )

    expect(validationResult.isValid).toBe(true)
    expect(validationResult.errors).toHaveLength(0)
  })

  it('should return error for invalid station', () => {
    const { result } = renderHook(() =>
      useAssignmentValidation({
        stations: mockStations,
        employees: mockEmployees,
        assignments: mockAssignments
      })
    )

    const validationResult = result.current.validateAssignment(
      'invalid-station',
      'employee-1',
      new Date(),
      'shift-1'
    )

    expect(validationResult.isValid).toBe(false)
    expect(validationResult.errors).toHaveLength(1)
    expect(validationResult.errors[0].message).toContain('Station not found')
  })

  it('should return error for invalid employee', () => {
    const { result } = renderHook(() =>
      useAssignmentValidation({
        stations: mockStations,
        employees: mockEmployees,
        assignments: mockAssignments
      })
    )

    const validationResult = result.current.validateAssignment(
      'station-1',
      'invalid-employee',
      new Date(),
      'shift-1'
    )

    expect(validationResult.isValid).toBe(false)
    expect(validationResult.errors).toHaveLength(1)
    expect(validationResult.errors[0].message).toContain('Employee not found')
  })

  it('should check station capacity status', () => {
    const { result } = renderHook(() =>
      useAssignmentValidation({
        stations: mockStations,
        employees: mockEmployees,
        assignments: mockAssignments
      })
    )

    const capacityStatus = result.current.getStationCapacityStatus('station-1')

    expect(capacityStatus).toEqual({
      current: 0,
      capacity: 2,
      available: 2,
      isAtCapacity: false,
      isOverCapacity: false,
      utilizationPercent: 0
    })
  })

  it('should detect when station is at capacity', () => {
    const assignmentsAtCapacity: Assignment[] = [
      {
        id: 'assignment-1',
        demandId: 'station-1-shift-1-2024-01-01',
        employeeId: 'employee-1',
        status: 'confirmed',
        score: 85,
        createdAt: new Date(),
        createdBy: 'user-1'
      },
      {
        id: 'assignment-2',
        demandId: 'station-1-shift-1-2024-01-01',
        employeeId: 'employee-2',
        status: 'confirmed',
        score: 80,
        createdAt: new Date(),
        createdBy: 'user-1'
      }
    ]

    const { result } = renderHook(() =>
      useAssignmentValidation({
        stations: mockStations,
        employees: mockEmployees,
        assignments: assignmentsAtCapacity
      })
    )

    const isAtCapacity = result.current.isStationAtCapacity('station-1')
    expect(isAtCapacity).toBe(true)

    const capacityStatus = result.current.getStationCapacityStatus('station-1')
    expect(capacityStatus?.isAtCapacity).toBe(true)
    expect(capacityStatus?.utilizationPercent).toBe(100)
  })
})
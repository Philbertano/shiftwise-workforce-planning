import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom';
import { 
  StationCapacityIndicator, 
  calculateCapacityStatus, 
  validateCapacityAssignment,
  getCapacityWarnings
} from '../StationCapacityIndicator'

describe('StationCapacityIndicator', () => {
  describe('calculateCapacityStatus', () => {
    it('should return empty status when no employees assigned', () => {
      const status = calculateCapacityStatus(0, 5, true)
      expect(status.status).toBe('empty')
      expect(status.current).toBe(0)
      expect(status.required).toBe(5)
      expect(status.availableCapacity).toBe(5)
      expect(status.canAcceptMore).toBe(true)
    })

    it('should return understaffed status when below capacity', () => {
      const status = calculateCapacityStatus(2, 5, true)
      expect(status.status).toBe('understaffed')
      expect(status.availableCapacity).toBe(3)
      expect(status.canAcceptMore).toBe(true)
    })

    it('should return optimal status when at capacity', () => {
      const status = calculateCapacityStatus(5, 5, true)
      expect(status.status).toBe('optimal')
      expect(status.availableCapacity).toBe(0)
      expect(status.canAcceptMore).toBe(false)
    })

    it('should return overstaffed status when over capacity', () => {
      const status = calculateCapacityStatus(7, 5, true)
      expect(status.status).toBe('overstaffed')
      expect(status.availableCapacity).toBe(0)
      expect(status.canAcceptMore).toBe(false)
    })
  })

  describe('validateCapacityAssignment', () => {
    it('should allow assignment when under capacity', () => {
      const result = validateCapacityAssignment(2, 5, 'emp1', ['emp2', 'emp3'])
      expect(result.canAssign).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should prevent assignment when at capacity', () => {
      const result = validateCapacityAssignment(5, 5, 'emp1', ['emp2', 'emp3', 'emp4', 'emp5', 'emp6'])
      expect(result.canAssign).toBe(false)
      expect(result.reason).toContain('maximum capacity')
      expect(result.severity).toBe('error')
    })

    it('should prevent duplicate assignment', () => {
      const result = validateCapacityAssignment(2, 5, 'emp1', ['emp1', 'emp2'])
      expect(result.canAssign).toBe(false)
      expect(result.reason).toContain('already assigned')
      expect(result.severity).toBe('error')
    })

    it('should warn when assignment will reach capacity', () => {
      const result = validateCapacityAssignment(4, 5, 'emp1', ['emp2', 'emp3', 'emp4', 'emp5'])
      expect(result.canAssign).toBe(true)
      expect(result.reason).toContain('full capacity')
      expect(result.severity).toBe('warning')
    })
  })

  describe('getCapacityWarnings', () => {
    it('should return overstaffed warning', () => {
      const status = calculateCapacityStatus(7, 5, true)
      const warnings = getCapacityWarnings(status)
      expect(warnings).toHaveLength(1)
      expect(warnings[0]).toContain('overstaffed by 2 employees')
    })

    it('should return understaffed warning', () => {
      const status = calculateCapacityStatus(2, 5, true)
      const warnings = getCapacityWarnings(status)
      expect(warnings).toHaveLength(1)
      expect(warnings[0]).toContain('needs 3 more employees')
    })

    it('should return empty station warning', () => {
      const status = calculateCapacityStatus(0, 5, true)
      const warnings = getCapacityWarnings(status)
      expect(warnings).toHaveLength(1)
      expect(warnings[0]).toContain('no employees assigned')
    })

    it('should return skills mismatch warning', () => {
      const status = calculateCapacityStatus(5, 5, false)
      const warnings = getCapacityWarnings(status)
      expect(warnings).toHaveLength(1)
      expect(warnings[0]).toContain('do not meet all required skills')
    })

    it('should return no warnings for optimal status', () => {
      const status = calculateCapacityStatus(5, 5, true)
      const warnings = getCapacityWarnings(status)
      expect(warnings).toHaveLength(0)
    })
  })

  describe('Component Rendering', () => {
    it('should render compact indicator correctly', () => {
      const capacityStatus = calculateCapacityStatus(3, 5, true)
      render(
        <StationCapacityIndicator 
          capacity={capacityStatus} 
          compact={true} 
        />
      )
      
      expect(screen.getByText('3/5')).toBeInTheDocument()
      expect(screen.getByText('⚠')).toBeInTheDocument()
    })

    it('should render detailed indicator with warnings', () => {
      const capacityStatus = calculateCapacityStatus(7, 5, false)
      render(
        <StationCapacityIndicator 
          capacity={capacityStatus} 
          showDetails={true}
          showWarnings={true}
        />
      )
      
      expect(screen.getByText('7/5')).toBeInTheDocument()
      expect(screen.getByText('Overstaffed')).toBeInTheDocument()
      expect(screen.getByText('Skill requirements not met')).toBeInTheDocument()
    })

    it('should show overstaffed indicator in compact mode', () => {
      const capacityStatus = calculateCapacityStatus(7, 5, true)
      render(
        <StationCapacityIndicator 
          capacity={capacityStatus} 
          compact={true} 
        />
      )
      
      expect(screen.getByText('🚫')).toBeInTheDocument()
    })

    it('should display capacity details when showDetails is true', () => {
      const capacityStatus = calculateCapacityStatus(3, 5, true)
      render(
        <StationCapacityIndicator 
          capacity={capacityStatus} 
          showDetails={true}
        />
      )
      
      expect(screen.getByText('Required:')).toBeInTheDocument()
      expect(screen.getByText('Assigned:')).toBeInTheDocument()
      expect(screen.getByText('Gap:')).toBeInTheDocument()
      expect(screen.getByText('Available:')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getAllByText('2')).toHaveLength(2) // Gap and Available both show 2
    })
  })
})
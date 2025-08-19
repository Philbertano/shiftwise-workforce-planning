import { describe, it, expect } from 'vitest';
import { Employee } from '../../models/Employee.js';
import { ContractType } from '../../types/index.js';

describe('Employee Model', () => {
  const validEmployeeData = {
    id: 'emp-001',
    name: 'John Doe',
    contractType: ContractType.FULL_TIME,
    weeklyHours: 40,
    maxHoursPerDay: 8,
    minRestHours: 12,
    team: 'Production A',
    active: true
  };

  describe('Constructor and Validation', () => {
    it('should create a valid employee', () => {
      const employee = new Employee(validEmployeeData);
      
      expect(employee.id).toBe('emp-001');
      expect(employee.name).toBe('John Doe');
      expect(employee.contractType).toBe(ContractType.FULL_TIME);
      expect(employee.weeklyHours).toBe(40);
      expect(employee.maxHoursPerDay).toBe(8);
      expect(employee.minRestHours).toBe(12);
      expect(employee.team).toBe('Production A');
      expect(employee.active).toBe(true);
      expect(employee.createdAt).toBeInstanceOf(Date);
      expect(employee.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error for empty ID', () => {
      expect(() => new Employee({ ...validEmployeeData, id: '' }))
        .toThrow('Employee ID is required');
    });

    it('should throw error for empty name', () => {
      expect(() => new Employee({ ...validEmployeeData, name: '' }))
        .toThrow('Employee name is required');
    });

    it('should throw error for name too long', () => {
      const longName = 'a'.repeat(101);
      expect(() => new Employee({ ...validEmployeeData, name: longName }))
        .toThrow('Name too long');
    });

    it('should throw error for invalid weekly hours', () => {
      expect(() => new Employee({ ...validEmployeeData, weeklyHours: 0 }))
        .toThrow('Weekly hours must be positive');
      
      expect(() => new Employee({ ...validEmployeeData, weeklyHours: 81 }))
        .toThrow('Weekly hours cannot exceed 80');
    });

    it('should throw error for invalid max hours per day', () => {
      expect(() => new Employee({ ...validEmployeeData, maxHoursPerDay: 0 }))
        .toThrow('Max hours per day must be positive');
      
      expect(() => new Employee({ ...validEmployeeData, maxHoursPerDay: 25 }))
        .toThrow('Cannot exceed 24 hours per day');
    });

    it('should throw error for invalid min rest hours', () => {
      expect(() => new Employee({ ...validEmployeeData, minRestHours: 7 }))
        .toThrow('Minimum rest must be at least 8 hours');
      
      expect(() => new Employee({ ...validEmployeeData, minRestHours: 25 }))
        .toThrow('Rest hours cannot exceed 24');
    });
  });

  describe('Business Rule Validation', () => {
    it('should throw error when weekly hours cannot be achieved with max hours per day', () => {
      expect(() => new Employee({
        ...validEmployeeData,
        weeklyHours: 50,
        maxHoursPerDay: 6 // 6 * 7 = 42, less than 50
      })).toThrow('Weekly hours cannot be achieved with the specified max hours per day');
    });

    it('should throw error for part-time employee with too many hours', () => {
      expect(() => new Employee({
        ...validEmployeeData,
        contractType: ContractType.PART_TIME,
        weeklyHours: 35
      })).toThrow('Part-time employees cannot work more than 30 hours per week');
    });

    it('should throw error for full-time employee with too few hours', () => {
      expect(() => new Employee({
        ...validEmployeeData,
        contractType: ContractType.FULL_TIME,
        weeklyHours: 30
      })).toThrow('Full-time employees must work at least 35 hours per week');
    });

    it('should validate preferences max consecutive days', () => {
      expect(() => new Employee({
        ...validEmployeeData,
        contractType: ContractType.PART_TIME, // Use part-time to avoid full-time validation
        weeklyHours: 16, // Only 2 days possible at 8 hours each
        preferences: {
          preferredShifts: [],
          preferredStations: [],
          maxConsecutiveDays: 5, // More than possible
          preferredDaysOff: []
        }
      })).toThrow('Max consecutive days exceeds what is possible with weekly hours');
    });
  });

  describe('Shift Calculations', () => {
    let employee: Employee;

    beforeEach(() => {
      employee = new Employee(validEmployeeData);
    });

    it('should calculate shift hours correctly', () => {
      expect(employee.calculateShiftHours('08:00', '16:00')).toBe(8);
      expect(employee.calculateShiftHours('09:30', '17:30')).toBe(8);
      expect(employee.calculateShiftHours('22:00', '06:00')).toBe(8); // Overnight
    });

    it('should detect daily limit violations', () => {
      expect(employee.wouldViolateDailyLimit('08:00', '16:00')).toBe(false); // 8 hours
      expect(employee.wouldViolateDailyLimit('08:00', '17:00')).toBe(true);  // 9 hours
    });

    it('should check availability for active employees', () => {
      expect(employee.isAvailableForShift(new Date(), '08:00', '16:00')).toBe(true);
    });

    it('should not be available when inactive', () => {
      const inactiveEmployee = new Employee({ ...validEmployeeData, active: false });
      expect(inactiveEmployee.isAvailableForShift(new Date(), '08:00', '16:00')).toBe(false);
    });
  });

  describe('Update and Serialization', () => {
    let employee: Employee;

    beforeEach(() => {
      employee = new Employee(validEmployeeData);
    });

    it('should create updated copy', async () => {
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      const updated = employee.update({ name: 'Jane Doe', weeklyHours: 35 });
      
      expect(updated.name).toBe('Jane Doe');
      expect(updated.weeklyHours).toBe(35);
      expect(updated.id).toBe(employee.id); // Should remain same
      expect(updated.createdAt).toStrictEqual(employee.createdAt); // Should remain same
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(employee.updatedAt.getTime());
    });

    it('should serialize to JSON correctly', () => {
      const json = employee.toJSON();
      
      expect(json).toHaveProperty('id', 'emp-001');
      expect(json).toHaveProperty('name', 'John Doe');
      expect(json).toHaveProperty('contractType', ContractType.FULL_TIME);
      expect(json).toHaveProperty('weeklyHours', 40);
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('updatedAt');
    });
  });

  describe('Edge Cases', () => {
    it('should handle preferences correctly', () => {
      const employeeWithPrefs = new Employee({
        ...validEmployeeData,
        preferences: {
          preferredShifts: ['day'],
          preferredStations: ['station-1'],
          maxConsecutiveDays: 3,
          preferredDaysOff: [0, 6] // Sunday and Saturday
        }
      });

      expect(employeeWithPrefs.preferences).toBeDefined();
      expect(employeeWithPrefs.preferences?.preferredShifts).toEqual(['day']);
    });

    it('should handle overnight shifts correctly', () => {
      const employee = new Employee(validEmployeeData);
      
      // Test overnight shift calculation
      expect(employee.calculateShiftHours('23:00', '07:00')).toBe(8);
      expect(employee.calculateShiftHours('22:30', '06:30')).toBe(8);
    });
  });
});
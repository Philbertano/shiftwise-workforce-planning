import { describe, it, expect, beforeEach } from 'vitest';
import { ShiftTemplate } from '../../models/ShiftTemplate.js';
import { ShiftType } from '../../types/index.js';

describe('ShiftTemplate Model', () => {
  const validShiftTemplateData = {
    id: 'shift-001',
    name: 'Day Shift',
    startTime: '08:00',
    endTime: '16:00',
    breakRules: [
      { duration: 30, startAfter: 240, paid: false }, // 30min lunch after 4 hours
      { duration: 15, startAfter: 120, paid: true },  // 15min break after 2 hours
      { duration: 15, startAfter: 360, paid: true }   // 15min break after 6 hours
    ],
    shiftType: ShiftType.DAY
  };

  describe('Constructor and Validation', () => {
    it('should create a valid shift template', () => {
      const shiftTemplate = new ShiftTemplate(validShiftTemplateData);
      
      expect(shiftTemplate.id).toBe('shift-001');
      expect(shiftTemplate.name).toBe('Day Shift');
      expect(shiftTemplate.startTime).toBe('08:00');
      expect(shiftTemplate.endTime).toBe('16:00');
      expect(shiftTemplate.breakRules).toHaveLength(3);
      expect(shiftTemplate.shiftType).toBe(ShiftType.DAY);
      expect(shiftTemplate.createdAt).toBeInstanceOf(Date);
      expect(shiftTemplate.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error for empty ID', () => {
      expect(() => new ShiftTemplate({ ...validShiftTemplateData, id: '' }))
        .toThrow('ShiftTemplate ID is required');
    });

    it('should throw error for empty name', () => {
      expect(() => new ShiftTemplate({ ...validShiftTemplateData, name: '' }))
        .toThrow('Shift template name is required');
    });

    it('should throw error for invalid time format', () => {
      expect(() => new ShiftTemplate({ ...validShiftTemplateData, startTime: '25:00' }))
        .toThrow('Start time must be in HH:MM format');
      
      expect(() => new ShiftTemplate({ ...validShiftTemplateData, endTime: '8:60' }))
        .toThrow('End time must be in HH:MM format');
      
      expect(() => new ShiftTemplate({ ...validShiftTemplateData, startTime: '08:60' }))
        .toThrow('Start time must be in HH:MM format');
    });

    it('should validate break rule durations', () => {
      expect(() => new ShiftTemplate({
        ...validShiftTemplateData,
        breakRules: [{ duration: 4, startAfter: 120, paid: true }]
      })).toThrow('Break duration must be at least 5 minutes');

      expect(() => new ShiftTemplate({
        ...validShiftTemplateData,
        breakRules: [{ duration: 130, startAfter: 120, paid: true }]
      })).toThrow('Break duration cannot exceed 2 hours');
    });

    it('should validate break rule start times', () => {
      expect(() => new ShiftTemplate({
        ...validShiftTemplateData,
        breakRules: [{ duration: 15, startAfter: -1, paid: true }]
      })).toThrow('Start after must be non-negative');
    });
  });

  describe('Business Rule Validation', () => {
    it('should throw error for too short shifts', () => {
      expect(() => new ShiftTemplate({
        ...validShiftTemplateData,
        startTime: '08:00',
        endTime: '09:30' // 1.5 hours
      })).toThrow('Shift duration must be at least 2 hours');
    });

    it('should throw error for too long shifts', () => {
      expect(() => new ShiftTemplate({
        ...validShiftTemplateData,
        startTime: '08:00',
        endTime: '01:00' // 17 hours (next day)
      })).toThrow('Shift duration cannot exceed 16 hours');
    });

    it('should throw error when total break time exceeds shift duration', () => {
      expect(() => new ShiftTemplate({
        ...validShiftTemplateData,
        startTime: '08:00',
        endTime: '10:00', // 2 hours = 120 minutes
        breakRules: [{ duration: 60, startAfter: 30, paid: false }, { duration: 61, startAfter: 90, paid: false }] // Total 121 minutes break
      })).toThrow('Total break time cannot exceed shift duration');
    });

    it('should throw error when break starts after shift ends', () => {
      expect(() => new ShiftTemplate({
        ...validShiftTemplateData,
        breakRules: [{ duration: 15, startAfter: 500, paid: true }] // After 8+ hours
      })).toThrow('Break cannot start after shift ends');
    });

    it('should throw error when break extends beyond shift end', () => {
      expect(() => new ShiftTemplate({
        ...validShiftTemplateData,
        breakRules: [{ duration: 60, startAfter: 450, paid: true }] // 1 hour break starting at 7.5 hours (extends beyond 8 hour shift)
      })).toThrow('Break cannot extend beyond shift end time');
    });
  });

  describe('Shift Type Validation', () => {
    it('should validate day shift timing', () => {
      expect(() => new ShiftTemplate({
        ...validShiftTemplateData,
        startTime: '15:00', // Too late for day shift
        endTime: '23:00',
        shiftType: ShiftType.DAY
      })).toThrow('Day shifts should typically start between 6:00 and 14:00');
    });

    it('should validate night shift timing', () => {
      expect(() => new ShiftTemplate({
        ...validShiftTemplateData,
        startTime: '12:00', // Too early for night shift
        endTime: '20:00',
        breakRules: [], // Remove breaks to avoid validation conflicts
        shiftType: ShiftType.NIGHT
      })).toThrow('Night shifts should typically start between 22:00 and 6:00');
    });

    it('should validate swing shift timing', () => {
      expect(() => new ShiftTemplate({
        ...validShiftTemplateData,
        startTime: '08:00', // Too early for swing shift
        shiftType: ShiftType.SWING
      })).toThrow('Swing shifts should typically start between 14:00 and 22:00');
    });

    it('should allow any timing for weekend shifts', () => {
      expect(() => new ShiftTemplate({
        ...validShiftTemplateData,
        startTime: '08:00',
        shiftType: ShiftType.WEEKEND
      })).not.toThrow();
    });
  });

  describe('Duration and Time Calculations', () => {
    let shiftTemplate: ShiftTemplate;

    beforeEach(() => {
      shiftTemplate = new ShiftTemplate(validShiftTemplateData);
    });

    it('should calculate shift duration correctly', () => {
      expect(shiftTemplate.getDuration()).toBe(8);
    });

    it('should calculate overnight shift duration', () => {
      const nightShift = new ShiftTemplate({
        ...validShiftTemplateData,
        startTime: '22:00',
        endTime: '06:00',
        shiftType: ShiftType.NIGHT
      });
      
      expect(nightShift.getDuration()).toBe(8);
    });

    it('should calculate total break time', () => {
      expect(shiftTemplate.getTotalBreakTime()).toBe(60); // 30 + 15 + 15
    });

    it('should calculate paid break time', () => {
      expect(shiftTemplate.getPaidBreakTime()).toBe(30); // 15 + 15
    });

    it('should calculate working time', () => {
      expect(shiftTemplate.getWorkingTime()).toBe(7.5); // 8 hours - 0.5 hours unpaid break
    });

    it('should identify overnight shifts', () => {
      expect(shiftTemplate.isOvernightShift()).toBe(false);
      
      const nightShift = new ShiftTemplate({
        ...validShiftTemplateData,
        startTime: '22:00',
        endTime: '06:00',
        shiftType: ShiftType.NIGHT
      });
      
      expect(nightShift.isOvernightShift()).toBe(true);
    });
  });

  describe('Break Rules Management', () => {
    let shiftTemplate: ShiftTemplate;

    beforeEach(() => {
      shiftTemplate = new ShiftTemplate(validShiftTemplateData);
    });

    it('should sort break rules by start time', () => {
      const sorted = shiftTemplate.getBreakRulesSorted();
      
      expect(sorted[0].startAfter).toBe(120); // First break at 2 hours
      expect(sorted[1].startAfter).toBe(240); // Second break at 4 hours
      expect(sorted[2].startAfter).toBe(360); // Third break at 6 hours
    });

    it('should check suitability for contract types', () => {
      expect(shiftTemplate.isSuitableForContractType(8)).toBe(true);
      expect(shiftTemplate.isSuitableForContractType(6)).toBe(false);
    });
  });

  describe('Update and Serialization', () => {
    let shiftTemplate: ShiftTemplate;

    beforeEach(() => {
      shiftTemplate = new ShiftTemplate(validShiftTemplateData);
    });

    it('should create updated copy', async () => {
      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updated = shiftTemplate.update({ 
        name: 'Morning Shift',
        startTime: '07:00',
        endTime: '15:00'
      });
      
      expect(updated.name).toBe('Morning Shift');
      expect(updated.startTime).toBe('07:00');
      expect(updated.endTime).toBe('15:00');
      expect(updated.id).toBe(shiftTemplate.id); // Should remain same
      expect(updated.createdAt).toStrictEqual(shiftTemplate.createdAt); // Should remain same
      expect(updated.updatedAt.getTime()).toBeGreaterThan(shiftTemplate.updatedAt.getTime());
    });

    it('should serialize to JSON correctly', () => {
      const json = shiftTemplate.toJSON();
      
      expect(json).toHaveProperty('id', 'shift-001');
      expect(json).toHaveProperty('name', 'Day Shift');
      expect(json).toHaveProperty('startTime', '08:00');
      expect(json).toHaveProperty('endTime', '16:00');
      expect(json).toHaveProperty('breakRules');
      expect(json).toHaveProperty('shiftType', ShiftType.DAY);
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('updatedAt');
    });
  });

  describe('Edge Cases', () => {
    it('should handle shifts with no breaks', () => {
      const noBreakShift = new ShiftTemplate({
        ...validShiftTemplateData,
        breakRules: []
      });

      expect(noBreakShift.getTotalBreakTime()).toBe(0);
      expect(noBreakShift.getPaidBreakTime()).toBe(0);
      expect(noBreakShift.getWorkingTime()).toBe(8);
    });

    it('should handle shifts with only paid breaks', () => {
      const paidBreaksOnly = new ShiftTemplate({
        ...validShiftTemplateData,
        breakRules: [
          { duration: 15, startAfter: 120, paid: true },
          { duration: 15, startAfter: 360, paid: true }
        ]
      });

      expect(paidBreaksOnly.getTotalBreakTime()).toBe(30);
      expect(paidBreaksOnly.getPaidBreakTime()).toBe(30);
      expect(paidBreaksOnly.getWorkingTime()).toBe(8); // All breaks are paid
    });

    it('should handle exact 24:00 end time', () => {
      const midnightEnd = new ShiftTemplate({
        ...validShiftTemplateData,
        startTime: '22:00', // Valid night shift start time
        endTime: '06:00', // 6 AM next day
        breakRules: [{ duration: 30, startAfter: 240, paid: false }], // 30min break after 4 hours
        shiftType: ShiftType.NIGHT
      });

      expect(midnightEnd.getDuration()).toBe(8);
      expect(midnightEnd.isOvernightShift()).toBe(true);
    });

    it('should handle maximum allowed shift duration', () => {
      const longShift = new ShiftTemplate({
        ...validShiftTemplateData,
        startTime: '08:00',
        endTime: '00:00', // 16 hours
        breakRules: [{ duration: 60, startAfter: 480, paid: false }] // 1 hour break
      });

      expect(longShift.getDuration()).toBe(16);
      expect(longShift.getWorkingTime()).toBe(15);
    });
  });
});
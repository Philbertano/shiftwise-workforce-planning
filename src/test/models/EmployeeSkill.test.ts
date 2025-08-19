import { describe, it, expect, beforeEach } from 'vitest';
import { EmployeeSkill } from '../../models/EmployeeSkill.js';
import { addDays, subDays } from 'date-fns';

describe('EmployeeSkill Model', () => {
  const validEmployeeSkillData = {
    id: 'emp-skill-001',
    employeeId: 'emp-001',
    skillId: 'skill-001',
    level: 2,
    validUntil: addDays(new Date(), 365), // Valid for 1 year
    certificationId: 'CERT-2024-001'
  };

  describe('Constructor and Validation', () => {
    it('should create a valid employee skill', () => {
      const employeeSkill = new EmployeeSkill(validEmployeeSkillData);
      
      expect(employeeSkill.id).toBe('emp-skill-001');
      expect(employeeSkill.employeeId).toBe('emp-001');
      expect(employeeSkill.skillId).toBe('skill-001');
      expect(employeeSkill.level).toBe(2);
      expect(employeeSkill.validUntil).toEqual(validEmployeeSkillData.validUntil);
      expect(employeeSkill.certificationId).toBe('CERT-2024-001');
      expect(employeeSkill.createdAt).toBeInstanceOf(Date);
      expect(employeeSkill.updatedAt).toBeInstanceOf(Date);
    });

    it('should create employee skill without expiry date', () => {
      const data = { ...validEmployeeSkillData };
      delete data.validUntil;
      delete data.certificationId;
      
      const employeeSkill = new EmployeeSkill(data);
      expect(employeeSkill.validUntil).toBeUndefined();
      expect(employeeSkill.certificationId).toBeUndefined();
    });

    it('should throw error for empty ID', () => {
      expect(() => new EmployeeSkill({ ...validEmployeeSkillData, id: '' }))
        .toThrow('EmployeeSkill ID is required');
    });

    it('should throw error for empty employee ID', () => {
      expect(() => new EmployeeSkill({ ...validEmployeeSkillData, employeeId: '' }))
        .toThrow('Employee ID is required');
    });

    it('should throw error for empty skill ID', () => {
      expect(() => new EmployeeSkill({ ...validEmployeeSkillData, skillId: '' }))
        .toThrow('Skill ID is required');
    });

    it('should throw error for invalid level', () => {
      expect(() => new EmployeeSkill({ ...validEmployeeSkillData, level: 0 }))
        .toThrow('Skill level must be at least 1');
    });
  });

  describe('Business Rule Validation', () => {
    it('should allow past expiry dates for testing expired skills', () => {
      expect(() => new EmployeeSkill({
        ...validEmployeeSkillData,
        validUntil: subDays(new Date(), 1)
      })).not.toThrow();
    });

    it('should throw error for certification ID with whitespace', () => {
      expect(() => new EmployeeSkill({
        ...validEmployeeSkillData,
        certificationId: ' CERT-001 '
      })).toThrow('Certification ID cannot have leading or trailing whitespace');
    });

    it('should throw error for negative level', () => {
      expect(() => new EmployeeSkill({
        ...validEmployeeSkillData,
        level: -1
      })).toThrow('Skill level must be at least 1');
    });
  });

  describe('Validity Checks', () => {
    let employeeSkill: EmployeeSkill;
    let expiredSkill: EmployeeSkill;
    let permanentSkill: EmployeeSkill;

    beforeEach(() => {
      employeeSkill = new EmployeeSkill(validEmployeeSkillData);
      
      expiredSkill = new EmployeeSkill({
        ...validEmployeeSkillData,
        id: 'expired-skill',
        validUntil: subDays(new Date(), 1)
      });
      
      permanentSkill = new EmployeeSkill({
        ...validEmployeeSkillData,
        id: 'permanent-skill',
        validUntil: undefined
      });
    });

    it('should check if skill is valid', () => {
      expect(employeeSkill.isValid()).toBe(true);
      expect(permanentSkill.isValid()).toBe(true);
    });

    it('should check if skill is expired', () => {
      expect(employeeSkill.isExpired()).toBe(false);
      expect(permanentSkill.isExpired()).toBe(false);
    });

    it('should check validity as of specific date', () => {
      const futureDate = addDays(new Date(), 400);
      expect(employeeSkill.isValid(futureDate)).toBe(false);
      expect(permanentSkill.isValid(futureDate)).toBe(true);
    });

    it('should check if skill is expiring soon', () => {
      const soonToExpire = new EmployeeSkill({
        ...validEmployeeSkillData,
        id: 'soon-expire',
        validUntil: addDays(new Date(), 15)
      });

      expect(soonToExpire.isExpiringSoon(30)).toBe(true);
      expect(soonToExpire.isExpiringSoon(10)).toBe(false);
      expect(employeeSkill.isExpiringSoon(30)).toBe(false);
      expect(permanentSkill.isExpiringSoon(30)).toBe(false);
    });

    it('should calculate days until expiry', () => {
      const daysUntilExpiry = employeeSkill.getDaysUntilExpiry();
      expect(daysUntilExpiry).toBeGreaterThan(360);
      expect(daysUntilExpiry).toBeLessThanOrEqual(365);
      
      expect(permanentSkill.getDaysUntilExpiry()).toBeNull();
      
      const expiredDays = expiredSkill.getDaysUntilExpiry();
      expect(expiredDays).toBeLessThan(0);
    });
  });

  describe('Level Requirements', () => {
    let employeeSkill: EmployeeSkill;

    beforeEach(() => {
      employeeSkill = new EmployeeSkill(validEmployeeSkillData); // Level 2
    });

    it('should check minimum level requirements', () => {
      expect(employeeSkill.meetsMinimumLevel(1)).toBe(true);
      expect(employeeSkill.meetsMinimumLevel(2)).toBe(true);
      expect(employeeSkill.meetsMinimumLevel(3)).toBe(false);
    });

    it('should check combined requirements (level and validity)', () => {
      expect(employeeSkill.meetsRequirement(2)).toBe(true);
      expect(employeeSkill.meetsRequirement(3)).toBe(false);
      
      // Test with expired skill
      const expiredSkill = new EmployeeSkill({
        ...validEmployeeSkillData,
        id: 'expired',
        validUntil: subDays(new Date(), 1)
      });
      
      expect(expiredSkill.meetsRequirement(2)).toBe(false);
    });
  });

  describe('Update and Renewal', () => {
    let employeeSkill: EmployeeSkill;

    beforeEach(() => {
      employeeSkill = new EmployeeSkill(validEmployeeSkillData);
    });

    it('should create updated copy', async () => {
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      const newExpiry = addDays(new Date(), 730); // 2 years
      const updated = employeeSkill.update({ 
        level: 3,
        validUntil: newExpiry
      });
      
      expect(updated.level).toBe(3);
      expect(updated.validUntil).toEqual(newExpiry);
      expect(updated.id).toBe(employeeSkill.id); // Should remain same
      expect(updated.employeeId).toBe(employeeSkill.employeeId); // Should remain same
      expect(updated.skillId).toBe(employeeSkill.skillId); // Should remain same
      expect(updated.createdAt).toStrictEqual(employeeSkill.createdAt); // Should remain same
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(employeeSkill.updatedAt.getTime());
    });

    it('should renew certification', () => {
      const newExpiry = addDays(new Date(), 730);
      const renewed = employeeSkill.renew(newExpiry, 'CERT-2025-001');
      
      expect(renewed.validUntil).toEqual(newExpiry);
      expect(renewed.certificationId).toBe('CERT-2025-001');
      expect(renewed.level).toBe(employeeSkill.level); // Should remain same
    });

    it('should throw error when renewing with past date', () => {
      const pastDate = subDays(new Date(), 1);
      expect(() => employeeSkill.renew(pastDate))
        .toThrow('New expiry date cannot be in the past');
    });

    it('should renew without changing certification ID', () => {
      const newExpiry = addDays(new Date(), 730);
      const renewed = employeeSkill.renew(newExpiry);
      
      expect(renewed.certificationId).toBe(employeeSkill.certificationId);
    });
  });

  describe('Serialization', () => {
    let employeeSkill: EmployeeSkill;

    beforeEach(() => {
      employeeSkill = new EmployeeSkill(validEmployeeSkillData);
    });

    it('should serialize to JSON correctly', () => {
      const json = employeeSkill.toJSON();
      
      expect(json).toHaveProperty('id', 'emp-skill-001');
      expect(json).toHaveProperty('employeeId', 'emp-001');
      expect(json).toHaveProperty('skillId', 'skill-001');
      expect(json).toHaveProperty('level', 2);
      expect(json).toHaveProperty('validUntil');
      expect(json).toHaveProperty('certificationId', 'CERT-2024-001');
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('updatedAt');
    });
  });

  describe('Edge Cases', () => {
    it('should handle skills without expiry dates', () => {
      const permanentSkill = new EmployeeSkill({
        ...validEmployeeSkillData,
        validUntil: undefined,
        certificationId: undefined
      });

      expect(permanentSkill.isValid()).toBe(true);
      expect(permanentSkill.isExpired()).toBe(false);
      expect(permanentSkill.isExpiringSoon()).toBe(false);
      expect(permanentSkill.getDaysUntilExpiry()).toBeNull();
    });

    it('should handle exact expiry date', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of day
      
      const expiringToday = new EmployeeSkill({
        ...validEmployeeSkillData,
        validUntil: today
      });

      expect(expiringToday.isValid(today)).toBe(true);
      expect(expiringToday.getDaysUntilExpiry(today)).toBe(0);
    });

    it('should handle high skill levels', () => {
      const highLevelSkill = new EmployeeSkill({
        ...validEmployeeSkillData,
        level: 10
      });

      expect(highLevelSkill.meetsMinimumLevel(10)).toBe(true);
      expect(highLevelSkill.meetsMinimumLevel(11)).toBe(false);
    });
  });
});
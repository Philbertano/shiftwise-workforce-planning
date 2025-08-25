import { describe, it, expect, beforeEach } from 'vitest';
import { SafetyRequirement } from '../../models/SafetyRequirement.js';
import { SafetyCategory, SafetyLevel } from '../../types/index.js';

describe('SafetyRequirement Model', () => {
  const validSafetyRequirementData = {
    id: 'safety-001',
    name: 'PPE Required',
    description: 'Personal protective equipment must be worn at all times',
    category: SafetyCategory.PPE,
    level: SafetyLevel.BASIC,
    certificationRequired: true,
    certificationValidityDays: 365,
    trainingRequired: true,
    equipmentRequired: ['helmet', 'safety_glasses', 'gloves'],
    active: true
  };

  describe('Constructor and Validation', () => {
    it('should create valid safety requirement', () => {
      const safetyReq = new SafetyRequirement(validSafetyRequirementData);
      
      expect(safetyReq.id).toBe('safety-001');
      expect(safetyReq.name).toBe('PPE Required');
      expect(safetyReq.description).toBe('Personal protective equipment must be worn at all times');
      expect(safetyReq.category).toBe(SafetyCategory.PPE);
      expect(safetyReq.level).toBe(SafetyLevel.BASIC);
      expect(safetyReq.certificationRequired).toBe(true);
      expect(safetyReq.certificationValidityDays).toBe(365);
      expect(safetyReq.trainingRequired).toBe(true);
      expect(safetyReq.equipmentRequired).toEqual(['helmet', 'safety_glasses', 'gloves']);
      expect(safetyReq.active).toBe(true);
      expect(safetyReq.createdAt).toBeInstanceOf(Date);
      expect(safetyReq.updatedAt).toBeInstanceOf(Date);
    });

    it('should create safety requirement without certification', () => {
      const data = {
        ...validSafetyRequirementData,
        certificationRequired: false,
        certificationValidityDays: undefined
      };

      const safetyReq = new SafetyRequirement(data);
      expect(safetyReq.certificationRequired).toBe(false);
      expect(safetyReq.certificationValidityDays).toBeUndefined();
    });

    it('should throw error for empty ID', () => {
      expect(() => new SafetyRequirement({ ...validSafetyRequirementData, id: '' }))
        .toThrow('Safety requirement ID is required');
    });

    it('should throw error for empty name', () => {
      expect(() => new SafetyRequirement({ ...validSafetyRequirementData, name: '' }))
        .toThrow('Safety requirement name is required');
    });

    it('should throw error for empty description', () => {
      expect(() => new SafetyRequirement({ ...validSafetyRequirementData, description: '' }))
        .toThrow('Description is required');
    });

    it('should throw error when certification required but no validity days', () => {
      expect(() => new SafetyRequirement({
        ...validSafetyRequirementData,
        certificationRequired: true,
        certificationValidityDays: undefined
      })).toThrow('Certification validity days must be specified when certification is required');
    });

    it('should throw error when certification not required but validity days specified', () => {
      expect(() => new SafetyRequirement({
        ...validSafetyRequirementData,
        certificationRequired: false,
        certificationValidityDays: 365
      })).toThrow('Certification validity days should not be specified when certification is not required');
    });

    it('should throw error for invalid certification validity period', () => {
      expect(() => new SafetyRequirement({
        ...validSafetyRequirementData,
        certificationValidityDays: 15
      })).toThrow('Certification validity must be between 30 days and 5 years');

      expect(() => new SafetyRequirement({
        ...validSafetyRequirementData,
        certificationValidityDays: 2000
      })).toThrow('Certification validity must be between 30 days and 5 years');
    });

    it('should throw error for duplicate equipment requirements', () => {
      expect(() => new SafetyRequirement({
        ...validSafetyRequirementData,
        equipmentRequired: ['helmet', 'helmet']
      })).toThrow('Required equipment cannot contain duplicates');
    });

    it('should throw error for too many equipment requirements', () => {
      const manyEquipment = Array.from({ length: 11 }, (_, i) => `equipment-${i}`);
      
      expect(() => new SafetyRequirement({
        ...validSafetyRequirementData,
        equipmentRequired: manyEquipment
      })).toThrow('Safety requirement cannot require more than 10 pieces of equipment');
    });

    it('should throw error for expert level without certification or training', () => {
      expect(() => new SafetyRequirement({
        ...validSafetyRequirementData,
        level: SafetyLevel.EXPERT,
        certificationRequired: false,
        certificationValidityDays: undefined,
        trainingRequired: false
      })).toThrow('Expert level safety requirements must require either certification or training');
    });
  });

  describe('Risk Assessment', () => {
    let safetyReq: SafetyRequirement;

    beforeEach(() => {
      safetyReq = new SafetyRequirement(validSafetyRequirementData);
    });

    it('should identify high risk requirements', () => {
      expect(safetyReq.isHighRisk()).toBe(false); // Basic level
      
      const advancedReq = safetyReq.update({ level: SafetyLevel.ADVANCED });
      expect(advancedReq.isHighRisk()).toBe(true);
      
      const expertReq = safetyReq.update({ level: SafetyLevel.EXPERT });
      expect(expertReq.isHighRisk()).toBe(true);
    });

    it('should identify critical requirements', () => {
      expect(safetyReq.isCritical()).toBe(false); // Basic level
      
      const expertReq = safetyReq.update({ level: SafetyLevel.EXPERT });
      expect(expertReq.isCritical()).toBe(true);
    });

    it('should calculate priority score', () => {
      const basicScore = safetyReq.getPriorityScore();
      expect(basicScore).toBeGreaterThan(0);
      
      const expertReq = safetyReq.update({ level: SafetyLevel.EXPERT });
      const expertScore = expertReq.getPriorityScore();
      expect(expertScore).toBeGreaterThan(basicScore);
      
      const criticalCategoryReq = safetyReq.update({ category: SafetyCategory.LOCKOUT_TAGOUT });
      const criticalScore = criticalCategoryReq.getPriorityScore();
      expect(criticalScore).toBeGreaterThan(basicScore);
    });
  });

  describe('Certification Management', () => {
    let safetyReq: SafetyRequirement;

    beforeEach(() => {
      safetyReq = new SafetyRequirement(validSafetyRequirementData);
    });

    it('should validate certification dates', () => {
      const certDate = new Date();
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() + 100); // 100 days later
      
      expect(safetyReq.isCertificationValid(certDate, checkDate)).toBe(true);
      
      checkDate.setDate(checkDate.getDate() + 300); // 400 days later (beyond 365)
      expect(safetyReq.isCertificationValid(certDate, checkDate)).toBe(false);
    });

    it('should handle requirements without certification', () => {
      // Create a new safety requirement without certification from scratch
      const noCertData = {
        ...validSafetyRequirementData,
        certificationRequired: false,
        certificationValidityDays: undefined
      };
      const noCertReq = new SafetyRequirement(noCertData);
      
      const certDate = new Date();
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 10);
      
      expect(noCertReq.isCertificationValid(certDate, futureDate)).toBe(true);
    });

    it('should calculate certification expiry date', () => {
      const certDate = new Date('2024-01-01');
      const expiryDate = safetyReq.getCertificationExpiryDate(certDate);
      
      expect(expiryDate).toBeInstanceOf(Date);
      expect(expiryDate?.getFullYear()).toBe(2024); // 365 days from Jan 1, 2024 is still 2024
      
      const noCertData = {
        ...validSafetyRequirementData,
        certificationRequired: false,
        certificationValidityDays: undefined
      };
      const noCertReq = new SafetyRequirement(noCertData);
      expect(noCertReq.getCertificationExpiryDate(certDate)).toBeNull();
    });

    it('should calculate days until expiry', () => {
      const certDate = new Date();
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() + 100);
      
      const daysUntilExpiry = safetyReq.getDaysUntilCertificationExpiry(certDate, checkDate);
      expect(daysUntilExpiry).toBe(265); // 365 - 100
      
      const noCertData = {
        ...validSafetyRequirementData,
        certificationRequired: false,
        certificationValidityDays: undefined
      };
      const noCertReq = new SafetyRequirement(noCertData);
      expect(noCertReq.getDaysUntilCertificationExpiry(certDate, checkDate)).toBeNull();
    });

    it('should identify expiring certifications', () => {
      const certDate = new Date();
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() + 340); // 25 days until expiry
      
      expect(safetyReq.isCertificationExpiringSoon(certDate, checkDate)).toBe(true);
      
      checkDate.setDate(checkDate.getDate() - 300); // 65 days until expiry
      expect(safetyReq.isCertificationExpiringSoon(certDate, checkDate)).toBe(false);
      
      checkDate.setDate(checkDate.getDate() + 400); // Already expired
      expect(safetyReq.isCertificationExpiringSoon(certDate, checkDate)).toBe(false);
    });
  });

  describe('Equipment Management', () => {
    let safetyReq: SafetyRequirement;

    beforeEach(() => {
      safetyReq = new SafetyRequirement(validSafetyRequirementData);
    });

    it('should check if equipment is required', () => {
      expect(safetyReq.requiresEquipment('helmet')).toBe(true);
      expect(safetyReq.requiresEquipment('boots')).toBe(false);
    });

    it('should add required equipment', () => {
      const updated = safetyReq.addRequiredEquipment('boots');
      expect(updated.equipmentRequired).toContain('boots');
      expect(updated.equipmentRequired).toHaveLength(4);
    });

    it('should throw error when adding duplicate equipment', () => {
      expect(() => safetyReq.addRequiredEquipment('helmet'))
        .toThrow('Equipment helmet is already required for this safety requirement');
    });

    it('should remove required equipment', () => {
      const updated = safetyReq.removeRequiredEquipment('helmet');
      expect(updated.equipmentRequired).not.toContain('helmet');
      expect(updated.equipmentRequired).toHaveLength(2);
    });

    it('should throw error when removing non-existent equipment', () => {
      expect(() => safetyReq.removeRequiredEquipment('boots'))
        .toThrow('Equipment boots is not required for this safety requirement');
    });
  });

  describe('Update and Serialization', () => {
    let safetyReq: SafetyRequirement;

    beforeEach(() => {
      safetyReq = new SafetyRequirement(validSafetyRequirementData);
    });

    it('should create updated copy', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      const updated = safetyReq.update({
        name: 'Enhanced PPE Required',
        level: SafetyLevel.INTERMEDIATE
      });

      expect(updated.name).toBe('Enhanced PPE Required');
      expect(updated.level).toBe(SafetyLevel.INTERMEDIATE);
      expect(updated.id).toBe(safetyReq.id);
      expect(updated.createdAt).toEqual(safetyReq.createdAt);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(safetyReq.updatedAt.getTime());
    });

    it('should serialize to JSON correctly', () => {
      const json = safetyReq.toJSON();
      
      expect(json.id).toBe('safety-001');
      expect(json.name).toBe('PPE Required');
      expect(json.category).toBe(SafetyCategory.PPE);
      expect(json.level).toBe(SafetyLevel.BASIC);
      expect(json.certificationRequired).toBe(true);
      expect(json.certificationValidityDays).toBe(365);
      expect(json.trainingRequired).toBe(true);
      expect(json.equipmentRequired).toEqual(['helmet', 'safety_glasses', 'gloves']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum certification validity', () => {
      const safetyReq = new SafetyRequirement({
        ...validSafetyRequirementData,
        certificationValidityDays: 30
      });
      
      expect(safetyReq.certificationValidityDays).toBe(30);
    });

    it('should handle maximum certification validity', () => {
      const safetyReq = new SafetyRequirement({
        ...validSafetyRequirementData,
        certificationValidityDays: 1825 // 5 years
      });
      
      expect(safetyReq.certificationValidityDays).toBe(1825);
    });

    it('should handle empty equipment requirements', () => {
      const safetyReq = new SafetyRequirement({
        ...validSafetyRequirementData,
        equipmentRequired: []
      });
      
      expect(safetyReq.equipmentRequired).toHaveLength(0);
      expect(safetyReq.requiresEquipment('anything')).toBe(false);
    });

    it('should handle maximum equipment requirements', () => {
      const maxEquipment = Array.from({ length: 10 }, (_, i) => `equipment-${i}`);
      
      const safetyReq = new SafetyRequirement({
        ...validSafetyRequirementData,
        equipmentRequired: maxEquipment
      });
      
      expect(safetyReq.equipmentRequired).toHaveLength(10);
    });

    it('should handle expert level with certification only', () => {
      const safetyReq = new SafetyRequirement({
        ...validSafetyRequirementData,
        level: SafetyLevel.EXPERT,
        certificationRequired: true,
        trainingRequired: false
      });
      
      expect(safetyReq.level).toBe(SafetyLevel.EXPERT);
      expect(safetyReq.certificationRequired).toBe(true);
      expect(safetyReq.trainingRequired).toBe(false);
    });

    it('should handle expert level with training only', () => {
      const safetyReq = new SafetyRequirement({
        ...validSafetyRequirementData,
        level: SafetyLevel.EXPERT,
        certificationRequired: false,
        certificationValidityDays: undefined,
        trainingRequired: true
      });
      
      expect(safetyReq.level).toBe(SafetyLevel.EXPERT);
      expect(safetyReq.certificationRequired).toBe(false);
      expect(safetyReq.trainingRequired).toBe(true);
    });
  });
});
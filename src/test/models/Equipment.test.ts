import { describe, it, expect } from 'vitest';
import { Equipment } from '../../models/Equipment.js';
import { EquipmentType, EquipmentStatus } from '../../types/index.js';

describe('Equipment Model', () => {
  const validEquipmentData = {
    id: 'eq-001',
    name: 'Assembly Robot 1',
    type: EquipmentType.ROBOT,
    model: 'AR-2000',
    serialNumber: 'SN123456',
    manufacturer: 'RoboCorp',
    installDate: new Date('2023-01-15'),
    lastMaintenance: new Date('2024-01-01'),
    nextMaintenance: new Date('2024-07-01'),
    status: EquipmentStatus.OPERATIONAL,
    requiredSkills: ['skill-001', 'skill-002'],
    safetyRequirements: ['safety-001'],
    operatingParameters: {
      maxSpeed: 100,
      precision: 0.1,
      workingPressure: 6.0
    },
    active: true
  };

  describe('Constructor and Validation', () => {
    it('should create valid equipment', () => {
      const equipment = new Equipment(validEquipmentData);
      
      expect(equipment.id).toBe('eq-001');
      expect(equipment.name).toBe('Assembly Robot 1');
      expect(equipment.type).toBe(EquipmentType.ROBOT);
      expect(equipment.model).toBe('AR-2000');
      expect(equipment.serialNumber).toBe('SN123456');
      expect(equipment.manufacturer).toBe('RoboCorp');
      expect(equipment.status).toBe(EquipmentStatus.OPERATIONAL);
      expect(equipment.requiredSkills).toEqual(['skill-001', 'skill-002']);
      expect(equipment.safetyRequirements).toEqual(['safety-001']);
      expect(equipment.active).toBe(true);
      expect(equipment.createdAt).toBeInstanceOf(Date);
      expect(equipment.updatedAt).toBeInstanceOf(Date);
    });

    it('should create equipment with minimal data', () => {
      const minimalData = {
        id: 'eq-002',
        name: 'Basic Tool',
        type: EquipmentType.TOOL,
        status: EquipmentStatus.OPERATIONAL,
        requiredSkills: [],
        safetyRequirements: [],
        active: true
      };

      const equipment = new Equipment(minimalData);
      expect(equipment.model).toBeUndefined();
      expect(equipment.serialNumber).toBeUndefined();
      expect(equipment.manufacturer).toBeUndefined();
      expect(equipment.installDate).toBeUndefined();
      expect(equipment.operatingParameters).toBeUndefined();
    });

    it('should throw error for empty ID', () => {
      expect(() => new Equipment({ ...validEquipmentData, id: '' }))
        .toThrow('Equipment ID is required');
    });

    it('should throw error for empty name', () => {
      expect(() => new Equipment({ ...validEquipmentData, name: '' }))
        .toThrow('Equipment name is required');
    });

    it('should throw error for invalid maintenance dates', () => {
      expect(() => new Equipment({
        ...validEquipmentData,
        lastMaintenance: new Date('2024-07-01'),
        nextMaintenance: new Date('2024-01-01')
      })).toThrow('Next maintenance date must be after last maintenance date');
    });

    it('should throw error for future install date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      expect(() => new Equipment({
        ...validEquipmentData,
        installDate: futureDate
      })).toThrow('Install date cannot be in the future');
    });

    it('should throw error for maintenance before install', () => {
      expect(() => new Equipment({
        ...validEquipmentData,
        installDate: new Date('2024-01-01'),
        lastMaintenance: new Date('2023-12-01')
      })).toThrow('Last maintenance date cannot be before install date');
    });

    it('should throw error for duplicate required skills', () => {
      expect(() => new Equipment({
        ...validEquipmentData,
        requiredSkills: ['skill-001', 'skill-001']
      })).toThrow('Required skills cannot contain duplicates');
    });

    it('should throw error for duplicate safety requirements', () => {
      expect(() => new Equipment({
        ...validEquipmentData,
        safetyRequirements: ['safety-001', 'safety-001']
      })).toThrow('Safety requirements cannot contain duplicates');
    });

    it('should throw error for too many required skills', () => {
      const manySkills = Array.from({ length: 21 }, (_, i) => `skill-${i}`);
      
      expect(() => new Equipment({
        ...validEquipmentData,
        requiredSkills: manySkills
      })).toThrow('Equipment cannot require more than 20 skills');
    });

    it('should throw error for too many safety requirements', () => {
      const manySafetyReqs = Array.from({ length: 16 }, (_, i) => `safety-${i}`);
      
      expect(() => new Equipment({
        ...validEquipmentData,
        safetyRequirements: manySafetyReqs
      })).toThrow('Equipment cannot have more than 15 safety requirements');
    });
  });

  describe('Status and Maintenance', () => {
    let equipment: Equipment;

    beforeEach(() => {
      equipment = new Equipment(validEquipmentData);
    });

    it('should identify operational equipment', () => {
      expect(equipment.isOperational()).toBe(true);
      
      const brokenEquipment = equipment.update({ status: EquipmentStatus.BREAKDOWN });
      expect(brokenEquipment.isOperational()).toBe(false);
      
      const inactiveEquipment = equipment.update({ active: false });
      expect(inactiveEquipment.isOperational()).toBe(false);
    });

    it('should check if maintenance is needed', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const needsMaintenanceEquipment = equipment.update({ nextMaintenance: pastDate });
      expect(needsMaintenanceEquipment.needsMaintenance()).toBe(true);
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const futureMaintenanceEquipment = equipment.update({ nextMaintenance: futureDate });
      expect(futureMaintenanceEquipment.needsMaintenance()).toBe(false);
    });

    it('should check if maintenance is overdue', () => {
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 10);
      
      const overdueEquipment = equipment.update({ nextMaintenance: overdueDate });
      expect(overdueEquipment.isMaintenanceOverdue()).toBe(true);
      
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5);
      
      const recentEquipment = equipment.update({ nextMaintenance: recentDate });
      expect(recentEquipment.isMaintenanceOverdue()).toBe(false);
    });

    it('should calculate days until maintenance', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      
      const futureMaintenanceEquipment = equipment.update({ nextMaintenance: futureDate });
      const days = futureMaintenanceEquipment.getDaysUntilMaintenance();
      expect(days).toBe(10);
      
      const noMaintenanceEquipment = equipment.update({ nextMaintenance: undefined });
      expect(noMaintenanceEquipment.getDaysUntilMaintenance()).toBeNull();
    });

    it('should calculate equipment age', () => {
      const age = equipment.getAgeInDays();
      expect(age).toBeGreaterThan(0);
      
      const noInstallDateEquipment = equipment.update({ installDate: undefined });
      expect(noInstallDateEquipment.getAgeInDays()).toBeNull();
    });

    it('should update maintenance dates', () => {
      const lastMaintenance = new Date();
      const nextMaintenance = new Date();
      nextMaintenance.setMonth(nextMaintenance.getMonth() + 6);
      
      const updated = equipment.updateMaintenance(lastMaintenance, nextMaintenance);
      expect(updated.lastMaintenance).toEqual(lastMaintenance);
      expect(updated.nextMaintenance).toEqual(nextMaintenance);
      expect(updated.status).toBe(EquipmentStatus.OPERATIONAL);
    });

    it('should throw error for invalid maintenance update', () => {
      const lastMaintenance = new Date();
      const nextMaintenance = new Date();
      nextMaintenance.setDate(nextMaintenance.getDate() - 1);
      
      expect(() => equipment.updateMaintenance(lastMaintenance, nextMaintenance))
        .toThrow('Next maintenance date must be after last maintenance date');
    });
  });

  describe('Skills and Safety Management', () => {
    let equipment: Equipment;

    beforeEach(() => {
      equipment = new Equipment(validEquipmentData);
    });

    it('should check if skill is required', () => {
      expect(equipment.requiresSkill('skill-001')).toBe(true);
      expect(equipment.requiresSkill('skill-999')).toBe(false);
    });

    it('should check if safety requirement exists', () => {
      expect(equipment.hasSafetyRequirement('safety-001')).toBe(true);
      expect(equipment.hasSafetyRequirement('safety-999')).toBe(false);
    });

    it('should add required skill', () => {
      const updated = equipment.addRequiredSkill('skill-003');
      expect(updated.requiredSkills).toContain('skill-003');
      expect(updated.requiredSkills).toHaveLength(3);
    });

    it('should throw error when adding duplicate skill', () => {
      expect(() => equipment.addRequiredSkill('skill-001'))
        .toThrow('Skill skill-001 is already required for this equipment');
    });

    it('should remove required skill', () => {
      const updated = equipment.removeRequiredSkill('skill-001');
      expect(updated.requiredSkills).not.toContain('skill-001');
      expect(updated.requiredSkills).toHaveLength(1);
    });

    it('should throw error when removing non-existent skill', () => {
      expect(() => equipment.removeRequiredSkill('skill-999'))
        .toThrow('Skill skill-999 is not required for this equipment');
    });

    it('should add safety requirement', () => {
      const updated = equipment.addSafetyRequirement('safety-002');
      expect(updated.safetyRequirements).toContain('safety-002');
      expect(updated.safetyRequirements).toHaveLength(2);
    });

    it('should throw error when adding duplicate safety requirement', () => {
      expect(() => equipment.addSafetyRequirement('safety-001'))
        .toThrow('Safety requirement safety-001 already exists for this equipment');
    });

    it('should remove safety requirement', () => {
      const updated = equipment.removeSafetyRequirement('safety-001');
      expect(updated.safetyRequirements).not.toContain('safety-001');
      expect(updated.safetyRequirements).toHaveLength(0);
    });

    it('should throw error when removing non-existent safety requirement', () => {
      expect(() => equipment.removeSafetyRequirement('safety-999'))
        .toThrow('Safety requirement safety-999 not found for this equipment');
    });
  });

  describe('Operating Parameters and Classification', () => {
    let equipment: Equipment;

    beforeEach(() => {
      equipment = new Equipment(validEquipmentData);
    });

    it('should get operating parameter value', () => {
      expect(equipment.getOperatingParameter('maxSpeed')).toBe(100);
      expect(equipment.getOperatingParameter('precision')).toBe(0.1);
      expect(equipment.getOperatingParameter('nonExistent')).toBeUndefined();
    });

    it('should identify critical equipment', () => {
      expect(equipment.isCritical()).toBe(true); // Robot is critical
      
      const toolEquipment = equipment.update({ type: EquipmentType.TOOL });
      expect(toolEquipment.isCritical()).toBe(false);
      
      const craneEquipment = equipment.update({ type: EquipmentType.CRANE });
      expect(craneEquipment.isCritical()).toBe(true);
    });
  });

  describe('Update and Serialization', () => {
    let equipment: Equipment;

    beforeEach(() => {
      equipment = new Equipment(validEquipmentData);
    });

    it('should create updated copy', async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
      const updated = equipment.update({
        name: 'Assembly Robot 2',
        status: EquipmentStatus.MAINTENANCE
      });

      expect(updated.name).toBe('Assembly Robot 2');
      expect(updated.status).toBe(EquipmentStatus.MAINTENANCE);
      expect(updated.id).toBe(equipment.id);
      expect(updated.createdAt).toEqual(equipment.createdAt);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(equipment.updatedAt.getTime());
    });

    it('should serialize to JSON correctly', () => {
      const json = equipment.toJSON();
      
      expect(json.id).toBe('eq-001');
      expect(json.name).toBe('Assembly Robot 1');
      expect(json.type).toBe(EquipmentType.ROBOT);
      expect(json.status).toBe(EquipmentStatus.OPERATIONAL);
      expect(json.requiredSkills).toEqual(['skill-001', 'skill-002']);
      expect(json.safetyRequirements).toEqual(['safety-001']);
      expect(json.operatingParameters).toEqual({
        maxSpeed: 100,
        precision: 0.1,
        workingPressure: 6.0
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle equipment without operating parameters', () => {
      const equipment = new Equipment({
        ...validEquipmentData,
        operatingParameters: undefined
      });
      
      expect(equipment.operatingParameters).toBeUndefined();
      expect(equipment.getOperatingParameter('maxSpeed')).toBeUndefined();
    });

    it('should handle equipment with empty skill and safety arrays', () => {
      const equipment = new Equipment({
        ...validEquipmentData,
        requiredSkills: [],
        safetyRequirements: []
      });
      
      expect(equipment.requiredSkills).toHaveLength(0);
      expect(equipment.safetyRequirements).toHaveLength(0);
      expect(equipment.requiresSkill('any-skill')).toBe(false);
      expect(equipment.hasSafetyRequirement('any-safety')).toBe(false);
    });

    it('should handle equipment with maximum allowed skills and safety requirements', () => {
      const maxSkills = Array.from({ length: 20 }, (_, i) => `skill-${i}`);
      const maxSafetyReqs = Array.from({ length: 15 }, (_, i) => `safety-${i}`);
      
      const equipment = new Equipment({
        ...validEquipmentData,
        requiredSkills: maxSkills,
        safetyRequirements: maxSafetyReqs
      });
      
      expect(equipment.requiredSkills).toHaveLength(20);
      expect(equipment.safetyRequirements).toHaveLength(15);
    });
  });
});
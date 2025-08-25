import { describe, it, expect, beforeEach } from 'vitest';
import { Station } from '../../models/Station.js';
import { Priority } from '../../types/index.js';

describe('Station Model', () => {
  const validStationData = {
    id: 'station-001',
    name: 'Assembly Line A1',
    line: 'Line A',
    requiredSkills: [
      { skillId: 'skill-001', minLevel: 2, count: 2, mandatory: true },
      { skillId: 'skill-002', minLevel: 1, count: 1, mandatory: false },
      { skillId: 'skill-003', minLevel: 3, count: 1, mandatory: true }
    ],
    priority: Priority.HIGH,
    location: 'Building 1, Floor 2',
    // Automotive-specific fields
    capacity: 5,
    productionLineId: 'line-001',
    equipment: [],
    safetyRequirements: [],
    description: 'Main assembly line for automotive production',
    active: true
  };

  describe('Constructor and Validation', () => {
    it('should create a valid station', () => {
      const station = new Station(validStationData);
      
      expect(station.id).toBe('station-001');
      expect(station.name).toBe('Assembly Line A1');
      expect(station.line).toBe('Line A');
      expect(station.requiredSkills).toHaveLength(3);
      expect(station.priority).toBe(Priority.HIGH);
      expect(station.location).toBe('Building 1, Floor 2');
      // Automotive-specific fields
      expect(station.capacity).toBe(5);
      expect(station.productionLineId).toBe('line-001');
      expect(station.equipment).toEqual([]);
      expect(station.safetyRequirements).toEqual([]);
      expect(station.description).toBe('Main assembly line for automotive production');
      expect(station.active).toBe(true);
      expect(station.createdAt).toBeInstanceOf(Date);
      expect(station.updatedAt).toBeInstanceOf(Date);
    });

    it('should create station without location', () => {
      const data = { ...validStationData };
      delete data.location;
      
      const station = new Station(data);
      expect(station.location).toBeUndefined();
    });

    it('should throw error for empty ID', () => {
      expect(() => new Station({ ...validStationData, id: '' }))
        .toThrow('Station ID is required');
    });

    it('should throw error for empty name', () => {
      expect(() => new Station({ ...validStationData, name: '' }))
        .toThrow('Station name is required');
    });

    it('should throw error for name too long', () => {
      const longName = 'a'.repeat(101);
      expect(() => new Station({ ...validStationData, name: longName }))
        .toThrow('Name too long');
    });

    it('should throw error for empty line', () => {
      expect(() => new Station({ ...validStationData, line: '' }))
        .toThrow('Line is required');
    });

    it('should throw error for line name too long', () => {
      const longLine = 'a'.repeat(51);
      expect(() => new Station({ ...validStationData, line: longLine }))
        .toThrow('Line name too long');
    });

    it('should throw error for location too long', () => {
      const longLocation = 'a'.repeat(201);
      expect(() => new Station({ ...validStationData, location: longLocation }))
        .toThrow('Location too long');
    });
  });

  describe('Required Skills Validation', () => {
    it('should validate required skill properties', () => {
      expect(() => new Station({
        ...validStationData,
        requiredSkills: [{ skillId: '', minLevel: 1, count: 1, mandatory: true }]
      })).toThrow('Skill ID is required');

      expect(() => new Station({
        ...validStationData,
        requiredSkills: [{ skillId: 'skill-001', minLevel: 0, count: 1, mandatory: true }]
      })).toThrow('Minimum level must be at least 1');

      expect(() => new Station({
        ...validStationData,
        requiredSkills: [{ skillId: 'skill-001', minLevel: 1, count: 0, mandatory: true }]
      })).toThrow('Count must be at least 1');
    });
  });

  describe('Business Rule Validation', () => {
    it('should throw error for no required skills', () => {
      expect(() => new Station({
        ...validStationData,
        requiredSkills: []
      })).toThrow('Station must have at least one required skill');
    });

    it('should throw error for duplicate skill requirements', () => {
      expect(() => new Station({
        ...validStationData,
        requiredSkills: [
          { skillId: 'skill-001', minLevel: 2, count: 1, mandatory: true },
          { skillId: 'skill-001', minLevel: 3, count: 1, mandatory: false }
        ]
      })).toThrow('Station cannot have duplicate skill requirements');
    });

    it('should throw error for critical stations without mandatory skills', () => {
      expect(() => new Station({
        ...validStationData,
        priority: Priority.CRITICAL,
        requiredSkills: [
          { skillId: 'skill-001', minLevel: 2, count: 1, mandatory: false },
          { skillId: 'skill-002', minLevel: 1, count: 1, mandatory: false }
        ]
      })).toThrow('Critical stations must have at least one mandatory skill');
    });

    it('should allow critical stations with mandatory skills', () => {
      expect(() => new Station({
        ...validStationData,
        priority: Priority.CRITICAL,
        requiredSkills: [
          { skillId: 'skill-001', minLevel: 2, count: 1, mandatory: true },
          { skillId: 'skill-002', minLevel: 1, count: 1, mandatory: false }
        ],
        safetyRequirements: [
          {
            id: 'safety-001',
            name: 'PPE Required',
            description: 'Personal protective equipment required',
            category: 'ppe',
            level: 'basic',
            certificationRequired: false,
            trainingRequired: true,
            equipmentRequired: ['helmet', 'gloves'],
            active: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      })).not.toThrow();
    });

    it('should throw error for excessive skill count', () => {
      const manySkills = Array.from({ length: 11 }, (_, i) => ({
        skillId: `skill-${i}`,
        minLevel: 1,
        count: 1,
        mandatory: false
      }));

      expect(() => new Station({
        ...validStationData,
        requiredSkills: manySkills
      })).toThrow('Total required skill count cannot exceed 10 per station');
    });
  });

  describe('Skill Management', () => {
    let station: Station;

    beforeEach(() => {
      station = new Station(validStationData);
    });

    it('should get mandatory skills', () => {
      const mandatory = station.getMandatorySkills();
      expect(mandatory).toHaveLength(2);
      expect(mandatory.every(skill => skill.mandatory)).toBe(true);
    });

    it('should get optional skills', () => {
      const optional = station.getOptionalSkills();
      expect(optional).toHaveLength(1);
      expect(optional.every(skill => !skill.mandatory)).toBe(true);
    });

    it('should calculate total required count', () => {
      expect(station.getTotalRequiredCount()).toBe(4); // 2 + 1 + 1
    });

    it('should calculate minimum required count', () => {
      expect(station.getMinimumRequiredCount()).toBe(3); // 2 + 1 (mandatory only)
    });

    it('should check if skill is required', () => {
      expect(station.requiresSkill('skill-001')).toBe(true);
      expect(station.requiresSkill('skill-999')).toBe(false);
    });

    it('should get required level for skill', () => {
      expect(station.getRequiredLevel('skill-001')).toBe(2);
      expect(station.getRequiredLevel('skill-002')).toBe(1);
      expect(station.getRequiredLevel('skill-999')).toBeNull();
    });

    it('should check if skill is mandatory', () => {
      expect(station.isSkillMandatory('skill-001')).toBe(true);
      expect(station.isSkillMandatory('skill-002')).toBe(false);
      expect(station.isSkillMandatory('skill-999')).toBe(false);
    });

    it('should get required count for skill', () => {
      expect(station.getRequiredCount('skill-001')).toBe(2);
      expect(station.getRequiredCount('skill-002')).toBe(1);
      expect(station.getRequiredCount('skill-999')).toBe(0);
    });

    it('should group skills by type', () => {
      const grouped = station.getSkillsByType();
      
      expect(grouped.mandatory).toHaveLength(2);
      expect(grouped.optional).toHaveLength(1);
      expect(grouped.mandatory.every(skill => skill.mandatory)).toBe(true);
      expect(grouped.optional.every(skill => !skill.mandatory)).toBe(true);
    });
  });

  describe('Priority Checks', () => {
    it('should identify critical stations', () => {
      const criticalStation = new Station({
        ...validStationData,
        priority: Priority.CRITICAL,
        safetyRequirements: [
          {
            id: 'safety-001',
            name: 'PPE Required',
            description: 'Personal protective equipment required',
            category: 'ppe',
            level: 'basic',
            certificationRequired: false,
            trainingRequired: true,
            equipmentRequired: ['helmet', 'gloves'],
            active: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      });
      
      expect(criticalStation.isCritical()).toBe(true);
      expect(new Station(validStationData).isCritical()).toBe(false);
    });

    it('should identify high priority stations', () => {
      const highStation = new Station({
        ...validStationData,
        priority: Priority.HIGH
      });
      
      const criticalStation = new Station({
        ...validStationData,
        priority: Priority.CRITICAL,
        safetyRequirements: [
          {
            id: 'safety-001',
            name: 'PPE Required',
            description: 'Personal protective equipment required',
            category: 'ppe',
            level: 'basic',
            certificationRequired: false,
            trainingRequired: true,
            equipmentRequired: ['helmet', 'gloves'],
            active: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      });
      
      const mediumStation = new Station({
        ...validStationData,
        priority: Priority.MEDIUM
      });

      expect(highStation.isHighPriority()).toBe(true);
      expect(criticalStation.isHighPriority()).toBe(true);
      expect(mediumStation.isHighPriority()).toBe(false);
    });
  });

  describe('Skill Addition and Removal', () => {
    let station: Station;

    beforeEach(() => {
      station = new Station(validStationData);
    });

    it('should add required skill', () => {
      const newSkill = { skillId: 'skill-004', minLevel: 2, count: 1, mandatory: false };
      const updated = station.addRequiredSkill(newSkill);
      
      expect(updated.requiredSkills).toHaveLength(4);
      expect(updated.requiresSkill('skill-004')).toBe(true);
      expect(updated.getRequiredLevel('skill-004')).toBe(2);
    });

    it('should throw error when adding duplicate skill', () => {
      const duplicateSkill = { skillId: 'skill-001', minLevel: 3, count: 1, mandatory: false };
      
      expect(() => station.addRequiredSkill(duplicateSkill))
        .toThrow('Skill skill-001 is already required for this station');
    });

    it('should remove required skill', () => {
      const updated = station.removeRequiredSkill('skill-002');
      
      expect(updated.requiredSkills).toHaveLength(2);
      expect(updated.requiresSkill('skill-002')).toBe(false);
    });

    it('should throw error when removing non-existent skill', () => {
      expect(() => station.removeRequiredSkill('skill-999'))
        .toThrow('Skill skill-999 is not required for this station');
    });
  });

  describe('Update and Serialization', () => {
    let station: Station;

    beforeEach(() => {
      station = new Station(validStationData);
    });

    it('should create updated copy', async () => {
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      const updated = station.update({ 
        name: 'Assembly Line A2',
        priority: Priority.CRITICAL,
        safetyRequirements: [
          {
            id: 'safety-001',
            name: 'PPE Required',
            description: 'Personal protective equipment required',
            category: 'ppe',
            level: 'basic',
            certificationRequired: false,
            trainingRequired: true,
            equipmentRequired: ['helmet', 'gloves'],
            active: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      });
      
      expect(updated.name).toBe('Assembly Line A2');
      expect(updated.priority).toBe(Priority.CRITICAL);
      expect(updated.id).toBe(station.id); // Should remain same
      expect(updated.createdAt).toStrictEqual(station.createdAt); // Should remain same
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(station.updatedAt.getTime());
    });

    it('should serialize to JSON correctly', () => {
      const json = station.toJSON();
      
      expect(json).toHaveProperty('id', 'station-001');
      expect(json).toHaveProperty('name', 'Assembly Line A1');
      expect(json).toHaveProperty('line', 'Line A');
      expect(json).toHaveProperty('requiredSkills');
      expect(json).toHaveProperty('priority', Priority.HIGH);
      expect(json).toHaveProperty('location', 'Building 1, Floor 2');
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('updatedAt');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single required skill', () => {
      const singleSkillStation = new Station({
        ...validStationData,
        requiredSkills: [{ skillId: 'skill-001', minLevel: 1, count: 1, mandatory: true }]
      });

      expect(singleSkillStation.getTotalRequiredCount()).toBe(1);
      expect(singleSkillStation.getMinimumRequiredCount()).toBe(1);
    });

    it('should handle all optional skills for non-critical stations', () => {
      const allOptionalStation = new Station({
        ...validStationData,
        priority: Priority.LOW,
        requiredSkills: [
          { skillId: 'skill-001', minLevel: 1, count: 1, mandatory: false },
          { skillId: 'skill-002', minLevel: 1, count: 1, mandatory: false }
        ]
      });

      expect(allOptionalStation.getMinimumRequiredCount()).toBe(0);
      expect(allOptionalStation.getMandatorySkills()).toHaveLength(0);
    });

    it('should handle maximum skill count', () => {
      const maxSkills = Array.from({ length: 10 }, (_, i) => ({
        skillId: `skill-${i}`,
        minLevel: 1,
        count: 1,
        mandatory: i === 0 // First one is mandatory
      }));

      expect(() => new Station({
        ...validStationData,
        requiredSkills: maxSkills
      })).not.toThrow();
    });

    it('should handle high skill levels and counts', () => {
      const highRequirementStation = new Station({
        ...validStationData,
        requiredSkills: [
          { skillId: 'skill-001', minLevel: 10, count: 5, mandatory: true }
        ]
      });

      expect(highRequirementStation.getRequiredLevel('skill-001')).toBe(10);
      expect(highRequirementStation.getRequiredCount('skill-001')).toBe(5);
    });
  });
});
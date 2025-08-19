import { describe, it, expect } from 'vitest';
import { Skill } from '../../models/Skill.js';
import { SkillCategory } from '../../types/index.js';

describe('Skill Model', () => {
  const validSkillData = {
    id: 'skill-001',
    name: 'Welding',
    description: 'Metal welding and fabrication',
    levelScale: 3,
    category: SkillCategory.TECHNICAL
  };

  describe('Constructor and Validation', () => {
    it('should create a valid skill', () => {
      const skill = new Skill(validSkillData);
      
      expect(skill.id).toBe('skill-001');
      expect(skill.name).toBe('Welding');
      expect(skill.description).toBe('Metal welding and fabrication');
      expect(skill.levelScale).toBe(3);
      expect(skill.category).toBe(SkillCategory.TECHNICAL);
      expect(skill.createdAt).toBeInstanceOf(Date);
      expect(skill.updatedAt).toBeInstanceOf(Date);
    });

    it('should create skill without description', () => {
      const skillData = { ...validSkillData };
      delete skillData.description;
      
      const skill = new Skill(skillData);
      expect(skill.description).toBeUndefined();
    });

    it('should throw error for empty ID', () => {
      expect(() => new Skill({ ...validSkillData, id: '' }))
        .toThrow('Skill ID is required');
    });

    it('should throw error for empty name', () => {
      expect(() => new Skill({ ...validSkillData, name: '' }))
        .toThrow('Skill name is required');
    });

    it('should throw error for name too long', () => {
      const longName = 'a'.repeat(101);
      expect(() => new Skill({ ...validSkillData, name: longName }))
        .toThrow('Name too long');
    });

    it('should throw error for description too long', () => {
      const longDescription = 'a'.repeat(501);
      expect(() => new Skill({ ...validSkillData, description: longDescription }))
        .toThrow('Description too long');
    });

    it('should throw error for invalid level scale', () => {
      expect(() => new Skill({ ...validSkillData, levelScale: 0 }))
        .toThrow('Level scale must be at least 1');
      
      expect(() => new Skill({ ...validSkillData, levelScale: 11 }))
        .toThrow('Level scale cannot exceed 10');
    });
  });

  describe('Business Rule Validation', () => {
    it('should throw error for skill name with whitespace', () => {
      expect(() => new Skill({ ...validSkillData, name: ' Welding ' }))
        .toThrow('Skill name cannot have leading or trailing whitespace');
    });

    it('should throw error for safety skills with insufficient levels', () => {
      expect(() => new Skill({
        ...validSkillData,
        category: SkillCategory.SAFETY,
        levelScale: 1
      })).toThrow('Safety skills must have at least 2 levels for proper certification tracking');
    });

    it('should allow safety skills with 2 or more levels', () => {
      expect(() => new Skill({
        ...validSkillData,
        category: SkillCategory.SAFETY,
        levelScale: 2
      })).not.toThrow();
    });
  });

  describe('Level Validation', () => {
    let skill: Skill;

    beforeEach(() => {
      skill = new Skill(validSkillData);
    });

    it('should validate correct levels', () => {
      expect(skill.isValidLevel(1)).toBe(true);
      expect(skill.isValidLevel(2)).toBe(true);
      expect(skill.isValidLevel(3)).toBe(true);
    });

    it('should reject invalid levels', () => {
      expect(skill.isValidLevel(0)).toBe(false);
      expect(skill.isValidLevel(4)).toBe(false);
      expect(skill.isValidLevel(-1)).toBe(false);
      expect(skill.isValidLevel(1.5)).toBe(false);
    });

    it('should provide level descriptions', () => {
      expect(skill.getLevelDescription(1)).toBe('Beginner');
      expect(skill.getLevelDescription(2)).toBe('Intermediate');
      expect(skill.getLevelDescription(3)).toBe('Advanced');
    });

    it('should throw error for invalid level description', () => {
      expect(() => skill.getLevelDescription(4))
        .toThrow('Invalid level 4 for skill Welding');
    });

    it('should handle higher level scales', () => {
      const highLevelSkill = new Skill({ ...validSkillData, levelScale: 5 });
      
      expect(highLevelSkill.getLevelDescription(4)).toBe('Expert');
      expect(highLevelSkill.getLevelDescription(5)).toBe('Master');
    });
  });

  describe('Skill Properties', () => {
    it('should identify critical skills', () => {
      const safetySkill = new Skill({
        ...validSkillData,
        category: SkillCategory.SAFETY
      });
      
      const qualitySkill = new Skill({
        ...validSkillData,
        category: SkillCategory.QUALITY
      });
      
      const technicalSkill = new Skill({
        ...validSkillData,
        category: SkillCategory.TECHNICAL
      });

      expect(safetySkill.isCritical()).toBe(true);
      expect(qualitySkill.isCritical()).toBe(true);
      expect(technicalSkill.isCritical()).toBe(false);
    });
  });

  describe('Update and Serialization', () => {
    let skill: Skill;

    beforeEach(() => {
      skill = new Skill(validSkillData);
    });

    it('should create updated copy', async () => {
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      const updated = skill.update({ 
        name: 'Advanced Welding',
        levelScale: 4
      });
      
      expect(updated.name).toBe('Advanced Welding');
      expect(updated.levelScale).toBe(4);
      expect(updated.id).toBe(skill.id); // Should remain same
      expect(updated.createdAt).toStrictEqual(skill.createdAt); // Should remain same
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(skill.updatedAt.getTime());
    });

    it('should serialize to JSON correctly', () => {
      const json = skill.toJSON();
      
      expect(json).toHaveProperty('id', 'skill-001');
      expect(json).toHaveProperty('name', 'Welding');
      expect(json).toHaveProperty('description', 'Metal welding and fabrication');
      expect(json).toHaveProperty('levelScale', 3);
      expect(json).toHaveProperty('category', SkillCategory.TECHNICAL);
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('updatedAt');
    });
  });

  describe('Edge Cases', () => {
    it('should handle all skill categories', () => {
      const categories = Object.values(SkillCategory);
      
      categories.forEach(category => {
        const levelScale = category === SkillCategory.SAFETY ? 2 : 3;
        expect(() => new Skill({
          ...validSkillData,
          category,
          levelScale
        })).not.toThrow();
      });
    });

    it('should handle maximum level scale', () => {
      const skill = new Skill({ ...validSkillData, levelScale: 10 });
      
      expect(skill.isValidLevel(10)).toBe(true);
      expect(skill.isValidLevel(11)).toBe(false);
    });

    it('should handle level descriptions for high scales', () => {
      const skill = new Skill({ ...validSkillData, levelScale: 8 });
      
      expect(skill.getLevelDescription(6)).toBe('Level 6');
      expect(skill.getLevelDescription(7)).toBe('Level 7');
      expect(skill.getLevelDescription(8)).toBe('Level 8');
    });
  });
});
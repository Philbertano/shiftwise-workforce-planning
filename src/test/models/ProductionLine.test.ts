import { describe, it, expect } from 'vitest';
import { ProductionLine } from '../../models/ProductionLine.js';
import { ProductionLineType } from '../../types/index.js';

describe('ProductionLine Model', () => {
  const validProductionLineData = {
    id: 'line-001',
    name: 'Assembly Line 1',
    type: ProductionLineType.ASSEMBLY,
    description: 'Main assembly line for automotive production',
    taktTime: 120, // 2 minutes
    capacity: 30, // 30 units per hour
    qualityCheckpoints: [
      {
        id: 'qc-001',
        name: 'Visual Inspection',
        description: 'Visual quality check',
        type: 'visual',
        frequency: 10,
        requiredSkills: ['skill-001'],
        tolerances: { defectRate: 0.01 },
        active: true
      }
    ],
    active: true
  };

  describe('Constructor and Validation', () => {
    it('should create a valid production line', () => {
      const line = new ProductionLine(validProductionLineData);
      
      expect(line.id).toBe('line-001');
      expect(line.name).toBe('Assembly Line 1');
      expect(line.type).toBe(ProductionLineType.ASSEMBLY);
      expect(line.description).toBe('Main assembly line for automotive production');
      expect(line.taktTime).toBe(120);
      expect(line.capacity).toBe(30);
      expect(line.qualityCheckpoints).toHaveLength(1);
      expect(line.active).toBe(true);
      expect(line.createdAt).toBeInstanceOf(Date);
      expect(line.updatedAt).toBeInstanceOf(Date);
    });

    it('should create production line without description', () => {
      const data = { ...validProductionLineData };
      delete data.description;
      
      const line = new ProductionLine(data);
      expect(line.description).toBeUndefined();
    });

    it('should throw error for empty ID', () => {
      expect(() => new ProductionLine({ ...validProductionLineData, id: '' }))
        .toThrow('Production line ID is required');
    });

    it('should throw error for empty name', () => {
      expect(() => new ProductionLine({ ...validProductionLineData, name: '' }))
        .toThrow('Production line name is required');
    });

    it('should throw error for invalid takt time', () => {
      expect(() => new ProductionLine({ ...validProductionLineData, taktTime: 5 }))
        .toThrow('Takt time must be between 10 seconds and 1 hour');
      
      expect(() => new ProductionLine({ ...validProductionLineData, taktTime: 4000 }))
        .toThrow('Takt time must be between 10 seconds and 1 hour');
    });

    it('should throw error for invalid capacity', () => {
      expect(() => new ProductionLine({ ...validProductionLineData, capacity: 0 }))
        .toThrow('Capacity must be between 1 and 1000 units per hour');
      
      expect(() => new ProductionLine({ ...validProductionLineData, capacity: 1001 }))
        .toThrow('Capacity must be between 1 and 1000 units per hour');
    });

    it('should throw error for duplicate quality checkpoint IDs', () => {
      const duplicateCheckpoints = [
        {
          id: 'qc-001',
          name: 'Visual Inspection 1',
          description: 'First visual check',
          type: 'visual',
          frequency: 10,
          requiredSkills: [],
          tolerances: {},
          active: true
        },
        {
          id: 'qc-001',
          name: 'Visual Inspection 2',
          description: 'Second visual check',
          type: 'visual',
          frequency: 20,
          requiredSkills: [],
          tolerances: {},
          active: true
        }
      ];

      expect(() => new ProductionLine({
        ...validProductionLineData,
        qualityCheckpoints: duplicateCheckpoints
      })).toThrow('Quality checkpoints must have unique IDs');
    });
  });

  describe('Quality Checkpoint Management', () => {
    let line: ProductionLine;

    beforeEach(() => {
      line = new ProductionLine(validProductionLineData);
    });

    it('should get active quality checkpoints', () => {
      const activeCheckpoints = line.getActiveQualityCheckpoints();
      expect(activeCheckpoints).toHaveLength(1);
      expect(activeCheckpoints[0].active).toBe(true);
    });

    it('should get quality checkpoints by type', () => {
      const visualCheckpoints = line.getQualityCheckpointsByType('visual');
      expect(visualCheckpoints).toHaveLength(1);
      expect(visualCheckpoints[0].type).toBe('visual');
    });

    it('should add quality checkpoint', () => {
      const newCheckpoint = {
        id: 'qc-002',
        name: 'Dimensional Check',
        description: 'Dimensional quality check',
        type: 'dimensional',
        frequency: 5,
        requiredSkills: ['skill-002'],
        tolerances: { tolerance: 0.1 },
        active: true
      };

      const updated = line.addQualityCheckpoint(newCheckpoint);
      expect(updated.qualityCheckpoints).toHaveLength(2);
      expect(updated.qualityCheckpoints.some(cp => cp.id === 'qc-002')).toBe(true);
    });

    it('should throw error when adding duplicate checkpoint', () => {
      const duplicateCheckpoint = {
        id: 'qc-001',
        name: 'Duplicate Check',
        description: 'Duplicate checkpoint',
        type: 'visual',
        frequency: 15,
        requiredSkills: [],
        tolerances: {},
        active: true
      };

      expect(() => line.addQualityCheckpoint(duplicateCheckpoint))
        .toThrow('Quality checkpoint with ID qc-001 already exists');
    });

    it('should remove quality checkpoint', () => {
      const updated = line.removeQualityCheckpoint('qc-001');
      expect(updated.qualityCheckpoints).toHaveLength(0);
    });

    it('should throw error when removing non-existent checkpoint', () => {
      expect(() => line.removeQualityCheckpoint('qc-999'))
        .toThrow('Quality checkpoint qc-999 not found');
    });
  });

  describe('Performance Calculations', () => {
    let line: ProductionLine;

    beforeEach(() => {
      line = new ProductionLine(validProductionLineData);
    });

    it('should calculate theoretical throughput', () => {
      const throughput = line.getTheoreticalThroughput();
      expect(throughput).toBe(30); // 3600 seconds / 120 seconds = 30 units/hour
    });

    it('should calculate efficiency percentage', () => {
      const efficiency = line.getEfficiencyPercentage();
      expect(efficiency).toBe(100); // capacity matches theoretical throughput
    });

    it('should identify high capacity lines', () => {
      expect(line.isHighCapacity()).toBe(false);
      
      const highCapacityLine = line.update({ capacity: 150 });
      expect(highCapacityLine.isHighCapacity()).toBe(true);
    });

    it('should get all required skills from checkpoints', () => {
      const skills = line.getAllRequiredSkills();
      expect(skills).toContain('skill-001');
      expect(skills).toHaveLength(1);
    });
  });

  describe('Update and Serialization', () => {
    let line: ProductionLine;

    beforeEach(() => {
      line = new ProductionLine(validProductionLineData);
    });

    it('should create updated copy', async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
      const updated = line.update({
        name: 'Assembly Line 2',
        capacity: 40
      });

      expect(updated.name).toBe('Assembly Line 2');
      expect(updated.capacity).toBe(40);
      expect(updated.id).toBe(line.id);
      expect(updated.createdAt).toEqual(line.createdAt);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(line.updatedAt.getTime());
    });

    it('should serialize to JSON correctly', () => {
      const json = line.toJSON();
      
      expect(json.id).toBe('line-001');
      expect(json.name).toBe('Assembly Line 1');
      expect(json.type).toBe(ProductionLineType.ASSEMBLY);
      expect(json.taktTime).toBe(120);
      expect(json.capacity).toBe(30);
      expect(json.qualityCheckpoints).toHaveLength(1);
      expect(json.active).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum valid takt time', () => {
      const line = new ProductionLine({
        ...validProductionLineData,
        taktTime: 10
      });
      
      expect(line.taktTime).toBe(10);
      expect(line.getTheoreticalThroughput()).toBe(360);
    });

    it('should handle maximum valid takt time', () => {
      const line = new ProductionLine({
        ...validProductionLineData,
        taktTime: 3600
      });
      
      expect(line.taktTime).toBe(3600);
      expect(line.getTheoreticalThroughput()).toBe(1);
    });

    it('should handle empty quality checkpoints', () => {
      const line = new ProductionLine({
        ...validProductionLineData,
        qualityCheckpoints: []
      });
      
      expect(line.qualityCheckpoints).toHaveLength(0);
      expect(line.getActiveQualityCheckpoints()).toHaveLength(0);
      expect(line.getAllRequiredSkills()).toHaveLength(0);
    });

    it('should handle multiple quality checkpoints with same skills', () => {
      const checkpoints = [
        {
          id: 'qc-001',
          name: 'Visual Check 1',
          description: 'First visual check',
          type: 'visual',
          frequency: 10,
          requiredSkills: ['skill-001', 'skill-002'],
          tolerances: {},
          active: true
        },
        {
          id: 'qc-002',
          name: 'Visual Check 2',
          description: 'Second visual check',
          type: 'visual',
          frequency: 20,
          requiredSkills: ['skill-001', 'skill-003'],
          tolerances: {},
          active: true
        }
      ];

      const line = new ProductionLine({
        ...validProductionLineData,
        qualityCheckpoints: checkpoints
      });

      const skills = line.getAllRequiredSkills();
      expect(skills).toContain('skill-001');
      expect(skills).toContain('skill-002');
      expect(skills).toContain('skill-003');
      expect(skills).toHaveLength(3); // No duplicates
    });
  });
});
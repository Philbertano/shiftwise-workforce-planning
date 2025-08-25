// Safety Requirement API service

import { apiClient } from './api';

export interface SafetyRequirement {
  id: string;
  name: string;
  description: string;
  category: 'ppe' | 'lockout_tagout' | 'confined_space' | 'hazmat' | 'electrical' | 'mechanical' | 'ergonomic' | 'fire_safety' | 'emergency_response';
  level: 'basic' | 'intermediate' | 'advanced' | 'expert';
  certificationRequired: boolean;
  certificationValidityDays?: number;
  trainingRequired: boolean;
  equipmentRequired: string[];
  active: boolean;
}

export interface CreateSafetyRequirementData {
  name: string;
  description: string;
  category: SafetyRequirement['category'];
  level: SafetyRequirement['level'];
  certificationRequired: boolean;
  certificationValidityDays?: number;
  trainingRequired: boolean;
  equipmentRequired?: string[];
  active?: boolean;
}

class SafetyRequirementService {
  async getSafetyRequirements(): Promise<SafetyRequirement[]> {
    try {
      const response = await apiClient.get<{ safetyRequirements: SafetyRequirement[] }>('/safety-requirements');
      return response.safetyRequirements;
    } catch (error) {
      // Return mock data for development
      return [
        {
          id: '1',
          name: 'Lockout/Tagout Certification',
          description: 'Required for working with electrical and mechanical equipment',
          category: 'lockout_tagout',
          level: 'intermediate',
          certificationRequired: true,
          certificationValidityDays: 365,
          trainingRequired: true,
          equipmentRequired: ['lockout_devices', 'tags'],
          active: true
        },
        {
          id: '2',
          name: 'Personal Protective Equipment',
          description: 'Basic PPE requirements for production floor',
          category: 'ppe',
          level: 'basic',
          certificationRequired: false,
          trainingRequired: true,
          equipmentRequired: ['safety_glasses', 'steel_toe_boots', 'hard_hat'],
          active: true
        },
        {
          id: '3',
          name: 'Electrical Safety',
          description: 'Advanced electrical safety for high-voltage equipment',
          category: 'electrical',
          level: 'advanced',
          certificationRequired: true,
          certificationValidityDays: 730,
          trainingRequired: true,
          equipmentRequired: ['insulated_gloves', 'voltage_tester'],
          active: true
        },
        {
          id: '4',
          name: 'Hazardous Materials Handling',
          description: 'Safe handling of paints, solvents, and chemicals',
          category: 'hazmat',
          level: 'intermediate',
          certificationRequired: true,
          certificationValidityDays: 365,
          trainingRequired: true,
          equipmentRequired: ['respirator', 'chemical_gloves', 'spill_kit'],
          active: true
        },
        {
          id: '5',
          name: 'Confined Space Entry',
          description: 'Safety procedures for working in confined spaces',
          category: 'confined_space',
          level: 'expert',
          certificationRequired: true,
          certificationValidityDays: 365,
          trainingRequired: true,
          equipmentRequired: ['gas_monitor', 'retrieval_equipment', 'communication_device'],
          active: true
        },
        {
          id: '6',
          name: 'Fire Safety and Emergency Response',
          description: 'Basic fire safety and emergency procedures',
          category: 'fire_safety',
          level: 'basic',
          certificationRequired: false,
          trainingRequired: true,
          equipmentRequired: ['fire_extinguisher'],
          active: true
        }
      ];
    }
  }

  async getSafetyRequirement(id: string): Promise<SafetyRequirement> {
    const response = await apiClient.get<{ success: boolean; data: SafetyRequirement }>(`/safety-requirements/${id}`);
    return response.data;
  }

  async createSafetyRequirement(data: CreateSafetyRequirementData): Promise<SafetyRequirement> {
    const response = await apiClient.post<{ success: boolean; data: SafetyRequirement }>('/safety-requirements', data);
    return response.data;
  }

  async getActiveSafetyRequirements(): Promise<SafetyRequirement[]> {
    const requirements = await this.getSafetyRequirements();
    return requirements.filter(req => req.active);
  }

  async getSafetyRequirementsByCategory(category: SafetyRequirement['category']): Promise<SafetyRequirement[]> {
    const requirements = await this.getSafetyRequirements();
    return requirements.filter(req => req.category === category);
  }

  async getSafetyRequirementsByLevel(level: SafetyRequirement['level']): Promise<SafetyRequirement[]> {
    const requirements = await this.getSafetyRequirements();
    return requirements.filter(req => req.level === level);
  }
}

export const safetyRequirementService = new SafetyRequirementService();
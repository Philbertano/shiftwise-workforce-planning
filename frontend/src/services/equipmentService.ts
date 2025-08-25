// Equipment API service

import { apiClient } from './api';

export interface Equipment {
  id: string;
  name: string;
  type: 'robot' | 'conveyor' | 'press' | 'welder' | 'paint_booth' | 'inspection_station' | 'assembly_fixture' | 'crane' | 'lift' | 'tool' | 'measurement_device' | 'safety_system';
  model?: string;
  manufacturer?: string;
  status: 'operational' | 'maintenance' | 'breakdown' | 'offline' | 'testing';
  requiredSkills: string[];
  safetyRequirements: string[];
  active: boolean;
}

export interface CreateEquipmentData {
  name: string;
  type: Equipment['type'];
  model?: string;
  manufacturer?: string;
  status: Equipment['status'];
  requiredSkills?: string[];
  safetyRequirements?: string[];
  active?: boolean;
}

class EquipmentService {
  async getEquipment(): Promise<Equipment[]> {
    try {
      const response = await apiClient.get<{ equipment: Equipment[] }>('/equipment');
      return response.equipment;
    } catch (error) {
      // Return mock data for development
      return [
        { 
          id: '1', 
          name: 'Robotic Welder #1', 
          type: 'robot', 
          model: 'RW-2000', 
          manufacturer: 'AutoBot Industries', 
          status: 'operational', 
          requiredSkills: ['welding', 'robotics'], 
          safetyRequirements: ['lockout_tagout', 'electrical'], 
          active: true 
        },
        { 
          id: '2', 
          name: 'Assembly Conveyor A', 
          type: 'conveyor', 
          model: 'AC-500', 
          manufacturer: 'ConveyTech', 
          status: 'operational', 
          requiredSkills: ['mechanical'], 
          safetyRequirements: ['lockout_tagout'], 
          active: true 
        },
        { 
          id: '3', 
          name: 'Hydraulic Press #3', 
          type: 'press', 
          model: 'HP-1500', 
          manufacturer: 'PressMax', 
          status: 'operational', 
          requiredSkills: ['hydraulics', 'safety'], 
          safetyRequirements: ['lockout_tagout', 'mechanical'], 
          active: true 
        },
        { 
          id: '4', 
          name: 'Paint Booth Ventilation', 
          type: 'paint_booth', 
          model: 'PBV-300', 
          manufacturer: 'AirFlow Systems', 
          status: 'operational', 
          requiredSkills: ['painting', 'ventilation'], 
          safetyRequirements: ['hazmat', 'ppe'], 
          active: true 
        },
        { 
          id: '5', 
          name: 'Quality Scanner', 
          type: 'inspection_station', 
          model: 'QS-100', 
          manufacturer: 'InspectPro', 
          status: 'operational', 
          requiredSkills: ['quality_control', 'measurement'], 
          safetyRequirements: ['electrical'], 
          active: true 
        }
      ];
    }
  }

  async getEquipmentById(id: string): Promise<Equipment> {
    const response = await apiClient.get<{ success: boolean; data: Equipment }>(`/equipment/${id}`);
    return response.data;
  }

  async createEquipment(data: CreateEquipmentData): Promise<Equipment> {
    const response = await apiClient.post<{ success: boolean; data: Equipment }>('/equipment', data);
    return response.data;
  }

  async getActiveEquipment(): Promise<Equipment[]> {
    const equipment = await this.getEquipment();
    return equipment.filter(eq => eq.active);
  }

  async getEquipmentByType(type: Equipment['type']): Promise<Equipment[]> {
    const equipment = await this.getEquipment();
    return equipment.filter(eq => eq.type === type);
  }
}

export const equipmentService = new EquipmentService();
// Skill API service

import { apiClient } from './api';
import { Skill } from '../types';

export interface CreateSkillData {
  name: string;
  description?: string;
  levelScale: number;
  category: string;
}

export interface UpdateSkillData extends Partial<CreateSkillData> {}

class SkillService {
  async getSkills(): Promise<Skill[]> {
    const response = await apiClient.get<{ skills: Skill[] }>('/skills');
    return response.skills;
  }

  async getSkill(id: string): Promise<Skill> {
    return apiClient.get<Skill>(`/skills/${id}`);
  }

  async createSkill(data: CreateSkillData): Promise<Skill> {
    return apiClient.post<Skill>('/skills', data);
  }

  async updateSkill(id: string, data: UpdateSkillData): Promise<Skill> {
    return apiClient.put<Skill>(`/skills/${id}`, data);
  }

  async deleteSkill(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/skills/${id}`);
  }

  async getSkillsByCategory(category: string): Promise<Skill[]> {
    const response = await apiClient.get<{ skills: Skill[] }>(`/skills?category=${category}`);
    return response.skills;
  }

  async searchSkills(searchTerm: string): Promise<Skill[]> {
    const response = await apiClient.get<{ skills: Skill[] }>(`/skills?search=${searchTerm}`);
    return response.skills;
  }
}

export const skillService = new SkillService();
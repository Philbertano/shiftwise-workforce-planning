// Station API service

import { apiClient } from './api';
import { Station, RequiredSkill, Equipment, SafetyRequirement } from '../types';

export interface CreateStationData {
  name: string;
  line?: string;
  description?: string;
  capacity?: number;
  active?: boolean;
  requiredSkills?: RequiredSkill[];
  productionLineId?: string;
  equipment?: Equipment[];
  safetyRequirements?: SafetyRequirement[];
}

export interface UpdateStationData extends Partial<CreateStationData> {}

class StationService {
  async getStations(): Promise<Station[]> {
    const response = await apiClient.get<{ stations: Station[] }>('/stations');
    return response.stations;
  }

  async getStation(id: string): Promise<Station> {
    const response = await apiClient.get<{ success: boolean; data: Station }>(`/stations/${id}`);
    return response.data;
  }

  async createStation(data: CreateStationData): Promise<Station> {
    const response = await apiClient.post<{ success: boolean; data: Station }>('/stations', data);
    return response.data;
  }

  async updateStation(id: string, data: UpdateStationData): Promise<Station> {
    const response = await apiClient.put<{ success: boolean; data: Station }>(`/stations/${id}`, data);
    return response.data;
  }

  async deleteStation(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/stations/${id}`);
  }

  async getStationsByLine(line: string): Promise<Station[]> {
    const response = await apiClient.get<{ stations: Station[] }>(`/stations?line=${line}`);
    return response.stations;
  }

  async searchStations(searchTerm: string): Promise<Station[]> {
    const response = await apiClient.get<{ stations: Station[] }>(`/stations?search=${searchTerm}`);
    return response.stations;
  }
}

export const stationService = new StationService();
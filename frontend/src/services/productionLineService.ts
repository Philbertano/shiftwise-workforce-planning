// Production Line API service

import { apiClient } from './api';

export interface ProductionLine {
  id: string;
  name: string;
  type: 'assembly' | 'paint' | 'body_shop' | 'final_inspection' | 'stamping' | 'welding' | 'trim' | 'chassis';
  description?: string;
  taktTime: number; // seconds
  capacity: number; // units per hour
  active: boolean;
}

export interface CreateProductionLineData {
  name: string;
  type: ProductionLine['type'];
  description?: string;
  taktTime: number;
  capacity: number;
  active?: boolean;
}

class ProductionLineService {
  async getProductionLines(): Promise<ProductionLine[]> {
    try {
      const response = await apiClient.get<{ productionLines: ProductionLine[] }>('/production-lines');
      return response.productionLines;
    } catch (error) {
      // Return mock data for development
      return [
        { id: '1', name: 'Engine Assembly Line 1', type: 'assembly', taktTime: 120, capacity: 30, active: true },
        { id: '2', name: 'Body Shop Line A', type: 'body_shop', taktTime: 180, capacity: 20, active: true },
        { id: '3', name: 'Paint Booth 1', type: 'paint', taktTime: 300, capacity: 12, active: true },
        { id: '4', name: 'Final Inspection', type: 'final_inspection', taktTime: 240, capacity: 15, active: true },
        { id: '5', name: 'Stamping Press Line', type: 'stamping', taktTime: 60, capacity: 60, active: true }
      ];
    }
  }

  async getProductionLine(id: string): Promise<ProductionLine> {
    const response = await apiClient.get<{ success: boolean; data: ProductionLine }>(`/production-lines/${id}`);
    return response.data;
  }

  async createProductionLine(data: CreateProductionLineData): Promise<ProductionLine> {
    const response = await apiClient.post<{ success: boolean; data: ProductionLine }>('/production-lines', data);
    return response.data;
  }

  async getActiveProductionLines(): Promise<ProductionLine[]> {
    const lines = await this.getProductionLines()
    return lines.filter(line => line.active)
  }

  async updateProductionLine(id: string, data: Partial<CreateProductionLineData>): Promise<ProductionLine> {
    const response = await apiClient.put<{ success: boolean; data: ProductionLine }>(`/production-lines/${id}`, data)
    return response.data
  }

  async deleteProductionLine(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/production-lines/${id}`)
  }
}

export const productionLineService = new ProductionLineService();
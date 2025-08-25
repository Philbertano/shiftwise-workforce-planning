// AI Assistant API service

import { apiClient } from './api';

export interface GeneratePlanRequest {
  instructions: string;
  dateRange: {
    start: Date;
    end: Date;
  };
}

export interface GeneratePlanResponse {
  success: boolean;
  planId: string;
  explanation: string;
  coveragePercentage: number;
  assignments: any[];
  gaps: number;
  constraints: any[];
}

export interface ExplainPlanRequest {
  planId?: string;
  assignmentId?: string;
  query?: string;
}

export interface ExplainPlanResponse {
  success: boolean;
  explanation: string;
  reasoning: string[];
  alternatives: string[];
  constraints: string[];
}

export interface SimulateAbsenceRequest {
  employeeId: string;
  dateRange: {
    start: Date;
    end: Date;
  };
}

export interface SimulateAbsenceResponse {
  success: boolean;
  impactSummary: string;
  coverageChange: number;
  riskLevel: string;
  affectedStations: string[];
  recommendations: string[];
}

export interface OptimizationSuggestion {
  type: 'swap' | 'overtime' | 'training' | 'hiring' | 'optimize';
  description: string;
  impact: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost?: number;
}

class AIAssistantService {
  async generatePlan(request: GeneratePlanRequest): Promise<GeneratePlanResponse> {
    const response = await apiClient.post<GeneratePlanResponse>('/assistant/generate-plan', {
      instructions: request.instructions,
      dateRange: {
        start: request.dateRange.start.toISOString(),
        end: request.dateRange.end.toISOString()
      }
    });
    
    return response;
  }

  async explainPlan(request: ExplainPlanRequest): Promise<ExplainPlanResponse> {
    const response = await apiClient.post<ExplainPlanResponse>('/assistant/explain-plan', request);
    return response;
  }

  async simulateAbsence(request: SimulateAbsenceRequest): Promise<SimulateAbsenceResponse> {
    const response = await apiClient.post<SimulateAbsenceResponse>('/assistant/simulate-absence', {
      employeeId: request.employeeId,
      dateRange: {
        start: request.dateRange.start.toISOString(),
        end: request.dateRange.end.toISOString()
      }
    });
    
    return response;
  }

  async getOptimizations(planId: string): Promise<OptimizationSuggestion[]> {
    const response = await apiClient.post<OptimizationSuggestion[]>('/assistant/optimize-plan', {
      planId
    });
    
    return response;
  }
}

export const aiAssistantService = new AIAssistantService();
// Employee API service

import { apiClient, PaginatedResponse } from './api';
import { Employee, EmployeeSkill, Skill } from '../types';

export interface EmployeeListParams {
  page?: number;
  limit?: number;
  search?: string;
  team?: string;
  contractType?: string;
  active?: 'true' | 'false' | 'all';
}

export interface CreateEmployeeData {
  name: string;
  contractType: 'full-time' | 'part-time' | 'temporary' | 'contract';
  weeklyHours?: number;
  maxHoursPerDay?: number;
  minRestHours?: number;
  team?: string;
  active?: boolean;
  preferences?: any;
}

export interface UpdateEmployeeData extends Partial<CreateEmployeeData> {}

export interface EmployeeSkillData {
  skillId: string;
  level: number;
  validUntil?: string; // ISO date string
  certificationId?: string;
}

export interface EmployeeWithSkills {
  employeeId: string;
  employeeName: string;
  skills: Array<{
    id: string;
    skillId: string;
    skillName: string;
    level: number;
    validUntil?: Date;
    certificationId?: string;
  }>;
}

export interface QualificationMatrix {
  employees: Array<{
    employeeId: string;
    skills: Array<{
      skillId: string;
      skillName: string;
      level: number;
      validUntil?: Date;
    }>;
  }>;
}

export interface BulkQualificationUpdate {
  employeeId: string;
  skillId: string;
  level?: number;
  validUntil?: string;
  certificationId?: string;
  action?: 'upsert' | 'delete';
}

class EmployeeService {
  // Employee CRUD operations
  async getEmployees(params: EmployeeListParams = {}): Promise<PaginatedResponse<Employee>> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    const endpoint = `/employees${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get<{
      employees: Employee[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(endpoint);

    return {
      data: response.employees,
      pagination: response.pagination,
    };
  }

  async getEmployee(id: string): Promise<Employee> {
    return apiClient.get<Employee>(`/employees/${id}`);
  }

  async createEmployee(data: CreateEmployeeData): Promise<Employee> {
    return apiClient.post<Employee>('/employees', data);
  }

  async updateEmployee(id: string, data: UpdateEmployeeData): Promise<Employee> {
    return apiClient.put<Employee>(`/employees/${id}`, data);
  }

  async deleteEmployee(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/employees/${id}`);
  }

  // Employee skill operations
  async getEmployeeSkills(employeeId: string): Promise<EmployeeWithSkills> {
    return apiClient.get<EmployeeWithSkills>(`/employees/${employeeId}/skills`);
  }

  async addEmployeeSkill(employeeId: string, skillData: EmployeeSkillData): Promise<{
    id: string;
    skillId: string;
    skillName: string;
    level: number;
    validUntil?: Date;
    certificationId?: string;
  }> {
    return apiClient.post(`/employees/${employeeId}/skills`, skillData);
  }

  async updateEmployeeSkill(
    employeeId: string, 
    skillId: string, 
    data: Partial<EmployeeSkillData>
  ): Promise<{
    id: string;
    skillId: string;
    level: number;
    validUntil?: Date;
    certificationId?: string;
  }> {
    return apiClient.put(`/employees/${employeeId}/skills/${skillId}`, data);
  }

  async removeEmployeeSkill(employeeId: string, skillId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`/employees/${employeeId}/skills/${skillId}`);
  }

  // Qualification matrix operations
  async getQualificationMatrix(employeeIds?: string[]): Promise<QualificationMatrix> {
    const params = employeeIds ? `?employeeIds=${employeeIds.join(',')}` : '';
    return apiClient.get<QualificationMatrix>(`/employees/qualifications${params}`);
  }

  async bulkUpdateQualifications(updates: BulkQualificationUpdate[]): Promise<{
    updatedCount: number;
    totalRequested: number;
    success: boolean;
    errors?: string[];
  }> {
    return apiClient.post('/employees/qualifications/bulk', { updates });
  }

  // Utility methods for frontend integration
  async searchEmployees(searchTerm: string, filters: Partial<EmployeeListParams> = {}): Promise<Employee[]> {
    const response = await this.getEmployees({
      search: searchTerm,
      limit: 100, // Get more results for search
      ...filters,
    });
    return response.data;
  }

  async getActiveEmployees(): Promise<Employee[]> {
    const response = await this.getEmployees({
      active: 'true',
      limit: 1000, // Get all active employees
    });
    return response.data;
  }

  async getEmployeesByTeam(team: string): Promise<Employee[]> {
    const response = await this.getEmployees({
      team,
      active: 'true',
      limit: 1000,
    });
    return response.data;
  }

  // Convert API response to frontend format
  convertApiEmployeeToFrontend(apiEmployee: any): Employee {
    return {
      id: apiEmployee.id,
      name: apiEmployee.name,
      contractType: apiEmployee.contractType,
      weeklyHours: apiEmployee.weeklyHours,
      maxHoursPerDay: apiEmployee.maxHoursPerDay,
      minRestHours: apiEmployee.minRestHours,
      team: apiEmployee.team,
      active: apiEmployee.active,
      preferences: apiEmployee.preferences,
    };
  }

  // Convert frontend employee to API format
  convertFrontendEmployeeToApi(employee: Omit<Employee, 'id'>): CreateEmployeeData {
    return {
      name: employee.name,
      contractType: employee.contractType,
      weeklyHours: employee.weeklyHours,
      maxHoursPerDay: employee.maxHoursPerDay,
      minRestHours: employee.minRestHours,
      team: employee.team,
      active: employee.active,
      preferences: employee.preferences,
    };
  }
}

export const employeeService = new EmployeeService();
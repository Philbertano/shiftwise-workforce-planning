import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safetyRequirementService } from '../safetyRequirementService';

// Mock fetch
global.fetch = vi.fn();

describe('safetyRequirementService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockSafetyRequirement = {
    id: '1',
    name: 'Welding Safety Certification',
    type: 'certification',
    description: 'Required certification for welding operations',
    validityPeriod: 365, // days
    mandatory: true,
    applicableStations: ['station1', 'station2'],
    trainingRequired: true,
    renewalNotice: 30 // days before expiry
  };

  describe('getSafetyRequirements', () => {
    it('fetches all safety requirements successfully', async () => {
      const mockResponse = [mockSafetyRequirement];
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await safetyRequirementService.getSafetyRequirements();

      expect(fetch).toHaveBeenCalledWith('/api/safety-requirements');
      expect(result).toEqual(mockResponse);
    });

    it('fetches safety requirements by station ID', async () => {
      const mockResponse = [mockSafetyRequirement];
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await safetyRequirementService.getSafetyRequirements('station1');

      expect(fetch).toHaveBeenCalledWith('/api/safety-requirements?stationId=station1');
      expect(result).toEqual(mockResponse);
    });

    it('handles fetch error gracefully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(safetyRequirementService.getSafetyRequirements()).rejects.toThrow(
        'Failed to fetch safety requirements: 500 Internal Server Error'
      );
    });
  });

  describe('getSafetyRequirementById', () => {
    it('fetches safety requirement by ID successfully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSafetyRequirement,
      });

      const result = await safetyRequirementService.getSafetyRequirementById('1');

      expect(fetch).toHaveBeenCalledWith('/api/safety-requirements/1');
      expect(result).toEqual(mockSafetyRequirement);
    });

    it('handles not found error', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(safetyRequirementService.getSafetyRequirementById('999')).rejects.toThrow(
        'Failed to fetch safety requirement: 404 Not Found'
      );
    });
  });

  describe('createSafetyRequirement', () => {
    it('creates safety requirement successfully', async () => {
      const newRequirement = {
        name: 'Chemical Handling Certification',
        type: 'certification',
        description: 'Required for paint shop operations',
        validityPeriod: 730,
        mandatory: true,
        applicableStations: ['station3']
      };

      const createdRequirement = { ...newRequirement, id: '2' };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => createdRequirement,
      });

      const result = await safetyRequirementService.createSafetyRequirement(newRequirement);

      expect(fetch).toHaveBeenCalledWith('/api/safety-requirements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRequirement),
      });
      expect(result).toEqual(createdRequirement);
    });

    it('handles validation error', async () => {
      const invalidData = { name: '' }; // Missing required fields

      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(safetyRequirementService.createSafetyRequirement(invalidData)).rejects.toThrow(
        'Failed to create safety requirement: 400 Bad Request'
      );
    });
  });

  describe('updateSafetyRequirement', () => {
    it('updates safety requirement successfully', async () => {
      const updates = { 
        validityPeriod: 400,
        renewalNotice: 45
      };
      const updatedRequirement = { ...mockSafetyRequirement, ...updates };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedRequirement,
      });

      const result = await safetyRequirementService.updateSafetyRequirement('1', updates);

      expect(fetch).toHaveBeenCalledWith('/api/safety-requirements/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      expect(result).toEqual(updatedRequirement);
    });
  });

  describe('deleteSafetyRequirement', () => {
    it('deletes safety requirement successfully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      await safetyRequirementService.deleteSafetyRequirement('1');

      expect(fetch).toHaveBeenCalledWith('/api/safety-requirements/1', {
        method: 'DELETE',
      });
    });

    it('handles delete error', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
      });

      await expect(safetyRequirementService.deleteSafetyRequirement('1')).rejects.toThrow(
        'Failed to delete safety requirement: 409 Conflict'
      );
    });
  });

  describe('getEmployeeSafetyCompliance', () => {
    it('fetches employee safety compliance successfully', async () => {
      const mockCompliance = {
        employeeId: 'emp1',
        employeeName: 'John Doe',
        overallCompliance: 95.5,
        certifications: [
          {
            requirementId: '1',
            requirementName: 'Welding Safety Certification',
            status: 'valid',
            obtainedDate: '2023-06-15T00:00:00Z',
            expiryDate: '2024-06-15T00:00:00Z',
            daysUntilExpiry: 45
          }
        ],
        violations: [],
        trainingStatus: {
          completed: 5,
          pending: 1,
          overdue: 0
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCompliance,
      });

      const result = await safetyRequirementService.getEmployeeSafetyCompliance('emp1');

      expect(fetch).toHaveBeenCalledWith('/api/safety-requirements/compliance/emp1');
      expect(result).toEqual(mockCompliance);
    });
  });

  describe('getStationSafetyCompliance', () => {
    it('fetches station safety compliance successfully', async () => {
      const mockCompliance = {
        stationId: 'station1',
        stationName: 'Assembly Station 1',
        overallCompliance: 88.2,
        requiredCertifications: [
          {
            requirementId: '1',
            requirementName: 'Welding Safety Certification',
            requiredEmployees: 10,
            compliantEmployees: 8,
            complianceRate: 80.0
          }
        ],
        assignedEmployees: [
          {
            employeeId: 'emp1',
            employeeName: 'John Doe',
            compliant: true,
            missingCertifications: []
          }
        ]
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCompliance,
      });

      const result = await safetyRequirementService.getStationSafetyCompliance('station1');

      expect(fetch).toHaveBeenCalledWith('/api/safety-requirements/compliance/station/station1');
      expect(result).toEqual(mockCompliance);
    });
  });

  describe('recordSafetyIncident', () => {
    it('records safety incident successfully', async () => {
      const incidentData = {
        stationId: 'station1',
        employeeId: 'emp1',
        type: 'minor_injury',
        description: 'Cut on hand while handling materials',
        severity: 'low',
        reportedBy: 'supervisor1',
        actionsTaken: 'First aid applied, safety briefing conducted'
      };

      const recordedIncident = { ...incidentData, id: 'incident1', reportedAt: new Date().toISOString() };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => recordedIncident,
      });

      const result = await safetyRequirementService.recordSafetyIncident(incidentData);

      expect(fetch).toHaveBeenCalledWith('/api/safety-requirements/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incidentData),
      });
      expect(result).toEqual(recordedIncident);
    });
  });

  describe('getSafetyMetrics', () => {
    it('fetches safety metrics successfully', async () => {
      const mockMetrics = {
        overallCompliance: 92.3,
        incidentCount: 2,
        incidentRate: 0.5, // per 100 employees
        certificationStatus: {
          current: 45,
          expired: 3,
          expiringSoon: 7
        },
        trainingStatus: {
          completed: 42,
          pending: 8,
          overdue: 2
        },
        complianceByArea: [
          {
            area: 'Assembly Line',
            compliance: 96.2,
            status: 'excellent'
          },
          {
            area: 'Paint Shop',
            compliance: 89.1,
            status: 'good'
          }
        ]
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetrics,
      });

      const result = await safetyRequirementService.getSafetyMetrics('30d');

      expect(fetch).toHaveBeenCalledWith('/api/safety-requirements/metrics?period=30d');
      expect(result).toEqual(mockMetrics);
    });
  });
});
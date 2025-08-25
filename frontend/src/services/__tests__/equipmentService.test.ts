import { describe, it, expect, vi, beforeEach } from 'vitest';
import { equipmentService } from '../equipmentService';

// Mock fetch
global.fetch = vi.fn();

describe('equipmentService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockEquipment = {
    id: '1',
    name: 'Welding Robot #1',
    type: 'welding_robot',
    stationId: 'station1',
    status: 'operational',
    lastMaintenance: '2024-01-10T10:00:00Z',
    nextMaintenance: '2024-02-10T10:00:00Z',
    specifications: {
      power: '15kW',
      capacity: '100 units/hour',
      accuracy: '±0.1mm'
    }
  };

  describe('getEquipment', () => {
    it('fetches all equipment successfully', async () => {
      const mockResponse = [mockEquipment];
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await equipmentService.getEquipment();

      expect(fetch).toHaveBeenCalledWith('/api/equipment');
      expect(result).toEqual(mockResponse);
    });

    it('fetches equipment by station ID', async () => {
      const mockResponse = [mockEquipment];
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await equipmentService.getEquipment('station1');

      expect(fetch).toHaveBeenCalledWith('/api/equipment?stationId=station1');
      expect(result).toEqual(mockResponse);
    });

    it('handles fetch error gracefully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(equipmentService.getEquipment()).rejects.toThrow(
        'Failed to fetch equipment: 500 Internal Server Error'
      );
    });
  });

  describe('getEquipmentById', () => {
    it('fetches equipment by ID successfully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEquipment,
      });

      const result = await equipmentService.getEquipmentById('1');

      expect(fetch).toHaveBeenCalledWith('/api/equipment/1');
      expect(result).toEqual(mockEquipment);
    });

    it('handles not found error', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(equipmentService.getEquipmentById('999')).rejects.toThrow(
        'Failed to fetch equipment: 404 Not Found'
      );
    });
  });

  describe('createEquipment', () => {
    it('creates equipment successfully', async () => {
      const newEquipment = {
        name: 'Paint Sprayer #2',
        type: 'paint_sprayer',
        stationId: 'station2',
        specifications: {
          pressure: '30 PSI',
          flowRate: '200 ml/min'
        }
      };

      const createdEquipment = { ...newEquipment, id: '2', status: 'operational' };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => createdEquipment,
      });

      const result = await equipmentService.createEquipment(newEquipment);

      expect(fetch).toHaveBeenCalledWith('/api/equipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEquipment),
      });
      expect(result).toEqual(createdEquipment);
    });

    it('handles validation error', async () => {
      const invalidData = { name: '' }; // Missing required fields

      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(equipmentService.createEquipment(invalidData)).rejects.toThrow(
        'Failed to create equipment: 400 Bad Request'
      );
    });
  });

  describe('updateEquipment', () => {
    it('updates equipment successfully', async () => {
      const updates = { 
        name: 'Updated Welding Robot #1', 
        status: 'maintenance' 
      };
      const updatedEquipment = { ...mockEquipment, ...updates };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedEquipment,
      });

      const result = await equipmentService.updateEquipment('1', updates);

      expect(fetch).toHaveBeenCalledWith('/api/equipment/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      expect(result).toEqual(updatedEquipment);
    });
  });

  describe('deleteEquipment', () => {
    it('deletes equipment successfully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      await equipmentService.deleteEquipment('1');

      expect(fetch).toHaveBeenCalledWith('/api/equipment/1', {
        method: 'DELETE',
      });
    });

    it('handles delete error', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
      });

      await expect(equipmentService.deleteEquipment('1')).rejects.toThrow(
        'Failed to delete equipment: 409 Conflict'
      );
    });
  });

  describe('getEquipmentStatus', () => {
    it('fetches equipment status successfully', async () => {
      const mockStatus = {
        id: '1',
        status: 'operational',
        uptime: 98.5,
        lastCheck: new Date().toISOString(),
        alerts: [],
        performance: {
          efficiency: 94.2,
          output: 95,
          quality: 99.1
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

      const result = await equipmentService.getEquipmentStatus('1');

      expect(fetch).toHaveBeenCalledWith('/api/equipment/1/status');
      expect(result).toEqual(mockStatus);
    });
  });

  describe('updateEquipmentStatus', () => {
    it('updates equipment status successfully', async () => {
      const statusUpdate = {
        status: 'maintenance',
        notes: 'Scheduled maintenance'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...statusUpdate, id: '1' }),
      });

      const result = await equipmentService.updateEquipmentStatus('1', statusUpdate);

      expect(fetch).toHaveBeenCalledWith('/api/equipment/1/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(statusUpdate),
      });
      expect(result).toEqual({ ...statusUpdate, id: '1' });
    });
  });

  describe('getMaintenanceSchedule', () => {
    it('fetches maintenance schedule successfully', async () => {
      const mockSchedule = [
        {
          equipmentId: '1',
          equipmentName: 'Welding Robot #1',
          type: 'preventive',
          scheduledDate: '2024-02-10T10:00:00Z',
          description: 'Monthly calibration',
          priority: 'medium'
        }
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSchedule,
      });

      const result = await equipmentService.getMaintenanceSchedule();

      expect(fetch).toHaveBeenCalledWith('/api/equipment/maintenance/schedule');
      expect(result).toEqual(mockSchedule);
    });

    it('fetches maintenance schedule for specific equipment', async () => {
      const mockSchedule = [
        {
          equipmentId: '1',
          type: 'preventive',
          scheduledDate: '2024-02-10T10:00:00Z',
          description: 'Monthly calibration'
        }
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSchedule,
      });

      const result = await equipmentService.getMaintenanceSchedule('1');

      expect(fetch).toHaveBeenCalledWith('/api/equipment/maintenance/schedule?equipmentId=1');
      expect(result).toEqual(mockSchedule);
    });
  });

  describe('scheduleMaintenace', () => {
    it('schedules maintenance successfully', async () => {
      const maintenanceData = {
        equipmentId: '1',
        type: 'preventive',
        scheduledDate: '2024-02-15T14:00:00Z',
        description: 'Quarterly inspection',
        priority: 'high'
      };

      const scheduledMaintenance = { ...maintenanceData, id: 'maint1' };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => scheduledMaintenance,
      });

      const result = await equipmentService.scheduleMaintenance(maintenanceData);

      expect(fetch).toHaveBeenCalledWith('/api/equipment/maintenance/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(maintenanceData),
      });
      expect(result).toEqual(scheduledMaintenance);
    });
  });
});
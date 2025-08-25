import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productionLineService } from '../productionLineService';

// Mock fetch
global.fetch = vi.fn();

describe('productionLineService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockProductionLine = {
    id: '1',
    name: 'Assembly Line A',
    type: 'assembly',
    taktTime: 45,
    capacity: 10,
    status: 'active',
    stations: ['station1', 'station2'],
    qualityCheckpoints: [
      { id: 'qc1', name: 'Visual Inspection', required: true }
    ]
  };

  describe('getProductionLines', () => {
    it('fetches all production lines successfully', async () => {
      const mockResponse = [mockProductionLine];
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await productionLineService.getProductionLines();

      expect(fetch).toHaveBeenCalledWith('/api/production-lines');
      expect(result).toEqual(mockResponse);
    });

    it('handles fetch error gracefully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(productionLineService.getProductionLines()).rejects.toThrow(
        'Failed to fetch production lines: 500 Internal Server Error'
      );
    });

    it('handles network error', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(productionLineService.getProductionLines()).rejects.toThrow('Network error');
    });
  });

  describe('getProductionLineById', () => {
    it('fetches production line by ID successfully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProductionLine,
      });

      const result = await productionLineService.getProductionLineById('1');

      expect(fetch).toHaveBeenCalledWith('/api/production-lines/1');
      expect(result).toEqual(mockProductionLine);
    });

    it('handles not found error', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(productionLineService.getProductionLineById('999')).rejects.toThrow(
        'Failed to fetch production line: 404 Not Found'
      );
    });
  });

  describe('createProductionLine', () => {
    it('creates production line successfully', async () => {
      const newProductionLine = {
        name: 'Paint Shop B',
        type: 'paint',
        taktTime: 60,
        capacity: 8
      };

      const createdProductionLine = { ...newProductionLine, id: '2' };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => createdProductionLine,
      });

      const result = await productionLineService.createProductionLine(newProductionLine);

      expect(fetch).toHaveBeenCalledWith('/api/production-lines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProductionLine),
      });
      expect(result).toEqual(createdProductionLine);
    });

    it('handles validation error', async () => {
      const invalidData = { name: '' }; // Missing required fields

      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(productionLineService.createProductionLine(invalidData)).rejects.toThrow(
        'Failed to create production line: 400 Bad Request'
      );
    });
  });

  describe('updateProductionLine', () => {
    it('updates production line successfully', async () => {
      const updates = { name: 'Updated Assembly Line A', capacity: 12 };
      const updatedProductionLine = { ...mockProductionLine, ...updates };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedProductionLine,
      });

      const result = await productionLineService.updateProductionLine('1', updates);

      expect(fetch).toHaveBeenCalledWith('/api/production-lines/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      expect(result).toEqual(updatedProductionLine);
    });
  });

  describe('deleteProductionLine', () => {
    it('deletes production line successfully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      await productionLineService.deleteProductionLine('1');

      expect(fetch).toHaveBeenCalledWith('/api/production-lines/1', {
        method: 'DELETE',
      });
    });

    it('handles delete error', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
      });

      await expect(productionLineService.deleteProductionLine('1')).rejects.toThrow(
        'Failed to delete production line: 409 Conflict'
      );
    });
  });

  describe('getProductionLineStatus', () => {
    it('fetches production line status successfully', async () => {
      const mockStatus = {
        id: '1',
        status: 'running',
        efficiency: 92.5,
        currentShift: 'Day Shift',
        staffingLevel: 85.0,
        lastUpdate: new Date().toISOString()
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

      const result = await productionLineService.getProductionLineStatus('1');

      expect(fetch).toHaveBeenCalledWith('/api/production-lines/1/status');
      expect(result).toEqual(mockStatus);
    });
  });

  describe('updateProductionLineStatus', () => {
    it('updates production line status successfully', async () => {
      const statusUpdate = {
        status: 'maintenance',
        efficiency: 0,
        staffingLevel: 0
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...statusUpdate, id: '1' }),
      });

      const result = await productionLineService.updateProductionLineStatus('1', statusUpdate);

      expect(fetch).toHaveBeenCalledWith('/api/production-lines/1/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(statusUpdate),
      });
      expect(result).toEqual({ ...statusUpdate, id: '1' });
    });
  });

  describe('getProductionLineMetrics', () => {
    it('fetches production line metrics successfully', async () => {
      const mockMetrics = {
        efficiency: [
          { date: '2024-01-15', value: 85.2 },
          { date: '2024-01-16', value: 92.1 }
        ],
        output: [
          { date: '2024-01-15', actual: 142, planned: 167 },
          { date: '2024-01-16', actual: 156, planned: 169 }
        ],
        quality: [
          { date: '2024-01-15', score: 94.5 },
          { date: '2024-01-16', score: 96.2 }
        ]
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetrics,
      });

      const result = await productionLineService.getProductionLineMetrics('1', '7d');

      expect(fetch).toHaveBeenCalledWith('/api/production-lines/1/metrics?period=7d');
      expect(result).toEqual(mockMetrics);
    });
  });
});
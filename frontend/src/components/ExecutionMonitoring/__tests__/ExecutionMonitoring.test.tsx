// Tests for ExecutionMonitoring component

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionMonitoring } from '../ExecutionMonitoring';
import { PlanExecutionSummary, ExecutionStatusType } from '../../../types/plan';

// Mock fetch
global.fetch = vi.fn();

const mockExecutionSummary: PlanExecutionSummary = {
  planId: 'plan-1',
  totalAssignments: 10,
  completedAssignments: 7,
  inProgressAssignments: 2,
  cancelledAssignments: 1,
  noShowAssignments: 0,
  completionRate: 70,
  onTimeRate: 85,
  lastUpdated: new Date('2024-01-15T10:30:00Z')
};

const mockAlerts = {
  noShows: [
    {
      planId: 'plan-1',
      assignmentId: 'assignment-1',
      status: ExecutionStatusType.NO_SHOW,
      updatedAt: new Date('2024-01-15T09:00:00Z'),
      updatedBy: 'system',
      notes: 'Employee did not show up'
    }
  ],
  lateStarts: [
    {
      planId: 'plan-1',
      assignmentId: 'assignment-2',
      status: ExecutionStatusType.IN_PROGRESS,
      actualStartTime: new Date('2024-01-15T08:15:00Z'),
      updatedAt: new Date('2024-01-15T08:15:00Z'),
      updatedBy: 'system'
    }
  ],
  earlyEnds: [],
  coverageGaps: [
    {
      stationId: 'station-1',
      shiftTime: '08:00-16:00',
      severity: 'high' as const
    }
  ]
};

const mockCoverage = {
  totalDemands: 10,
  filledDemands: 8,
  coveragePercentage: 80,
  gaps: [
    {
      demandId: 'demand-1',
      stationName: 'Assembly Line 1',
      shiftTime: '08:00-16:00',
      criticality: 'high' as any,
      reason: 'Employee no-show',
      suggestedActions: ['Find replacement', 'Redistribute workload']
    }
  ],
  riskLevel: 'medium' as any
};

describe('ExecutionMonitoring', () => {
  const mockOnStatusUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockClear();
  });

  it('should render execution monitoring interface', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockExecutionSummary })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockAlerts })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockCoverage })
      });

    render(<ExecutionMonitoring planId="plan-1" onStatusUpdate={mockOnStatusUpdate} />);

    await waitFor(() => {
      expect(screen.getByText('Execution Monitoring')).toBeInTheDocument();
    });

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('Coverage')).toBeInTheDocument();
  });

  it('should display execution summary', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockExecutionSummary })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockAlerts })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockCoverage })
      });

    render(<ExecutionMonitoring planId="plan-1" />);

    await waitFor(() => {
      expect(screen.getByText('Total Assignments')).toBeInTheDocument();
    });

    expect(screen.getByText('10')).toBeInTheDocument(); // Total assignments
    expect(screen.getByText('70%')).toBeInTheDocument(); // Completion rate
    expect(screen.getByText('85%')).toBeInTheDocument(); // On-time rate
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('should display alerts with counts', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockExecutionSummary })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockAlerts })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockCoverage })
      });

    render(<ExecutionMonitoring planId="plan-1" />);

    await waitFor(() => {
      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });

    // Should show alert count badge
    const alertsTab = screen.getByText('Alerts');
    expect(alertsTab.parentElement).toHaveTextContent('3'); // 1 no-show + 1 late start + 1 coverage gap
  });

  it('should display no-show alerts', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockExecutionSummary })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockAlerts })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockCoverage })
      });

    render(<ExecutionMonitoring planId="plan-1" />);

    await waitFor(() => {
      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });

    const alertsTab = screen.getByText('Alerts');
    fireEvent.click(alertsTab);

    expect(screen.getByText('No Shows (1)')).toBeInTheDocument();
    expect(screen.getByText('Assignment assignment-1')).toBeInTheDocument();
    expect(screen.getByText('Notes: Employee did not show up')).toBeInTheDocument();
    expect(screen.getByText('Find Replacement')).toBeInTheDocument();
  });

  it('should display late start alerts', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockExecutionSummary })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockAlerts })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockCoverage })
      });

    render(<ExecutionMonitoring planId="plan-1" />);

    await waitFor(() => {
      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });

    const alertsTab = screen.getByText('Alerts');
    fireEvent.click(alertsTab);

    expect(screen.getByText('Late Starts (1)')).toBeInTheDocument();
    expect(screen.getByText('Assignment assignment-2')).toBeInTheDocument();
  });

  it('should display coverage gaps', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockExecutionSummary })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockAlerts })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockCoverage })
      });

    render(<ExecutionMonitoring planId="plan-1" />);

    await waitFor(() => {
      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });

    const alertsTab = screen.getByText('Alerts');
    fireEvent.click(alertsTab);

    expect(screen.getByText('Coverage Gaps (1)')).toBeInTheDocument();
    expect(screen.getByText('Station: station-1')).toBeInTheDocument();
    expect(screen.getByText('Severity: high')).toBeInTheDocument();
  });

  it('should display coverage information', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockExecutionSummary })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockAlerts })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockCoverage })
      });

    render(<ExecutionMonitoring planId="plan-1" />);

    await waitFor(() => {
      expect(screen.getByText('Coverage')).toBeInTheDocument();
    });

    const coverageTab = screen.getByText('Coverage');
    fireEvent.click(coverageTab);

    expect(screen.getByText('Overall Coverage')).toBeInTheDocument();
    expect(screen.getByText('80.0%')).toBeInTheDocument();
    expect(screen.getByText('Total Demands:')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Filled:')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument(); // Risk level
  });

  it('should display coverage gaps with suggested actions', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockExecutionSummary })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockAlerts })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockCoverage })
      });

    render(<ExecutionMonitoring planId="plan-1" />);

    await waitFor(() => {
      expect(screen.getByText('Coverage')).toBeInTheDocument();
    });

    const coverageTab = screen.getByText('Coverage');
    fireEvent.click(coverageTab);

    expect(screen.getByText('Coverage Gaps (1)')).toBeInTheDocument();
    expect(screen.getByText('Assembly Line 1')).toBeInTheDocument();
    expect(screen.getByText('08:00-16:00')).toBeInTheDocument();
    expect(screen.getByText('Employee no-show')).toBeInTheDocument();
    expect(screen.getByText('• Find replacement')).toBeInTheDocument();
    expect(screen.getByText('• Redistribute workload')).toBeInTheDocument();
  });

  it('should handle refresh button click', async () => {
    (fetch as any)
      .mockResolvedValue({
        json: async () => ({ success: true, data: mockExecutionSummary })
      })
      .mockResolvedValue({
        json: async () => ({ success: true, data: mockAlerts })
      })
      .mockResolvedValue({
        json: async () => ({ success: true, data: mockCoverage })
      });

    render(<ExecutionMonitoring planId="plan-1" />);

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    // Should make new API calls
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(6); // 3 initial + 3 refresh
    });
  });

  it('should show no alerts message when no alerts exist', async () => {
    const emptyAlerts = {
      noShows: [],
      lateStarts: [],
      earlyEnds: [],
      coverageGaps: []
    };

    (fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockExecutionSummary })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: emptyAlerts })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockCoverage })
      });

    render(<ExecutionMonitoring planId="plan-1" />);

    await waitFor(() => {
      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });

    const alertsTab = screen.getByText('Alerts');
    fireEvent.click(alertsTab);

    expect(screen.getByText('No alerts at this time')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({ success: false, error: { message: 'Plan not found' } })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockAlerts })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockCoverage })
      });

    render(<ExecutionMonitoring planId="plan-1" />);

    await waitFor(() => {
      expect(screen.getByText('⚠️ Failed to load execution data')).toBeInTheDocument();
    });
  });

  it('should show loading state initially', () => {
    (fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ExecutionMonitoring planId="plan-1" />);

    expect(screen.getByText('Loading execution data...')).toBeInTheDocument();
  });

  it('should format time correctly', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockExecutionSummary })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockAlerts })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockCoverage })
      });

    render(<ExecutionMonitoring planId="plan-1" />);

    await waitFor(() => {
      expect(screen.getByText('Last updated: 10:30')).toBeInTheDocument();
    });
  });

  it('should handle last-minute change actions', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockExecutionSummary })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockAlerts })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockCoverage })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: {} })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockExecutionSummary })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockAlerts })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockCoverage })
      });

    render(<ExecutionMonitoring planId="plan-1" />);

    await waitFor(() => {
      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });

    const alertsTab = screen.getByText('Alerts');
    fireEvent.click(alertsTab);

    const findReplacementButton = screen.getByText('Find Replacement');
    fireEvent.click(findReplacementButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/execution-monitoring/last-minute-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignmentId: 'assignment-1',
          changeType: 'replace'
        })
      });
    });
  });
});
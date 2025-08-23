// Tests for PlanApproval component

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlanApproval } from '../PlanApproval';
import { PlanReviewData, PlanStatus } from '../../../types/plan';
import type { AssignmentStatus } from '../../../types';

// Mock fetch
global.fetch = vi.fn();

const mockPlanReviewData: PlanReviewData = {
  plan: {
    id: 'plan-1',
    name: 'Test Plan',
    status: PlanStatus.PENDING_APPROVAL,
    assignments: [
      {
        id: 'assignment-1',
        demandId: 'demand-1',
        employeeId: 'employee-1',
        status: 'proposed' as AssignmentStatus,
        score: 85,
        explanation: 'Good skill match',
        createdAt: new Date(),
        createdBy: 'system'
      },
      {
        id: 'assignment-2',
        demandId: 'demand-2',
        employeeId: 'employee-2',
        status: 'proposed' as AssignmentStatus,
        score: 70,
        explanation: 'Adequate skill match',
        createdAt: new Date(),
        createdBy: 'system'
      }
    ],
    coverageStatus: {
      stationId: 'station-1',
      shiftId: 'shift-1',
      required: 2,
      assigned: 2,
      coverage: 100,
      status: 'adequate' as any,
      gaps: []
    },
    violations: [],
    dateRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-07')
    },
    createdAt: new Date(),
    createdBy: 'planner-1',
    updatedAt: new Date()
  },
  impactAnalysis: {
    affectedEmployees: ['employee-1', 'employee-2'],
    affectedStations: ['station-1'],
    riskAssessment: 'Low',
    recommendations: ['Review coverage gaps', 'Monitor execution']
  }
};

describe('PlanApproval', () => {
  const mockOnApprove = vi.fn();
  const mockOnReject = vi.fn();
  const mockOnCommit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockClear();
  });

  it('should render plan approval interface', async () => {
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockPlanReviewData })
    });

    render(
      <PlanApproval
        planId="plan-1"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        onCommit={mockOnCommit}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Plan Review: Test Plan')).toBeInTheDocument();
    });

    expect(screen.getByText('PENDING_APPROVAL')).toBeInTheDocument();
    expect(screen.getByText('Assignments (2)')).toBeInTheDocument();
    expect(screen.getByText('Impact Analysis')).toBeInTheDocument();
  });

  it('should display assignment details', async () => {
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockPlanReviewData })
    });

    render(<PlanApproval planId="plan-1" />);

    await waitFor(() => {
      expect(screen.getByText('Assignment assignment-1')).toBeInTheDocument();
    });

    expect(screen.getByText('Employee: employee-1')).toBeInTheDocument();
    expect(screen.getByText('Score: 85')).toBeInTheDocument();
    expect(screen.getByText('Good skill match')).toBeInTheDocument();
  });

  it('should allow toggling assignment approval status', async () => {
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockPlanReviewData })
    });

    render(<PlanApproval planId="plan-1" />);

    await waitFor(() => {
      expect(screen.getByText('Assignment assignment-1')).toBeInTheDocument();
    });

    const approveButtons = screen.getAllByText('Approve');
    const rejectButtons = screen.getAllByText('Reject');

    // Initially all assignments should be approved (default)
    expect(approveButtons[0]).toHaveClass('active');
    expect(rejectButtons[0]).not.toHaveClass('active');

    // Click reject button
    fireEvent.click(rejectButtons[0]);

    expect(rejectButtons[0]).toHaveClass('active');
    expect(approveButtons[0]).not.toHaveClass('active');
  });

  it('should submit approval request', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockPlanReviewData })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: { ...mockPlanReviewData.plan, status: PlanStatus.APPROVED } })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockPlanReviewData })
      });

    render(<PlanApproval planId="plan-1" onApprove={mockOnApprove} />);

    await waitFor(() => {
      expect(screen.getByText('Approve Selected (2)')).toBeInTheDocument();
    });

    const approveButton = screen.getByText('Approve Selected (2)');
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/plan-approval/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: 'plan-1',
          assignmentIds: ['assignment-1', 'assignment-2'],
          rejectedAssignmentIds: [],
          comments: '',
          approvedBy: 'current-user'
        })
      });
    });

    expect(mockOnApprove).toHaveBeenCalledWith('plan-1', ['assignment-1', 'assignment-2']);
  });

  it('should submit rejection request', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockPlanReviewData })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: { ...mockPlanReviewData.plan, status: PlanStatus.REJECTED } })
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockPlanReviewData })
      });

    render(<PlanApproval planId="plan-1" onReject={mockOnReject} />);

    await waitFor(() => {
      expect(screen.getByText('Reject Plan')).toBeInTheDocument();
    });

    const rejectButton = screen.getByText('Reject Plan');
    fireEvent.click(rejectButton);

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByText('Reject Plan')).toBeInTheDocument();
    });

    const reasonTextarea = screen.getByPlaceholderText('Reason for rejection (optional)');
    fireEvent.change(reasonTextarea, { target: { value: 'Not suitable for current needs' } });

    const confirmRejectButton = screen.getAllByText('Reject Plan')[1]; // Second one is in modal
    fireEvent.click(confirmRejectButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/plan-approval/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: 'plan-1',
          rejectedBy: 'current-user',
          reason: 'Not suitable for current needs'
        })
      });
    });

    expect(mockOnReject).toHaveBeenCalledWith('plan-1', 'Not suitable for current needs');
  });

  it('should display impact analysis', async () => {
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, data: mockPlanReviewData })
    });

    render(<PlanApproval planId="plan-1" />);

    await waitFor(() => {
      expect(screen.getByText('Impact Analysis')).toBeInTheDocument();
    });

    const impactTab = screen.getByText('Impact Analysis');
    fireEvent.click(impactTab);

    expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
    expect(screen.getByText('Low Risk')).toBeInTheDocument();
    expect(screen.getByText('Employees:')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Review coverage gaps')).toBeInTheDocument();
  });

  it('should show commit button for approved plans', async () => {
    const approvedPlanData = {
      ...mockPlanReviewData,
      plan: { ...mockPlanReviewData.plan, status: PlanStatus.APPROVED }
    };

    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, data: approvedPlanData })
    });

    render(<PlanApproval planId="plan-1" onCommit={mockOnCommit} />);

    await waitFor(() => {
      expect(screen.getByText('Commit Plan (2 assignments)')).toBeInTheDocument();
    });

    // Approve and reject buttons should be disabled
    const approveButtons = screen.getAllByText('Approve');
    expect(approveButtons[0]).toBeDisabled();
  });

  it('should handle API errors gracefully', async () => {
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: false, error: { message: 'Plan not found' } })
    });

    render(<PlanApproval planId="plan-1" />);

    await waitFor(() => {
      expect(screen.getByText('Error: Plan not found')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    (fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<PlanApproval planId="plan-1" />);

    expect(screen.getByText('Loading plan review data...')).toBeInTheDocument();
  });

  it('should display plan diff when available', async () => {
    const planDataWithDiff = {
      ...mockPlanReviewData,
      diff: {
        planId: 'plan-1',
        comparedWith: 'plan-0',
        assignmentDiffs: [
          {
            assignmentId: 'assignment-1',
            type: 'added' as const,
            current: mockPlanReviewData.plan.assignments[0]
          }
        ],
        coverageChanges: {
          totalDemands: { old: 1, new: 2 },
          filledDemands: { old: 1, new: 2 },
          coveragePercentage: { old: 50, new: 100 }
        },
        summary: {
          addedAssignments: 1,
          removedAssignments: 0,
          modifiedAssignments: 0
        }
      }
    };

    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, data: planDataWithDiff })
    });

    render(<PlanApproval planId="plan-1" />);

    await waitFor(() => {
      expect(screen.getByText('Changes (1)')).toBeInTheDocument();
    });

    const changesTab = screen.getByText('Changes (1)');
    fireEvent.click(changesTab);

    expect(screen.getByText('+1 Added')).toBeInTheDocument();
    expect(screen.getByText('ADDED')).toBeInTheDocument();
  });
});
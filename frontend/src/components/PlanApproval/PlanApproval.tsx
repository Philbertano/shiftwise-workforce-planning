// Plan approval component for reviewing and approving shift plans

import React, { useState, useEffect } from 'react';
import { Plan, PlanDiff, PlanReviewData, AssignmentDiff } from '../../types/plan';
import { Assignment } from '../../types';
import './PlanApproval.css';

interface PlanApprovalProps {
  planId: string;
  onApprove?: (planId: string, assignmentIds?: string[]) => void;
  onReject?: (planId: string, reason?: string) => void;
  onCommit?: (planId: string, assignmentIds?: string[]) => void;
}

export const PlanApproval: React.FC<PlanApprovalProps> = ({
  planId,
  onApprove,
  onReject,
  onCommit
}) => {
  const [reviewData, setReviewData] = useState<PlanReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(new Set());
  const [rejectedAssignments, setRejectedAssignments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'assignments' | 'diff' | 'impact'>('assignments');

  useEffect(() => {
    loadPlanReviewData();
  }, [planId]);

  const loadPlanReviewData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/plan-approval/${planId}/review`);
      const result = await response.json();
      
      if (result.success) {
        setReviewData(result.data);
        // Initialize all assignments as selected by default
        const allAssignmentIds = new Set<string>(result.data.plan.assignments.map((a: Assignment) => String(a.id)));
        setSelectedAssignments(allAssignmentIds);
      } else {
        setError(result.error?.message || 'Failed to load plan review data');
      }
    } catch (err) {
      setError('Failed to load plan review data');
      console.error('Error loading plan review data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentToggle = (assignmentId: string, action: 'approve' | 'reject') => {
    if (action === 'approve') {
      setSelectedAssignments(prev => {
        const newSet = new Set(prev);
        newSet.add(assignmentId);
        return newSet;
      });
      setRejectedAssignments(prev => {
        const newSet = new Set(prev);
        newSet.delete(assignmentId);
        return newSet;
      });
    } else {
      setRejectedAssignments(prev => {
        const newSet = new Set(prev);
        newSet.add(assignmentId);
        return newSet;
      });
      setSelectedAssignments(prev => {
        const newSet = new Set(prev);
        newSet.delete(assignmentId);
        return newSet;
      });
    }
  };

  const handleApprove = async () => {
    if (!reviewData) return;

    try {
      const response = await fetch('/api/plan-approval/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          assignmentIds: Array.from(selectedAssignments),
          rejectedAssignmentIds: Array.from(rejectedAssignments),
          comments,
          approvedBy: 'current-user' // Would come from auth context
        }),
      });

      const result = await response.json();
      if (result.success) {
        onApprove?.(planId, Array.from(selectedAssignments));
        await loadPlanReviewData(); // Refresh data
      } else {
        setError(result.error?.message || 'Failed to approve plan');
      }
    } catch (err) {
      setError('Failed to approve plan');
      console.error('Error approving plan:', err);
    }
  };

  const handleReject = async () => {
    try {
      const response = await fetch('/api/plan-approval/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          rejectedBy: 'current-user', // Would come from auth context
          reason: rejectReason
        }),
      });

      const result = await response.json();
      if (result.success) {
        onReject?.(planId, rejectReason);
        setShowRejectDialog(false);
        await loadPlanReviewData(); // Refresh data
      } else {
        setError(result.error?.message || 'Failed to reject plan');
      }
    } catch (err) {
      setError('Failed to reject plan');
      console.error('Error rejecting plan:', err);
    }
  };

  const handleCommit = async () => {
    if (!reviewData) return;

    try {
      const response = await fetch('/api/plan-approval/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          assignmentIds: Array.from(selectedAssignments),
          committedBy: 'current-user' // Would come from auth context
        }),
      });

      const result = await response.json();
      if (result.success) {
        onCommit?.(planId, Array.from(selectedAssignments));
        await loadPlanReviewData(); // Refresh data
      } else {
        setError(result.error?.message || 'Failed to commit plan');
      }
    } catch (err) {
      setError('Failed to commit plan');
      console.error('Error committing plan:', err);
    }
  };

  const getAssignmentStatus = (assignmentId: string): 'approved' | 'rejected' | 'pending' => {
    if (selectedAssignments.has(assignmentId)) return 'approved';
    if (rejectedAssignments.has(assignmentId)) return 'rejected';
    return 'pending';
  };

  const getDiffTypeColor = (type: AssignmentDiff['type']): string => {
    switch (type) {
      case 'added': return 'diff-added';
      case 'removed': return 'diff-removed';
      case 'modified': return 'diff-modified';
      default: return '';
    }
  };

  if (loading) {
    return <div className="plan-approval-loading">Loading plan review data...</div>;
  }

  if (error) {
    return <div className="plan-approval-error">Error: {error}</div>;
  }

  if (!reviewData) {
    return <div className="plan-approval-error">No plan data available</div>;
  }

  const { plan, diff, impactAnalysis } = reviewData;
  const canApprove = plan.status === 'draft' || plan.status === 'pending_approval';
  const canCommit = plan.status === 'approved' || plan.status === 'partially_approved';

  return (
    <div className="plan-approval">
      <div className="plan-approval-header">
        <h2>Plan Review: {plan.name || plan.id}</h2>
        <div className="plan-status">
          <span className={`status-badge status-${plan.status}`}>
            {plan.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      <div className="plan-approval-tabs">
        <button
          className={`tab ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          Assignments ({plan.assignments.length})
        </button>
        {diff && (
          <button
            className={`tab ${activeTab === 'diff' ? 'active' : ''}`}
            onClick={() => setActiveTab('diff')}
          >
            Changes ({diff.summary.addedAssignments + diff.summary.modifiedAssignments + diff.summary.removedAssignments})
          </button>
        )}
        <button
          className={`tab ${activeTab === 'impact' ? 'active' : ''}`}
          onClick={() => setActiveTab('impact')}
        >
          Impact Analysis
        </button>
      </div>

      <div className="plan-approval-content">
        {activeTab === 'assignments' && (
          <div className="assignments-tab">
            <div className="assignments-summary">
              <div className="summary-item">
                <span className="label">Total Assignments:</span>
                <span className="value">{plan.assignments.length}</span>
              </div>
              <div className="summary-item">
                <span className="label">Coverage:</span>
                <span className="value">{plan.coverageStatus.coverage.toFixed(1)}%</span>
              </div>
              <div className="summary-item">
                <span className="label">Violations:</span>
                <span className="value">{plan.violations.length}</span>
              </div>
            </div>

            <div className="assignments-list">
              {plan.assignments.map((assignment) => {
                const status = getAssignmentStatus(assignment.id);
                return (
                  <div key={assignment.id} className={`assignment-item status-${status}`}>
                    <div className="assignment-info">
                      <div className="assignment-id">Assignment {assignment.id}</div>
                      <div className="assignment-details">
                        <span>Employee: {assignment.employeeId}</span>
                        <span>Score: {assignment.score}</span>
                        <span>Status: {assignment.status}</span>
                      </div>
                      {assignment.explanation && (
                        <div className="assignment-explanation">{assignment.explanation}</div>
                      )}
                    </div>
                    <div className="assignment-actions">
                      <button
                        className={`action-btn approve ${status === 'approved' ? 'active' : ''}`}
                        onClick={() => handleAssignmentToggle(assignment.id, 'approve')}
                        disabled={!canApprove}
                      >
                        Approve
                      </button>
                      <button
                        className={`action-btn reject ${status === 'rejected' ? 'active' : ''}`}
                        onClick={() => handleAssignmentToggle(assignment.id, 'reject')}
                        disabled={!canApprove}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'diff' && diff && (
          <div className="diff-tab">
            <div className="diff-summary">
              <div className="diff-stats">
                <span className="diff-stat added">+{diff.summary.addedAssignments} Added</span>
                <span className="diff-stat modified">~{diff.summary.modifiedAssignments} Modified</span>
                <span className="diff-stat removed">-{diff.summary.removedAssignments} Removed</span>
              </div>
            </div>

            <div className="diff-list">
              {diff.assignmentDiffs.map((assignmentDiff) => (
                <div key={assignmentDiff.assignmentId} className={`diff-item ${getDiffTypeColor(assignmentDiff.type)}`}>
                  <div className="diff-header">
                    <span className="diff-type">{assignmentDiff.type.toUpperCase()}</span>
                    <span className="assignment-id">Assignment {assignmentDiff.assignmentId}</span>
                  </div>
                  
                  {assignmentDiff.changes && (
                    <div className="diff-changes">
                      {assignmentDiff.changes.map((change, index) => (
                        <div key={index} className="change-item">
                          <span className="field">{change.field}:</span>
                          <span className="old-value">{String(change.oldValue)}</span>
                          <span className="arrow">→</span>
                          <span className="new-value">{String(change.newValue)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'impact' && (
          <div className="impact-tab">
            <div className="impact-section">
              <h3>Risk Assessment</h3>
              <div className={`risk-level risk-${impactAnalysis.riskAssessment.toLowerCase()}`}>
                {impactAnalysis.riskAssessment} Risk
              </div>
            </div>

            <div className="impact-section">
              <h3>Affected Resources</h3>
              <div className="affected-resources">
                <div className="resource-group">
                  <span className="resource-label">Employees:</span>
                  <span className="resource-count">{impactAnalysis.affectedEmployees.length}</span>
                </div>
                <div className="resource-group">
                  <span className="resource-label">Stations:</span>
                  <span className="resource-count">{impactAnalysis.affectedStations.length}</span>
                </div>
              </div>
            </div>

            <div className="impact-section">
              <h3>Recommendations</h3>
              <ul className="recommendations-list">
                {impactAnalysis.recommendations.map((recommendation, index) => (
                  <li key={index}>{recommendation}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="plan-approval-actions">
        <div className="comments-section">
          <textarea
            placeholder="Add comments (optional)"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            disabled={!canApprove}
          />
        </div>

        <div className="action-buttons">
          {canApprove && (
            <>
              <button
                className="btn btn-primary"
                onClick={handleApprove}
                disabled={selectedAssignments.size === 0}
              >
                Approve Selected ({selectedAssignments.size})
              </button>
              <button
                className="btn btn-danger"
                onClick={() => setShowRejectDialog(true)}
              >
                Reject Plan
              </button>
            </>
          )}
          
          {canCommit && (
            <button
              className="btn btn-success"
              onClick={handleCommit}
              disabled={selectedAssignments.size === 0}
            >
              Commit Plan ({selectedAssignments.size} assignments)
            </button>
          )}
        </div>
      </div>

      {showRejectDialog && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Reject Plan</h3>
            <textarea
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleReject}>
                Reject Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
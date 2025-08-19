// Execution monitoring component for tracking assignment execution

import React, { useState, useEffect } from 'react';
import { ExecutionStatus, ExecutionStatusType, PlanExecutionSummary } from '../../types/plan';
import './ExecutionMonitoring.css';

interface ExecutionMonitoringProps {
  planId: string;
  onStatusUpdate?: (assignmentId: string, status: ExecutionStatusType) => void;
}

export const ExecutionMonitoring: React.FC<ExecutionMonitoringProps> = ({
  planId,
  onStatusUpdate
}) => {
  const [summary, setSummary] = useState<PlanExecutionSummary | null>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [coverage, setCoverage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'alerts' | 'coverage'>('summary');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadExecutionData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadExecutionData, 30000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [planId]);

  const loadExecutionData = async () => {
    try {
      setLoading(true);
      
      // Load all execution data in parallel
      const [summaryResponse, alertsResponse, coverageResponse] = await Promise.all([
        fetch(`/api/execution-monitoring/plan/${planId}/summary`),
        fetch(`/api/execution-monitoring/plan/${planId}/alerts`),
        fetch(`/api/execution-monitoring/plan/${planId}/coverage`)
      ]);

      const [summaryResult, alertsResult, coverageResult] = await Promise.all([
        summaryResponse.json(),
        alertsResponse.json(),
        coverageResponse.json()
      ]);

      if (summaryResult.success) {
        setSummary(summaryResult.data);
      }
      
      if (alertsResult.success) {
        setAlerts(alertsResult.data);
      }
      
      if (coverageResult.success) {
        setCoverage(coverageResult.data);
      }

      setError(null);
    } catch (err) {
      setError('Failed to load execution data');
      console.error('Error loading execution data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (
    assignmentId: string, 
    status: ExecutionStatusType,
    options?: {
      notes?: string;
      actualStartTime?: Date;
      actualEndTime?: Date;
    }
  ) => {
    try {
      const response = await fetch('/api/execution-monitoring/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignmentId,
          status,
          notes: options?.notes,
          actualStartTime: options?.actualStartTime?.toISOString(),
          actualEndTime: options?.actualEndTime?.toISOString()
        }),
      });

      const result = await response.json();
      if (result.success) {
        onStatusUpdate?.(assignmentId, status);
        await loadExecutionData(); // Refresh data
      } else {
        setError(result.error?.message || 'Failed to update status');
      }
    } catch (err) {
      setError('Failed to update status');
      console.error('Error updating status:', err);
    }
  };

  const handleLastMinuteChange = async (
    assignmentId: string,
    changeType: 'cancel' | 'modify' | 'replace',
    options?: {
      reason?: string;
      replacementEmployeeId?: string;
    }
  ) => {
    try {
      const response = await fetch('/api/execution-monitoring/last-minute-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignmentId,
          changeType,
          reason: options?.reason,
          replacementEmployeeId: options?.replacementEmployeeId
        }),
      });

      const result = await response.json();
      if (result.success) {
        await loadExecutionData(); // Refresh data
      } else {
        setError(result.error?.message || 'Failed to handle change');
      }
    } catch (err) {
      setError('Failed to handle change');
      console.error('Error handling change:', err);
    }
  };

  const getStatusColor = (status: ExecutionStatusType): string => {
    switch (status) {
      case ExecutionStatusType.SCHEDULED: return 'status-scheduled';
      case ExecutionStatusType.IN_PROGRESS: return 'status-in-progress';
      case ExecutionStatusType.COMPLETED: return 'status-completed';
      case ExecutionStatusType.NO_SHOW: return 'status-no-show';
      case ExecutionStatusType.CANCELLED: return 'status-cancelled';
      case ExecutionStatusType.MODIFIED: return 'status-modified';
      default: return '';
    }
  };

  const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  };

  if (loading && !summary) {
    return <div className="execution-monitoring-loading">Loading execution data...</div>;
  }

  if (error && !summary) {
    return <div className="execution-monitoring-error">Error: {error}</div>;
  }

  return (
    <div className="execution-monitoring">
      <div className="execution-monitoring-header">
        <h2>Execution Monitoring</h2>
        <div className="header-actions">
          <button className="refresh-btn" onClick={loadExecutionData} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <div className="last-updated">
            Last updated: {summary?.lastUpdated ? formatTime(new Date(summary.lastUpdated)) : 'Never'}
          </div>
        </div>
      </div>

      <div className="execution-monitoring-tabs">
        <button
          className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button
          className={`tab ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          Alerts {alerts && (alerts.noShows.length + alerts.lateStarts.length + alerts.earlyEnds.length) > 0 && 
            <span className="alert-count">
              {alerts.noShows.length + alerts.lateStarts.length + alerts.earlyEnds.length}
            </span>
          }
        </button>
        <button
          className={`tab ${activeTab === 'coverage' ? 'active' : ''}`}
          onClick={() => setActiveTab('coverage')}
        >
          Coverage
        </button>
      </div>

      <div className="execution-monitoring-content">
        {activeTab === 'summary' && summary && (
          <div className="summary-tab">
            <div className="summary-cards">
              <div className="summary-card">
                <div className="card-header">
                  <h3>Total Assignments</h3>
                </div>
                <div className="card-value">{summary.totalAssignments}</div>
              </div>

              <div className="summary-card">
                <div className="card-header">
                  <h3>Completion Rate</h3>
                </div>
                <div className="card-value">{summary.completionRate}%</div>
                <div className="card-progress">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${summary.completionRate}%` }}
                  ></div>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-header">
                  <h3>On-Time Rate</h3>
                </div>
                <div className="card-value">{summary.onTimeRate}%</div>
                <div className="card-progress">
                  <div 
                    className="progress-bar on-time" 
                    style={{ width: `${summary.onTimeRate}%` }}
                  ></div>
                </div>
              </div>

              <div className="summary-card">
                <div className="card-header">
                  <h3>In Progress</h3>
                </div>
                <div className="card-value">{summary.inProgressAssignments}</div>
              </div>

              <div className="summary-card">
                <div className="card-header">
                  <h3>No Shows</h3>
                </div>
                <div className="card-value alert">{summary.noShowAssignments}</div>
              </div>

              <div className="summary-card">
                <div className="card-header">
                  <h3>Cancelled</h3>
                </div>
                <div className="card-value warning">{summary.cancelledAssignments}</div>
              </div>
            </div>

            <div className="status-breakdown">
              <h3>Status Breakdown</h3>
              <div className="status-list">
                <div className="status-item">
                  <span className="status-label">Completed</span>
                  <span className="status-count completed">{summary.completedAssignments}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">In Progress</span>
                  <span className="status-count in-progress">{summary.inProgressAssignments}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">No Shows</span>
                  <span className="status-count no-show">{summary.noShowAssignments}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Cancelled</span>
                  <span className="status-count cancelled">{summary.cancelledAssignments}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && alerts && (
          <div className="alerts-tab">
            {alerts.noShows.length > 0 && (
              <div className="alert-section">
                <h3 className="alert-title no-show">No Shows ({alerts.noShows.length})</h3>
                <div className="alert-list">
                  {alerts.noShows.map((alert: ExecutionStatus) => (
                    <div key={alert.assignmentId} className="alert-item no-show">
                      <div className="alert-info">
                        <div className="assignment-id">Assignment {alert.assignmentId}</div>
                        <div className="alert-details">
                          <span>Updated: {formatTime(new Date(alert.updatedAt))}</span>
                          {alert.notes && <span>Notes: {alert.notes}</span>}
                        </div>
                      </div>
                      <div className="alert-actions">
                        <button 
                          className="action-btn"
                          onClick={() => handleLastMinuteChange(alert.assignmentId, 'replace')}
                        >
                          Find Replacement
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alerts.lateStarts.length > 0 && (
              <div className="alert-section">
                <h3 className="alert-title late">Late Starts ({alerts.lateStarts.length})</h3>
                <div className="alert-list">
                  {alerts.lateStarts.map((alert: ExecutionStatus) => (
                    <div key={alert.assignmentId} className="alert-item late">
                      <div className="alert-info">
                        <div className="assignment-id">Assignment {alert.assignmentId}</div>
                        <div className="alert-details">
                          <span>Started: {alert.actualStartTime ? formatTime(new Date(alert.actualStartTime)) : 'Unknown'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alerts.earlyEnds.length > 0 && (
              <div className="alert-section">
                <h3 className="alert-title early">Early Ends ({alerts.earlyEnds.length})</h3>
                <div className="alert-list">
                  {alerts.earlyEnds.map((alert: ExecutionStatus) => (
                    <div key={alert.assignmentId} className="alert-item early">
                      <div className="alert-info">
                        <div className="assignment-id">Assignment {alert.assignmentId}</div>
                        <div className="alert-details">
                          <span>Ended: {alert.actualEndTime ? formatTime(new Date(alert.actualEndTime)) : 'Unknown'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alerts.coverageGaps.length > 0 && (
              <div className="alert-section">
                <h3 className="alert-title gap">Coverage Gaps ({alerts.coverageGaps.length})</h3>
                <div className="alert-list">
                  {alerts.coverageGaps.map((gap: any, index: number) => (
                    <div key={index} className={`alert-item gap severity-${gap.severity}`}>
                      <div className="alert-info">
                        <div className="station-info">Station: {gap.stationId}</div>
                        <div className="shift-info">Shift: {gap.shiftTime}</div>
                        <div className="severity">Severity: {gap.severity}</div>
                      </div>
                      <div className="alert-actions">
                        <button className="action-btn">Trigger Re-planning</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alerts.noShows.length === 0 && alerts.lateStarts.length === 0 && 
             alerts.earlyEnds.length === 0 && alerts.coverageGaps.length === 0 && (
              <div className="no-alerts">
                <div className="no-alerts-icon">✓</div>
                <div className="no-alerts-message">No alerts at this time</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'coverage' && coverage && (
          <div className="coverage-tab">
            <div className="coverage-summary">
              <div className="coverage-metric">
                <div className="metric-label">Overall Coverage</div>
                <div className="metric-value">{coverage.coveragePercentage.toFixed(1)}%</div>
                <div className="coverage-bar">
                  <div 
                    className="coverage-fill" 
                    style={{ width: `${coverage.coveragePercentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="coverage-stats">
                <div className="stat">
                  <span className="stat-label">Total Demands:</span>
                  <span className="stat-value">{coverage.totalDemands}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Filled:</span>
                  <span className="stat-value">{coverage.filledDemands}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Risk Level:</span>
                  <span className={`stat-value risk-${coverage.riskLevel}`}>
                    {coverage.riskLevel.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {coverage.gaps.length > 0 && (
              <div className="coverage-gaps">
                <h3>Coverage Gaps ({coverage.gaps.length})</h3>
                <div className="gaps-list">
                  {coverage.gaps.map((gap: any, index: number) => (
                    <div key={index} className="gap-item">
                      <div className="gap-info">
                        <div className="gap-station">{gap.stationName}</div>
                        <div className="gap-time">{gap.shiftTime}</div>
                        <div className="gap-reason">{gap.reason}</div>
                      </div>
                      <div className="gap-actions">
                        <div className="suggested-actions">
                          {gap.suggestedActions.map((action: string, actionIndex: number) => (
                            <div key={actionIndex} className="suggested-action">
                              • {action}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
    </div>
  );
};
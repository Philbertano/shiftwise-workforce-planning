import React from 'react'
import { ExecutionMonitoring } from '../components/ExecutionMonitoring/ExecutionMonitoring'
import { ExecutionStatusType } from '../types/plan'

export const MonitoringPage: React.FC = () => {
  const handleStatusUpdate = (assignmentId: string, status: ExecutionStatusType) => {
    console.log('Updating assignment status:', assignmentId, status)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Execution Monitoring</h1>
        <p>Monitor shift execution and real-time status updates</p>
      </div>
      <div className="page-content">
        <ExecutionMonitoring 
          planId="plan-demo-1"
          onStatusUpdate={handleStatusUpdate}
        />
      </div>
    </div>
  )
}
import React from 'react'
import { PlanApproval } from '../components/PlanApproval/PlanApproval'

export const ApprovalPage: React.FC = () => {
  const handleApprove = (planId: string, assignmentIds?: string[]) => {
    console.log('Approving plan:', planId, assignmentIds)
  }

  const handleReject = (planId: string, reason?: string) => {
    console.log('Rejecting plan:', planId, reason)
  }

  const handleCommit = (planId: string, assignmentIds?: string[]) => {
    console.log('Committing plan:', planId, assignmentIds)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Production Plan Approval</h1>
        <p>Review and approve manufacturing shift planning proposals</p>
      </div>
      <div className="page-content">
        <PlanApproval 
          planId="plan-demo-1"
          onApprove={handleApprove}
          onReject={handleReject}
          onCommit={handleCommit}
        />
      </div>
    </div>
  )
}
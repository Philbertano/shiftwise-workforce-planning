import React, { useState } from 'react'
import { AssignmentConflict, ConflictResolution } from '../../services/planningPersistenceService'
import { Assignment } from '../../types'
import './ConflictResolutionModal.css'

interface ConflictResolutionModalProps {
  conflict: AssignmentConflict
  localAssignment?: Assignment
  remoteAssignment?: Assignment
  onResolve: (resolution: ConflictResolution) => void
  onCancel: () => void
  isVisible: boolean
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  conflict,
  localAssignment,
  remoteAssignment,
  onResolve,
  onCancel,
  isVisible
}) => {
  const [selectedResolution, setSelectedResolution] = useState<ConflictResolution['action']>('accept_local')
  const [isResolving, setIsResolving] = useState(false)

  if (!isVisible) return null

  const handleResolve = async () => {
    setIsResolving(true)
    try {
      const resolution: ConflictResolution = {
        action: selectedResolution,
        resolvedAssignment: selectedResolution === 'accept_local' ? localAssignment : remoteAssignment
      }
      await onResolve(resolution)
    } finally {
      setIsResolving(false)
    }
  }

  const getConflictTypeDescription = (type: AssignmentConflict['type']) => {
    switch (type) {
      case 'double_booking':
        return 'Employee is already assigned to another station at this time'
      case 'skill_mismatch':
        return 'Employee does not have the required skills for this assignment'
      case 'capacity_exceeded':
        return 'Station capacity has been exceeded'
      case 'concurrent_modification':
        return 'This assignment was modified by another user'
      default:
        return 'An assignment conflict has occurred'
    }
  }

  const formatAssignmentDetails = (assignment: Assignment | undefined) => {
    if (!assignment) return 'No assignment data'
    
    return (
      <div className="assignment-details">
        <div><strong>Employee:</strong> {assignment.employeeId}</div>
        <div><strong>Station:</strong> {assignment.demandId}</div>
        <div><strong>Status:</strong> {assignment.status}</div>
        <div><strong>Score:</strong> {assignment.score}</div>
        <div><strong>Created:</strong> {new Date(assignment.createdAt).toLocaleString()}</div>
      </div>
    )
  }

  return (
    <div className="conflict-resolution-overlay">
      <div className="conflict-resolution-modal">
        <div className="modal-header">
          <h2>Assignment Conflict Detected</h2>
          <button 
            className="close-button" 
            onClick={onCancel}
            disabled={isResolving}
          >
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="conflict-description">
            <div className="conflict-type">
              <strong>Conflict Type:</strong> {conflict.type.replace('_', ' ').toUpperCase()}
            </div>
            <div className="conflict-message">
              {conflict.message || getConflictTypeDescription(conflict.type)}
            </div>
          </div>

          {(localAssignment || remoteAssignment) && (
            <div className="conflict-comparison">
              <div className="assignment-comparison">
                <div className="local-assignment">
                  <h3>Your Changes</h3>
                  {formatAssignmentDetails(localAssignment)}
                </div>
                
                <div className="remote-assignment">
                  <h3>Other User's Changes</h3>
                  {formatAssignmentDetails(remoteAssignment)}
                </div>
              </div>
            </div>
          )}

          <div className="resolution-options">
            <h3>How would you like to resolve this conflict?</h3>
            
            <div className="resolution-choice">
              <label>
                <input
                  type="radio"
                  name="resolution"
                  value="accept_local"
                  checked={selectedResolution === 'accept_local'}
                  onChange={(e) => setSelectedResolution(e.target.value as ConflictResolution['action'])}
                  disabled={isResolving}
                />
                <span>Keep my changes</span>
                <small>Your local changes will be saved and override the conflicting assignment</small>
              </label>
            </div>

            <div className="resolution-choice">
              <label>
                <input
                  type="radio"
                  name="resolution"
                  value="accept_remote"
                  checked={selectedResolution === 'accept_remote'}
                  onChange={(e) => setSelectedResolution(e.target.value as ConflictResolution['action'])}
                  disabled={isResolving}
                />
                <span>Accept other user's changes</span>
                <small>The other user's changes will be kept and your changes will be discarded</small>
              </label>
            </div>

            {conflict.type === 'concurrent_modification' && (
              <div className="resolution-choice">
                <label>
                  <input
                    type="radio"
                    name="resolution"
                    value="merge"
                    checked={selectedResolution === 'merge'}
                    onChange={(e) => setSelectedResolution(e.target.value as ConflictResolution['action'])}
                    disabled={isResolving}
                  />
                  <span>Merge changes (if possible)</span>
                  <small>Attempt to combine both sets of changes automatically</small>
                </label>
              </div>
            )}

            <div className="resolution-choice">
              <label>
                <input
                  type="radio"
                  name="resolution"
                  value="manual"
                  checked={selectedResolution === 'manual'}
                  onChange={(e) => setSelectedResolution(e.target.value as ConflictResolution['action'])}
                  disabled={isResolving}
                />
                <span>Resolve manually</span>
                <small>I'll fix this conflict myself by making new assignments</small>
              </label>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button 
            className="cancel-button" 
            onClick={onCancel}
            disabled={isResolving}
          >
            Cancel
          </button>
          <button 
            className="resolve-button" 
            onClick={handleResolve}
            disabled={isResolving}
          >
            {isResolving ? 'Resolving...' : 'Resolve Conflict'}
          </button>
        </div>
      </div>
    </div>
  )
}
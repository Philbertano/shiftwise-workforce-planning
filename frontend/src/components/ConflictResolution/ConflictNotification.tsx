import React from 'react'
import { AssignmentConflict } from '../../services/planningPersistenceService'
import './ConflictNotification.css'

interface ConflictNotificationProps {
  conflicts: AssignmentConflict[]
  onResolveConflict: (conflictId: string) => void
  onDismiss: (conflictId: string) => void
}

export const ConflictNotification: React.FC<ConflictNotificationProps> = ({
  conflicts,
  onResolveConflict,
  onDismiss
}) => {
  if (conflicts.length === 0) return null

  const getConflictIcon = (type: AssignmentConflict['type']) => {
    switch (type) {
      case 'double_booking':
        return '⚠️'
      case 'skill_mismatch':
        return '🔧'
      case 'capacity_exceeded':
        return '📊'
      case 'concurrent_modification':
        return '👥'
      default:
        return '❗'
    }
  }

  const getConflictSeverity = (type: AssignmentConflict['type']) => {
    switch (type) {
      case 'double_booking':
      case 'capacity_exceeded':
        return 'high'
      case 'concurrent_modification':
        return 'medium'
      case 'skill_mismatch':
        return 'low'
      default:
        return 'medium'
    }
  }

  return (
    <div className="conflict-notifications">
      <div className="notifications-header">
        <h3>Assignment Conflicts ({conflicts.length})</h3>
        <small>These conflicts need your attention</small>
      </div>
      
      <div className="notifications-list">
        {conflicts.map((conflict) => (
          <div 
            key={conflict.id} 
            className={`conflict-notification ${getConflictSeverity(conflict.type)}`}
          >
            <div className="conflict-icon">
              {getConflictIcon(conflict.type)}
            </div>
            
            <div className="conflict-content">
              <div className="conflict-title">
                {conflict.type.replace('_', ' ').toUpperCase()} Conflict
              </div>
              <div className="conflict-message">
                {conflict.message}
              </div>
              {conflict.affectedAssignments.length > 0 && (
                <div className="affected-assignments">
                  Affects {conflict.affectedAssignments.length} assignment{conflict.affectedAssignments.length > 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            <div className="conflict-actions">
              <button
                className="resolve-btn"
                onClick={() => onResolveConflict(conflict.id)}
                title="Resolve this conflict"
              >
                Resolve
              </button>
              <button
                className="dismiss-btn"
                onClick={() => onDismiss(conflict.id)}
                title="Dismiss this notification"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
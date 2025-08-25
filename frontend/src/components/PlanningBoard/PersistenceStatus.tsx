import React from 'react'
import { usePlanning } from '../../contexts/PlanningContext'
import './PersistenceStatus.css'

export const PersistenceStatus: React.FC = () => {
  const { state, forceSave, resolveConflict } = usePlanning()

  const handleForceSave = async () => {
    try {
      await forceSave()
    } catch (error) {
      console.error('Force save failed:', error)
    }
  }

  const handleResolveConflict = async (conflictId: string, resolution: 'accept_local' | 'accept_remote') => {
    try {
      await resolveConflict(conflictId, resolution)
    } catch (error) {
      console.error('Conflict resolution failed:', error)
    }
  }

  return (
    <div className="persistence-status">
      <div className="status-indicators">
        {/* Online/Offline Status */}
        <div className={`status-indicator ${state.isOnline ? 'online' : 'offline'}`}>
          <span className="status-dot"></span>
          {state.isOnline ? 'Online' : 'Offline'}
        </div>

        {/* Saving Status */}
        {state.isSaving && (
          <div className="status-indicator saving">
            <span className="spinner"></span>
            Saving...
          </div>
        )}

        {/* Unsaved Changes */}
        {state.hasUnsavedChanges && !state.isSaving && (
          <div className="status-indicator unsaved">
            <span className="status-dot warning"></span>
            Unsaved changes
            <button 
              className="force-save-btn"
              onClick={handleForceSave}
              title="Force save all changes"
            >
              Save Now
            </button>
          </div>
        )}

        {/* Last Saved */}
        {state.lastSaved && !state.hasUnsavedChanges && !state.isSaving && (
          <div className="status-indicator saved">
            <span className="status-dot success"></span>
            Saved {formatLastSaved(state.lastSaved)}
          </div>
        )}

        {/* Error Status */}
        {state.error && (
          <div className="status-indicator error">
            <span className="status-dot error"></span>
            {state.error}
          </div>
        )}
      </div>

      {/* Conflicts */}
      {state.conflicts.length > 0 && (
        <div className="conflicts-section">
          <h4>Conflicts Detected</h4>
          {state.conflicts.map(conflict => (
            <div key={conflict.id} className="conflict-item">
              <div className="conflict-message">{conflict.message}</div>
              <div className="conflict-actions">
                <button 
                  className="btn btn-sm"
                  onClick={() => handleResolveConflict(conflict.id, 'accept_local')}
                >
                  Keep Local
                </button>
                <button 
                  className="btn btn-sm"
                  onClick={() => handleResolveConflict(conflict.id, 'accept_remote')}
                >
                  Accept Remote
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatLastSaved(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)

  if (diffSeconds < 60) {
    return 'just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else {
    return date.toLocaleDateString()
  }
}
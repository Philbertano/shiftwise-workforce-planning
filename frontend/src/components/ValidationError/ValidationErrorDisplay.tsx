import React from 'react'
import { ValidationError } from '../../services/assignmentValidationService'
import './ValidationErrorDisplay.css'

interface ValidationErrorDisplayProps {
  errors: ValidationError[]
  warnings: ValidationError[]
  onDismiss?: () => void
  onRetry?: () => void
  showRecoveryActions?: boolean
}

export const ValidationErrorDisplay: React.FC<ValidationErrorDisplayProps> = ({
  errors,
  warnings,
  onDismiss,
  onRetry,
  showRecoveryActions = true
}) => {
  if (errors.length === 0 && warnings.length === 0) {
    return null
  }

  const getIcon = (type: ValidationError['type']) => {
    switch (type) {
      case 'capacity_exceeded':
        return '⚠️'
      case 'skill_mismatch':
        return '🔧'
      case 'employee_unavailable':
        return '👤'
      case 'duplicate_assignment':
        return '🔄'
      default:
        return '❌'
    }
  }

  const getRecoveryActions = (error: ValidationError): string[] => {
    const actions: string[] = []
    
    if (error.suggestedAction) {
      actions.push(error.suggestedAction)
    }

    switch (error.type) {
      case 'capacity_exceeded':
        if (!actions.length) {
          actions.push('Remove an existing assignment or increase station capacity')
        }
        break
      case 'skill_mismatch':
        if (!actions.length) {
          actions.push('Select an employee with required skills')
        }
        break
      case 'employee_unavailable':
        if (!actions.length) {
          actions.push('Select a different employee')
        }
        break
      case 'duplicate_assignment':
        if (!actions.length) {
          actions.push('Remove existing assignment first')
        }
        break
    }

    return actions
  }

  return (
    <div className="validation-error-display">
      {errors.length > 0 && (
        <div className="validation-errors">
          <div className="validation-header error">
            <span className="validation-icon">❌</span>
            <h4>Assignment Error{errors.length > 1 ? 's' : ''}</h4>
            {onDismiss && (
              <button className="dismiss-btn" onClick={onDismiss} aria-label="Dismiss">
                ✕
              </button>
            )}
          </div>
          <div className="validation-list">
            {errors.map((error, index) => (
              <div key={index} className="validation-item error">
                <div className="validation-message">
                  <span className="validation-type-icon">{getIcon(error.type)}</span>
                  <span className="message-text">{error.message}</span>
                </div>
                {showRecoveryActions && (
                  <div className="recovery-actions">
                    <span className="recovery-label">Suggested actions:</span>
                    <ul className="recovery-list">
                      {getRecoveryActions(error).map((action, actionIndex) => (
                        <li key={actionIndex} className="recovery-action">
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
          {onRetry && (
            <div className="validation-actions">
              <button className="btn btn-primary" onClick={onRetry}>
                Try Again
              </button>
            </div>
          )}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="validation-warnings">
          <div className="validation-header warning">
            <span className="validation-icon">⚠️</span>
            <h4>Assignment Warning{warnings.length > 1 ? 's' : ''}</h4>
            {onDismiss && (
              <button className="dismiss-btn" onClick={onDismiss} aria-label="Dismiss">
                ✕
              </button>
            )}
          </div>
          <div className="validation-list">
            {warnings.map((warning, index) => (
              <div key={index} className="validation-item warning">
                <div className="validation-message">
                  <span className="validation-type-icon">{getIcon(warning.type)}</span>
                  <span className="message-text">{warning.message}</span>
                </div>
                {showRecoveryActions && warning.suggestedAction && (
                  <div className="recovery-actions">
                    <span className="recovery-label">Suggestion:</span>
                    <span className="recovery-action">{warning.suggestedAction}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ValidationErrorDisplay
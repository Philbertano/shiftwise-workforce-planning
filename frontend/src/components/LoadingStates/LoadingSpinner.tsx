import React from 'react'
import './LoadingSpinner.css'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  color?: 'primary' | 'secondary' | 'automotive'
  message?: string
  overlay?: boolean
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = React.memo(({
  size = 'medium',
  color = 'automotive',
  message,
  overlay = false
}) => {
  const spinnerClasses = [
    'loading-spinner',
    `loading-spinner--${size}`,
    `loading-spinner--${color}`,
    overlay ? 'loading-spinner--overlay' : ''
  ].filter(Boolean).join(' ')

  return (
    <div className={spinnerClasses}>
      <div className="loading-spinner__circle">
        <div className="loading-spinner__inner"></div>
      </div>
      {message && (
        <div className="loading-spinner__message">
          {message}
        </div>
      )}
    </div>
  )
})

LoadingSpinner.displayName = 'LoadingSpinner'
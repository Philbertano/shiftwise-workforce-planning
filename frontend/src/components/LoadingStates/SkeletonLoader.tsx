import React from 'react'
import './SkeletonLoader.css'

interface SkeletonLoaderProps {
  width?: string | number
  height?: string | number
  variant?: 'text' | 'rectangular' | 'circular'
  animation?: 'pulse' | 'wave' | 'none'
  lines?: number
  className?: string
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = React.memo(({
  width = '100%',
  height = '1em',
  variant = 'text',
  animation = 'pulse',
  lines = 1,
  className = ''
}) => {
  const skeletonClasses = [
    'skeleton-loader',
    `skeleton-loader--${variant}`,
    `skeleton-loader--${animation}`,
    className
  ].filter(Boolean).join(' ')

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className="skeleton-loader-group">
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={skeletonClasses}
            style={{
              ...style,
              width: index === lines - 1 ? '75%' : style.width // Last line shorter
            }}
          />
        ))}
      </div>
    )
  }

  return <div className={skeletonClasses} style={style} />
})

SkeletonLoader.displayName = 'SkeletonLoader'

// Predefined skeleton components for common use cases
export const SkeletonCard: React.FC<{ className?: string }> = React.memo(({ className = '' }) => (
  <div className={`skeleton-card ${className}`}>
    <SkeletonLoader variant="rectangular" height={200} className="skeleton-card__image" />
    <div className="skeleton-card__content">
      <SkeletonLoader variant="text" height="1.5em" className="skeleton-card__title" />
      <SkeletonLoader variant="text" lines={3} className="skeleton-card__description" />
    </div>
  </div>
))

export const SkeletonTable: React.FC<{ 
  rows?: number
  columns?: number
  className?: string 
}> = React.memo(({ rows = 5, columns = 4, className = '' }) => (
  <div className={`skeleton-table ${className}`}>
    <div className="skeleton-table__header">
      {Array.from({ length: columns }, (_, index) => (
        <SkeletonLoader key={index} variant="text" height="2em" />
      ))}
    </div>
    <div className="skeleton-table__body">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="skeleton-table__row">
          {Array.from({ length: columns }, (_, colIndex) => (
            <SkeletonLoader key={colIndex} variant="text" height="1.5em" />
          ))}
        </div>
      ))}
    </div>
  </div>
))

export const SkeletonDashboard: React.FC<{ className?: string }> = React.memo(({ className = '' }) => (
  <div className={`skeleton-dashboard ${className}`}>
    <div className="skeleton-dashboard__header">
      <SkeletonLoader variant="text" width="300px" height="2em" />
      <div className="skeleton-dashboard__actions">
        <SkeletonLoader variant="rectangular" width="100px" height="36px" />
        <SkeletonLoader variant="rectangular" width="100px" height="36px" />
      </div>
    </div>
    <div className="skeleton-dashboard__kpis">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="skeleton-dashboard__kpi">
          <SkeletonLoader variant="text" height="3em" />
          <SkeletonLoader variant="text" height="1em" width="60%" />
        </div>
      ))}
    </div>
    <div className="skeleton-dashboard__content">
      <div className="skeleton-dashboard__chart">
        <SkeletonLoader variant="rectangular" height="300px" />
      </div>
      <div className="skeleton-dashboard__sidebar">
        <SkeletonLoader variant="text" lines={8} />
      </div>
    </div>
  </div>
))
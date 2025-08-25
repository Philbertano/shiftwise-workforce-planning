import React, { useState, useEffect, useRef } from 'react'
import './FadeTransition.css'

interface FadeTransitionProps {
  show: boolean
  children: React.ReactNode
  duration?: number
  className?: string
  onEnter?: () => void
  onExit?: () => void
  unmountOnExit?: boolean
}

export const FadeTransition: React.FC<FadeTransitionProps> = React.memo(({
  show,
  children,
  duration = 300,
  className = '',
  onEnter,
  onExit,
  unmountOnExit = false
}) => {
  const [shouldRender, setShouldRender] = useState(show)
  const [isVisible, setIsVisible] = useState(show)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (show) {
      setShouldRender(true)
      // Small delay to ensure element is rendered before fade in
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true)
        onEnter?.()
      }, 10)
    } else {
      setIsVisible(false)
      onExit?.()
      
      if (unmountOnExit) {
        timeoutRef.current = setTimeout(() => {
          setShouldRender(false)
        }, duration)
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [show, duration, onEnter, onExit, unmountOnExit])

  if (!shouldRender && unmountOnExit) {
    return null
  }

  const transitionClasses = [
    'fade-transition',
    isVisible ? 'fade-transition--visible' : 'fade-transition--hidden',
    className
  ].filter(Boolean).join(' ')

  return (
    <div
      className={transitionClasses}
      style={{
        transitionDuration: `${duration}ms`,
        opacity: isVisible ? 1 : 0
      }}
    >
      {children}
    </div>
  )
})

FadeTransition.displayName = 'FadeTransition'
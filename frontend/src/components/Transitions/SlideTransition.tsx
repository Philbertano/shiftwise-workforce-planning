import React, { useState, useEffect, useRef } from 'react'
import './SlideTransition.css'

interface SlideTransitionProps {
  show: boolean
  children: React.ReactNode
  direction?: 'up' | 'down' | 'left' | 'right'
  duration?: number
  distance?: string
  className?: string
  onEnter?: () => void
  onExit?: () => void
  unmountOnExit?: boolean
}

export const SlideTransition: React.FC<SlideTransitionProps> = React.memo(({
  show,
  children,
  direction = 'up',
  duration = 300,
  distance = '20px',
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

  const getTransform = () => {
    if (isVisible) return 'translate3d(0, 0, 0)'
    
    switch (direction) {
      case 'up':
        return `translate3d(0, ${distance}, 0)`
      case 'down':
        return `translate3d(0, -${distance}, 0)`
      case 'left':
        return `translate3d(${distance}, 0, 0)`
      case 'right':
        return `translate3d(-${distance}, 0, 0)`
      default:
        return `translate3d(0, ${distance}, 0)`
    }
  }

  const transitionClasses = [
    'slide-transition',
    `slide-transition--${direction}`,
    isVisible ? 'slide-transition--visible' : 'slide-transition--hidden',
    className
  ].filter(Boolean).join(' ')

  return (
    <div
      className={transitionClasses}
      style={{
        transitionDuration: `${duration}ms`,
        transform: getTransform(),
        opacity: isVisible ? 1 : 0
      }}
    >
      {children}
    </div>
  )
})

SlideTransition.displayName = 'SlideTransition'
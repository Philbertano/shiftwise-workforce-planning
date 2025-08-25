/**
 * Performance optimization utilities for the automotive enhancements
 */

import { useRef, useCallback, useEffect, useState } from 'react'

/**
 * Debounce hook for expensive operations
 */
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay]) as T

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

/**
 * Throttle hook for high-frequency events
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCallRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now()
    const timeSinceLastCall = now - lastCallRef.current

    if (timeSinceLastCall >= delay) {
      lastCallRef.current = now
      callback(...args)
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now()
        callback(...args)
      }, delay - timeSinceLastCall)
    }
  }, [callback, delay]) as T

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return throttledCallback
}

/**
 * Memoization utility for expensive calculations
 */
export const createMemoizedSelector = <TInput, TOutput>(
  selector: (input: TInput) => TOutput,
  equalityFn?: (a: TInput, b: TInput) => boolean
) => {
  let lastInput: TInput
  let lastOutput: TOutput
  let hasValue = false

  const defaultEqualityFn = (a: TInput, b: TInput) => a === b

  return (input: TInput): TOutput => {
    const isEqual = equalityFn || defaultEqualityFn

    if (!hasValue || !isEqual(input, lastInput)) {
      lastInput = input
      lastOutput = selector(input)
      hasValue = true
    }

    return lastOutput
  }
}

/**
 * Virtual scrolling utility for large lists
 */
export interface VirtualScrollOptions {
  itemHeight: number
  containerHeight: number
  overscan?: number
}

export const useVirtualScroll = (
  itemCount: number,
  options: VirtualScrollOptions
) => {
  const { itemHeight, containerHeight, overscan = 5 } = options
  
  const visibleItemCount = Math.ceil(containerHeight / itemHeight)
  const totalHeight = itemCount * itemHeight

  const getVisibleRange = useCallback((scrollTop: number) => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      itemCount - 1,
      startIndex + visibleItemCount + overscan * 2
    )

    return { startIndex, endIndex }
  }, [itemHeight, itemCount, visibleItemCount, overscan])

  const getItemStyle = useCallback((index: number) => ({
    position: 'absolute' as const,
    top: index * itemHeight,
    height: itemHeight,
    width: '100%'
  }), [itemHeight])

  return {
    totalHeight,
    getVisibleRange,
    getItemStyle,
    visibleItemCount
  }
}

/**
 * Performance monitoring hook
 */
export const usePerformanceMonitor = (componentName: string) => {
  const renderCountRef = useRef(0)
  const lastRenderTimeRef = useRef(Date.now())

  useEffect(() => {
    renderCountRef.current += 1
    const now = Date.now()
    const timeSinceLastRender = now - lastRenderTimeRef.current
    lastRenderTimeRef.current = now

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName} rendered ${renderCountRef.current} times. Time since last render: ${timeSinceLastRender}ms`)
    }
  })

  const markRenderStart = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      performance.mark(`${componentName}-render-start`)
    }
  }, [componentName])

  const markRenderEnd = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      performance.mark(`${componentName}-render-end`)
      performance.measure(
        `${componentName}-render`,
        `${componentName}-render-start`,
        `${componentName}-render-end`
      )
    }
  }, [componentName])

  return { markRenderStart, markRenderEnd }
}

/**
 * Intersection Observer hook for lazy loading
 */
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const elementRef = useRef<HTMLElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const observe = useCallback((callback: (entry: IntersectionObserverEntry) => void) => {
    if (!elementRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(callback)
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    )

    observerRef.current.observe(elementRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [options])

  return { elementRef, observe }
}

/**
 * Batch updates utility
 */
export class BatchUpdater<T> {
  private updates: T[] = []
  private timeoutId: NodeJS.Timeout | null = null
  private readonly batchSize: number
  private readonly delay: number
  private readonly processor: (updates: T[]) => void

  constructor(
    processor: (updates: T[]) => void,
    options: { batchSize?: number; delay?: number } = {}
  ) {
    this.processor = processor
    this.batchSize = options.batchSize || 10
    this.delay = options.delay || 100
  }

  add(update: T): void {
    this.updates.push(update)

    if (this.updates.length >= this.batchSize) {
      this.flush()
    } else if (!this.timeoutId) {
      this.timeoutId = setTimeout(() => this.flush(), this.delay)
    }
  }

  flush(): void {
    if (this.updates.length === 0) return

    const updatesToProcess = [...this.updates]
    this.updates = []

    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }

    this.processor(updatesToProcess)
  }

  dispose(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    this.updates = []
  }
}

/**
 * Memory usage monitoring
 */
export const getMemoryUsage = (): MemoryInfo | null => {
  if ('memory' in performance) {
    return (performance as any).memory
  }
  return null
}

/**
 * Component size monitoring
 */
export const useComponentSize = () => {
  const ref = useRef<HTMLElement | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!ref.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setSize({ width, height })
      }
    })

    resizeObserver.observe(ref.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  return { ref, size }
}
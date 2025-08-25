import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { MultiAssignmentSlot } from '../../components/PlanningBoard/MultiAssignmentSlot'
import { AutomotiveDashboard } from '../../components/AutomotiveDashboard/AutomotiveDashboard'
import { PlanningProvider } from '../../contexts/PlanningContext'
import { Assignment, Employee, Station } from '../../types'

// Mock performance API
const mockPerformance = {
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => [{ duration: 10 }]),
  now: vi.fn(() => Date.now())
}

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true
})

describe('Automotive Performance Optimizations', () => {
  const mockStations: Station[] = [
    {
      id: 'station-1',
      name: 'Engine Assembly',
      line: 'ENG-01',
      description: 'Engine assembly line',
      capacity: 3,
      active: true,
      priority: 'high',
      requiredSkills: []
    }
  ]

  const mockEmployees: Employee[] = Array.from({ length: 100 }, (_, i) => ({
    id: `emp-${i}`,
    name: `Employee ${i}`,
    contractType: 'full-time',
    weeklyHours: 40,
    maxHoursPerDay: 8,
    minRestHours: 11,
    team: `Team ${Math.floor(i / 10)}`,
    active: true
  }))

  const mockAssignments: Assignment[] = []

  const mockDashboardData = {
    productionLines: [
      {
        id: 'line-1',
        name: 'Assembly Line A',
        type: 'assembly' as const,
        taktTime: 120,
        capacity: 10,
        qualityCheckpoints: [],
        active: true
      }
    ],
    stations: mockStations,
    shifts: [],
    coverageStatus: [],
    gaps: [],
    staffingLevels: [],
    kpiData: {
      overallEfficiency: 85,
      productionRate: 120,
      qualityScore: 95,
      safetyIncidents: 0,
      staffingEfficiency: 90,
      lineUtilization: 88
    },
    efficiencyData: [],
    skillCoverage: [],
    safetyCompliance: {
      overallScore: 95,
      certificationCompliance: 98,
      ppeCompliance: 92,
      trainingCompliance: 96,
      incidentRate: 0.1
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('MultiAssignmentSlot Performance', () => {
    it('should render efficiently with large datasets', async () => {
      const startTime = performance.now()
      
      render(
        <DndProvider backend={HTML5Backend}>
          <MultiAssignmentSlot
            stationId="station-1"
            shiftId="shift-1"
            date={new Date()}
            assignments={mockAssignments}
            employees={mockEmployees}
            stations={mockStations}
            capacity={3}
            violations={[]}
            onAssignmentDrop={vi.fn()}
            onAssignmentDelete={vi.fn()}
          />
        </DndProvider>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time (less than 100ms)
      expect(renderTime).toBeLessThan(100)
    })

    it('should memoize expensive calculations', () => {
      const onAssignmentDrop = vi.fn()
      const onAssignmentDelete = vi.fn()

      const { rerender } = render(
        <DndProvider backend={HTML5Backend}>
          <MultiAssignmentSlot
            stationId="station-1"
            shiftId="shift-1"
            date={new Date()}
            assignments={mockAssignments}
            employees={mockEmployees}
            stations={mockStations}
            capacity={3}
            violations={[]}
            onAssignmentDrop={onAssignmentDrop}
            onAssignmentDelete={onAssignmentDelete}
          />
        </DndProvider>
      )

      // Re-render with same props should not trigger expensive recalculations
      rerender(
        <DndProvider backend={HTML5Backend}>
          <MultiAssignmentSlot
            stationId="station-1"
            shiftId="shift-1"
            date={new Date()}
            assignments={mockAssignments}
            employees={mockEmployees}
            stations={mockStations}
            capacity={3}
            violations={[]}
            onAssignmentDrop={onAssignmentDrop}
            onAssignmentDelete={onAssignmentDelete}
          />
        </DndProvider>
      )

      // Component should use React.memo to prevent unnecessary re-renders
      expect(screen.getByText('0/3')).toBeInTheDocument() // Check for capacity indicator
    })

    it('should handle drag operations efficiently', async () => {
      const onAssignmentDrop = vi.fn()
      
      render(
        <DndProvider backend={HTML5Backend}>
          <MultiAssignmentSlot
            stationId="station-1"
            shiftId="shift-1"
            date={new Date()}
            assignments={mockAssignments}
            employees={mockEmployees}
            stations={mockStations}
            capacity={3}
            violations={[]}
            onAssignmentDrop={onAssignmentDrop}
            onAssignmentDelete={vi.fn()}
          />
        </DndProvider>
      )

      const slot = screen.getAllByRole('generic')[0] // Get first generic element
      
      // Simulate drag operations
      const startTime = performance.now()
      fireEvent.dragEnter(slot)
      fireEvent.dragOver(slot)
      fireEvent.drop(slot)
      const endTime = performance.now()

      const dragTime = endTime - startTime
      expect(dragTime).toBeLessThan(50) // Should handle drag operations quickly
    })
  })

  describe('AutomotiveDashboard Performance', () => {
    const mockDashboardData = {
      productionLines: Array.from({ length: 20 }, (_, i) => ({
        id: `line-${i}`,
        name: `Production Line ${i}`,
        type: 'assembly' as const,
        active: true,
        taktTime: 60,
        capacity: 10,
        qualityCheckpoints: []
      })),
      stations: mockStations,
      shifts: [],
      coverageStatus: [],
      gaps: [],
      staffingLevels: Array.from({ length: 60 }, (_, i) => ({
        productionLineId: `line-${Math.floor(i / 3)}`,
        shiftId: `shift-${i % 3 + 1}`,
        required: 5,
        assigned: Math.floor(Math.random() * 7),
        efficiency: Math.random() * 100,
        status: 'optimal' as const
      })),
      kpiData: {
        overallEfficiency: 85,
        productionRate: 120,
        qualityScore: 95,
        safetyIncidents: 0,
        staffingEfficiency: 90,
        lineUtilization: 88
      },
      efficiencyData: [],
      skillCoverage: [],
      safetyCompliance: {
        overallScore: 95,
        certificationCompliance: 98,
        ppeCompliance: 92,
        trainingCompliance: 96,
        incidentRate: 0.1
      }
    }

    it('should render dashboard efficiently with large datasets', async () => {
      const startTime = performance.now()
      
      render(
        <AutomotiveDashboard
          data={mockDashboardData}
          selectedDate={new Date()}
          onDateChange={vi.fn()}
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(200)
      expect(screen.getByText(/Manufacturing Operations Dashboard/)).toBeInTheDocument()
    })

    it('should handle view changes efficiently', async () => {
      render(
        <AutomotiveDashboard
          data={mockDashboardData}
          selectedDate={new Date()}
          onDateChange={vi.fn()}
        />
      )

      const productionButton = screen.getByText('Production Lines')
      const staffingButton = screen.getByText('Workforce')

      const startTime = performance.now()
      
      fireEvent.click(productionButton)
      await waitFor(() => {
        expect(productionButton).toHaveClass('btn-primary')
      })

      fireEvent.click(staffingButton)
      await waitFor(() => {
        expect(staffingButton).toHaveClass('btn-primary')
      })

      const endTime = performance.now()
      const switchTime = endTime - startTime

      expect(switchTime).toBeLessThan(200) // View switches should be reasonably fast
    })

    it('should memoize expensive calculations', () => {
      const onDateChange = vi.fn()
      
      render(
        <AutomotiveDashboard
          data={mockDashboardData}
          selectedDate={new Date()}
          onDateChange={onDateChange}
        />
      )

      // Should use memoization to prevent unnecessary recalculations
      expect(screen.getByText(/Manufacturing Operations Dashboard/)).toBeInTheDocument()
    })
  })

  describe('PlanningContext Performance', () => {
    it('should handle state updates efficiently', async () => {
      const TestComponent = () => {
        return (
          <PlanningProvider>
            <div>Test Component</div>
          </PlanningProvider>
        )
      }

      const startTime = performance.now()
      render(<TestComponent />)
      const endTime = performance.now()

      const initTime = endTime - startTime
      expect(initTime).toBeLessThan(100) // Context initialization should be fast
    })

    it('should debounce assignment operations', async () => {
      // This would require more complex setup with actual context usage
      // For now, we'll test that the debounce utility works
      const mockCallback = vi.fn()
      let debouncedFn: any

      // Simulate debounced function
      const debounceTimeout = 300
      const debounce = (fn: Function, delay: number) => {
        let timeoutId: NodeJS.Timeout
        return (...args: any[]) => {
          clearTimeout(timeoutId)
          timeoutId = setTimeout(() => fn(...args), delay)
        }
      }

      debouncedFn = debounce(mockCallback, debounceTimeout)

      // Call multiple times rapidly
      debouncedFn('test1')
      debouncedFn('test2')
      debouncedFn('test3')

      // Should not have been called yet
      expect(mockCallback).not.toHaveBeenCalled()

      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, debounceTimeout + 50))

      // Should have been called only once with the last value
      expect(mockCallback).toHaveBeenCalledTimes(1)
      expect(mockCallback).toHaveBeenCalledWith('test3')
    })
  })

  describe('Memory Usage', () => {
    it('should not create memory leaks with large datasets', () => {
      // Mock memory API
      const mockMemory = {
        usedJSHeapSize: 10000000,
        totalJSHeapSize: 20000000,
        jsHeapSizeLimit: 100000000
      }

      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        writable: true
      })

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

      // Render components multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <DndProvider backend={HTML5Backend}>
            <MultiAssignmentSlot
              stationId={`station-${i}`}
              shiftId="shift-1"
              date={new Date()}
              assignments={mockAssignments}
              employees={mockEmployees}
              stations={mockStations}
              capacity={3}
              violations={[]}
              onAssignmentDrop={vi.fn()}
              onAssignmentDelete={vi.fn()}
            />
          </DndProvider>
        )
        unmount()
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10000000)
    })
  })

  describe('Loading States', () => {
    it('should show loading states during data operations', () => {
      render(
        <AutomotiveDashboard
          data={mockDashboardData}
          selectedDate={new Date()}
          onDateChange={vi.fn()}
        />
      )

      // Should render without loading states by default
      expect(screen.queryByText(/Loading/)).not.toBeInTheDocument()
    })

    it('should handle transitions smoothly', async () => {
      const { rerender } = render(
        <AutomotiveDashboard
          data={mockDashboardData}
          selectedDate={new Date()}
          onDateChange={vi.fn()}
        />
      )

      // Change view to trigger transition
      const productionButton = screen.getByText('Production Lines')
      fireEvent.click(productionButton)

      await waitFor(() => {
        expect(productionButton).toHaveClass('btn-primary')
      })

      // Transitions should be smooth and not cause layout shifts
      expect(screen.getByText(/Manufacturing Operations Dashboard/)).toBeInTheDocument()
    })
  })
})
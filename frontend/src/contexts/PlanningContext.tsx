import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useMemo } from 'react'
import { PlanningBoardData, Assignment } from '../types'
import { 
  getPlanningPersistenceService, 
  PlanningPersistenceService, 
  PersistenceError, 
  AssignmentConflict,
  ConflictResolution,
  PlanningChange 
} from '../services/planningPersistenceService'

interface PlanningState {
  data: PlanningBoardData
  selectedDate: Date
  isLoading: boolean
  error: string | null
  isSaving: boolean
  lastSaved: Date | null
  hasUnsavedChanges: boolean
  isOnline: boolean
  conflicts: AssignmentConflict[]
}

type PlanningAction =
  | { type: 'SET_DATA'; payload: PlanningBoardData }
  | { type: 'SET_SELECTED_DATE'; payload: Date }
  | { type: 'ADD_ASSIGNMENT'; payload: Assignment }
  | { type: 'UPDATE_ASSIGNMENT'; payload: Assignment }
  | { type: 'DELETE_ASSIGNMENT'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_LAST_SAVED'; payload: Date | null }
  | { type: 'SET_UNSAVED_CHANGES'; payload: boolean }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'ADD_CONFLICT'; payload: AssignmentConflict }
  | { type: 'REMOVE_CONFLICT'; payload: string }
  | { type: 'CLEAR_CONFLICTS' }
  | { type: 'APPLY_OPTIMISTIC_UPDATE'; payload: Assignment }
  | { type: 'ROLLBACK_OPTIMISTIC_UPDATES'; payload: Assignment[] }

interface PlanningContextType {
  state: PlanningState
  dispatch: React.Dispatch<PlanningAction>
  addAssignment: (assignment: Assignment) => Promise<void>
  updateAssignment: (assignment: Assignment) => Promise<void>
  deleteAssignment: (assignmentId: string) => Promise<void>
  setSelectedDate: (date: Date) => Promise<void>
  loadPlanningData: (date: Date) => Promise<void>
  forceSave: () => Promise<void>
  resolveConflict: (conflictId: string, resolution: 'accept_local' | 'accept_remote') => Promise<void>
  resolveConflictWithResolution: (conflictId: string, resolution: ConflictResolution) => Promise<void>
  // Legacy methods for backward compatibility
  saveToStorage: () => void
  loadFromStorage: () => void
}

const PlanningContext = createContext<PlanningContextType | undefined>(undefined)

const STORAGE_KEY = 'autoshift_planning_data'

// Mock data for planning board
const initialPlanningData: PlanningBoardData = {
  stations: [
    {
      id: 'station-1',
      name: 'Engine Assembly Line',
      line: 'ENG-01',
      description: 'Main engine assembly and installation',
      capacity: 3,
      active: true,
      priority: 'high',
      requiredSkills: [
        { skillId: 'skill-1', minLevel: 2, count: 2, mandatory: true },
        { skillId: 'skill-2', minLevel: 1, count: 1, mandatory: false }
      ]
    },
    {
      id: 'station-2',
      name: 'Quality Control Station',
      line: 'QC-01',
      description: 'Final quality inspection and testing',
      capacity: 2,
      active: true,
      priority: 'critical',
      requiredSkills: [
        { skillId: 'skill-3', minLevel: 3, count: 1, mandatory: true }
      ]
    },
    {
      id: 'station-3',
      name: 'Paint Shop Line 1',
      line: 'PAINT-01',
      description: 'Automotive painting and finishing',
      capacity: 4,
      active: true,
      priority: 'medium',
      requiredSkills: [
        { skillId: 'skill-4', minLevel: 2, count: 2, mandatory: true },
        { skillId: 'skill-5', minLevel: 1, count: 2, mandatory: false }
      ]
    }
  ],
  shifts: [
    {
      id: 'shift-1',
      name: 'Day Shift',
      startTime: '06:00',
      endTime: '14:00',
      shiftType: 'day',
      breakRules: [
        { duration: 30, startAfter: 180, paid: true },
        { duration: 45, startAfter: 360, paid: false }
      ]
    },
    {
      id: 'shift-2',
      name: 'Evening Shift',
      startTime: '14:00',
      endTime: '22:00',
      shiftType: 'swing',
      breakRules: [
        { duration: 30, startAfter: 180, paid: true },
        { duration: 45, startAfter: 300, paid: false }
      ]
    },
    {
      id: 'shift-3',
      name: 'Night Shift',
      startTime: '22:00',
      endTime: '06:00',
      shiftType: 'night',
      breakRules: [
        { duration: 30, startAfter: 180, paid: true },
        { duration: 45, startAfter: 360, paid: false }
      ]
    }
  ],
  employees: [
    {
      id: 'emp-1',
      name: 'John Smith',
      contractType: 'full-time',
      weeklyHours: 40,
      maxHoursPerDay: 8,
      minRestHours: 11,
      team: 'Engine Team',
      active: true
    },
    {
      id: 'emp-2',
      name: 'Sarah Johnson',
      contractType: 'full-time',
      weeklyHours: 40,
      maxHoursPerDay: 8,
      minRestHours: 11,
      team: 'Quality Team',
      active: true
    },
    {
      id: 'emp-3',
      name: 'Mike Wilson',
      contractType: 'part-time',
      weeklyHours: 20,
      maxHoursPerDay: 6,
      minRestHours: 11,
      team: 'Paint Team',
      active: true
    },
    {
      id: 'emp-4',
      name: 'Lisa Chen',
      contractType: 'full-time',
      weeklyHours: 40,
      maxHoursPerDay: 8,
      minRestHours: 11,
      team: 'Engine Team',
      active: true
    }
  ],
  assignments: [],
  coverageStatus: [],
  violations: []
}

const initialState: PlanningState = {
  data: initialPlanningData,
  selectedDate: new Date(),
  isLoading: false,
  error: null,
  isSaving: false,
  lastSaved: null,
  hasUnsavedChanges: false,
  isOnline: navigator.onLine,
  conflicts: []
}

function planningReducer(state: PlanningState, action: PlanningAction): PlanningState {
  switch (action.type) {
    case 'SET_DATA':
      return { 
        ...state, 
        data: action.payload,
        hasUnsavedChanges: false,
        lastSaved: new Date()
      }
    
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload }
    
    case 'ADD_ASSIGNMENT':
      return {
        ...state,
        data: {
          ...state.data,
          assignments: [...state.data.assignments, action.payload]
        },
        hasUnsavedChanges: true
      }
    
    case 'UPDATE_ASSIGNMENT':
      return {
        ...state,
        data: {
          ...state.data,
          assignments: state.data.assignments.map(assignment =>
            assignment.id === action.payload.id ? action.payload : assignment
          )
        },
        hasUnsavedChanges: true
      }
    
    case 'DELETE_ASSIGNMENT':
      return {
        ...state,
        data: {
          ...state.data,
          assignments: state.data.assignments.filter(assignment => assignment.id !== action.payload)
        },
        hasUnsavedChanges: true
      }
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    
    case 'SET_SAVING':
      return { ...state, isSaving: action.payload }
    
    case 'SET_LAST_SAVED':
      return { 
        ...state, 
        lastSaved: action.payload,
        hasUnsavedChanges: false
      }
    
    case 'SET_UNSAVED_CHANGES':
      return { ...state, hasUnsavedChanges: action.payload }
    
    case 'SET_ONLINE_STATUS':
      return { ...state, isOnline: action.payload }
    
    case 'ADD_CONFLICT':
      return {
        ...state,
        conflicts: [...state.conflicts, action.payload]
      }
    
    case 'REMOVE_CONFLICT':
      return {
        ...state,
        conflicts: state.conflicts.filter(conflict => conflict.id !== action.payload)
      }
    
    case 'CLEAR_CONFLICTS':
      return { ...state, conflicts: [] }
    
    case 'APPLY_OPTIMISTIC_UPDATE':
      // Apply optimistic update immediately to UI
      const existingIndex = state.data.assignments.findIndex(a => a.id === action.payload.id)
      const updatedAssignments = existingIndex >= 0
        ? state.data.assignments.map(a => a.id === action.payload.id ? action.payload : a)
        : [...state.data.assignments, action.payload]
      
      return {
        ...state,
        data: {
          ...state.data,
          assignments: updatedAssignments
        }
      }
    
    case 'ROLLBACK_OPTIMISTIC_UPDATES':
      return {
        ...state,
        data: {
          ...state.data,
          assignments: action.payload
        }
      }
    
    default:
      return state
  }
}

export const PlanningProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(planningReducer, initialState)
  const persistenceService = useRef<PlanningPersistenceService>(getPlanningPersistenceService())
  const isInitialized = useRef(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize persistence service and load data on mount
  useEffect(() => {
    const initializeService = async () => {
      if (isInitialized.current) return
      isInitialized.current = true

      dispatch({ type: 'SET_LOADING', payload: true })

      try {
        // Set up event listeners
        const unsubscribeChanges = persistenceService.current.subscribeToChanges(handlePersistenceChanges)
        const unsubscribeErrors = persistenceService.current.subscribeToErrors(handlePersistenceError)
        const unsubscribeConflicts = persistenceService.current.subscribeToConflicts(handlePersistenceConflict)

        // Set up online/offline listeners
        const handleOnline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: true })
        const handleOffline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: false })
        
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        // Try to load data from backend first, fallback to localStorage
        try {
          await loadPlanningData(state.selectedDate)
        } catch (error) {
          console.warn('Failed to load from backend, trying localStorage:', error)
          loadFromStorage()
        }

        // Cleanup function
        return () => {
          unsubscribeChanges()
          unsubscribeErrors()
          unsubscribeConflicts()
          window.removeEventListener('online', handleOnline)
          window.removeEventListener('offline', handleOffline)
        }
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: `Failed to initialize persistence: ${error instanceof Error ? error.message : 'Unknown error'}` })
        // Fallback to localStorage
        loadFromStorage()
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    initializeService()
  }, [])

  // Handle persistence service changes
  const handlePersistenceChanges = useCallback((changes: PlanningChange[]) => {
    // Apply changes from other users or successful saves
    changes.forEach(change => {
      switch (change.type) {
        case 'add':
        case 'update':
          dispatch({ type: 'APPLY_OPTIMISTIC_UPDATE', payload: change.assignment })
          break
        case 'delete':
          dispatch({ type: 'DELETE_ASSIGNMENT', payload: change.assignment.id })
          break
      }
    })
  }, [])

  // Handle persistence errors
  const handlePersistenceError = useCallback((error: PersistenceError) => {
    dispatch({ type: 'SET_ERROR', payload: error.message })
    dispatch({ type: 'SET_SAVING', payload: false })
    
    if (!error.retryable) {
      dispatch({ type: 'SET_UNSAVED_CHANGES', payload: true })
    }
  }, [])

  // Handle persistence conflicts
  const handlePersistenceConflict = useCallback((conflict: AssignmentConflict) => {
    dispatch({ type: 'ADD_CONFLICT', payload: conflict })
  }, [])

  // Debounced save function for better performance
  const debouncedSave = useCallback((assignment: Assignment, operation: 'add' | 'update' | 'delete') => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        dispatch({ type: 'SET_SAVING', payload: true })
        
        switch (operation) {
          case 'add':
          case 'update':
            await persistenceService.current.saveAssignment(assignment)
            break
          case 'delete':
            await persistenceService.current.removeAssignment(assignment.id)
            break
        }
        
        dispatch({ type: 'SET_LAST_SAVED', payload: new Date() })
        dispatch({ type: 'SET_SAVING', payload: false })
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: `Failed to ${operation} assignment: ${error instanceof Error ? error.message : 'Unknown error'}` })
        dispatch({ type: 'SET_SAVING', payload: false })
      }
    }, 300) // 300ms debounce
  }, [])

  // Enhanced assignment operations with persistence and validation
  const addAssignment = useCallback(async (assignment: Assignment) => {
    try {
      // Apply optimistic update immediately
      dispatch({ type: 'ADD_ASSIGNMENT', payload: assignment })
      
      // Debounced save to backend
      debouncedSave(assignment, 'add')
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: `Failed to save assignment: ${error instanceof Error ? error.message : 'Unknown error'}` })
      throw error
    }
  }, [debouncedSave])

  const updateAssignment = useCallback(async (assignment: Assignment) => {
    try {
      // Apply optimistic update immediately
      dispatch({ type: 'UPDATE_ASSIGNMENT', payload: assignment })
      
      // Debounced save to backend
      debouncedSave(assignment, 'update')
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: `Failed to update assignment: ${error instanceof Error ? error.message : 'Unknown error'}` })
      throw error
    }
  }, [debouncedSave])

  const deleteAssignment = useCallback(async (assignmentId: string) => {
    try {
      // Find the assignment to delete for the debounced operation
      const assignmentToDelete = state.data.assignments.find(a => a.id === assignmentId)
      if (!assignmentToDelete) {
        throw new Error(`Assignment ${assignmentId} not found`)
      }

      // Apply optimistic update immediately
      dispatch({ type: 'DELETE_ASSIGNMENT', payload: assignmentId })
      
      // Debounced save to backend
      debouncedSave(assignmentToDelete, 'delete')
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: `Failed to delete assignment: ${error instanceof Error ? error.message : 'Unknown error'}` })
      throw error
    }
  }, [state.data.assignments, debouncedSave])

  const setSelectedDate = useCallback(async (date: Date) => {
    dispatch({ type: 'SET_SELECTED_DATE', payload: date })
    
    // Load data for the new date
    try {
      await loadPlanningData(date)
    } catch (error) {
      console.warn('Failed to load data for new date:', error)
    }
  }, [])

  const loadPlanningData = useCallback(async (date: Date) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const data = await persistenceService.current.loadPlanningData(date)
      dispatch({ type: 'SET_DATA', payload: data })
      dispatch({ type: 'CLEAR_CONFLICTS' })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: `Failed to load planning data: ${error instanceof Error ? error.message : 'Unknown error'}` })
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  const forceSave = useCallback(async () => {
    if (!state.hasUnsavedChanges) return

    try {
      dispatch({ type: 'SET_SAVING', payload: true })
      await persistenceService.current.forceSyncPendingChanges()
      dispatch({ type: 'SET_LAST_SAVED', payload: new Date() })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: `Failed to force save: ${error instanceof Error ? error.message : 'Unknown error'}` })
      throw error
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false })
    }
  }, [state.hasUnsavedChanges])

  const resolveConflict = useCallback(async (conflictId: string, resolution: 'accept_local' | 'accept_remote') => {
    const conflict = state.conflicts.find(c => c.id === conflictId)
    if (!conflict) return

    try {
      const conflictResolution = { action: resolution }
      await persistenceService.current.resolveConflict(conflictId, conflictResolution)
      
      dispatch({ type: 'REMOVE_CONFLICT', payload: conflictId })
      
      // Reload data to get the resolved state
      await loadPlanningData(state.selectedDate)
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: `Failed to resolve conflict: ${error instanceof Error ? error.message : 'Unknown error'}` })
      throw error
    }
  }, [state.conflicts, state.selectedDate])

  const resolveConflictWithResolution = useCallback(async (conflictId: string, resolution: ConflictResolution) => {
    try {
      await persistenceService.current.resolveConflict(conflictId, resolution)
      dispatch({ type: 'REMOVE_CONFLICT', payload: conflictId })
      
      // If resolution includes a resolved assignment, apply it
      if (resolution.resolvedAssignment) {
        dispatch({ type: 'APPLY_OPTIMISTIC_UPDATE', payload: resolution.resolvedAssignment })
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: `Failed to resolve conflict: ${error instanceof Error ? error.message : 'Unknown error'}` })
      throw error
    }
  }, [])

  // Legacy localStorage methods for backward compatibility
  const saveToStorage = useCallback(() => {
    try {
      const dataToSave = {
        assignments: state.data.assignments,
        selectedDate: state.selectedDate.toISOString(),
        timestamp: new Date().toISOString()
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
    } catch (error) {
      console.warn('Failed to save planning data to localStorage:', error)
    }
  }, [state.data.assignments, state.selectedDate])

  const loadFromStorage = useCallback(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY)
      if (savedData) {
        const parsed = JSON.parse(savedData)
        
        // Only load if data is recent (within 24 hours)
        const savedTime = new Date(parsed.timestamp)
        const now = new Date()
        const hoursDiff = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60)
        
        if (hoursDiff < 24 && parsed.assignments) {
          dispatch({
            type: 'SET_DATA',
            payload: {
              ...state.data,
              assignments: parsed.assignments
            }
          })
          
          if (parsed.selectedDate) {
            dispatch({
              type: 'SET_SELECTED_DATE',
              payload: new Date(parsed.selectedDate)
            })
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load planning data from localStorage:', error)
    }
  }, [state.data])

  // Auto-save to localStorage as backup
  useEffect(() => {
    if (state.data.assignments.length > 0) {
      saveToStorage()
    }
  }, [state.data.assignments, saveToStorage])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue: PlanningContextType = useMemo(() => ({
    state,
    dispatch,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    setSelectedDate,
    loadPlanningData,
    forceSave,
    resolveConflict,
    resolveConflictWithResolution,
    // Legacy methods
    saveToStorage,
    loadFromStorage
  }), [
    state,
    dispatch,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    setSelectedDate,
    loadPlanningData,
    forceSave,
    resolveConflict,
    resolveConflictWithResolution,
    saveToStorage,
    loadFromStorage
  ])

  return (
    <PlanningContext.Provider value={contextValue}>
      {children}
    </PlanningContext.Provider>
  )
}

export const usePlanning = (): PlanningContextType => {
  const context = useContext(PlanningContext)
  if (!context) {
    throw new Error('usePlanning must be used within a PlanningProvider')
  }
  return context
}
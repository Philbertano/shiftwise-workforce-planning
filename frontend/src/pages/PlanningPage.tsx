import React, { useState } from 'react'
import { PlanningBoard } from '../components/PlanningBoard/PlanningBoard'
import { PersistenceStatus } from '../components/PlanningBoard/PersistenceStatus'
import { ConflictNotification, ConflictResolutionModal } from '../components/ConflictResolution'
import { Assignment } from '../types'
import { usePlanning } from '../contexts/PlanningContext'
import { AssignmentConflict, ConflictResolution } from '../services/planningPersistenceService'

export const PlanningPage: React.FC = () => {
  const { 
    state, 
    addAssignment, 
    updateAssignment, 
    deleteAssignment, 
    setSelectedDate,
    resolveConflictWithResolution,
    dispatch
  } = usePlanning()

  const [activeConflict, setActiveConflict] = useState<AssignmentConflict | null>(null)
  const [isConflictModalVisible, setIsConflictModalVisible] = useState(false)

  const handleAssignmentChange = async (assignment: Assignment) => {
    try {
      const existingAssignment = state.data.assignments.find(a => a.id === assignment.id)
      
      if (existingAssignment) {
        await updateAssignment(assignment)
      } else {
        await addAssignment(assignment)
      }
    } catch (error) {
      console.error('Failed to save assignment:', error)
      // Error is already handled by the context and shown in the UI
    }
  }

  const handleAssignmentDelete = async (assignmentId: string) => {
    try {
      await deleteAssignment(assignmentId)
    } catch (error) {
      console.error('Failed to delete assignment:', error)
      // Error is already handled by the context and shown in the UI
    }
  }

  const handleDateChange = async (date: Date) => {
    try {
      await setSelectedDate(date)
    } catch (error) {
      console.error('Failed to change date:', error)
      // Error is already handled by the context and shown in the UI
    }
  }

  const handleResolveConflict = (conflictId: string) => {
    const conflict = state.conflicts.find(c => c.id === conflictId)
    if (conflict) {
      setActiveConflict(conflict)
      setIsConflictModalVisible(true)
    }
  }

  const handleDismissConflict = (conflictId: string) => {
    dispatch({ type: 'REMOVE_CONFLICT', payload: conflictId })
  }

  const handleConflictResolution = async (resolution: ConflictResolution) => {
    if (activeConflict) {
      try {
        await resolveConflictWithResolution(activeConflict.id, resolution)
        setIsConflictModalVisible(false)
        setActiveConflict(null)
      } catch (error) {
        console.error('Failed to resolve conflict:', error)
        // Error is already handled by the context
      }
    }
  }

  const handleCancelConflictResolution = () => {
    setIsConflictModalVisible(false)
    setActiveConflict(null)
  }

  // Get local and remote assignments for conflict resolution
  const getConflictAssignments = (conflict: AssignmentConflict) => {
    const localAssignment = state.data.assignments.find(a => 
      conflict.affectedAssignments.includes(a.id)
    )
    // Remote assignment would come from the conflict data in a real implementation
    const remoteAssignment = localAssignment // Placeholder
    
    return { localAssignment, remoteAssignment }
  }

  const conflictAssignments = activeConflict ? getConflictAssignments(activeConflict) : { localAssignment: undefined, remoteAssignment: undefined }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Production Shift Planning</h1>
        <p>Interactive manufacturing shift planning and production line worker assignments</p>
      </div>
      <div className="page-content">
        <PlanningBoard
          data={state.data}
          selectedDate={state.selectedDate}
          onAssignmentChange={handleAssignmentChange}
          onAssignmentDelete={handleAssignmentDelete}
          onDateChange={handleDateChange}
        />
        <PersistenceStatus />
      </div>

      {/* Conflict Notifications */}
      {state.conflicts.length > 0 && (
        <ConflictNotification
          conflicts={state.conflicts}
          onResolveConflict={handleResolveConflict}
          onDismiss={handleDismissConflict}
        />
      )}

      {/* Conflict Resolution Modal */}
      {activeConflict && (
        <ConflictResolutionModal
          conflict={activeConflict}
          localAssignment={conflictAssignments.localAssignment}
          remoteAssignment={conflictAssignments.remoteAssignment}
          onResolve={handleConflictResolution}
          onCancel={handleCancelConflictResolution}
          isVisible={isConflictModalVisible}
        />
      )}
    </div>
  )
}
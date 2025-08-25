import React, { useState, useMemo, useCallback } from 'react'
import { format, addDays, startOfWeek } from 'date-fns'
import { ProductionLineStatus } from './ProductionLineStatus'
import { StaffingLevelMonitor } from './StaffingLevelMonitor'
import { AutomotiveKPICards } from './AutomotiveKPICards'
import { ProductionEfficiencyChart } from './ProductionEfficiencyChart'
import { SkillCoverageMatrix } from './SkillCoverageMatrix'
import { SafetyComplianceIndicator } from './SafetyComplianceIndicator'
import { Station, ProductionLine, CoverageStatus, Gap, ShiftTemplate } from '../../types'
import './AutomotiveDashboard.css'

interface AutomotiveDashboardData {
  productionLines: ProductionLine[]
  stations: Station[]
  shifts: ShiftTemplate[]
  coverageStatus: CoverageStatus[]
  gaps: Gap[]
  staffingLevels: StaffingLevel[]
  kpiData: AutomotiveKPIData
  efficiencyData: EfficiencyDataPoint[]
  skillCoverage: SkillCoverageData[]
  safetyCompliance: SafetyComplianceData
}

interface StaffingLevel {
  productionLineId: string
  shiftId: string
  required: number
  assigned: number
  efficiency: number
  status: 'optimal' | 'understaffed' | 'overstaffed' | 'critical'
}

interface AutomotiveKPIData {
  overallEfficiency: number
  productionRate: number
  qualityScore: number
  safetyIncidents: number
  staffingEfficiency: number
  lineUtilization: number
}

interface EfficiencyDataPoint {
  timestamp: Date
  productionLineId: string
  efficiency: number
  throughput: number
  staffingLevel: number
}

interface SkillCoverageData {
  skillId: string
  skillName: string
  category: string
  required: number
  available: number
  coverage: number
  critical: boolean
}

interface SafetyComplianceData {
  overallScore: number
  certificationCompliance: number
  ppeCompliance: number
  trainingCompliance: number
  incidentRate: number
  lastIncident?: Date
}

interface AutomotiveDashboardProps {
  data: AutomotiveDashboardData
  selectedDate: Date
  onDateChange: (date: Date) => void
  onProductionLineClick?: (lineId: string) => void
  onStaffingAlert?: (alert: StaffingAlert) => void
}

interface StaffingAlert {
  type: 'understaffed' | 'overstaffed' | 'skill_gap' | 'safety_violation'
  productionLineId: string
  shiftId: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
}

export const AutomotiveDashboard: React.FC<AutomotiveDashboardProps> = React.memo(({
  data,
  selectedDate,
  onDateChange,
  onProductionLineClick,
  onStaffingAlert
}) => {
  const [selectedView, setSelectedView] = useState<'overview' | 'production' | 'staffing' | 'safety'>('overview')
  const [selectedProductionLine, setSelectedProductionLine] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(selectedDate, { weekStartsOn: 1 }))

  // Generate week dates
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Calculate automotive-specific metrics
  const automotiveMetrics = useMemo(() => {
    const totalLines = data.productionLines.length
    const activeLines = data.productionLines.filter(line => line.active).length
    const criticalStaffingIssues = data.staffingLevels.filter(level => level.status === 'critical').length
    const averageEfficiency = data.staffingLevels.reduce((sum, level) => sum + level.efficiency, 0) / data.staffingLevels.length || 0
    
    const skillGaps = data.skillCoverage.filter(skill => skill.coverage < 90).length
    const criticalSkillGaps = data.skillCoverage.filter(skill => skill.critical && skill.coverage < 100).length
    
    return {
      totalLines,
      activeLines,
      criticalStaffingIssues,
      averageEfficiency,
      skillGaps,
      criticalSkillGaps,
      safetyScore: data.safetyCompliance.overallScore
    }
  }, [data.productionLines, data.staffingLevels, data.skillCoverage, data.safetyCompliance])

  const handlePreviousWeek = useCallback(() => {
    const newWeekStart = addDays(weekStart, -7)
    setWeekStart(newWeekStart)
    onDateChange(newWeekStart)
  }, [weekStart, onDateChange])

  const handleNextWeek = useCallback(() => {
    const newWeekStart = addDays(weekStart, 7)
    setWeekStart(newWeekStart)
    onDateChange(newWeekStart)
  }, [weekStart, onDateChange])

  const handleProductionLineSelect = useCallback((lineId: string) => {
    setSelectedProductionLine(lineId)
    onProductionLineClick?.(lineId)
  }, [onProductionLineClick])

  const handleStaffingAlert = useCallback((alert: StaffingAlert) => {
    onStaffingAlert?.(alert)
  }, [onStaffingAlert])

  const handleViewChange = useCallback((view: 'overview' | 'production' | 'staffing' | 'safety') => {
    setSelectedView(view)
  }, [])

  return (
    <div className="automotive-dashboard">
      <div className="dashboard-header">
        <div className="header-controls">
          <div className="week-navigation">
            <button className="btn btn-secondary" onClick={handlePreviousWeek}>
              ← Previous Week
            </button>
            <h1 className="dashboard-title">
              Manufacturing Operations Dashboard - Week of {format(weekStart, 'MMM d, yyyy')}
            </h1>
            <button className="btn btn-secondary" onClick={handleNextWeek}>
              Next Week →
            </button>
          </div>

          <div className="view-selector">
            <button 
              className={`btn ${selectedView === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleViewChange('overview')}
            >
              Overview
            </button>
            <button 
              className={`btn ${selectedView === 'production' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleViewChange('production')}
            >
              Production Lines
            </button>
            <button 
              className={`btn ${selectedView === 'staffing' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleViewChange('staffing')}
            >
              Workforce
            </button>
            <button 
              className={`btn ${selectedView === 'safety' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleViewChange('safety')}
            >
              Safety & Compliance
            </button>
          </div>
        </div>

        <AutomotiveKPICards 
          kpiData={data.kpiData}
          metrics={automotiveMetrics}
        />
      </div>

      <div className="dashboard-content">
        {selectedView === 'overview' && (
          <div className="overview-grid">
            <div className="overview-section">
              <ProductionLineStatus
                productionLines={data.productionLines}
                staffingLevels={data.staffingLevels}
                onLineClick={handleProductionLineSelect}
                selectedLine={selectedProductionLine}
              />
            </div>
            <div className="overview-section">
              <StaffingLevelMonitor
                staffingLevels={data.staffingLevels}
                productionLines={data.productionLines}
                onAlert={handleStaffingAlert}
              />
            </div>
            <div className="overview-section">
              <ProductionEfficiencyChart
                data={data.efficiencyData}
                selectedLine={selectedProductionLine}
                timeRange="24h"
              />
            </div>
            <div className="overview-section">
              <SafetyComplianceIndicator
                complianceData={data.safetyCompliance}
                showDetails={false}
              />
            </div>
          </div>
        )}

        {selectedView === 'production' && (
          <div className="production-view">
            <ProductionLineStatus
              productionLines={data.productionLines}
              staffingLevels={data.staffingLevels}
              onLineClick={handleProductionLineSelect}
              selectedLine={selectedProductionLine}
              detailed={true}
            />
            <ProductionEfficiencyChart
              data={data.efficiencyData}
              selectedLine={selectedProductionLine}
              timeRange="7d"
            />
          </div>
        )}

        {selectedView === 'staffing' && (
          <div className="staffing-view">
            <StaffingLevelMonitor
              staffingLevels={data.staffingLevels}
              productionLines={data.productionLines}
              onAlert={handleStaffingAlert}
              detailed={true}
            />
            <SkillCoverageMatrix
              skillCoverage={data.skillCoverage}
              productionLines={data.productionLines}
            />
          </div>
        )}

        {selectedView === 'safety' && (
          <div className="safety-view">
            <SafetyComplianceIndicator
              complianceData={data.safetyCompliance}
              showDetails={true}
            />
            <SkillCoverageMatrix
              skillCoverage={data.skillCoverage.filter(skill => skill.category === 'safety')}
              productionLines={data.productionLines}
              title="Safety Skill Coverage"
            />
          </div>
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for performance optimization
  return (
    prevProps.selectedDate.getTime() === nextProps.selectedDate.getTime() &&
    prevProps.data.productionLines.length === nextProps.data.productionLines.length &&
    prevProps.data.staffingLevels.length === nextProps.data.staffingLevels.length &&
    prevProps.data.kpiData.overallEfficiency === nextProps.data.kpiData.overallEfficiency &&
    prevProps.data.safetyCompliance.overallScore === nextProps.data.safetyCompliance.overallScore
  )
})
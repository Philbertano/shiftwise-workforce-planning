import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { AutomotiveKPICards } from '../AutomotiveKPICards';

describe('AutomotiveKPICards', () => {
  const mockKPIData = {
    overallEfficiency: 85.5,
    productionRate: 142,
    qualityScore: 92.3,
    safetyIncidents: 2,
    staffingEfficiency: 78.9,
    lineUtilization: 94.7
  };

  const mockMetrics = {
    totalLines: 5,
    activeLines: 4,
    criticalStaffingIssues: 2,
    averageEfficiency: 85.5,
    skillGaps: 3,
    criticalSkillGaps: 1,
    safetyScore: 96.2
  };

  it('renders all KPI cards with correct values', () => {
    render(<AutomotiveKPICards kpiData={mockKPIData} metrics={mockMetrics} />);

    expect(screen.getByText('Overall Equipment Effectiveness')).toBeInTheDocument();
    expect(screen.getByText('85.5')).toBeInTheDocument();
    
    expect(screen.getByText('Quality Score')).toBeInTheDocument();
    expect(screen.getByText('92.3')).toBeInTheDocument();
    
    expect(screen.getByText('Production Rate')).toBeInTheDocument();
    expect(screen.getByText('142')).toBeInTheDocument();
    
    expect(screen.getByText('Workforce Efficiency')).toBeInTheDocument();
    expect(screen.getByText('78.9')).toBeInTheDocument();
    
    expect(screen.getByText('Line Utilization')).toBeInTheDocument();
    expect(screen.getByText('94.7')).toBeInTheDocument();
    
    expect(screen.getByText('Safety Performance')).toBeInTheDocument();
    expect(screen.getByText('96.2')).toBeInTheDocument();
  });

  it('applies correct status classes based on KPI values', () => {
    render(<AutomotiveKPICards kpiData={mockKPIData} metrics={mockMetrics} />);

    // Overall efficiency 85.5% should be excellent (>= 85)
    const efficiencyCard = screen.getByText('85.5').closest('.kpi-card');
    expect(efficiencyCard).toHaveClass('kpi-card--excellent');

    // Quality score 92.3% should be warning (< 95)
    const qualityCard = screen.getByText('92.3').closest('.kpi-card');
    expect(qualityCard).toHaveClass('kpi-card--warning');

    // Safety score 96.2% should be excellent (>= 95)
    const safetyCard = screen.getByText('96.2').closest('.kpi-card');
    expect(safetyCard).toHaveClass('kpi-card--excellent');
  });

  it('handles zero values correctly', () => {
    const zeroKPIData = {
      ...mockKPIData,
      overallEfficiency: 0,
      productionRate: 0
    };

    const zeroMetrics = {
      ...mockMetrics,
      safetyScore: 0
    };

    render(<AutomotiveKPICards kpiData={zeroKPIData} metrics={zeroMetrics} />);

    // Check that zero values are displayed (there may be multiple)
    expect(screen.getAllByText('0.0')).toHaveLength(2); // overallEfficiency and safetyScore
    expect(screen.getByText('0')).toBeInTheDocument(); // productionRate
  });

  it('displays trend indicators correctly', () => {
    render(<AutomotiveKPICards kpiData={mockKPIData} metrics={mockMetrics} />);

    // Should show trend icons (there may be multiple)
    expect(screen.getAllByText('↗️').length).toBeGreaterThan(0); // up trend
    expect(screen.getAllByText('→').length).toBeGreaterThan(0); // stable trend
  });

  it('shows correct icons for each KPI', () => {
    render(<AutomotiveKPICards kpiData={mockKPIData} metrics={mockMetrics} />);

    expect(screen.getByText('⚙️')).toBeInTheDocument(); // Overall Equipment Effectiveness
    expect(screen.getByText('🏭')).toBeInTheDocument(); // Production Rate
    expect(screen.getByText('✅')).toBeInTheDocument(); // Quality Score
    expect(screen.getByText('🛡️')).toBeInTheDocument(); // Safety Performance
    expect(screen.getByText('👥')).toBeInTheDocument(); // Workforce Efficiency
    expect(screen.getByText('📊')).toBeInTheDocument(); // Line Utilization
  });
});
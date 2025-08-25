import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { SafetyComplianceIndicator } from '../SafetyComplianceIndicator';

describe('SafetyComplianceIndicator', () => {
  const mockSafetyData = {
    overallScore: 94.5,
    certificationCompliance: 96.2,
    ppeCompliance: 89.1,
    trainingCompliance: 92.8,
    incidentRate: 2,
    lastIncident: new Date('2024-01-10T14:30:00Z')
  };

  it('displays overall compliance percentage', () => {
    render(<SafetyComplianceIndicator complianceData={mockSafetyData} />);

    expect(screen.getByText('94.5%')).toBeInTheDocument();
    expect(screen.getByText('Safety Score')).toBeInTheDocument();
    expect(screen.getByText('Safety & Compliance')).toBeInTheDocument();
  });

  it('shows incident rate and last incident date', () => {
    render(<SafetyComplianceIndicator complianceData={mockSafetyData} />);

    expect(screen.getByText('2.0')).toBeInTheDocument();
    expect(screen.getByText('Incident Rate')).toBeInTheDocument();
    expect(screen.getByText(/Jan 10, 2024/)).toBeInTheDocument();
  });

  it('displays compliance metrics with details', () => {
    render(<SafetyComplianceIndicator complianceData={mockSafetyData} showDetails={true} />);

    expect(screen.getByText('Certification Compliance')).toBeInTheDocument();
    expect(screen.getByText('PPE Compliance')).toBeInTheDocument();
    expect(screen.getByText('Training Compliance')).toBeInTheDocument();

    expect(screen.getByText('96.2%')).toBeInTheDocument(); // certification
    expect(screen.getByText('89.1%')).toBeInTheDocument(); // ppe
    expect(screen.getByText('92.8%')).toBeInTheDocument(); // training
  });

  it('shows compliance status based on scores', () => {
    render(<SafetyComplianceIndicator complianceData={mockSafetyData} />);

    expect(screen.getByText('Good')).toBeInTheDocument(); // overall score 94.5%
    expect(screen.getByText('Low Risk')).toBeInTheDocument(); // incident rate 2
  });

  it('displays recommended actions when details are shown', () => {
    const lowComplianceData = {
      ...mockSafetyData,
      certificationCompliance: 85,
      ppeCompliance: 80,
      trainingCompliance: 75,
      incidentRate: 5
    };

    render(<SafetyComplianceIndicator complianceData={lowComplianceData} showDetails={true} />);

    expect(screen.getByText('Recommended Actions')).toBeInTheDocument();
    expect(screen.getByText('Review and update worker certifications')).toBeInTheDocument();
    expect(screen.getByText('Conduct PPE compliance audit')).toBeInTheDocument();
    expect(screen.getByText('Schedule safety training sessions')).toBeInTheDocument();
    expect(screen.getByText('Investigate incident patterns')).toBeInTheDocument();
  });

  it('shows circular progress indicator', () => {
    render(<SafetyComplianceIndicator complianceData={mockSafetyData} />);

    const progressElement = document.querySelector('.circular-progress');
    expect(progressElement).toBeInTheDocument();
    
    const progressValue = screen.getByText('94.5%');
    expect(progressValue).toBeInTheDocument();
    
    const progressLabel = screen.getByText('Safety Score');
    expect(progressLabel).toBeInTheDocument();
  });

  it('applies correct status colors based on compliance scores', () => {
    render(<SafetyComplianceIndicator complianceData={mockSafetyData} />);

    const statusDot = document.querySelector('.status-dot');
    expect(statusDot).toBeInTheDocument();
    
    const statusText = screen.getByText('Good');
    expect(statusText).toBeInTheDocument();
  });

  it('handles zero incidents correctly', () => {
    const zeroIncidentData = {
      ...mockSafetyData,
      incidentRate: 0,
      lastIncident: undefined
    };

    render(<SafetyComplianceIndicator complianceData={zeroIncidentData} />);

    expect(screen.getByText('0.0')).toBeInTheDocument();
    expect(screen.getByText('Zero Incidents')).toBeInTheDocument();
    expect(screen.getByText('No recent incidents')).toBeInTheDocument();
  });

  it('shows excellent performance message for high scores', () => {
    const excellentData = {
      ...mockSafetyData,
      overallScore: 96,
      certificationCompliance: 98,
      ppeCompliance: 97,
      trainingCompliance: 96
    };

    render(<SafetyComplianceIndicator complianceData={excellentData} showDetails={true} />);

    expect(screen.getAllByText('Excellent').length).toBeGreaterThan(0);
    expect(screen.getByText('Excellent safety performance - maintain standards')).toBeInTheDocument();
  });

  it('displays metric descriptions in details view', () => {
    render(<SafetyComplianceIndicator complianceData={mockSafetyData} showDetails={true} />);

    expect(screen.getByText('Workers with valid certifications')).toBeInTheDocument();
    expect(screen.getByText('Personal protective equipment usage')).toBeInTheDocument();
    expect(screen.getByText('Completed safety training programs')).toBeInTheDocument();
  });
});
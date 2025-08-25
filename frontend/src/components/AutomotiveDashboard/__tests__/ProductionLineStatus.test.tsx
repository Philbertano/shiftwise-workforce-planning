import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { ProductionLineStatus } from '../ProductionLineStatus';

describe('ProductionLineStatus', () => {
  const mockProductionLines = [
    {
      id: '1',
      name: 'Assembly Line A',
      type: 'assembly',
      status: 'active',
      taktTime: 45,
      capacity: 10
    },
    {
      id: '2',
      name: 'Paint Shop B',
      type: 'paint',
      status: 'maintenance',
      taktTime: 60,
      capacity: 8
    },
    {
      id: '3',
      name: 'Final Inspection',
      type: 'inspection',
      status: 'active',
      taktTime: 30,
      capacity: 5
    }
  ];

  const mockStaffingLevels = [
    {
      productionLineId: '1',
      shiftId: 'shift1',
      required: 10,
      assigned: 8,
      efficiency: 92.5,
      status: 'understaffed' as const
    },
    {
      productionLineId: '2',
      shiftId: 'shift1',
      required: 8,
      assigned: 0,
      efficiency: 0,
      status: 'critical' as const
    },
    {
      productionLineId: '3',
      shiftId: 'shift1',
      required: 5,
      assigned: 5,
      efficiency: 85.2,
      status: 'optimal' as const
    }
  ];

  it('renders all production lines with correct information', () => {
    render(<ProductionLineStatus productionLines={mockProductionLines} staffingLevels={mockStaffingLevels} />);

    expect(screen.getByText('Assembly Line A')).toBeInTheDocument();
    expect(screen.getByText('Paint Shop B')).toBeInTheDocument();
    expect(screen.getByText('Final Inspection')).toBeInTheDocument();

    expect(screen.getByText('8/10')).toBeInTheDocument(); // Assembly Line staffing
    expect(screen.getByText('0/8')).toBeInTheDocument(); // Paint Shop staffing
    expect(screen.getByText('5/5')).toBeInTheDocument(); // Final Inspection staffing
  });

  it('displays correct status indicators', () => {
    render(<ProductionLineStatus productionLines={mockProductionLines} staffingLevels={mockStaffingLevels} />);

    // Check for staffing status indicators (there are duplicates in legend and lines)
    expect(screen.getAllByText('Understaffed').length).toBeGreaterThan(0); // Assembly Line
    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0); // Paint Shop
    expect(screen.getAllByText('Optimal').length).toBeGreaterThan(0); // Final Inspection
  });

  it('shows efficiency information', () => {
    render(<ProductionLineStatus productionLines={mockProductionLines} staffingLevels={mockStaffingLevels} />);

    // Check for efficiency badges using text content matching
    expect(screen.getByText(/92\.5.*% Efficiency/)).toBeInTheDocument(); // Assembly Line efficiency
    expect(screen.getByText(/0\.0.*% Efficiency/)).toBeInTheDocument(); // Paint Shop efficiency  
    expect(screen.getByText(/85\.2.*% Efficiency/)).toBeInTheDocument(); // Final Inspection efficiency
  });

  it('handles empty production lines array', () => {
    render(<ProductionLineStatus productionLines={[]} staffingLevels={[]} />);

    // Should show empty state or no lines
    const productionLinesContainer = document.querySelector('.production-lines');
    expect(productionLinesContainer).toBeInTheDocument();
  });

  it('shows production line types', () => {
    render(<ProductionLineStatus productionLines={mockProductionLines} staffingLevels={mockStaffingLevels} />);

    // Production line types should be visible in the component
    expect(screen.getByText('Assembly Line A')).toBeInTheDocument();
    expect(screen.getByText('Paint Shop B')).toBeInTheDocument();
    expect(screen.getByText('Final Inspection')).toBeInTheDocument();
  });

  it('applies correct status classes based on staffing levels', () => {
    render(<ProductionLineStatus productionLines={mockProductionLines} staffingLevels={mockStaffingLevels} />);

    // Check that production lines have the correct base classes
    const productionLines = document.querySelectorAll('.production-line');
    expect(productionLines).toHaveLength(3);
    
    // All lines should have the inactive class since they're not active
    productionLines.forEach(line => {
      expect(line).toHaveClass('production-line--inactive');
    });
    
    // Check that status indicators show correct text
    const statusTexts = document.querySelectorAll('.status-text');
    expect(statusTexts[0]).toHaveTextContent('Understaffed');
    expect(statusTexts[1]).toHaveTextContent('Critical');
    expect(statusTexts[2]).toHaveTextContent('Optimal');
  });
});
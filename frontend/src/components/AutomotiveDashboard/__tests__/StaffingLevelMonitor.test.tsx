import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { StaffingLevelMonitor } from '../StaffingLevelMonitor';

describe('StaffingLevelMonitor', () => {
  const mockStaffingData = [
    {
      stationId: '1',
      stationName: 'Assembly Station 1',
      currentStaffing: 8,
      requiredStaffing: 10,
      shift: 'Day Shift',
      skills: ['Welding', 'Assembly'],
      status: 'understaffed' as const
    },
    {
      stationId: '2',
      stationName: 'Paint Booth 2',
      currentStaffing: 6,
      requiredStaffing: 6,
      shift: 'Day Shift',
      skills: ['Painting', 'Quality Control'],
      status: 'optimal' as const
    },
    {
      stationId: '3',
      stationName: 'Final Inspection',
      currentStaffing: 5,
      requiredStaffing: 4,
      shift: 'Night Shift',
      skills: ['Inspection', 'Documentation'],
      status: 'overstaffed' as const
    }
  ];

  it('renders all stations with staffing information', () => {
    render(<StaffingLevelMonitor staffingData={mockStaffingData} />);

    expect(screen.getByText('Assembly Station 1')).toBeInTheDocument();
    expect(screen.getByText('Paint Booth 2')).toBeInTheDocument();
    expect(screen.getByText('Final Inspection')).toBeInTheDocument();

    expect(screen.getByText('8/10')).toBeInTheDocument();
    expect(screen.getByText('6/6')).toBeInTheDocument();
    expect(screen.getByText('5/4')).toBeInTheDocument();
  });

  it('displays correct status indicators and colors', () => {
    render(<StaffingLevelMonitor staffingData={mockStaffingData} />);

    const understaffedElement = screen.getByText('8/10').closest('.staffing-level');
    expect(understaffedElement).toHaveClass('understaffed');

    const optimalElement = screen.getByText('6/6').closest('.staffing-level');
    expect(optimalElement).toHaveClass('optimal');

    const overstaffedElement = screen.getByText('5/4').closest('.staffing-level');
    expect(overstaffedElement).toHaveClass('overstaffed');
  });

  it('shows shift information for each station', () => {
    render(<StaffingLevelMonitor staffingData={mockStaffingData} />);

    const dayShiftElements = screen.getAllByText('Day Shift');
    expect(dayShiftElements).toHaveLength(2);

    expect(screen.getByText('Night Shift')).toBeInTheDocument();
  });

  it('displays required skills for each station', () => {
    render(<StaffingLevelMonitor staffingData={mockStaffingData} />);

    expect(screen.getByText('Welding')).toBeInTheDocument();
    expect(screen.getByText('Assembly')).toBeInTheDocument();
    expect(screen.getByText('Painting')).toBeInTheDocument();
    expect(screen.getByText('Quality Control')).toBeInTheDocument();
    expect(screen.getByText('Inspection')).toBeInTheDocument();
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });

  it('calculates and displays staffing percentage', () => {
    render(<StaffingLevelMonitor staffingData={mockStaffingData} />);

    // 8/10 = 80%
    expect(screen.getByText('80%')).toBeInTheDocument();
    // 6/6 = 100%
    expect(screen.getByText('100%')).toBeInTheDocument();
    // 5/4 = 125%
    expect(screen.getByText('125%')).toBeInTheDocument();
  });

  it('handles empty staffing data', () => {
    render(<StaffingLevelMonitor staffingData={[]} />);

    expect(screen.getByText('No staffing data available')).toBeInTheDocument();
  });

  it('shows alert icons for understaffed stations', () => {
    render(<StaffingLevelMonitor staffingData={mockStaffingData} />);

    const understaffedStation = screen.getByText('Assembly Station 1').closest('.station-card');
    expect(understaffedStation?.querySelector('.alert-icon')).toBeInTheDocument();
  });

  it('groups stations by shift when showByShift prop is true', () => {
    render(<StaffingLevelMonitor staffingData={mockStaffingData} showByShift={true} />);

    expect(screen.getByText('Day Shift Stations')).toBeInTheDocument();
    expect(screen.getByText('Night Shift Stations')).toBeInTheDocument();
  });
});
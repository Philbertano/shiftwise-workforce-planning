import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { SkillCoverageMatrix } from '../SkillCoverageMatrix';

describe('SkillCoverageMatrix', () => {
  const mockSkillCoverage = [
    {
      skillId: '1',
      skillName: 'Welding',
      requiredLevel: 'Advanced',
      availableEmployees: 12,
      requiredEmployees: 15,
      coveragePercentage: 80,
      criticalShortage: true,
      stations: ['Assembly Line A', 'Body Shop']
    },
    {
      skillId: '2',
      skillName: 'Quality Control',
      requiredLevel: 'Intermediate',
      availableEmployees: 8,
      requiredEmployees: 8,
      coveragePercentage: 100,
      criticalShortage: false,
      stations: ['Final Inspection', 'Paint Shop']
    },
    {
      skillId: '3',
      skillName: 'Machine Operation',
      requiredLevel: 'Basic',
      availableEmployees: 20,
      requiredEmployees: 18,
      coveragePercentage: 111,
      criticalShortage: false,
      stations: ['Assembly Line A', 'Assembly Line B', 'Paint Shop']
    }
  ];

  it('renders skill coverage matrix with all skills', () => {
    render(<SkillCoverageMatrix skillCoverage={mockSkillCoverage} />);

    expect(screen.getByText('Welding')).toBeInTheDocument();
    expect(screen.getByText('Quality Control')).toBeInTheDocument();
    expect(screen.getByText('Machine Operation')).toBeInTheDocument();
  });

  it('displays coverage percentages correctly', () => {
    render(<SkillCoverageMatrix skillCoverage={mockSkillCoverage} />);

    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('111%')).toBeInTheDocument();
  });

  it('shows employee counts (available/required)', () => {
    render(<SkillCoverageMatrix skillCoverage={mockSkillCoverage} />);

    expect(screen.getByText('12/15')).toBeInTheDocument();
    expect(screen.getByText('8/8')).toBeInTheDocument();
    expect(screen.getByText('20/18')).toBeInTheDocument();
  });

  it('displays required skill levels', () => {
    render(<SkillCoverageMatrix skillCoverage={mockSkillCoverage} />);

    expect(screen.getByText('Advanced')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByText('Basic')).toBeInTheDocument();
  });

  it('highlights critical shortages', () => {
    render(<SkillCoverageMatrix skillCoverage={mockSkillCoverage} />);

    const weldingRow = screen.getByText('Welding').closest('.skill-row');
    expect(weldingRow).toHaveClass('critical-shortage');

    const qualityRow = screen.getByText('Quality Control').closest('.skill-row');
    expect(qualityRow).not.toHaveClass('critical-shortage');
  });

  it('shows stations where skills are required', () => {
    render(<SkillCoverageMatrix skillCoverage={mockSkillCoverage} />);

    expect(screen.getByText('Assembly Line A')).toBeInTheDocument();
    expect(screen.getByText('Body Shop')).toBeInTheDocument();
    expect(screen.getByText('Final Inspection')).toBeInTheDocument();
    expect(screen.getByText('Paint Shop')).toBeInTheDocument();
    expect(screen.getByText('Assembly Line B')).toBeInTheDocument();
  });

  it('applies correct status classes based on coverage percentage', () => {
    render(<SkillCoverageMatrix skillCoverage={mockSkillCoverage} />);

    // 80% coverage should be warning
    const lowCoverage = screen.getByText('80%').closest('.coverage-cell');
    expect(lowCoverage).toHaveClass('warning');

    // 100% coverage should be good
    const goodCoverage = screen.getByText('100%').closest('.coverage-cell');
    expect(goodCoverage).toHaveClass('good');

    // 111% coverage should be excellent
    const excellentCoverage = screen.getByText('111%').closest('.coverage-cell');
    expect(excellentCoverage).toHaveClass('excellent');
  });

  it('handles empty skill coverage data', () => {
    render(<SkillCoverageMatrix skillCoverage={[]} />);

    expect(screen.getByText('No skill coverage data available')).toBeInTheDocument();
  });

  it('shows shortage indicators for skills below 100% coverage', () => {
    render(<SkillCoverageMatrix skillCoverage={mockSkillCoverage} />);

    const weldingRow = screen.getByText('Welding').closest('.skill-row');
    expect(weldingRow?.querySelector('.shortage-indicator')).toBeInTheDocument();
  });

  it('displays skill matrix in tabular format', () => {
    render(<SkillCoverageMatrix skillCoverage={mockSkillCoverage} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Skill')).toBeInTheDocument();
    expect(screen.getByText('Level')).toBeInTheDocument();
    expect(screen.getByText('Coverage')).toBeInTheDocument();
    expect(screen.getByText('Employees')).toBeInTheDocument();
    expect(screen.getByText('Stations')).toBeInTheDocument();
  });
});
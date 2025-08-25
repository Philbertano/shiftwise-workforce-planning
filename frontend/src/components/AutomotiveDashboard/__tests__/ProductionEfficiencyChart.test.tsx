import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { ProductionEfficiencyChart } from '../ProductionEfficiencyChart';

// Mock Chart.js
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
}));

vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="efficiency-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
}));

describe('ProductionEfficiencyChart', () => {
  const mockEfficiencyData = [
    {
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      productionLineId: 'line1',
      efficiency: 85.2,
      throughput: 142,
      staffingLevel: 8
    },
    {
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      productionLineId: 'line1',
      efficiency: 92.1,
      throughput: 156,
      staffingLevel: 8
    },
    {
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      productionLineId: 'line1',
      efficiency: 88.7,
      throughput: 148,
      staffingLevel: 7
    },
    {
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      productionLineId: 'line1',
      efficiency: 94.3,
      throughput: 162,
      staffingLevel: 8
    }
  ];

  it('renders the efficiency chart component', () => {
    render(<ProductionEfficiencyChart data={mockEfficiencyData} timeRange="24h" />);

    expect(screen.getByTestId('efficiency-chart')).toBeInTheDocument();
    expect(screen.getByText('Production Efficiency Trend')).toBeInTheDocument();
  });

  it('passes correct data to the chart', () => {
    render(<ProductionEfficiencyChart data={mockEfficiencyData} timeRange="24h" />);

    const chartData = screen.getByTestId('chart-data');
    const data = JSON.parse(chartData.textContent || '{}');

    expect(data.labels).toEqual(['Jan 15', 'Jan 16', 'Jan 17', 'Jan 18']);
    expect(data.datasets).toHaveLength(2); // Efficiency and Target lines
    expect(data.datasets[0].label).toBe('Actual Efficiency');
    expect(data.datasets[1].label).toBe('Target');
  });

  it('displays efficiency values correctly in chart data', () => {
    render(<ProductionEfficiencyChart data={mockEfficiencyData} timeRange="24h" />);

    const chartData = screen.getByTestId('chart-data');
    const data = JSON.parse(chartData.textContent || '{}');

    expect(data.datasets[0].data).toEqual([85.2, 92.1, 88.7, 94.3]);
    expect(data.datasets[1].data).toEqual([90.0, 90.0, 90.0, 90.0]);
  });

  it('configures chart options correctly', () => {
    render(<ProductionEfficiencyChart data={mockEfficiencyData} timeRange="24h" />);

    const chartOptions = screen.getByTestId('chart-options');
    const options = JSON.parse(chartOptions.textContent || '{}');

    expect(options.responsive).toBe(true);
    expect(options.plugins.title.display).toBe(true);
    expect(options.plugins.title.text).toBe('Production Efficiency Over Time');
  });

  it('shows current efficiency statistics', () => {
    render(<ProductionEfficiencyChart data={mockEfficiencyData} timeRange="24h" />);

    // Should show peak efficiency
    expect(screen.getByText('94.3%')).toBeInTheDocument();
    expect(screen.getByText('Peak Efficiency')).toBeInTheDocument();

    // Should show average efficiency
    const average = (85.2 + 92.1 + 88.7 + 94.3) / 4;
    expect(screen.getByText(`${average.toFixed(1)}%`)).toBeInTheDocument();
  });

  it('displays target vs actual comparison', () => {
    render(<ProductionEfficiencyChart data={mockEfficiencyData} timeRange="24h" />);

    expect(screen.getByText('Excellent Performance')).toBeInTheDocument();
    expect(screen.getByText('Improving')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    render(<ProductionEfficiencyChart data={[]} timeRange="24h" />);

    expect(screen.getByText('No efficiency data available for the selected time range')).toBeInTheDocument();
  });

  it('shows trend indicators', () => {
    render(<ProductionEfficiencyChart data={mockEfficiencyData} timeRange="24h" />);

    // Should show if trend is improving or declining
    expect(screen.getByText(/trend/i)).toBeInTheDocument();
  });

  it('displays output information when showOutput prop is true', () => {
    render(<ProductionEfficiencyChart data={mockEfficiencyData} timeRange="24h" showOutput={true} />);

    expect(screen.getByText('Actual Output: 162')).toBeInTheDocument();
    expect(screen.getByText('Planned Output: 172')).toBeInTheDocument();
  });

  it('applies correct styling for efficiency levels', () => {
    render(<ProductionEfficiencyChart data={mockEfficiencyData} timeRange="24h" />);

    const chartContainer = screen.getByTestId('efficiency-chart').closest('.efficiency-chart');
    expect(chartContainer).toHaveClass('production-efficiency-chart');
  });

  it('shows time period selector when multiple periods available', () => {
    const extendedData = [
      ...mockEfficiencyData,
      ...Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000), // 10 days ago to 1 day ago
        productionLineId: 'line1',
        efficiency: 90 + Math.random() * 10,
        throughput: 150 + Math.random() * 20,
        staffingLevel: 8
      }))
    ];

    render(<ProductionEfficiencyChart data={extendedData} timeRange="24h" showPeriodSelector={true} />);

    expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
  });
});
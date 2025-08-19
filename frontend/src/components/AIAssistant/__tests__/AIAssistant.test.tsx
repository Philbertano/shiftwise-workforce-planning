import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AIAssistant, { AIAssistantProps, OptimizationSuggestion } from '../AIAssistant';

// Mock handlers
const mockOnGeneratePlan = vi.fn();
const mockOnExplainPlan = vi.fn();
const mockOnSimulateAbsence = vi.fn();
const mockOnGetOptimizations = vi.fn();

const defaultProps: AIAssistantProps = {
  onGeneratePlan: mockOnGeneratePlan,
  onExplainPlan: mockOnExplainPlan,
  onSimulateAbsence: mockOnSimulateAbsence,
  onGetOptimizations: mockOnGetOptimizations
};

const mockPlanResult = {
  success: true,
  planId: 'plan-123',
  assignments: [{ id: 'assignment-1' }, { id: 'assignment-2' }],
  coveragePercentage: 85.5,
  gaps: 2,
  explanation: 'Generated plan with good coverage and minimal gaps'
};

const mockExplanationResult = {
  success: true,
  explanation: 'This plan optimizes coverage while maintaining fairness',
  reasoning: [
    'Evaluated 50 potential assignments',
    'Applied skill matching constraints',
    'Balanced workload distribution'
  ],
  alternatives: [
    'Consider overtime for critical gaps',
    'Review skill requirements for flexibility'
  ],
  constraints: [
    'All labor law requirements satisfied',
    'Skill requirements met for 90% of assignments'
  ]
};

const mockSimulationResult = {
  success: true,
  impactSummary: 'Absence would reduce coverage by 15% affecting 3 stations',
  coverageChange: -15.2,
  affectedStations: ['Station A', 'Station B', 'Station C'],
  recommendations: [
    'Consider overtime assignments',
    'Review backup staff availability'
  ],
  riskLevel: 'medium'
};

const mockOptimizationSuggestions: OptimizationSuggestion[] = [
  {
    type: 'overtime',
    description: 'Approve overtime for critical coverage gaps',
    impact: 'Immediate coverage improvement',
    priority: 'high',
    estimatedCost: 500
  },
  {
    type: 'training',
    description: 'Cross-train employees for Station A',
    impact: 'Long-term flexibility improvement',
    priority: 'medium',
    estimatedCost: 2000
  }
];

describe('AIAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnGeneratePlan.mockResolvedValue(mockPlanResult);
    mockOnExplainPlan.mockResolvedValue(mockExplanationResult);
    mockOnSimulateAbsence.mockResolvedValue(mockSimulationResult);
    mockOnGetOptimizations.mockResolvedValue(mockOptimizationSuggestions);
  });

  it('renders with welcome message', () => {
    render(<AIAssistant {...defaultProps} />);
    
    expect(screen.getByText('AI Planning Assistant')).toBeInTheDocument();
    expect(screen.getByText(/Hello! I'm your AI workforce planning assistant/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask me to generate plans/)).toBeInTheDocument();
  });

  it('displays quick command buttons', () => {
    render(<AIAssistant {...defaultProps} />);
    
    expect(screen.getByText('Generate Plan')).toBeInTheDocument();
    expect(screen.getByText('Explain Plan')).toBeInTheDocument();
    expect(screen.getByText('Simulate Scenario')).toBeInTheDocument();
    expect(screen.getByText('Optimize')).toBeInTheDocument();
  });

  it('disables plan-dependent buttons when no active plan', () => {
    render(<AIAssistant {...defaultProps} />);
    
    expect(screen.getByText('Explain Plan')).toBeDisabled();
    expect(screen.getByText('Optimize')).toBeDisabled();
  });

  it('handles plan generation command', async () => {
    render(<AIAssistant {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/Ask me to generate plans/);
    const sendButton = screen.getByRole('button', { name: /➤/ });
    
    fireEvent.change(input, { target: { value: 'Generate a balanced shift plan for next week' } });
    fireEvent.click(sendButton);
    
    expect(mockOnGeneratePlan).toHaveBeenCalledWith(
      'Generate a balanced shift plan for next week',
      expect.objectContaining({
        start: expect.any(Date),
        end: expect.any(Date)
      })
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Plan Generated Successfully/)).toBeInTheDocument();
      expect(screen.getByText(/Plan ID: plan-123/)).toBeInTheDocument();
      expect(screen.getByText(/Coverage: 85.5%/)).toBeInTheDocument();
    });
  });

  it('shows plan ID in header after successful generation', async () => {
    render(<AIAssistant {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/Ask me to generate plans/);
    fireEvent.change(input, { target: { value: 'create a plan' } });
    fireEvent.click(screen.getByRole('button', { name: /➤/ }));
    
    await waitFor(() => {
      expect(screen.getByText('Active Plan: plan-123')).toBeInTheDocument();
    });
  });

  it('handles plan generation failure', async () => {
    mockOnGeneratePlan.mockResolvedValueOnce({
      success: false,
      message: 'Database connection failed'
    });
    
    render(<AIAssistant {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/Ask me to generate plans/);
    fireEvent.change(input, { target: { value: 'generate plan' } });
    fireEvent.click(screen.getByRole('button', { name: /➤/ }));
    
    await waitFor(() => {
      expect(screen.getByText(/Plan Generation Failed/)).toBeInTheDocument();
      expect(screen.getByText(/Database connection failed/)).toBeInTheDocument();
    });
  });

  it('handles explain plan command after plan generation', async () => {
    render(<AIAssistant {...defaultProps} />);
    
    // First generate a plan
    const input = screen.getByPlaceholderText(/Ask me to generate plans/);
    fireEvent.change(input, { target: { value: 'generate plan' } });
    fireEvent.click(screen.getByRole('button', { name: /➤/ }));
    
    await waitFor(() => screen.getByText('Active Plan: plan-123'));
    
    // Then explain it
    fireEvent.change(input, { target: { value: 'explain this plan' } });
    fireEvent.click(screen.getByRole('button', { name: /➤/ }));
    
    expect(mockOnExplainPlan).toHaveBeenCalledWith('plan-123');
    
    await waitFor(() => {
      expect(screen.getByText(/Plan Explanation/)).toBeInTheDocument();
      expect(screen.getByText(/This plan optimizes coverage/)).toBeInTheDocument();
    });
  });

  it('handles absence simulation command', async () => {
    render(<AIAssistant {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/Ask me to generate plans/);
    fireEvent.change(input, { target: { value: 'what if employee: emp-123 is absent?' } });
    fireEvent.click(screen.getByRole('button', { name: /➤/ }));
    
    expect(mockOnSimulateAbsence).toHaveBeenCalledWith(
      'emp-123',
      expect.objectContaining({
        start: expect.any(Date),
        end: expect.any(Date)
      })
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Simulation Results/)).toBeInTheDocument();
      expect(screen.getByText(/Coverage Change: -15.2%/)).toBeInTheDocument();
      expect(screen.getByText(/Risk Level: MEDIUM/)).toBeInTheDocument();
    });
  });

  it('handles optimization request after plan generation', async () => {
    render(<AIAssistant {...defaultProps} />);
    
    // First generate a plan
    const input = screen.getByPlaceholderText(/Ask me to generate plans/);
    fireEvent.change(input, { target: { value: 'generate plan' } });
    fireEvent.click(screen.getByRole('button', { name: /➤/ }));
    
    await waitFor(() => screen.getByText('Active Plan: plan-123'));
    
    // Then request optimization
    fireEvent.change(input, { target: { value: 'how can I optimize this plan?' } });
    fireEvent.click(screen.getByRole('button', { name: /➤/ }));
    
    expect(mockOnGetOptimizations).toHaveBeenCalledWith('plan-123');
    
    await waitFor(() => {
      expect(screen.getByText(/Optimization Suggestions/)).toBeInTheDocument();
      expect(screen.getByText(/I found 2 ways to improve/)).toBeInTheDocument();
    });
  });

  it('handles help request', async () => {
    render(<AIAssistant {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/Ask me to generate plans/);
    fireEvent.change(input, { target: { value: 'help' } });
    fireEvent.click(screen.getByRole('button', { name: /➤/ }));
    
    await waitFor(() => {
      expect(screen.getByText(/I can help you with:/)).toBeInTheDocument();
      expect(screen.getByText(/Generate Plans/)).toBeInTheDocument();
      expect(screen.getByText(/Explain Decisions/)).toBeInTheDocument();
    });
  });

  it('handles unknown commands gracefully', async () => {
    render(<AIAssistant {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/Ask me to generate plans/);
    fireEvent.change(input, { target: { value: 'random unknown command' } });
    fireEvent.click(screen.getByRole('button', { name: /➤/ }));
    
    await waitFor(() => {
      expect(screen.getByText(/Could you be more specific?/)).toBeInTheDocument();
    });
  });

  it('populates input with quick command text', () => {
    render(<AIAssistant {...defaultProps} />);
    
    const generateButton = screen.getByText('Generate Plan');
    fireEvent.click(generateButton);
    
    const input = screen.getByPlaceholderText(/Ask me to generate plans/);
    expect(input).toHaveValue('Generate a balanced plan for next week');
  });

  it('prevents submission of empty messages', () => {
    render(<AIAssistant {...defaultProps} />);
    
    const sendButton = screen.getByRole('button', { name: /➤/ });
    expect(sendButton).toBeDisabled();
    
    const input = screen.getByPlaceholderText(/Ask me to generate plans/);
    fireEvent.change(input, { target: { value: '   ' } }); // Only whitespace
    expect(sendButton).toBeDisabled();
  });

  it('clears input after sending message', async () => {
    render(<AIAssistant {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/Ask me to generate plans/);
    fireEvent.change(input, { target: { value: 'test message' } });
    fireEvent.click(screen.getByRole('button', { name: /➤/ }));
    
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  it('handles service errors gracefully', async () => {
    mockOnGeneratePlan.mockRejectedValueOnce(new Error('Network error'));
    
    render(<AIAssistant {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/Ask me to generate plans/);
    fireEvent.change(input, { target: { value: 'generate plan' } });
    fireEvent.click(screen.getByRole('button', { name: /➤/ }));
    
    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
    });
  });

  it('handles missing service handlers', async () => {
    render(<AIAssistant onGeneratePlan={undefined} />);
    
    const input = screen.getByPlaceholderText(/Ask me to generate plans/);
    fireEvent.change(input, { target: { value: 'generate plan' } });
    fireEvent.click(screen.getByRole('button', { name: /➤/ }));
    
    await waitFor(() => {
      expect(screen.getByText(/Plan generation is not available/)).toBeInTheDocument();
    });
  });

  it('has proper ARIA labels and roles', () => {
    render(<AIAssistant {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /➤/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('handles form submission via Enter key', async () => {
    render(<AIAssistant {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/Ask me to generate plans/);
    fireEvent.change(input, { target: { value: 'generate plan' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    expect(mockOnGeneratePlan).toHaveBeenCalled();
  });

  it('displays reasoning chain in explanations', async () => {
    render(<AIAssistant {...defaultProps} />);
    
    // Generate plan first
    const input = screen.getByPlaceholderText(/Ask me to generate plans/);
    fireEvent.change(input, { target: { value: 'generate plan' } });
    fireEvent.click(screen.getByRole('button', { name: /➤/ }));
    
    await waitFor(() => screen.getByText('Active Plan: plan-123'));
    
    // Then explain
    fireEvent.change(input, { target: { value: 'why was this plan created?' } });
    fireEvent.click(screen.getByRole('button', { name: /➤/ }));
    
    await waitFor(() => {
      expect(screen.getByText(/Reasoning:/)).toBeInTheDocument();
      expect(screen.getByText(/1. Evaluated 50 potential assignments/)).toBeInTheDocument();
      expect(screen.getByText(/2. Applied skill matching constraints/)).toBeInTheDocument();
    });
  });

  it('displays simulation recommendations', async () => {
    render(<AIAssistant {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/Ask me to generate plans/);
    fireEvent.change(input, { target: { value: 'simulate absence' } });
    fireEvent.click(screen.getByRole('button', { name: /➤/ }));
    
    await waitFor(() => {
      expect(screen.getByText(/Recommendations:/)).toBeInTheDocument();
      expect(screen.getByText(/1. Consider overtime assignments/)).toBeInTheDocument();
      expect(screen.getByText(/2. Review backup staff availability/)).toBeInTheDocument();
    });
  });

  it('displays optimization suggestions with priorities', async () => {
    render(<AIAssistant {...defaultProps} />);
    
    // Generate plan first
    const input = screen.getByPlaceholderText(/Ask me to generate plans/);
    fireEvent.change(input, { target: { value: 'generate plan' } });
    fireEvent.click(screen.getByRole('button', { name: /➤/ }));
    
    await waitFor(() => screen.getByText('Active Plan: plan-123'));
    
    // Then get suggestions
    fireEvent.change(input, { target: { value: 'suggest improvements' } });
    fireEvent.click(screen.getByRole('button', { name: /➤/ }));
    
    await waitFor(() => {
      expect(screen.getByText(/OVERTIME/)).toBeInTheDocument();
      expect(screen.getByText(/TRAINING/)).toBeInTheDocument();
      expect(screen.getByText(/Estimated Cost: \$500/)).toBeInTheDocument();
      expect(screen.getByText(/Estimated Cost: \$2000/)).toBeInTheDocument();
    });
  });
});
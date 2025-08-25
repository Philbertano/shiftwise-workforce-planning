import React from 'react'
import { AIAssistant } from '../components/AIAssistant/AIAssistant'
import { aiAssistantService } from '../services/aiAssistantService'

export const AssistantPage: React.FC = () => {
  const handleGeneratePlan = async (instructions: string, dateRange: { start: Date; end: Date }) => {
    try {
      const response = await aiAssistantService.generatePlan({ instructions, dateRange });
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to generate plan');
    }
  };

  const handleExplainPlan = async (planId?: string, assignmentId?: string) => {
    try {
      const response = await aiAssistantService.explainPlan({ planId, assignmentId });
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to explain plan');
    }
  };

  const handleSimulateAbsence = async (employeeId: string, dateRange: { start: Date; end: Date }) => {
    try {
      const response = await aiAssistantService.simulateAbsence({ employeeId, dateRange });
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to simulate absence');
    }
  };

  const handleGetOptimizations = async (planId: string) => {
    try {
      const suggestions = await aiAssistantService.getOptimizations(planId);
      return suggestions;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get optimizations');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Manufacturing AI Assistant</h1>
        <p>Get AI-powered insights and assistance for production workforce planning</p>
      </div>
      <div className="page-content">
        <AIAssistant 
          onGeneratePlan={handleGeneratePlan}
          onExplainPlan={handleExplainPlan}
          onSimulateAbsence={handleSimulateAbsence}
          onGetOptimizations={handleGetOptimizations}
        />
      </div>
    </div>
  )
}
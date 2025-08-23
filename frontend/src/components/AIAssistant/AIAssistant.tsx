import React, { useState, useRef, useEffect } from 'react';
import './AIAssistant.css';

export interface AssistantMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    planId?: string;
    assignmentId?: string;
    suggestions?: OptimizationSuggestion[];
    reasoning?: string[];
  };
}

export interface OptimizationSuggestion {
  type: 'swap' | 'overtime' | 'training' | 'hiring' | 'optimize';
  description: string;
  impact: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost?: number;
}

export interface AIAssistantProps {
  onGeneratePlan?: (instructions: string, dateRange: { start: Date; end: Date }) => Promise<any>;
  onExplainPlan?: (planId?: string, assignmentId?: string) => Promise<any>;
  onSimulateAbsence?: (employeeId: string, dateRange: { start: Date; end: Date }) => Promise<any>;
  onGetOptimizations?: (planId: string) => Promise<OptimizationSuggestion[]>;
  className?: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  onGeneratePlan,
  onExplainPlan,
  onSimulateAbsence,
  onGetOptimizations,
  className = ''
}) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      type: 'assistant',
      content: 'Hello! I\'m your AI workforce planning assistant. I can help you generate shift plans, explain assignments, simulate scenarios, and provide optimization suggestions. What would you like to do?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (message: Omit<AssistantMessage, 'id' | 'timestamp'>) => {
    const newMessage: AssistantMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  const parseCommand = (input: string): { command: string; params: any } => {
    const lowerInput = input.toLowerCase();
    
    // Generate plan commands
    if (lowerInput.includes('generate') || lowerInput.includes('create') || lowerInput.includes('plan')) {
      return {
        command: 'generate_plan',
        params: {
          instructions: input,
          dateRange: getDateRangeFromInput(input)
        }
      };
    }
    
    // Explain commands
    if (lowerInput.includes('explain') || lowerInput.includes('why') || lowerInput.includes('reason')) {
      return {
        command: 'explain',
        params: {
          planId: currentPlanId,
          query: input
        }
      };
    }
    
    // Simulate commands
    if (lowerInput.includes('simulate') || lowerInput.includes('what if') || lowerInput.includes('absence')) {
      return {
        command: 'simulate',
        params: {
          query: input,
          dateRange: getDateRangeFromInput(input)
        }
      };
    }
    
    // Optimize commands
    if (lowerInput.includes('optimize') || lowerInput.includes('improve') || lowerInput.includes('suggest')) {
      return {
        command: 'optimize',
        params: {
          planId: currentPlanId
        }
      };
    }
    
    // Default to general query
    return {
      command: 'general',
      params: { query: input }
    };
  };

  const getDateRangeFromInput = (input: string): { start: Date; end: Date } => {
    // Simple date parsing - in a real implementation, this would be more sophisticated
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    return {
      start: today,
      end: nextWeek
    };
  };

  const handleGeneratePlan = async (params: any) => {
    if (!onGeneratePlan) {
      return 'Plan generation is not available. Please check your configuration.';
    }

    try {
      const result = await onGeneratePlan(params.instructions, params.dateRange);
      
      if (result.success) {
        setCurrentPlanId(result.planId);
        return {
          content: `✅ **Plan Generated Successfully**\n\n${result.explanation}\n\n**Plan ID:** ${result.planId}\n**Coverage:** ${result.coveragePercentage.toFixed(1)}%\n**Assignments:** ${result.assignments.length}\n**Gaps:** ${result.gaps}`,
          metadata: {
            planId: result.planId,
            suggestions: result.gaps > 0 ? [
              {
                type: 'optimize' as const,
                description: 'Get optimization suggestions for this plan',
                impact: 'Improve coverage and resolve gaps',
                priority: 'medium' as const
              }
            ] : []
          }
        };
      } else {
        return `❌ **Plan Generation Failed**\n\n${result.message}`;
      }
    } catch (error) {
      return `❌ **Error:** ${error.message}`;
    }
  };

  const handleExplain = async (params: any) => {
    if (!onExplainPlan) {
      return 'Plan explanation is not available. Please check your configuration.';
    }

    try {
      const result = await onExplainPlan(params.planId);
      
      if (result.success) {
        let content = `📋 **Plan Explanation**\n\n${result.explanation}`;
        
        if (result.reasoning.length > 0) {
          content += '\n\n**Reasoning:**\n';
          result.reasoning.forEach((reason, index) => {
            content += `${index + 1}. ${reason}\n`;
          });
        }
        
        if (result.alternatives.length > 0) {
          content += '\n\n**Alternative Options:**\n';
          result.alternatives.forEach((alt, index) => {
            content += `${index + 1}. ${alt}\n`;
          });
        }
        
        if (result.constraints.length > 0) {
          content += '\n\n**Constraints:**\n';
          result.constraints.forEach((constraint, index) => {
            content += `${index + 1}. ${constraint}\n`;
          });
        }
        
        return {
          content,
          metadata: {
            reasoning: result.reasoning,
            planId: params.planId
          }
        };
      } else {
        return '❌ **Explanation Failed**\n\nUnable to explain the plan. Please ensure a plan has been generated first.';
      }
    } catch (error) {
      return `❌ **Error:** ${error.message}`;
    }
  };

  const handleSimulate = async (params: any) => {
    if (!onSimulateAbsence) {
      return 'Simulation is not available. Please check your configuration.';
    }

    // Simple parsing to extract employee ID - in practice, this would be more sophisticated
    const employeeMatch = params.query.match(/employee[:\s]+(\w+)/i);
    const employeeId = employeeMatch ? employeeMatch[1] : 'employee-1';

    try {
      const result = await onSimulateAbsence(employeeId, params.dateRange);
      
      if (result.success) {
        let content = `🔮 **Simulation Results**\n\n${result.impactSummary}`;
        
        content += `\n\n**Impact Details:**\n`;
        content += `• Coverage Change: ${result.coverageChange > 0 ? '+' : ''}${result.coverageChange.toFixed(1)}%\n`;
        content += `• Risk Level: ${result.riskLevel.toUpperCase()}\n`;
        content += `• Affected Stations: ${result.affectedStations.length}\n`;
        
        if (result.recommendations.length > 0) {
          content += '\n\n**Recommendations:**\n';
          result.recommendations.forEach((rec, index) => {
            content += `${index + 1}. ${rec}\n`;
          });
        }
        
        return content;
      } else {
        return '❌ **Simulation Failed**\n\nUnable to run simulation. Please check your parameters.';
      }
    } catch (error) {
      return `❌ **Error:** ${error.message}`;
    }
  };

  const handleOptimize = async (params: any) => {
    if (!onGetOptimizations || !params.planId) {
      return 'Optimization suggestions are not available. Please generate a plan first.';
    }

    try {
      const suggestions = await onGetOptimizations(params.planId);
      
      if (suggestions.length === 0) {
        return '✨ **Great News!**\n\nYour current plan is already well-optimized. No immediate improvements needed.';
      }
      
      let content = `💡 **Optimization Suggestions**\n\nI found ${suggestions.length} ways to improve your plan:\n\n`;
      
      suggestions.forEach((suggestion, index) => {
        const priorityEmoji = {
          critical: '🚨',
          high: '⚠️',
          medium: '💡',
          low: 'ℹ️'
        }[suggestion.priority];
        
        content += `${index + 1}. ${priorityEmoji} **${suggestion.type.toUpperCase()}** (${suggestion.priority})\n`;
        content += `   ${suggestion.description}\n`;
        content += `   Impact: ${suggestion.impact}\n`;
        if (suggestion.estimatedCost) {
          content += `   Estimated Cost: $${suggestion.estimatedCost}\n`;
        }
        content += '\n';
      });
      
      return {
        content,
        metadata: {
          suggestions,
          planId: params.planId
        }
      };
    } catch (error) {
      return `❌ **Error:** ${error.message}`;
    }
  };

  const handleGeneralQuery = (params: any) => {
    const query = params.query.toLowerCase();
    
    if (query.includes('help') || query.includes('what can you do')) {
      return `🤖 **I can help you with:**

• **Generate Plans**: "Generate a shift plan for next week" or "Create a balanced schedule"
• **Explain Decisions**: "Explain this plan" or "Why was John assigned to Station A?"
• **Simulate Scenarios**: "What if employee-123 is absent tomorrow?" or "Simulate sick leave"
• **Optimize Plans**: "How can I improve this plan?" or "Give me optimization suggestions"

**Tips:**
- Be specific about dates, employees, or stations when possible
- I remember the current plan context between messages
- Ask follow-up questions for more details`;
    }
    
    if (query.includes('status') || query.includes('current plan')) {
      if (currentPlanId) {
        return `📊 **Current Plan Status**\n\nPlan ID: ${currentPlanId}\n\nYou can ask me to explain this plan, optimize it, or run simulations against it.`;
      } else {
        return `📊 **Current Plan Status**\n\nNo active plan. Generate a new plan to get started!`;
      }
    }
    
    return `I understand you want to: "${params.query}"\n\nCould you be more specific? Try phrases like:
• "Generate a plan for..."
• "Explain why..."
• "What if..."
• "How can I optimize..."`;
  };

  const processCommand = async (command: string, params: any) => {
    switch (command) {
      case 'generate_plan':
        return await handleGeneratePlan(params);
      case 'explain':
        return await handleExplain(params);
      case 'simulate':
        return await handleSimulate(params);
      case 'optimize':
        return await handleOptimize(params);
      case 'general':
      default:
        return handleGeneralQuery(params);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isProcessing) return;
    
    const userInput = inputValue.trim();
    setInputValue('');
    setIsProcessing(true);
    
    // Add user message
    addMessage({
      type: 'user',
      content: userInput
    });
    
    try {
      // Parse and process command
      const { command, params } = parseCommand(userInput);
      const response = await processCommand(command, params);
      
      // Add assistant response
      if (typeof response === 'string') {
        addMessage({
          type: 'assistant',
          content: response
        });
      } else {
        addMessage({
          type: 'assistant',
          content: response.content,
          metadata: response.metadata
        });
      }
    } catch (error) {
      addMessage({
        type: 'assistant',
        content: `❌ **Error:** ${error.message}`
      });
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  const handleSuggestionClick = (suggestion: OptimizationSuggestion) => {
    if (suggestion.type === 'optimize') {
      setInputValue('Give me optimization suggestions');
    } else {
      setInputValue(`Tell me more about ${suggestion.description}`);
    }
    inputRef.current?.focus();
  };

  const formatMessageContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className={`ai-assistant ${className}`}>
      <div className="ai-assistant__header">
        <div className="ai-assistant__title">
          <span className="ai-assistant__icon">🤖</span>
          AI Planning Assistant
        </div>
        {currentPlanId && (
          <div className="ai-assistant__status">
            Active Plan: {currentPlanId}
          </div>
        )}
      </div>
      
      <div className="ai-assistant__messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`ai-assistant__message ai-assistant__message--${message.type}`}
          >
            <div className="ai-assistant__message-content">
              <div
                dangerouslySetInnerHTML={{
                  __html: formatMessageContent(message.content)
                }}
              />
              
              {message.metadata?.suggestions && message.metadata.suggestions.length > 0 && (
                <div className="ai-assistant__suggestions">
                  <div className="ai-assistant__suggestions-title">Quick Actions:</div>
                  {message.metadata.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className={`ai-assistant__suggestion ai-assistant__suggestion--${suggestion.priority}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion.description}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="ai-assistant__message-time">
              {message.timestamp.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="ai-assistant__message ai-assistant__message--assistant">
            <div className="ai-assistant__message-content">
              <div className="ai-assistant__typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form className="ai-assistant__input-form" onSubmit={handleSubmit}>
        <div className="ai-assistant__input-container">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me to generate plans, explain decisions, or run simulations..."
            className="ai-assistant__input"
            disabled={isProcessing}
          />
          <button
            type="submit"
            className="ai-assistant__send-button"
            disabled={!inputValue.trim() || isProcessing}
          >
            {isProcessing ? '⏳' : '➤'}
          </button>
        </div>
        
        <div className="ai-assistant__quick-commands">
          <button
            type="button"
            className="ai-assistant__quick-command"
            onClick={() => setInputValue('Generate a balanced plan for next week')}
          >
            Generate Plan
          </button>
          <button
            type="button"
            className="ai-assistant__quick-command"
            onClick={() => setInputValue('Explain this plan')}
            disabled={!currentPlanId}
          >
            Explain Plan
          </button>
          <button
            type="button"
            className="ai-assistant__quick-command"
            onClick={() => setInputValue('What if an employee is absent?')}
          >
            Simulate Scenario
          </button>
          <button
            type="button"
            className="ai-assistant__quick-command"
            onClick={() => setInputValue('How can I optimize this plan?')}
            disabled={!currentPlanId}
          >
            Optimize
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIAssistant;
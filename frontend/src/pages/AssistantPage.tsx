import React from 'react'
import { AIAssistant } from '../components/AIAssistant/AIAssistant'

export const AssistantPage: React.FC = () => {
  return (
    <div className="page">
      <div className="page-header">
        <h1>AI Assistant</h1>
        <p>Get AI-powered insights and assistance for workforce planning</p>
      </div>
      <div className="page-content">
        <AIAssistant />
      </div>
    </div>
  )
}
import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout/Layout'
import {
  Dashboard,
  PlanningPage,
  EmployeesPage,
  SkillsPage,
  QualificationsPage,
  CoveragePage,
  ApprovalPage,
  MonitoringPage,
  AssistantPage
} from './pages'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="planning" element={<PlanningPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="skills" element={<SkillsPage />} />
          <Route path="qualifications" element={<QualificationsPage />} />
          <Route path="coverage" element={<CoveragePage />} />
          <Route path="approval" element={<ApprovalPage />} />
          <Route path="monitoring" element={<MonitoringPage />} />
          <Route path="assistant" element={<AssistantPage />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
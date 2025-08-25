import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout/Layout'
import { PlanningProvider } from './contexts/PlanningContext'
import { AutomotiveThemeProvider } from './contexts/AutomotiveThemeContext'
import {
  Dashboard,
  PlanningPage,
  EmployeesPage,
  StationsPage,
  SkillsPage,
  QualificationsPage,
  CoveragePage,
  ApprovalPage,
  MonitoringPage,
  AssistantPage
} from './pages'

function App() {
  return (
    <AutomotiveThemeProvider>
      <PlanningProvider>
        <Router>
          <div className="automotive-theme">
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="planning" element={<PlanningPage />} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="stations" element={<StationsPage />} />
                <Route path="skills" element={<SkillsPage />} />
                <Route path="qualifications" element={<QualificationsPage />} />
                <Route path="coverage" element={<CoveragePage />} />
                <Route path="approval" element={<ApprovalPage />} />
                <Route path="monitoring" element={<MonitoringPage />} />
                <Route path="assistant" element={<AssistantPage />} />
              </Route>
            </Routes>
          </div>
        </Router>
      </PlanningProvider>
    </AutomotiveThemeProvider>
  )
}

export default App
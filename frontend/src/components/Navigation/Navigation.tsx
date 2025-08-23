import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Navigation.css'

export const Navigation: React.FC = () => {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/planning', label: 'Planning Board', icon: '📅' },
    { path: '/employees', label: 'Employees', icon: '👥' },
    { path: '/skills', label: 'Skills', icon: '🎯' },
    { path: '/qualifications', label: 'Qualification Matrix', icon: '📋' },
    { path: '/coverage', label: 'Coverage Dashboard', icon: '📈' },
    { path: '/approval', label: 'Plan Approval', icon: '✅' },
    { path: '/monitoring', label: 'Execution Monitoring', icon: '👁️' },
    { path: '/assistant', label: 'AI Assistant', icon: '🤖' }
  ]

  return (
    <nav className="navigation">
      <div className="nav-header">
        <h1 className="nav-title">ShiftWise</h1>
        <p className="nav-subtitle">Workforce Planning</p>
      </div>
      <ul className="nav-list">
        {navItems.map((item) => (
          <li key={item.path} className="nav-item">
            <Link
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
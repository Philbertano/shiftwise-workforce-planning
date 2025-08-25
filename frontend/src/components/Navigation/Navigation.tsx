import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Logo } from '../Logo/Logo'
import '../../styles/automotive-theme.css'
import './Navigation.css'

export const Navigation: React.FC = () => {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Manufacturing Dashboard', icon: '⚙️' },
    { path: '/planning', label: 'Shift Planning', icon: '📋' },
    { path: '/employees', label: 'Manufacturing Teams', icon: '👥' },
    { path: '/stations', label: 'Production Lines', icon: '🏭' },
    { path: '/skills', label: 'Technical Skills', icon: '🔧' },
    { path: '/qualifications', label: 'Safety Certifications', icon: '🛡️' },
    { path: '/coverage', label: 'Line Coverage', icon: '📊' },
    { path: '/approval', label: 'Shift Approval', icon: '✅' },
    { path: '/monitoring', label: 'Production Monitor', icon: '📈' },
    { path: '/assistant', label: 'Manufacturing AI', icon: '🤖' }
  ]

  const getSectionType = (path: string): string => {
    if (['/stations', '/coverage', '/monitoring'].includes(path)) return 'production'
    if (['/qualifications', '/skills'].includes(path)) return 'safety'
    return 'general'
  }

  const isManufacturingContext = (path: string): boolean => {
    return ['/stations', '/employees', '/planning', '/coverage', '/monitoring'].includes(path)
  }

  return (
    <nav className="navigation automotive-theme">
      <div className="nav-header automotive">
        <Logo size="small" variant="automotive" />
      </div>
      <ul className="nav-list">
        {navItems.map((item) => (
          <li 
            key={item.path} 
            className="nav-item"
            data-section={getSectionType(item.path)}
          >
            <Link
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              data-context={isManufacturingContext(item.path) ? 'manufacturing' : 'general'}
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
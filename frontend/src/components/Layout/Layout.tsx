import React from 'react'
import { Outlet } from 'react-router-dom'
import { Navigation } from '../Navigation/Navigation'
import { useAutomotiveTheme } from '../../contexts/AutomotiveThemeContext'
import './Layout.css'

export const Layout: React.FC = () => {
  const theme = useAutomotiveTheme()

  return (
    <div className="layout automotive-layout">
      <Navigation />
      <main className="main-content automotive-main-content">
        <Outlet />
      </main>
    </div>
  )
}
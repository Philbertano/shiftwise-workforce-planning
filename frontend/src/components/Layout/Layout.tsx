import React from 'react'
import { Outlet } from 'react-router-dom'
import { Navigation } from '../Navigation/Navigation'
import './Layout.css'

export const Layout: React.FC = () => {
  return (
    <div className="layout">
      <Navigation />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
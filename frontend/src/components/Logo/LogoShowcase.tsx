import React from 'react'
import { Logo } from './Logo'

/**
 * LogoShowcase component for demonstrating different logo variants and sizes
 * This is primarily for development and testing purposes
 */
export const LogoShowcase: React.FC = () => {
  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h2>Logo Variants and Sizes</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3>Automotive Theme</h3>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Logo size="small" variant="automotive" />
          <Logo size="medium" variant="automotive" />
          <Logo size="large" variant="automotive" />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3>Light Theme</h3>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap', backgroundColor: '#1e293b', padding: '1rem', borderRadius: '0.5rem' }}>
          <Logo size="small" variant="light" />
          <Logo size="medium" variant="light" />
          <Logo size="large" variant="light" />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3>Dark Theme</h3>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
          <Logo size="small" variant="dark" />
          <Logo size="medium" variant="dark" />
          <Logo size="large" variant="dark" />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3>Icon Only</h3>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Logo size="small" variant="automotive" showText={false} />
          <Logo size="medium" variant="automotive" showText={false} />
          <Logo size="large" variant="automotive" showText={false} />
        </div>
      </div>
    </div>
  )
}
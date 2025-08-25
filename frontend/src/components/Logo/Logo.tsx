import React from 'react'
import './Logo.css'

interface LogoProps {
  size?: 'small' | 'medium' | 'large'
  variant?: 'light' | 'dark' | 'automotive'
  showText?: boolean
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'medium', 
  variant = 'light', 
  showText = true 
}) => {
  return (
    <div className={`logo logo--${size} logo--${variant}`}>
      <div className="logo__icon">
        <svg viewBox="0 0 64 64" className="logo__svg">
          {/* Main gear */}
          <g className="logo__gear-main">
            <circle cx="32" cy="32" r="18" fill="currentColor" opacity="0.9" />
            <circle cx="32" cy="32" r="12" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.7" />
            <circle cx="32" cy="32" r="6" fill="currentColor" opacity="0.8" />
            
            {/* Gear teeth */}
            <rect x="30" y="10" width="4" height="6" fill="currentColor" />
            <rect x="30" y="48" width="4" height="6" fill="currentColor" />
            <rect x="10" y="30" width="6" height="4" fill="currentColor" />
            <rect x="48" y="30" width="6" height="4" fill="currentColor" />
            
            {/* Diagonal teeth */}
            <rect x="44" y="16" width="4" height="6" fill="currentColor" transform="rotate(45 46 19)" />
            <rect x="16" y="16" width="4" height="6" fill="currentColor" transform="rotate(-45 18 19)" />
            <rect x="44" y="42" width="4" height="6" fill="currentColor" transform="rotate(-45 46 45)" />
            <rect x="16" y="42" width="4" height="6" fill="currentColor" transform="rotate(45 18 45)" />
          </g>
          
          {/* Secondary smaller gear */}
          <g className="logo__gear-secondary">
            <circle cx="48" cy="16" r="8" fill="currentColor" opacity="0.7" />
            <circle cx="48" cy="16" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
            <circle cx="48" cy="16" r="2.5" fill="currentColor" opacity="0.8" />
            
            {/* Small gear teeth */}
            <rect x="47" y="6" width="2" height="3" fill="currentColor" />
            <rect x="47" y="23" width="2" height="3" fill="currentColor" />
            <rect x="38" y="15" width="3" height="2" fill="currentColor" />
            <rect x="55" y="15" width="3" height="2" fill="currentColor" />
          </g>
          
          {/* Production line element */}
          <g className="logo__production-line" opacity="0.6">
            <rect x="8" y="52" width="48" height="3" rx="1.5" fill="currentColor" />
            <rect x="12" y="48" width="2" height="8" fill="currentColor" />
            <rect x="20" y="48" width="2" height="8" fill="currentColor" />
            <rect x="28" y="48" width="2" height="8" fill="currentColor" />
            <rect x="36" y="48" width="2" height="8" fill="currentColor" />
            <rect x="44" y="48" width="2" height="8" fill="currentColor" />
            <rect x="52" y="48" width="2" height="8" fill="currentColor" />
          </g>
        </svg>
      </div>
      {showText && (
        <div className="logo__text">
          <div className="logo__title">ShiftWise</div>
          <div className="logo__subtitle">Automotive Manufacturing</div>
        </div>
      )}
    </div>
  )
}
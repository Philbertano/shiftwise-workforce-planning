import React, { createContext, useContext, ReactNode } from 'react';

export interface AutomotiveTheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    success: string;
    warning: string;
    error: string;
    border: string;
    hover: string;
  };
  typography: {
    fontFamily: string;
    headingSizes: {
      h1: string;
      h2: string;
      h3: string;
      h4: string;
      h5: string;
      h6: string;
    };
    bodySizes: {
      large: string;
      medium: string;
      small: string;
      xsmall: string;
    };
    fontWeights: {
      light: number;
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  borderRadius: {
    small: string;
    medium: string;
    large: string;
  };
  shadows: {
    small: string;
    medium: string;
    large: string;
  };
}

const automotiveTheme: AutomotiveTheme = {
  colors: {
    primary: '#1e3a8a', // Industrial blue
    secondary: '#64748b', // Steel gray
    accent: '#ea580c', // Safety orange
    background: '#f8fafc', // Light gray
    surface: '#ffffff', // White
    text: '#1e293b', // Dark gray
    textSecondary: '#64748b', // Medium gray
    success: '#059669', // Green
    warning: '#d97706', // Yellow/amber
    error: '#dc2626', // Red
    border: '#e2e8f0', // Light border
    hover: '#f1f5f9', // Hover state
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
    headingSizes: {
      h1: '2.25rem', // 36px
      h2: '1.875rem', // 30px
      h3: '1.5rem', // 24px
      h4: '1.25rem', // 20px
      h5: '1.125rem', // 18px
      h6: '1rem', // 16px
    },
    bodySizes: {
      large: '1.125rem', // 18px
      medium: '1rem', // 16px
      small: '0.875rem', // 14px
      xsmall: '0.75rem', // 12px
    },
    fontWeights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    xxl: '3rem', // 48px
  },
  borderRadius: {
    small: '0.25rem', // 4px
    medium: '0.5rem', // 8px
    large: '0.75rem', // 12px
  },
  shadows: {
    small: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    large: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
};

const AutomotiveThemeContext = createContext<AutomotiveTheme | undefined>(undefined);

export const useAutomotiveTheme = (): AutomotiveTheme => {
  const context = useContext(AutomotiveThemeContext);
  if (context === undefined) {
    throw new Error('useAutomotiveTheme must be used within an AutomotiveThemeProvider');
  }
  return context;
};

interface AutomotiveThemeProviderProps {
  children: ReactNode;
}

export const AutomotiveThemeProvider: React.FC<AutomotiveThemeProviderProps> = ({ children }) => {
  return (
    <AutomotiveThemeContext.Provider value={automotiveTheme}>
      {children}
    </AutomotiveThemeContext.Provider>
  );
};
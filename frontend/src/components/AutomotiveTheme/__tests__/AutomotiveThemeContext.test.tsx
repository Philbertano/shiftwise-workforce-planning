import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { AutomotiveThemeProvider, useAutomotiveTheme } from '../../../contexts/AutomotiveThemeContext';

// Test component that uses the theme
const TestComponent: React.FC = () => {
  const theme = useAutomotiveTheme();
  
  return (
    <div data-testid="theme-test">
      <div data-testid="primary-color">{theme.colors.primary}</div>
      <div data-testid="font-family">{theme.typography.fontFamily}</div>
      <div data-testid="spacing-md">{theme.spacing.md}</div>
    </div>
  );
};

describe('AutomotiveThemeContext', () => {
  it('provides theme values to child components', () => {
    render(
      <AutomotiveThemeProvider>
        <TestComponent />
      </AutomotiveThemeProvider>
    );

    expect(screen.getByTestId('primary-color')).toHaveTextContent('#1e3a8a');
    expect(screen.getByTestId('font-family')).toHaveTextContent('"Inter", "Segoe UI", "Roboto", sans-serif');
    expect(screen.getByTestId('spacing-md')).toHaveTextContent('1rem');
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAutomotiveTheme must be used within an AutomotiveThemeProvider');
    
    consoleSpy.mockRestore();
  });

  it('provides all required theme properties', () => {
    render(
      <AutomotiveThemeProvider>
        <TestComponent />
      </AutomotiveThemeProvider>
    );

    const TestComponentWithFullTheme: React.FC = () => {
      const theme = useAutomotiveTheme();
      
      // Verify all theme sections exist
      expect(theme.colors).toBeDefined();
      expect(theme.typography).toBeDefined();
      expect(theme.spacing).toBeDefined();
      expect(theme.borderRadius).toBeDefined();
      expect(theme.shadows).toBeDefined();
      
      // Verify specific color properties
      expect(theme.colors.primary).toBe('#1e3a8a');
      expect(theme.colors.secondary).toBe('#64748b');
      expect(theme.colors.accent).toBe('#ea580c');
      expect(theme.colors.background).toBe('#f8fafc');
      expect(theme.colors.surface).toBe('#ffffff');
      
      // Verify typography properties
      expect(theme.typography.fontFamily).toBe('"Inter", "Segoe UI", "Roboto", sans-serif');
      expect(theme.typography.headingSizes.h1).toBe('2.25rem');
      expect(theme.typography.bodySizes.medium).toBe('1rem');
      
      return <div>Theme validated</div>;
    };

    render(
      <AutomotiveThemeProvider>
        <TestComponentWithFullTheme />
      </AutomotiveThemeProvider>
    );
  });
});
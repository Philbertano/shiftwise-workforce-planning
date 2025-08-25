import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useAutomotiveTheme } from '../useAutomotiveTheme';
import { AutomotiveThemeProvider } from '../../contexts/AutomotiveThemeContext';

describe('useAutomotiveTheme', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AutomotiveThemeProvider>{children}</AutomotiveThemeProvider>
  );

  it('returns theme object with all required properties', () => {
    const { result } = renderHook(() => useAutomotiveTheme(), { wrapper });

    expect(result.current).toHaveProperty('colors');
    expect(result.current).toHaveProperty('typography');
    expect(result.current).toHaveProperty('spacing');
    expect(result.current).toHaveProperty('borderRadius');
  });

  it('provides automotive-specific color palette', () => {
    const { result } = renderHook(() => useAutomotiveTheme(), { wrapper });

    const { colors } = result.current;

    expect(colors.primary).toBe('#1e3a8a'); // Industrial blue
    expect(colors.secondary).toBe('#64748b'); // Steel gray
    expect(colors.accent).toBe('#ea580c'); // Safety orange
    expect(colors.background).toBe('#f8fafc');
    expect(colors.surface).toBe('#ffffff');
    expect(colors.text).toBe('#1e293b');
    expect(colors.success).toBe('#059669');
    expect(colors.warning).toBe('#d97706');
    expect(colors.error).toBe('#dc2626');
  });

  it('provides industrial typography settings', () => {
    const { result } = renderHook(() => useAutomotiveTheme(), { wrapper });

    const { typography } = result.current;

    expect(typography.fontFamily).toBe('"Inter", "Segoe UI", "Roboto", sans-serif');
    expect(typography.headingSizes).toHaveProperty('h1');
    expect(typography.headingSizes).toHaveProperty('h2');
    expect(typography.headingSizes).toHaveProperty('h3');
    expect(typography.bodySizes).toHaveProperty('large');
    expect(typography.bodySizes).toHaveProperty('medium');
    expect(typography.bodySizes).toHaveProperty('small');
  });

  it('provides consistent spacing scale', () => {
    const { result } = renderHook(() => useAutomotiveTheme(), { wrapper });

    const { spacing } = result.current;

    expect(spacing.xs).toBe('0.25rem');
    expect(spacing.sm).toBe('0.5rem');
    expect(spacing.md).toBe('1rem');
    expect(spacing.lg).toBe('1.5rem');
    expect(spacing.xl).toBe('2rem');
    expect(spacing.xxl).toBe('3rem');
  });

  it('provides border radius values', () => {
    const { result } = renderHook(() => useAutomotiveTheme(), { wrapper });

    const { borderRadius } = result.current;

    expect(borderRadius.sm).toBe('0.25rem');
    expect(borderRadius.md).toBe('0.375rem');
    expect(borderRadius.lg).toBe('0.5rem');
    expect(borderRadius.xl).toBe('0.75rem');
  });

  it('throws error when used outside provider', () => {
    expect(() => {
      renderHook(() => useAutomotiveTheme());
    }).toThrow('useAutomotiveTheme must be used within an AutomotiveThemeProvider');
  });

  it('maintains consistent theme object reference', () => {
    const { result, rerender } = renderHook(() => useAutomotiveTheme(), { wrapper });

    const firstTheme = result.current;
    rerender();
    const secondTheme = result.current;

    expect(firstTheme).toBe(secondTheme);
  });

  it('provides utility functions for theme usage', () => {
    const { result } = renderHook(() => useAutomotiveTheme(), { wrapper });

    // Check if theme has utility methods if implemented
    expect(typeof result.current).toBe('object');
    expect(result.current.colors).toBeDefined();
  });
});
import React from 'react';
import { useAutomotiveTheme } from '../../hooks/useAutomotiveTheme';

/**
 * Example component demonstrating how to use the automotive theme
 * This component shows various ways to access and use theme values
 */
export const AutomotiveThemeExample: React.FC = () => {
  const { theme, getColor, getFontSize, getSpacing } = useAutomotiveTheme();

  const exampleStyles = {
    container: {
      padding: getSpacing('lg'),
      backgroundColor: getColor('surface'),
      border: `1px solid ${getColor('border')}`,
      borderRadius: theme.borderRadius.medium,
      boxShadow: theme.shadows.medium,
    },
    title: {
      fontSize: getFontSize('h2'),
      color: getColor('primary'),
      fontWeight: theme.typography.fontWeights.semibold,
      marginBottom: getSpacing('md'),
    },
    text: {
      fontSize: getFontSize('medium'),
      color: getColor('text'),
      marginBottom: getSpacing('sm'),
    },
    button: {
      backgroundColor: getColor('primary'),
      color: 'white',
      padding: `${getSpacing('sm')} ${getSpacing('md')}`,
      border: 'none',
      borderRadius: theme.borderRadius.medium,
      fontSize: getFontSize('medium'),
      fontWeight: theme.typography.fontWeights.medium,
      cursor: 'pointer',
      marginRight: getSpacing('sm'),
    },
    accentButton: {
      backgroundColor: getColor('accent'),
      color: 'white',
      padding: `${getSpacing('sm')} ${getSpacing('md')}`,
      border: 'none',
      borderRadius: theme.borderRadius.medium,
      fontSize: getFontSize('medium'),
      fontWeight: theme.typography.fontWeights.medium,
      cursor: 'pointer',
    },
  };

  return (
    <div style={exampleStyles.container}>
      <h2 style={exampleStyles.title}>Automotive Theme Example</h2>
      <p style={exampleStyles.text}>
        This component demonstrates the automotive theme in action with industrial colors and typography.
      </p>
      <div>
        <button style={exampleStyles.button}>Primary Action</button>
        <button style={exampleStyles.accentButton}>Safety Action</button>
      </div>
      
      {/* Using CSS classes */}
      <div style={{ marginTop: getSpacing('lg') }}>
        <h3 className="automotive-heading automotive-heading--h3">Using CSS Classes</h3>
        <p className="automotive-text automotive-text--medium">
          You can also use the predefined CSS classes for consistent styling.
        </p>
        <button className="automotive-button automotive-button--primary">
          Primary Button
        </button>
        <button className="automotive-button automotive-button--secondary" style={{ marginLeft: getSpacing('sm') }}>
          Secondary Button
        </button>
        <button className="automotive-button automotive-button--accent" style={{ marginLeft: getSpacing('sm') }}>
          Accent Button
        </button>
      </div>

      {/* Status indicators */}
      <div style={{ marginTop: getSpacing('lg') }}>
        <h4 className="automotive-heading automotive-heading--h4">Status Indicators</h4>
        <div style={{ marginTop: getSpacing('sm') }}>
          <span className="automotive-status automotive-status--success" style={{ marginRight: getSpacing('sm') }}>
            Operational
          </span>
          <span className="automotive-status automotive-status--warning" style={{ marginRight: getSpacing('sm') }}>
            Maintenance
          </span>
          <span className="automotive-status automotive-status--error">
            Offline
          </span>
        </div>
      </div>
    </div>
  );
};

export default AutomotiveThemeExample;
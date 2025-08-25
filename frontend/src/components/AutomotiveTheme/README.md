# Automotive Theme System

The automotive theme system provides a consistent industrial design language for the ShiftWise application, specifically tailored for automotive manufacturing environments.

## Overview

The theme system consists of:
- **AutomotiveThemeProvider**: React context provider for theme values
- **useAutomotiveTheme**: Hook for accessing theme values in components
- **CSS Custom Properties**: Global CSS variables for consistent styling
- **Utility Classes**: Pre-built CSS classes for common patterns

## Usage

### 1. Theme Provider Setup

The theme provider should wrap your entire application:

```tsx
import { AutomotiveThemeProvider } from './contexts/AutomotiveThemeContext';

function App() {
  return (
    <AutomotiveThemeProvider>
      <div className="automotive-theme">
        {/* Your app content */}
      </div>
    </AutomotiveThemeProvider>
  );
}
```

### 2. Using the Theme Hook

Access theme values programmatically in your components:

```tsx
import { useAutomotiveTheme } from '../hooks/useAutomotiveTheme';

const MyComponent = () => {
  const { theme, getColor, getFontSize, getSpacing } = useAutomotiveTheme();

  const styles = {
    container: {
      backgroundColor: getColor('surface'),
      padding: getSpacing('lg'),
      borderRadius: theme.borderRadius.medium,
    },
    title: {
      color: getColor('primary'),
      fontSize: getFontSize('h2'),
    },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Manufacturing Station</h2>
    </div>
  );
};
```

### 3. Using CSS Custom Properties

Use CSS variables directly in your stylesheets:

```css
.production-line-card {
  background-color: var(--automotive-color-surface);
  border: 1px solid var(--automotive-color-border);
  border-radius: var(--automotive-border-radius-medium);
  padding: var(--automotive-spacing-lg);
  box-shadow: var(--automotive-shadow-small);
}

.station-title {
  color: var(--automotive-color-primary);
  font-size: var(--automotive-font-size-h3);
  font-weight: var(--automotive-font-weight-semibold);
}
```

### 4. Using Utility Classes

Apply pre-built classes for common patterns:

```tsx
const StationCard = () => (
  <div className="automotive-card">
    <h3 className="automotive-heading automotive-heading--h3">
      Assembly Line A
    </h3>
    <p className="automotive-text automotive-text--secondary">
      Main engine assembly and installation
    </p>
    <button className="automotive-button automotive-button--primary">
      View Details
    </button>
    <span className="automotive-status automotive-status--success">
      Operational
    </span>
  </div>
);
```

## Theme Structure

### Colors
- **Primary**: Industrial blue (#1e3a8a) - Main brand color
- **Secondary**: Steel gray (#64748b) - Secondary elements
- **Accent**: Safety orange (#ea580c) - Attention-grabbing elements
- **Background**: Light gray (#f8fafc) - Page background
- **Surface**: White (#ffffff) - Card and component backgrounds
- **Text**: Dark gray (#1e293b) - Primary text
- **Success/Warning/Error**: Standard status colors

### Typography
- **Font Family**: Inter, Segoe UI, Roboto (industrial sans-serif)
- **Heading Sizes**: h1 (36px) to h6 (16px)
- **Body Sizes**: Large (18px), Medium (16px), Small (14px), XSmall (12px)
- **Font Weights**: Light (300) to Bold (700)

### Spacing
- **XS**: 4px - Minimal spacing
- **SM**: 8px - Small spacing
- **MD**: 16px - Standard spacing
- **LG**: 24px - Large spacing
- **XL**: 32px - Extra large spacing
- **XXL**: 48px - Maximum spacing

### Border Radius
- **Small**: 4px - Subtle rounding
- **Medium**: 8px - Standard rounding
- **Large**: 12px - Prominent rounding

### Shadows
- **Small**: Subtle elevation
- **Medium**: Standard elevation
- **Large**: Prominent elevation

## Best Practices

1. **Consistency**: Always use theme values instead of hardcoded colors or sizes
2. **Accessibility**: Ensure sufficient color contrast for text readability
3. **Industrial Feel**: Use the steel gray and industrial blue for a manufacturing aesthetic
4. **Safety Colors**: Use accent orange for important actions or warnings
5. **Hierarchy**: Use typography scales to establish clear information hierarchy

## Automotive Terminology Integration

The theme supports automotive manufacturing terminology:
- Production Lines instead of generic stations
- Manufacturing Teams instead of generic employees
- Shift Planning with industrial context
- Safety-focused color choices (orange for attention)
- Industrial typography for professional appearance
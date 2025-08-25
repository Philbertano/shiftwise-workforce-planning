import { useAutomotiveTheme as useThemeContext } from '../contexts/AutomotiveThemeContext';

/**
 * Hook to access automotive theme values
 * Provides easy access to colors, typography, spacing, and other theme properties
 */
export const useAutomotiveTheme = () => {
  const theme = useThemeContext();

  // Helper functions for common theme operations
  const getColor = (colorKey: keyof typeof theme.colors) => theme.colors[colorKey];
  
  const getFontSize = (sizeKey: keyof typeof theme.typography.headingSizes | keyof typeof theme.typography.bodySizes) => {
    if (sizeKey in theme.typography.headingSizes) {
      return theme.typography.headingSizes[sizeKey as keyof typeof theme.typography.headingSizes];
    }
    return theme.typography.bodySizes[sizeKey as keyof typeof theme.typography.bodySizes];
  };

  const getSpacing = (spacingKey: keyof typeof theme.spacing) => theme.spacing[spacingKey];
  
  const getBorderRadius = (radiusKey: keyof typeof theme.borderRadius) => theme.borderRadius[radiusKey];
  
  const getShadow = (shadowKey: keyof typeof theme.shadows) => theme.shadows[shadowKey];

  const getFontWeight = (weightKey: keyof typeof theme.typography.fontWeights) => 
    theme.typography.fontWeights[weightKey];

  return {
    theme,
    getColor,
    getFontSize,
    getSpacing,
    getBorderRadius,
    getShadow,
    getFontWeight,
  };
};

export default useAutomotiveTheme;
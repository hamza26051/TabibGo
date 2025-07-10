import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';

/**
 * Text Component
 * A customizable text component with support for different variants, sizes, and weights
 * 
 * @param {string} variant - 'body', 'heading', 'subheading', 'caption', 'label'
 * @param {string} size - 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'
 * @param {string} weight - 'normal', 'medium', 'semibold', 'bold'
 * @param {string} color - Custom color (overrides variant color)
 * @param {boolean} center - Center align the text
 * @param {object} style - Additional styles to apply to the text
 * @param {React.ReactNode} children - Text content
 */
const Text = ({
  variant = 'body',
  size = 'md',
  weight = 'normal',
  color,
  center = false,
  style,
  children,
  ...props
}) => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  
  // Font size mapping
  const fontSizes = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  };
  
  // Font weight mapping
  const fontWeights = {
    normal: 'normal',
    medium: '500',
    semibold: '600',
    bold: 'bold',
  };
  
  // Variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'heading':
        return {
          fontSize: fontSizes['2xl'],
          fontWeight: fontWeights.bold,
          color: colors.text,
          marginBottom: 8,
        };
      case 'subheading':
        return {
          fontSize: fontSizes.xl,
          fontWeight: fontWeights.semibold,
          color: colors.text,
          marginBottom: 6,
        };
      case 'caption':
        return {
          fontSize: fontSizes.sm,
          fontWeight: fontWeights.normal,
          color: colors.textSecondary,
        };
      case 'label':
        return {
          fontSize: fontSizes.sm,
          fontWeight: fontWeights.medium,
          color: colors.textSecondary,
          marginBottom: 4,
        };
      case 'body':
      default:
        return {
          fontSize: fontSizes.md,
          fontWeight: fontWeights.normal,
          color: colors.text,
        };
    }
  };
  
  const variantStyle = getVariantStyles();
  
  // Override default styles with props
  const textStyles = [
    styles.text,
    variantStyle,
    size !== 'md' && { fontSize: fontSizes[size] },
    weight !== 'normal' && { fontWeight: fontWeights[weight] },
    color && { color },
    center && styles.center,
    style,
  ];
  
  return (
    <RNText style={textStyles} {...props}>
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  text: {
    lineHeight: 24,
  },
  center: {
    textAlign: 'center',
  },
});

export default Text;
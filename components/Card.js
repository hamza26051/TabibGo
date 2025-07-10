import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';

/**
 * Card Component
 * A customizable card component with support for different variants and styles
 * 
 * @param {string} variant - 'default', 'elevated', 'outlined', 'flat'
 * @param {boolean} onPress - Makes the card touchable and calls this function when pressed
 * @param {object} style - Additional styles to apply to the card
 * @param {boolean} fullWidth - Whether the card should take up the full width
 * @param {number} elevation - Shadow elevation (0-24)
 * @param {React.ReactNode} children - Card content
 */
const Card = ({
  variant = 'default',
  onPress,
  style,
  fullWidth = false,
  elevation = 2,
  children,
}) => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  
  // Determine card variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.card,
          borderWidth: 0,
          shadowOpacity: 0.3,
          shadowRadius: elevation,
          elevation: elevation,
        };
      case 'outlined':
        return {
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          shadowOpacity: 0,
          shadowRadius: 0,
          elevation: 0,
        };
      case 'flat':
        return {
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
          borderWidth: 0,
          shadowOpacity: 0,
          shadowRadius: 0,
          elevation: 0,
        };
      case 'default':
      default:
        return {
          backgroundColor: colors.card,
          borderWidth: 0,
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 2,
        };
    }
  };
  
  const variantStyles = getVariantStyles();
  
  const cardStyles = [
    styles.card,
    {
      backgroundColor: variantStyles.backgroundColor,
      borderWidth: variantStyles.borderWidth,
      borderColor: variantStyles.borderColor,
      shadowOpacity: variantStyles.shadowOpacity,
      shadowRadius: variantStyles.shadowRadius,
      elevation: variantStyles.elevation,
      shadowColor: colors.shadow,
    },
    fullWidth && styles.fullWidth,
    style,
  ];
  
  // Render the card as touchable or regular view
  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={cardStyles}
      >
        {children}
      </TouchableOpacity>
    );
  }
  
  return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  fullWidth: {
    width: '100%',
  },
});

export default Card;
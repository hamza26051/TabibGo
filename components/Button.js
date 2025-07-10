import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';

/**
 * Button Component
 * A customizable button component with support for different variants, sizes, and states
 * 
 * @param {string} variant - 'primary', 'secondary', 'outline', 'text'
 * @param {string} size - 'small', 'medium', 'large'
 * @param {boolean} isLoading - Shows a loading indicator when true
 * @param {boolean} disabled - Disables the button when true
 * @param {string} icon - Name of the Ionicons icon to display
 * @param {string} iconPosition - 'left' or 'right'
 * @param {function} onPress - Function to call when button is pressed
 * @param {object} style - Additional styles to apply to the button
 * @param {object} textStyle - Additional styles to apply to the button text
 * @param {boolean} fullWidth - Whether the button should take up the full width
 * @param {React.ReactNode} children - Button content
 */
const Button = ({
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  onPress,
  style,
  textStyle,
  fullWidth = false,
  children,
}) => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  
  // Determine button size styles
  const sizeStyles = {
    small: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      fontSize: 14,
    },
    medium: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      fontSize: 16,
    },
    large: {
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      fontSize: 18,
    },
  };
  
  // Determine button variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: colors.secondary,
          borderColor: colors.secondary,
          textColor: colors.buttonText,
          gradientColors: [colors.secondary, isDarkMode ? '#4D8A50' : '#3D8A40'],
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: colors.primary,
          textColor: colors.primary,
          gradientColors: null,
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          textColor: colors.primary,
          gradientColors: null,
        };
      case 'primary':
      default:
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
          textColor: colors.buttonText,
          gradientColors: [colors.primary, isDarkMode ? '#1A3A5A' : '#4D94FF'],
        };
    }
  };
  
  const variantStyles = getVariantStyles();
  const isOutlineOrText = variant === 'outline' || variant === 'text';
  
  // Determine icon size based on button size
  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'large': return 24;
      default: return 20;
    }
  };
  
  // Render button content
  const renderContent = () => {
    return (
      <View style={styles.contentContainer}>
        {icon && iconPosition === 'left' && !isLoading && (
          <Ionicons 
            name={icon} 
            size={getIconSize()} 
            color={variantStyles.textColor} 
            style={styles.leftIcon} 
          />
        )}
        
        {isLoading ? (
          <ActivityIndicator 
            size="small" 
            color={isOutlineOrText ? colors.primary : colors.buttonText} 
          />
        ) : (
          <Text 
            style={[
              styles.text, 
              { 
                fontSize: sizeStyles[size].fontSize,
                color: variantStyles.textColor,
                opacity: disabled ? 0.6 : 1,
              },
              textStyle
            ]}
          >
            {children}
          </Text>
        )}
        
        {icon && iconPosition === 'right' && !isLoading && (
          <Ionicons 
            name={icon} 
            size={getIconSize()} 
            color={variantStyles.textColor} 
            style={styles.rightIcon} 
          />
        )}
      </View>
    );
  };
  
  // Render the button with or without gradient
  const renderButton = () => {
    const buttonStyles = [
      styles.button,
      {
        paddingVertical: sizeStyles[size].paddingVertical,
        paddingHorizontal: sizeStyles[size].paddingHorizontal,
        borderRadius: sizeStyles[size].borderRadius,
        borderWidth: isOutlineOrText ? (variant === 'text' ? 0 : 1) : 0,
        borderColor: variantStyles.borderColor,
        backgroundColor: variantStyles.gradientColors ? 'transparent' : variantStyles.backgroundColor,
        opacity: disabled ? 0.7 : 1,
      },
      fullWidth && styles.fullWidth,
      style,
    ];
    
    if (variantStyles.gradientColors && !disabled) {
      return (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPress}
          disabled={disabled || isLoading}
          style={[styles.buttonContainer, fullWidth && styles.fullWidth]}
        >
          <LinearGradient
            colors={variantStyles.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={buttonStyles}
          >
            {renderContent()}
          </LinearGradient>
        </TouchableOpacity>
      );
    } else {
      return (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPress}
          disabled={disabled || isLoading}
          style={[styles.buttonContainer, buttonStyles, fullWidth && styles.fullWidth]}
        >
          {renderContent()}
        </TouchableOpacity>
      );
    }
  };
  
  return renderButton();
};

const styles = StyleSheet.create({
  buttonContainer: {
    alignSelf: 'flex-start',
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
    width: '100%',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
});

export default Button;
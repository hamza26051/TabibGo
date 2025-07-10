import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';

/**
 * Input Component
 * A customizable text input component with support for different states and styles
 * 
 * @param {string} label - Input label text
 * @param {string} placeholder - Placeholder text
 * @param {string} value - Input value
 * @param {function} onChangeText - Function to call when text changes
 * @param {boolean} secureTextEntry - Whether to hide the text (for passwords)
 * @param {string} error - Error message to display
 * @param {boolean} success - Whether the input is in a success state
 * @param {boolean} disabled - Whether the input is disabled
 * @param {string} leftIcon - Name of the Ionicons icon to display on the left
 * @param {string} rightIcon - Name of the Ionicons icon to display on the right
 * @param {function} onRightIconPress - Function to call when right icon is pressed
 * @param {object} style - Additional styles to apply to the input container
 * @param {object} inputStyle - Additional styles to apply to the TextInput
 * @param {string} keyboardType - Keyboard type to display
 * @param {boolean} multiline - Whether the input is multiline
 * @param {number} numberOfLines - Number of lines for multiline input
 * @param {boolean} autoCapitalize - Auto capitalize behavior
 * @param {boolean} autoCorrect - Whether to enable auto-correct
 */
const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  error,
  success = false,
  disabled = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  inputStyle,
  keyboardType,
  multiline = false,
  numberOfLines = 1,
  autoCapitalize = 'none',
  autoCorrect = false,
  ...props
}) => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);
  
  // Determine border color based on state
  const getBorderColor = () => {
    if (error) return colors.error;
    if (success) return colors.success;
    if (isFocused) return colors.primary;
    return colors.inputBorder;
  };
  
  // Handle focus and blur events
  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);
  
  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };
  
  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text 
          style={[
            styles.label, 
            { color: error ? colors.error : colors.textSecondary },
            disabled && { opacity: 0.6 }
          ]}
        >
          {label}
        </Text>
      )}
      
      <View 
        style={[
          styles.inputContainer,
          { 
            backgroundColor: colors.inputBackground,
            borderColor: getBorderColor(),
            borderWidth: isFocused || error || success ? 2 : 1,
          },
          multiline && styles.multilineContainer,
          disabled && styles.disabledContainer,
        ]}
      >
        {leftIcon && (
          <Ionicons 
            name={leftIcon} 
            size={20} 
            color={error ? colors.error : colors.textSecondary} 
            style={styles.leftIcon} 
          />
        )}
        
        <TextInput
          style={[
            styles.input,
            { 
              color: colors.text,
              height: multiline ? 20 * numberOfLines : 40,
            },
            multiline && styles.multilineInput,
            leftIcon && styles.inputWithLeftIcon,
            (rightIcon || secureTextEntry) && styles.inputWithRightIcon,
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          {...props}
        />
        
        {secureTextEntry && (
          <TouchableOpacity 
            onPress={togglePasswordVisibility} 
            style={styles.rightIconContainer}
          >
            <Ionicons 
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
        
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity 
            onPress={onRightIconPress} 
            style={styles.rightIconContainer}
            disabled={!onRightIconPress}
          >
            <Ionicons 
              name={rightIcon} 
              size={20} 
              color={error ? colors.error : colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  multilineContainer: {
    alignItems: 'flex-start',
    paddingVertical: 10,
    height: 'auto',
  },
  disabledContainer: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  multilineInput: {
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIconContainer: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default Input;
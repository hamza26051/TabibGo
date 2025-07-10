import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create the theme context
const ThemeContext = createContext();

// Theme options
export const ThemeMode = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const deviceTheme = useColorScheme();
  const [themeMode, setThemeMode] = useState(ThemeMode.SYSTEM);
  
  // Determine the actual theme based on the theme mode and device theme
  const actualTheme = themeMode === ThemeMode.SYSTEM 
    ? deviceTheme || ThemeMode.LIGHT 
    : themeMode;

  // Load saved theme preference from storage on component mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('themeMode');
        if (savedTheme) {
          setThemeMode(savedTheme);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };

    loadThemePreference();
  }, []);

  // Save theme preference when it changes
  const setThemePreference = async (newTheme) => {
    try {
      await AsyncStorage.setItem('themeMode', newTheme);
      setThemeMode(newTheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider 
      value={{
        themeMode,
        isDarkMode: actualTheme === ThemeMode.DARK,
        setThemeMode: setThemePreference,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
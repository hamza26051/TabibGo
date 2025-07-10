// Theme color definitions for the app

// Light theme colors
const lightColors = {
  // Primary colors
  primary: '#0066CC',
  secondary: '#4CAF50',
  accent: '#FFA000',
  
  // Background colors
  background: '#f5f5f5',
  card: '#ffffff',
  surface: '#ffffff',
  
  // Text colors
  text: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  
  // UI element colors
  border: '#eeeeee',
  divider: '#e0e0e0',
  disabled: '#cccccc',
  placeholder: '#aaaaaa',
  
  // Status colors
  success: '#4CAF50',
  warning: '#FFA000',
  error: '#F44336',
  info: '#2196F3',
  
  // Specific UI components
  header: '#ffffff',
  headerText: '#000000',
  tabBar: '#ffffff',
  tabBarInactive: '#999999',
  tabBarActive: '#0066CC',
  button: '#0066CC',
  buttonText: '#ffffff',
  inputBackground: '#ffffff',
  inputBorder: '#dddddd',
  shadow: '#000000',
  
  // Specific screens
  supportHoursBackground: '#4CAF50',
  supportHoursText: '#ffffff',
  contactContainer: '#e6f2ff',
};

// Dark theme colors
const darkColors = {
  // Primary colors
  primary: '#2196F3',
  secondary: '#66BB6A',
  accent: '#FFB74D',
  
  // Background colors
  background: '#121212',
  card: '#1E1E1E',
  surface: '#242424',
  
  // Text colors
  text: '#FFFFFF',
  textSecondary: '#CCCCCC',
  textLight: '#999999',
  
  // UI element colors
  border: '#333333',
  divider: '#424242',
  disabled: '#666666',
  placeholder: '#888888',
  
  // Status colors
  success: '#66BB6A',
  warning: '#FFB74D',
  error: '#EF5350',
  info: '#42A5F5',
  
  // Specific UI components
  header: '#1E1E1E',
  headerText: '#FFFFFF',
  tabBar: '#1E1E1E',
  tabBarInactive: '#888888',
  tabBarActive: '#2196F3',
  button: '#2196F3',
  buttonText: '#FFFFFF',
  inputBackground: '#333333',
  inputBorder: '#444444',
  shadow: '#000000',
  
  // Specific screens
  supportHoursBackground: '#66BB6A',
  supportHoursText: '#FFFFFF',
  contactContainer: '#1A3A5A',
};

// Export theme colors based on mode
export const getColors = (isDarkMode) => {
  return isDarkMode ? darkColors : lightColors;
};

// Export individual theme objects
export const lightTheme = lightColors;
export const darkTheme = darkColors;
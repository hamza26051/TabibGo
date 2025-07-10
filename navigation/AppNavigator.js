import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { enableScreens } from 'react-native-screens';
import { View, ActivityIndicator, Text } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import CallScreen from '../screens/CallScreen';
import { useAuth } from '../context/AuthContext';
import DrawerNavigator from './DrawerNavigator';

// Enable screens for better performance
enableScreens(true);

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { currentUser, loading, authInitialized } = useAuth();
  
  // Show loading screen while auth is initializing
  if (loading || !authInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  return (
    // Removed NavigationContainer from here as it's already in App.js
    <Stack.Navigator
      initialRouteName={currentUser ? "Home" : "Login"}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0066CC',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {currentUser ? (
        // Authenticated user screens - using Drawer Navigator
        <>
          <Stack.Screen 
            name="Main" 
            component={DrawerNavigator} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Call" 
            component={CallScreen} 
            options={{ headerShown: false }}
          />
        </>
      ) : (
        // Non-authenticated user screens
        <>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ title: 'Login' }} 
          />
          <Stack.Screen 
            name="Signup" 
            component={SignupScreen} 
            options={{ title: 'Create Account' }} 
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Image, ActivityIndicator, Alert, Modal, Text, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { RequestProvider } from './context/RequestContext';
import { LocationTrackingProvider } from './context/LocationTrackingContext';
import { NotificationProvider } from './context/NotificationContext';
import { listenForIncomingCalls } from './firebase/callService';
import { Audio } from 'expo-av';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase/config';
import { getColors } from './theme/colors';
import { RatingProvider } from './context/RatingContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Incoming Call Modal Component
const IncomingCallModal = ({ call, onAccept, onDecline }) => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const [ringtone, setRingtone] = useState();
  
  // Play ringtone when modal is shown
  useEffect(() => {
    const playRingtone = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('./assets/ringtone.mp3'),
          { shouldPlay: true, isLooping: true }
        );
        setRingtone(sound);
      } catch (error) {
        console.error('Error playing ringtone:', error);
      }
    };
    
    playRingtone();
    
    return () => {
      if (ringtone) {
        ringtone.stopAsync().then(() => ringtone.unloadAsync());
      }
    };
  }, []);
  
  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={true}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors?.background || '#fff' }]}>
        <View style={[styles.callCard, { backgroundColor: colors?.card || '#fff' }]}>
          <View style={styles.callerInfo}>
            <View style={[styles.callerAvatar, { backgroundColor: colors?.primary || '#0066CC' }]}>
              <Text style={styles.callerInitial}>
                {call?.callerName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <Text style={[styles.callerName, { color: colors?.text || '#000' }]}>
              {call?.callerName || 'Unknown Caller'}
            </Text>
            <Text style={[styles.callStatus, { color: colors?.textSecondary || '#666' }]}>
              Incoming call...
            </Text>
          </View>
          
          <View style={styles.callActions}>
            <TouchableOpacity 
              style={[styles.declineButton, { backgroundColor: colors?.error || '#FF3B30' }]}
              onPress={onDecline}
            >
              <Ionicons name="call" size={30} color="#fff" style={styles.declineIcon} />
              <Text style={styles.actionText}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.acceptButton, { backgroundColor: colors?.success || '#34C759' }]}
              onPress={onAccept}
            >
              <Ionicons name="call" size={30} color="#fff" />
              <Text style={styles.actionText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Main App Component with Call Handling
const AppWithCallHandling = () => {
  const { currentUser } = useAuth();
  const navigation = useNavigation();
  const [incomingCall, setIncomingCall] = useState(null);
  
  // Listen for incoming calls
  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = listenForIncomingCalls((call) => {
      console.log('Incoming call detected:', call);
      setIncomingCall(call);
    });
    
    return () => unsubscribe();
  }, [currentUser]);
  
  // Handle accepting a call
  const handleAcceptCall = () => {
    if (!incomingCall) return;
    
    // Navigate to call screen
    navigation.navigate('Call', {
      callId: incomingCall.id,
      recipientId: incomingCall.callerId,
      recipientName: incomingCall.callerName,
      isIncoming: true
    });
    
    setIncomingCall(null);
  };
  
  // Handle declining a call
  const handleDeclineCall = async () => {
    if (!incomingCall) return;
    
    try {
      // Update call status in Firestore
      const callRef = doc(db, 'calls', incomingCall.id);
      await updateDoc(callRef, {
        status: 'declined',
        endedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error declining call:', error);
    }
    
    setIncomingCall(null);
  };
  
  return (
    <>
      <AppNavigator />
      {incomingCall && (
        <IncomingCallModal 
          call={incomingCall} 
          onAccept={handleAcceptCall} 
          onDecline={handleDeclineCall} 
        />
      )}
    </>
  );
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  // Add this inner component to access currentUser from useAuth
  const NotificationProviderWithKey = ({ children }) => {
    const { currentUser } = useAuth();
    return (
      <NotificationProvider key={currentUser ? currentUser.uid : 'no-user'}>
        {children}
      </NotificationProvider>
    );
  };

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(async () => {
      setIsLoading(false);
      await SplashScreen.hideAsync();
    }, 3000); // 3 seconds loading time

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require('./assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#0066CC" style={styles.loader} />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <RequestProvider>
            <LocationTrackingProvider>
              <NotificationProviderWithKey>
                <RatingProvider>
                  <NavigationContainer>
                    <AppWithCallHandling />
                  </NavigationContainer>
                </RatingProvider>
              </NotificationProviderWithKey>
            </LocationTrackingProvider>
          </RequestProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '80%',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  loader: {
    marginTop: 20,
  },
  requestBox: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  doctorIcon: {
    width: 80,
    height: 80,
    marginBottom: 15,
  },
  requestText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  // Incoming call modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  callCard: {
    width: '85%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  callerInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  callerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  callerInitial: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  callerName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  callStatus: {
    fontSize: 16,
  },
  callActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  declineButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  acceptButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  declineIcon: {
    transform: [{ rotate: '135deg' }],
  },
  actionText: {
    color: '#fff',
    marginTop: 5,
    fontSize: 12,
    fontWeight: '500',
  },
});
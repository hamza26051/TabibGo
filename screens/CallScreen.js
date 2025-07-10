import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { db } from '../firebase/config';
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import InCallManager from 'react-native-incall-manager';
// import translations from '../translations/appTranslations';
import { useLanguage } from '../context/LanguageContext';

const CallScreen = ({ navigation, route }) => {
  const { currentUser } = useAuth();
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const { callId, recipientId, recipientName, isIncoming = false } = route.params;
  
  // Call states
  const [callStatus, setCallStatus] = useState(isIncoming ? 'incoming' : 'connecting'); // connecting, ringing, ongoing, ended
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [recipientInfo, setRecipientInfo] = useState(null);
  const [callDoc, setCallDoc] = useState(null);
  
  // References
  const timerRef = useRef(null);
  const soundRef = useRef(null);
  const callDocRef = useRef(null);
  
  const { language } = useLanguage();
  
  // Initialize call when component mounts
  useEffect(() => {
    setupCall();
    
    // Start audio session - with platform check
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      try {
        InCallManager.start({ media: 'audio' });
      } catch (error) {
        console.error('Error starting InCallManager:', error);
      }
    }
    
    // Clean up when component unmounts
    return () => {
      cleanupCall();
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        try {
          InCallManager.stop();
        } catch (error) {
          console.error('Error stopping InCallManager:', error);
        }
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, []);
  
  // Setup the call
  const setupCall = async () => {
    try {
      // Get recipient info
      const userDoc = await getDoc(doc(db, 'users', recipientId));
      if (userDoc.exists()) {
        setRecipientInfo({
          id: userDoc.id,
          ...userDoc.data()
        });
      }
      
      // Setup call document reference
      callDocRef.current = doc(db, 'calls', callId);
      
      // If outgoing call, create call document
      if (!isIncoming) {
        await setDoc(callDocRef.current, {
          callerId: currentUser.uid,
          callerName: currentUser.displayName || currentUser.email,
          recipientId: recipientId,
          recipientName: recipientName,
          status: 'ringing',
          startedAt: serverTimestamp(),
          endedAt: null,
          isCallerMuted: false,
          isRecipientMuted: false
        });
        
        // Play ringing sound
        playRingingSound();
        setCallStatus('ringing');
      } else {
        // For incoming calls, update call status to connected when answered
        await updateDoc(callDocRef.current, {
          status: 'connected',
          answeredAt: serverTimestamp()
        });
        
        setCallStatus('ongoing');
        startCallTimer();
      }
      
      // Listen for call status changes
      const unsubscribe = onSnapshot(callDocRef.current, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setCallDoc(data);
          
          // Handle call status changes
          if (data.status === 'connected' && callStatus === 'ringing') {
            // Call was answered
            stopRingingSound();
            setCallStatus('ongoing');
            startCallTimer();
          } else if (data.status === 'ended') {
            // Call was ended
            endCall(false);
          }
        }
      });
      
      // Set timeout for unanswered calls (30 seconds)
      if (!isIncoming) {
        setTimeout(() => {
          if (callStatus === 'ringing') {
            Alert.alert('Call not answered', 'The recipient did not answer the call.');
            endCall(true);
          }
        }, 30000);
      }
      
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up call:', error);
      Alert.alert('Error', 'Failed to set up call. Please try again.');
      navigation.goBack();
    }
  };
  
  // Play ringing sound
  const playRingingSound = async () => {
    try {
      // Initialize audio mode first
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false
      });
      
      // Then create and play the sound with more specific options
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/ringtone.mp3'),
        { 
          shouldPlay: true, 
          isLooping: true,
          progressUpdateIntervalMillis: 1000,
          positionMillis: 0,
          rate: 1.0,
          volume: 1.0
        }
      );
      soundRef.current = sound;
    } catch (error) {
      console.error('Error playing sound:', error);
      // Continue without sound rather than throwing an error
    }
  };

  
  // Stop ringing sound
  const stopRingingSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      } catch (error) {
        console.error('Error stopping sound:', error);
        // Reset the sound reference even if there was an error
        soundRef.current = null;
      }
    }
  };
  
  // Start call timer
  const startCallTimer = () => {
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };
  
  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Toggle mute
  const toggleMute = async () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    
    // Update mute state in Firestore
    if (callDocRef.current) {
      const field = currentUser.uid === callDoc?.callerId ? 'isCallerMuted' : 'isRecipientMuted';
      await updateDoc(callDocRef.current, {
        [field]: newMuteState
      });
    }
    
    // Use InCallManager to mute microphone
    InCallManager.setMicrophoneMute(newMuteState);
  };
  
  // Toggle speaker
  const toggleSpeaker = () => {
    const newSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(newSpeakerState);
    
    // Use InCallManager to toggle speaker
    InCallManager.setSpeakerphoneOn(newSpeakerState);
  };
  
  // End call
  const endCall = async (updateFirestore = true) => {
    // Stop timer and sounds
    if (timerRef.current) clearInterval(timerRef.current);
    await stopRingingSound();
    
    // Update call status in Firestore
    if (updateFirestore && callDocRef.current) {
      try {
        await updateDoc(callDocRef.current, {
          status: 'ended',
          endedAt: serverTimestamp(),
          duration: callDuration
        });
      } catch (error) {
        console.error('Error updating call status:', error);
      }
    }
    
    // Navigate back
    navigation.goBack();
  };
  
  // Answer incoming call
  const answerCall = async () => {
    try {
      if (callDocRef.current) {
        await updateDoc(callDocRef.current, {
          status: 'connected',
          answeredAt: serverTimestamp()
        });
        
        setCallStatus('ongoing');
        startCallTimer();
      }
    } catch (error) {
      console.error('Error answering call:', error);
      Alert.alert('Error', 'Failed to answer call. Please try again.');
    }
  };
  
  // Clean up call resources
  const cleanupCall = async () => {
    // If call is still in ringing state, mark it as missed
    if (callStatus === 'ringing' && callDocRef.current) {
      try {
        await updateDoc(callDocRef.current, {
          status: 'missed',
          endedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error updating call status:', error);
      }
    }
  };
  
  // Render call status text
  const renderCallStatusText = () => {
    switch (callStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'ringing':
        return 'Ringing...';
      case 'ongoing':
        return formatDuration(callDuration);
      case 'incoming':
        return 'Incoming Call';
      default:
        return 'Call Ended';
    }
  };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  callInfoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  profileImageContainer: {
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 60,
    fontWeight: 'bold',
      color: colors.text, // TODO: This color should be from theme
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  callStatus: {
    fontSize: 18,
  },
  controlsContainer: {
    padding: 30,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
  },
  incomingCallControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  declineButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineIcon: {
    transform: [{ rotate: '135deg' }],
  },
  answerButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ongoingCallControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  controlButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
  },
  activeControlButton: {
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
  },
  controlText: {
    marginTop: 5,
    fontSize: 12,
  },
  endCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallIcon: {
    transform: [{ rotate: '135deg' }],
  },
  endCallText: {
      color: colors.text, // TODO: This color should be from theme
    marginTop: 5,
    fontSize: 12,
  },
});

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Call info area */}
      <View style={styles.callInfoContainer}>
        <View style={styles.profileImageContainer}>
          <View style={[styles.profileImage, { backgroundColor: colors.primary }]}>
            <Text style={styles.profileInitial}>
              {recipientName ? recipientName.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.callerName, { color: colors.text }]}>
          {recipientName || 'Unknown'}
        </Text>
        
        <Text style={[styles.callStatus, { color: colors.textSecondary }]}>
          {renderCallStatusText()}
        </Text>
      </View>
      
      {/* Call controls */}
      <View style={styles.controlsContainer}>
        {callStatus === 'incoming' ? (
          // Incoming call controls
          <View style={styles.incomingCallControls}>
            <TouchableOpacity 
              style={[styles.declineButton, { backgroundColor: colors.error }]}
              onPress={() => endCall(true)}
            >
              <Ionicons name="call" size={30} color={colors.text} style={styles.declineIcon} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.answerButton, { backgroundColor: colors.success }]}
              onPress={answerCall}
            >
              <Ionicons name="call" size={30} color={colors.text} />
            </TouchableOpacity>
          </View>
        ) : (
          // Ongoing call controls
          <View style={styles.ongoingCallControls}>
            <TouchableOpacity 
              style={[styles.controlButton, isMuted && styles.activeControlButton]}
              onPress={toggleMute}
            >
              <Ionicons 
                name={isMuted ? "mic-off" : "mic"} 
                size={24} 
                color={isMuted ? colors.primary : colors.text} 
              />
              <Text style={[styles.controlText, { color: isMuted ? colors.primary : colors.text }]}>
                {isMuted ? 'Unmute' : 'Mute'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButton, isSpeakerOn && styles.activeControlButton]}
              onPress={toggleSpeaker}
            >
              <Ionicons 
                name={isSpeakerOn ? "volume-high" : "volume-medium"} 
                size={24} 
                color={isSpeakerOn ? colors.primary : colors.text} 
              />
              <Text style={[styles.controlText, { color: isSpeakerOn ? colors.primary : colors.text }]}>
                {isSpeakerOn ? 'Speaker Off' : 'Speaker'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.endCallButton, { backgroundColor: colors.error }]}
              onPress={() => endCall(true)}
            >
              <Ionicons name="call" size={30} color={colors.text} style={styles.endCallIcon} />
              <Text style={styles.endCallText}>End</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default CallScreen;
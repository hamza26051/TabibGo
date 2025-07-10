import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';

const urduText = {
  treatment_in_progress: 'علاج جاری ہے',
  you_are_treating: 'آپ اب مریض کا علاج کر رہے ہیں',
  doctor_treating_you: 'آپ کا ڈاکٹر اب آپ کا علاج کر رہا ہے',
  complete_when_finished: 'علاج مکمل ہونے پر وزٹ مکمل کریں',
  doctor_will_complete: 'آپ کا ڈاکٹر علاج مکمل ہونے پر وزٹ مکمل کرے گا',
  extended_waiting: 'انتظار کا وقت بڑھا دیا گیا ہے',
  waiting_for_patient: 'مریض کا انتظار ہو رہا ہے',
  doctor_arrived: 'ڈاکٹر پہنچ گیا ہے!',
  waiting_for_receive: 'مریض کے وصول کرنے کا انتظار',
  waiting_expired: 'انتظار کا وقت ختم ہو گیا',
  please_receive_doctor: 'براہ کرم اپنے ڈاکٹر کو وصول کریں',
  cancel_visit: 'وزٹ منسوخ کریں',
  wait_more: 'مزید 5 منٹ انتظار کریں',
  received: 'وصول کر لیا',
};

const WaitingTimer = ({
  isDoctor, // boolean to determine if this is doctor or patient view
  timeRemaining, // seconds remaining in the timer
  isExtended, // boolean to track if timer has been extended
  onReceived, // callback when doctor is received
  onExtend, // callback to extend timer
  onCancel, // callback to cancel visit
  doctorName = 'Your doctor', // name of the doctor
  doctorReceived = false, // boolean to track if doctor has been received
}) => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors);
  const [localTimeRemaining, setLocalTimeRemaining] = useState(timeRemaining || 300);
  const timerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { language } = useLanguage();

  // Format seconds into minutes:seconds
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Calculate percentage for progress bar
  const calculatePercentage = () => {
    const maxTime = isExtended ? 600 : 300; // 10 or 5 minutes
    return (localTimeRemaining / maxTime) * 100;
  };

  // Update local timer every second
  useEffect(() => {
    // Update local time when prop changes
    setLocalTimeRemaining(timeRemaining);
    console.log('WaitingTimer: timeRemaining updated to', timeRemaining);

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Only start timer if we have time remaining and doctor hasn't been received
    if (timeRemaining > 0 && !doctorReceived) {
      console.log('WaitingTimer: Starting timer with', timeRemaining, 'seconds');
      timerRef.current = setInterval(() => {
        setLocalTimeRemaining((prev) => {
          if (prev <= 1) {
            console.log('WaitingTimer: Timer reached zero');
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        console.log('WaitingTimer: Cleaning up timer');
        clearInterval(timerRef.current);
      }
    };
  }, [timeRemaining, doctorReceived]);
  
  // Force re-render every second to ensure timer updates
  useEffect(() => {
    const forceUpdateInterval = setInterval(() => {
      // This empty setState forces a re-render
      setLocalTimeRemaining(prev => prev);
    }, 1000);
    
    return () => clearInterval(forceUpdateInterval);
  }, []);

  // Show alert when timer reaches zero
  useEffect(() => {
    if (localTimeRemaining === 0 && isDoctor && !doctorReceived) {
      Alert.alert(
        language === 'ur' ? urduText.waiting_expired : 'Waiting Time Expired',
        language === 'ur' ? urduText.please_receive_doctor : 'The patient has not received you yet. Would you like to wait longer or cancel the visit?',
        [
          {
            text: language === 'ur' ? urduText.cancel_visit : 'Cancel Visit',
            style: 'destructive',
            onPress: onCancel,
          },
          {
            text: language === 'ur' ? urduText.wait_more : 'Wait 5 More Minutes',
            onPress: onExtend,
          },
        ]
      );
    }
  }, [localTimeRemaining, isDoctor, doctorReceived, onCancel, onExtend]);
  
  // Start pulsing animation for treatment in progress
  useEffect(() => {
    if (doctorReceived) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          })
        ])
      ).start();
    }
    return () => pulseAnim.stopAnimation();
  }, [doctorReceived, pulseAnim]);

  // Render treatment in progress UI if doctor has been received
  if (doctorReceived) {
    return (
      <Animated.View 
        style={[
          styles.container, 
          { 
            transform: [{ scale: pulseAnim }] 
          }
        ]}
      >
        <View style={styles.headerContainer}>
          <Ionicons name="medkit-outline" size={24} color={colors.success} />
          <Text style={styles.headerText}>
            {language === 'ur' ? urduText.treatment_in_progress : 'Treatment in Progress'}
          </Text>
        </View>

        <View style={styles.treatmentContainer}>
          <View style={styles.treatmentIconContainer}>
            <Ionicons name="checkmark-circle" size={40} color={colors.success} />
          </View>
          <Text style={styles.treatmentText}>
            {isDoctor 
              ? (language === 'ur' ? urduText.you_are_treating : 'You are now treating the patient')
              : (language === 'ur' ? urduText.doctor_treating_you : `${doctorName} is now treating you`)}
          </Text>
          <Text style={styles.treatmentSubtext}>
            {isDoctor
              ? (language === 'ur' ? urduText.complete_when_finished : 'Complete the visit when treatment is finished')
              : (language === 'ur' ? urduText.doctor_will_complete : 'Your doctor will complete the visit when finished')}
          </Text>
        </View>
      </Animated.View>
    );
  }
  
  // Render waiting timer UI if doctor has not been received yet
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Ionicons name="time-outline" size={24} color={colors.primary} />
        <Text style={styles.headerText}>
          {isDoctor
            ? isExtended
              ? (language === 'ur' ? urduText.extended_waiting : 'Extended Waiting Period')
              : (language === 'ur' ? urduText.waiting_for_patient : 'Waiting for Patient')
            : (language === 'ur' ? urduText.doctor_arrived : `${doctorName} has arrived!`)}
        </Text>
      </View>

      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>
          {formatTime(localTimeRemaining)}
        </Text>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${calculatePercentage()}%` },
            ]}
          />
        </View>
        <Text style={styles.timerLabel}>
          {isDoctor
            ? localTimeRemaining > 0
              ? (language === 'ur' ? urduText.waiting_for_receive : 'Waiting for patient to receive you')
              : (language === 'ur' ? urduText.waiting_expired : 'Waiting time expired')
            : (language === 'ur' ? urduText.please_receive_doctor : 'Please receive your doctor')}
        </Text>
      </View>

      <View style={styles.actionContainer}>
        {isDoctor ? (
          // Doctor view
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onReceived}
          >
            <Text style={styles.actionButtonText}>{language === 'ur' ? urduText.received : 'Received'}</Text>
          </TouchableOpacity>
        ) : (
          // Patient view - REMOVED the "I've Received My Doctor" button
          // Patient should not have this button, only the doctor should
          null
        )}

        {isDoctor && localTimeRemaining === 0 && (
          <View style={styles.expiredActionContainer}>
            <TouchableOpacity
              style={[styles.expiredActionButton, { backgroundColor: colors.error }]}
              onPress={onCancel}
            >
              <Text style={styles.actionButtonText}>{language === 'ur' ? urduText.cancel_visit : 'Cancel Visit'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.expiredActionButton, { backgroundColor: colors.primary }]}
              onPress={onExtend}
            >
              <Text style={styles.actionButtonText}>{language === 'ur' ? urduText.wait_more : 'Wait 5 More Minutes'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const createStyles = (colors) => {
  return StyleSheet.create({
    container: {
      borderRadius: 12,
      padding: 16,
      margin: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      backgroundColor: colors.card,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    headerText: {
      fontSize: 18,
      fontWeight: 'bold',
      marginLeft: 8,
      color: colors.text,
    },
    timerContainer: {
      alignItems: 'center',
      marginVertical: 12,
    },
    timerText: {
      fontSize: 36,
      fontWeight: 'bold',
      marginBottom: 8,
      color: colors.primary,
    },
    progressBarContainer: {
      width: '100%',
      height: 8,
      backgroundColor: colors.divider,
      borderRadius: 4,
      marginVertical: 8,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    timerLabel: {
      fontSize: 14,
      marginTop: 8,
      color: colors.textSecondary,
    },
    actionContainer: {
      marginTop: 16,
    },
    actionButton: {
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.success,
    },
    actionButtonText: {
      color: colors.buttonText,
      fontWeight: 'bold',
      fontSize: 16,
    },
    expiredActionContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    expiredActionButton: {
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flex: 0.48,
    },
    // Treatment in progress styles
    treatmentContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
    },
    treatmentIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      backgroundColor: colors.success + '20',
    },
    treatmentText: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
      textAlign: 'center',
      color: colors.text,
    },
    treatmentSubtext: {
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 16,
      color: colors.textSecondary,
    },
  });
};

export default WaitingTimer;
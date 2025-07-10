import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator, Alert, Image, TextInput, FlatList, Linking, Animated, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Circle, Polyline, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { createPatientRequest, listenToDoctorMatches, acceptDoctorOffer, cancelPatientRequest, listenToPatientRequest } from '../firebase/patientDoctorMatching';
import { auth } from '../firebase/config';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { useLocationTracking } from '../context/LocationTrackingContext';
import { getDirectionsFromApi, createStraightLineRoute } from '../utils/directionsApi';
import { lightMapStyle, darkMapStyle, routeStyles } from '../theme/mapStyles';
import WaitingTimer from '../components/WaitingTimer';
import Text from '../components/Text';
import Card from '../components/Card';
import { db } from '../firebase/config';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import StarRating from 'react-native-star-rating-widget';
import { saveRating, getAverageRating } from '../firebase/ratingService';
import { useRating } from '../context/RatingContext';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchMultipleUserProfilePictures } from '../utils/profilePictureUtils';
// import translations from '../translations/appTranslations';
import { useLanguage } from '../context/LanguageContext';

// Mock data for nearby doctors
const MOCK_DOCTORS = [
  {
    id: 1,
    name: 'Dr. Ahmed Khan',
    specialty: 'General Physician',
    rating: 4.8,
    distance: '1.2 km',
    eta: '10 min',
    location: { latitude: 24.8607, longitude: 67.0011 }, // Will be dynamically adjusted
    image: require('../assets/doctor-icon-new.png'),
  },
  {
    id: 2,
    name: 'Dr. Sara Ali',
    specialty: 'Pediatrician',
    rating: 4.9,
    distance: '2.5 km',
    eta: '15 min',
    location: { latitude: 24.8637, longitude: 67.0031 }, // Will be dynamically adjusted
    image: require('../assets/doctor-icon-new.png'),
  },
  {
    id: 3,
    name: 'Dr. Bilal Ahmed',
    specialty: 'Emergency Medicine',
    rating: 4.7,
    distance: '3.0 km',
    eta: '20 min',
    location: { latitude: 24.8587, longitude: 67.0051 }, // Will be dynamically adjusted
    image: require('../assets/doctor-icon-new.png'),
  },
];

const MapScreen = ({ navigation, route }) => {
  const [location, setLocation] = useState(null);
  const [patientLocation, setPatientLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [nearbyDoctors, setNearbyDoctors] = useState([]);
  const [searchLocation, setSearchLocation] = useState('');
  const [addressDetails, setAddressDetails] = useState('');
  const [doctorTimers, setDoctorTimers] = useState({});
  const [showingDoctors, setShowingDoctors] = useState(false);
  const [requestId, setRequestId] = useState(null);
  const [matchId, setMatchId] = useState(null);
  const [trackingDoctor, setTrackingDoctor] = useState(false);
  const [acceptedDoctorOffer, setAcceptedDoctorOffer] = useState(null);
  const [doctorOfferTimer, setDoctorOfferTimer] = useState(10); // 10 second countdown
  const [doctorLocation, setDoctorLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [doctorHasReached, setDoctorHasReached] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [directions, setDirections] = useState(null);
  const [currentDoctorName, setCurrentDoctorName] = useState(null);
  const [currentDoctorId, setCurrentDoctorId] = useState(null);
  const [doctorReceived, setDoctorReceived] = useState(null);
  const timerRefs = useRef({});
  const doctorOfferTimerRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [doctorRating, setDoctorRating] = useState(0);
  const [lastCompletedVisitId, setLastCompletedVisitId] = useState(null);
  const matchIdRef = useRef(null);
  const [hasShownRatingModal, setHasShownRatingModal] = useState(false); // NEW
  const [doctorRatings, setDoctorRatings] = useState({});
  const [visitWasCancelled, setVisitWasCancelled] = useState(false);
  const [visitCancelledByDoctor, setVisitCancelledByDoctor] = useState(false); // NEW - track if doctor cancelled
  const [doctorProfilePictures, setDoctorProfilePictures] = useState({});
  const [trackingDoctorInfo, setTrackingDoctorInfo] = useState(null);
  
  // Get the theme at the component level
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors);

  // Get the location tracking context at the component level
  const locationTracking = useLocationTracking();

  // Get the rating context at the component level
  const { refreshRatings } = useRating();

  // Get the auth context at the component level
  const { currentUser } = useAuth();

  // Get the language context at the component level
  const { language } = useLanguage();

  const urduText = {
    doctor_on_way: 'ڈاکٹر راستے میں ہے',
    doctor_arrived: 'ڈاکٹر پہنچ گیا ہے',
    chat_with_doctor: 'ڈاکٹر سے چیٹ کریں',
    call_doctor: 'ڈاکٹر کو کال کریں',
    accept: 'قبول کریں',
    decline: 'مسترد کریں',
    no_longer_available: 'اب دستیاب نہیں',
    available_for: 'دستیاب وقت:',
    fee: 'فیس',
    specialty: 'تخصص',
    distance: 'فاصلہ',
    eta: 'متوقع وقت',
    maps: 'نقشہ',
    rating: 'ریٹنگ',
    available_doctors: 'دستیاب ڈاکٹرز',
    cancel: 'منسوخ کریں',
    confirm_doctor: 'ڈاکٹر کی تصدیق کریں',
    waiting_for_doctors: 'ڈاکٹرز کے جواب کا انتظار ہو رہا ہے...',
    finding_doctors: 'آپ کے قریب ڈاکٹرز تلاش کیے جا رہے ہیں...',
    doctors_will_appear: 'ڈاکٹرز آپ کی درخواست پر ظاہر ہوں گے',
    address_details: 'پتہ کی تفصیلات',
    search_location: 'مقام تلاش کریں',
    confirm_location: 'مقام کی تصدیق کریں',
    estimated_time: 'متوقع وقت',
    distance: 'فاصلہ',
    current_route: 'موجودہ راستہ',
    live_tracking: 'ڈاکٹر کی لائیو ٹریکنگ',
    notified_when_arrives: 'جب ڈاکٹر پہنچے گا تو آپ کو اطلاع دی جائے گی',
    cancel_visit: 'وزٹ منسوخ کریں',
    rate_doctor: 'ڈاکٹر کی درجہ بندی کریں',
    submit_rating: 'درجہ بندی جمع کروائیں',
    rating_submitted: 'درجہ بندی جمع ہوگئی',
    doctor_rating: 'ڈاکٹر کی درجہ بندی',
  };

  // Helper function to calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  };
  
  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  // Function to calculate real ETA based on distance
  const calculateETA = (distanceInKm) => {
    // Assuming average speed of 30 km/h in urban areas
    const averageSpeedKmh = 30;
    const timeInMinutes = Math.ceil((distanceInKm / averageSpeedKmh) * 60);
    
    if (timeInMinutes < 1) {
      return 'Less than 1 min';
    } else if (timeInMinutes < 60) {
      return `${timeInMinutes} min`;
    } else {
      const hours = Math.floor(timeInMinutes / 60);
      const minutes = timeInMinutes % 60;
      return `${hours} hr ${minutes} min`;
    }
  };

  // Function to get real distance and ETA for a doctor
  const getRealDoctorMetrics = (doctor) => {
    if (!location || !doctor.location) {
      return { distance: 'Calculating...', eta: 'Calculating...' };
    }

    try {
      const distanceInKm = calculateDistance(
        location.latitude,
        location.longitude,
        doctor.location.latitude,
        doctor.location.longitude
      );
      
      const eta = calculateETA(distanceInKm);
      
      return {
        distance: `${distanceInKm.toFixed(1)} km`,
        eta: eta
      };
    } catch (error) {
      console.error('Error calculating doctor metrics:', error);
      return { distance: 'Calculating...', eta: 'Calculating...' };
    }
  };

  // Listen to changes in the doctorHasReached state from LocationTrackingContext
  // This ensures the patient interface updates when the doctor marks arrival
  useEffect(() => {
    console.log('LocationTracking doctorHasReached changed:', locationTracking.doctorHasReached);
    
    // Update local state when the context state changes
    if (locationTracking.doctorHasReached !== doctorHasReached) {
      console.log('Updating doctorHasReached state in MapScreen');
      setDoctorHasReached(locationTracking.doctorHasReached);
      
      // Force UI update when doctor has reached
      if (locationTracking.doctorHasReached === true) {
        // Clear any existing ETA data to ensure it doesn't show
        setEta(null);
        setDirections(null);
        
        // Force the UI to show the timer by ensuring tracking is active
        if (!trackingDoctor) {
          setTrackingDoctor(true);
        }
        
        // Log to verify timer state
        console.log('Doctor has reached - Timer state:', {
          waitingTimeRemaining: locationTracking.waitingTimeRemaining,
          waitingTimerExtended: locationTracking.waitingTimerExtended,
          doctorReceived: locationTracking.doctorReceived
        });
      }
    }
  }, [locationTracking.doctorHasReached, doctorHasReached, trackingDoctor]);

  // Listen to changes in the LocationTrackingContext's isTracking state
  // This ensures the MapScreen responds to visit completion events
  useEffect(() => {
    console.log('LocationTracking isTracking changed:', locationTracking.isTracking);
    
    // If we were tracking but now we're not, it means the visit was completed or cancelled
    if (trackingDoctor && !locationTracking.isTracking) {
      console.log('Visit tracking stopped in LocationTrackingContext, updating MapScreen state');
      
      // Store the matchId in the ref BEFORE clearing it
      matchIdRef.current = matchId;
      
      // Reset all tracking-related state in MapScreen
      setTrackingDoctor(false);
      setMatchId(null);
      setRequestId(null);
      setDoctorLocation(null);
      setEta(null);
      setDoctorHasReached(false);
      setRouteCoordinates([]);
      setDirections(null);
      setAcceptedDoctorOffer(null);
      setTrackingDoctorInfo(null);
      setCurrentDoctorName(null);
      setCurrentDoctorId(null);
      // Only set showingDoctors to false, never to true after cancellation
      setShowingDoctors(false);
      
      // Clean up any remaining timers
      Object.values(timerRefs.current).forEach(timer => {
        clearInterval(timer);
      });
      if (doctorOfferTimerRef.current) {
        clearInterval(doctorOfferTimerRef.current);
      }
      
      // Unsubscribe from any Firebase listeners
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    }
  }, [locationTracking.isTracking, trackingDoctor]);



  // Add a listener for when the user tries to navigate away
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Only prompt the user if they have an active request
      if (requestId && showingDoctors && !trackingDoctor) {
        // Prevent default behavior of leaving the screen
        e.preventDefault();
        
        // Prompt the user before leaving the screen
        Alert.alert(
          'Cancel Request?',
          'You have an active doctor request. Do you want to cancel it?',
          [
            { 
              text: "Don't leave", 
              style: 'cancel', 
              onPress: () => {} 
            },
            {
              text: 'Cancel Request and Leave', 
              style: 'destructive',
              onPress: () => {
                handleCancelRequest();
                navigation.dispatch(e.data.action);
              }
            }
          ]
        );
      }
    });

    return unsubscribe;
  }, [navigation, requestId, showingDoctors, trackingDoctor]);

  // Define the renderDoctorCard method here, before it's used
  const renderDoctorCard = (doctor) => {
    console.log('*** PATIENT SCREEN: Rendering doctor LIST card (THIS IS THE PATIENT VIEW) ***', doctor.name, 'doctorId:', doctor.doctorId, 'rating:', doctorRatings[doctor.doctorId]);
    const timeRemaining = doctorTimers[doctor.id] || 0;
    const isExpired = timeRemaining === 0;
    const isSelected = selectedDoctor?.id === doctor.id;
    
    // Get real-time distance and ETA
    const realMetrics = getRealDoctorMetrics(doctor);
    
    return (
      <Card
        variant="elevated"
        elevation={4}
        style={[styles.doctorCard, isSelected && styles.selectedDoctorCard]}
        onPress={isExpired ? null : () => handleDoctorSelect(doctor)}
      >
        <View style={styles.doctorCardContent}>
          {doctorProfilePictures[doctor.doctorId] ? (
            <Image source={{ uri: doctorProfilePictures[doctor.doctorId] }} style={styles.doctorImage} />
          ) : (
            <Image source={doctor.image} style={styles.doctorImage} />
          )}
          <View style={styles.doctorInfo}>
            <Text variant="subheading" weight="semibold" style={styles.doctorName}>
              {doctor.name}
              {doctor.doctorId && (
                <Text style={{ marginLeft: 8, fontSize: 14, color: '#FFD700', fontWeight: 'bold' }}>
                  <Ionicons name="star" size={14} color="#FFD700" /> {doctorRatings[doctor.doctorId] && doctorRatings[doctor.doctorId] !== 'No ratings' ? Number(doctorRatings[doctor.doctorId]).toFixed(2) : (language === 'ur' ? urduText.rating : 'No ratings')}
                </Text>
              )}
            </Text>
            <Text variant="caption" color={colors.textSecondary} style={styles.doctorSpecialty}>{language === 'ur' ? urduText.specialty + ': ' : ''}{doctor.specialty}</Text>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.success, marginTop: 2, marginBottom: 2 }}>
              {language === 'ur' ? urduText.fee + ': ' : 'Fee: '}{doctor.fee ? doctor.fee : '1500-2500'}
            </Text>
            <View style={styles.doctorMetrics}>
              <View style={styles.distanceContainer}>
                <Ionicons name="location-outline" size={14} color={colors.primary} />
                <Text variant="caption" color={colors.textSecondary} style={styles.doctorDistance}>{language === 'ur' ? urduText.distance + ': ' : ''}{realMetrics.distance}</Text>
              </View>
            </View>
            <View style={styles.etaContainer}>
              <Ionicons name="time-outline" size={14} color={colors.primary} />
              <Text variant="caption" weight="semibold" color={colors.primary} style={styles.doctorEta}>{language === 'ur' ? urduText.eta + ': ' : 'ETA: '}{realMetrics.eta}</Text>
            </View>
            
            {/* Timer display */}
            <View style={styles.timerContainer}>
              {!isExpired ? (
                <>
                  <Text variant="caption" color={colors.textSecondary} style={styles.timerText}>
                    {language === 'ur' ? urduText.available_for : 'Available for:'} {timeRemaining}s
                  </Text>
                  <View style={styles.timerBarContainer}>
                    <View 
                      style={[styles.timerBar, { width: `${(timeRemaining / 10) * 100}%` }]} 
                    />
                  </View>
                  
                  {/* Accept/Decline buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleAcceptDoctorFromCard(doctor)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color={colors.buttonText} />
                      <Text variant="caption" weight="semibold" color={colors.buttonText} style={styles.actionButtonText}>{language === 'ur' ? urduText.accept : 'Accept'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.declineButton]}
                      onPress={() => {
                        // Remove this doctor from the list
                        setNearbyDoctors(prev => 
                          prev.filter(d => d.id !== doctor.id)
                        );
                        // Clear the timer
                        clearInterval(timerRefs.current[doctor.id]);
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={16} color={colors.buttonText} />
                      <Text variant="caption" weight="semibold" color={colors.buttonText} style={styles.actionButtonText}>{language === 'ur' ? urduText.decline : 'Decline'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <Text variant="caption" color={colors.error} style={styles.expiredText}>{language === 'ur' ? urduText.no_longer_available : 'No longer available'}</Text>
              )}
            </View>
          </View>
        </View>
      </Card>
    );
  };

  // Animation values for pulsing effect - moved from renderTrackingUI to component level
  const [pulseAnim] = useState(new Animated.Value(1));
  
  // Start pulsing animation when tracking - moved from renderTrackingUI
  useEffect(() => {
    if (trackingDoctor && !doctorHasReached) {
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
  }, [trackingDoctor, doctorHasReached, pulseAnim]);

  // Render the tracking UI when doctor is on the way - modified to not use hooks inside
  const renderTrackingUI = () => {
    console.log('renderTrackingUI called, trackingDoctor:', trackingDoctor, 'doctorHasReached:', doctorHasReached);
    console.log('LocationTrackingContext state:', {
      doctorHasReached: locationTracking.doctorHasReached,
      waitingTimerActive: locationTracking.waitingTimerActive,
      waitingTimeRemaining: locationTracking.waitingTimeRemaining,
      doctorReceived: locationTracking.doctorReceived
    });
    if (!trackingDoctor) return null;
    
    return (
      <Animated.View 
        style={[
          styles.trackingContainer, 
          { 
            backgroundColor: colors.card, 
            shadowColor: colors.shadow,
            transform: doctorHasReached ? [] : [{ scale: pulseAnim }]
          }
        ]}
      >
        {/* Header with gradient */}
        <LinearGradient
          colors={[colors.primary, isDarkMode ? '#1A3A5A' : '#4D94FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.trackingHeaderGradient}
        >
          <View style={styles.trackingHeaderContent}>
            <View style={styles.trackingHeaderLeft}>
              <Ionicons name="navigate-circle" size={24} color={colors.buttonText} />
              <Text variant="subheading" color={colors.buttonText} style={styles.trackingHeaderTitle}>
                {doctorHasReached ? (language === 'ur' ? urduText.doctor_arrived : 'Doctor Has Arrived') : (language === 'ur' ? urduText.doctor_on_way : 'Doctor is on the way')}
              </Text>
            </View>
            
            {patientLocation && doctorLocation && (
              <TouchableOpacity 
                style={styles.openGoogleMapsButton}
                onPress={() => {
                  if (doctorLocation) {
                    const url = `https://www.google.com/maps/dir/?api=1&origin=${patientLocation.latitude},${patientLocation.longitude}&destination=${doctorLocation.latitude},${doctorLocation.longitude}`;
                    Linking.openURL(url);
                  }
                }}
              >
                <Ionicons name="open-outline" size={16} color={colors.buttonText} />
                <Text variant="caption" weight="medium" color={colors.buttonText} style={styles.openGoogleMapsButtonText}>{language === 'ur' ? urduText.maps : 'Maps'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
        
        <ScrollView 
          style={styles.trackingContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.trackingScrollContent}
        >
          {/* Communication buttons - ALWAYS show these */}
          <View style={styles.communicationContainer}>
            <TouchableOpacity 
              style={[styles.communicationButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (matchId) {
                  navigation.navigate('Chat', { requestId: matchId });
                } else {
                  Alert.alert('Chat not available', 'Chat will be available once the doctor accepts your request.');
                }
              }}
            >
              <Ionicons name="chatbubble-outline" size={20} color={colors.buttonText} />
              <Text variant="body" weight="semibold" color={colors.buttonText} style={styles.communicationButtonText}>{language === 'ur' ? urduText.chat_with_doctor : 'Chat with Doctor'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.communicationButton, { backgroundColor: colors.success }]}
              onPress={() => {
                if (acceptedDoctorOffer && acceptedDoctorOffer.doctorId) {
                  // Generate a unique call ID
                  const callId = `patient_doctor_${Date.now()}`;
                  // Navigate to call screen with necessary params
                  navigation.navigate('Call', {
                    callId,
                    recipientId: acceptedDoctorOffer.doctorId,
                    recipientName: acceptedDoctorOffer.name,
                    isIncoming: false
                  });
                } else {
                  Alert.alert('Cannot Make Call', 'The doctor\'s information is not available yet.');
                }
              }}
            >
              <Ionicons name="call-outline" size={20} color={colors.buttonText} />
              <Text variant="body" weight="semibold" color={colors.buttonText} style={styles.communicationButtonText}>{language === 'ur' ? urduText.call_doctor : 'Call Doctor'}</Text>
            </TouchableOpacity>
          </View>

          {doctorHasReached === true || locationTracking.doctorHasReached === true ? (
            /* When doctor has arrived, show the timer */
            <View style={[styles.timerOnlyContainer, { zIndex: 999, elevation: 999 }]}> 
              {renderDoctorInfoHeader()}
              <WaitingTimer 
                isDoctor={false}
                timeRemaining={locationTracking.waitingTimeRemaining}
                isExtended={locationTracking.waitingTimerExtended}
                onReceived={() => {
                  locationTracking.markDoctorAsReceived();
                  Alert.alert(
                    'Doctor Received',
                    'You have confirmed receiving your doctor. Your visit will now begin.',
                    [{ text: 'OK' }]
                  );
                }}
                doctorName={currentDoctorName || 'Your doctor'}
                doctorReceived={locationTracking.doctorReceived}
              />
            </View>
          ) : (
            /* When doctor is on the way, show all tracking information */
            <>
              {/* ETA Card */}
              <Card variant="elevated" elevation={2} style={styles.etaCard}>
                {renderDoctorInfoHeader()}
                <View style={styles.etaIconContainer}>
                  <View style={[styles.etaIcon, { backgroundColor: isDarkMode ? 'rgba(33, 150, 243, 0.15)' : 'rgba(0, 102, 204, 0.1)' }]}>
                    <Ionicons name="time-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.etaTextContainer}>
                    <Text variant="caption" weight="medium" color={colors.textSecondary}>
                      {language === 'ur' ? urduText.estimated_time : 'Estimated Time'}
                    </Text>
                    <Text variant="subheading" weight="semibold" style={styles.etaDuration}>
                      {eta && eta.text ? eta.text : 'Calculating...'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.etaDivider} />
                
                <View style={styles.etaIconContainer}>
                  <View style={[styles.etaIcon, { backgroundColor: isDarkMode ? 'rgba(33, 150, 243, 0.15)' : 'rgba(0, 102, 204, 0.1)' }]}>
                    <Ionicons name="location-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.etaTextContainer}>
                    <Text variant="caption" weight="medium" color={colors.textSecondary}>
                      {language === 'ur' ? urduText.distance : 'Distance'}
                    </Text>
                    <Text variant="subheading" weight="semibold" style={styles.etaDistance}>
                      {eta && eta.distance ? eta.distance : 'Calculating...'}
                    </Text>
                  </View>
                </View>
              </Card>
              
              {/* Directions Card */}
              {directions && directions.steps && directions.steps.length > 0 && (
                <Card variant="flat" style={styles.directionsCard}>
                  <View style={styles.directionsHeader}>
                    <Ionicons name="navigate-outline" size={18} color={colors.primary} />
                    <Text variant="body" weight="semibold" color={colors.primary} style={styles.directionsHeaderText}>
                      {language === 'ur' ? urduText.current_route : 'Current Route'}
                    </Text>
                  </View>
                  <Text variant="body" style={styles.directionsText}>{directions.steps[0].instructions}</Text>
                  <Text variant="caption" color={colors.textSecondary} style={styles.directionsDistance}>{directions.steps[0].distance}</Text>
                </Card>
              )}
              
              {/* Status Card */}
              <Card variant="elevated" elevation={2} style={styles.statusCard}>
                <View style={styles.liveTrackingContainer}>
                  <View style={styles.liveTrackingIconContainer}>
                    <View style={styles.pulsingDot}>
                      <View style={[styles.pulsingCore, { backgroundColor: colors.primary }]} />
                      <View style={[styles.pulsingRing, { borderColor: colors.primary }]} />
                    </View>
                  </View>
                  <View style={styles.liveTrackingTextContainer}>
                    <Text variant="body" weight="semibold" color={colors.primary} style={styles.liveTrackingText}>
                      {language === 'ur' ? urduText.live_tracking : 'Live tracking your doctor'}
                    </Text>
                    <Text variant="caption" color={colors.textSecondary} style={styles.liveTrackingSubtext}>
                      {language === 'ur' ? urduText.notified_when_arrives : "You'll be notified when your doctor arrives"}
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Cancel Request Button */}
              <TouchableOpacity 
                style={[styles.cancelRequestButton, { backgroundColor: colors.error }]}
                onPress={() => {
                  Alert.alert(
                    'Cancel Visit',
                    'Are you sure you want to cancel this visit? The doctor will be notified and the visit will end.',
                    [
                      { text: 'No, Keep Visit', style: 'cancel' },
                      { 
                        text: 'Yes, Cancel Visit', 
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            setVisitWasCancelled(true); // NEW
                            const success = await locationTracking.cancelVisitEnRoute();
                            if (success) {
                              // Clear all request state
                              setRequestId(null);
                              setShowingDoctors(false);
                              setTrackingDoctor(false);
                              setMatchId(null);
                              setDoctorLocation(null);
                              setEta(null);
                              setDoctorHasReached(false);
                              setRouteCoordinates([]);
                              setDirections(null);
                              setAcceptedDoctorOffer(null);
                              setTrackingDoctorInfo(null);
                              setCurrentDoctorName(null);
                              setCurrentDoctorId(null);
                              setNearbyDoctors([]);
                              setDoctorTimers({});
                              // Navigate to dashboard
                              navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
                            } else {
                              Alert.alert('Error', 'Could not cancel the visit. Please try again.');
                            }
                          } catch (error) {
                            console.error('Error cancelling visit:', error);
                            Alert.alert('Error', 'Could not cancel the visit. Please try again.');
                          }
                        }
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="close-circle-outline" size={20} color={colors.buttonText} />
                <Text variant="body" weight="semibold" color={colors.buttonText} style={styles.cancelRequestButtonText}>
                  {language === 'ur' ? urduText.cancel_visit : 'Cancel Visit'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </Animated.View>
    );
  };

  // Create a ref to store the selected location persistently throughout the session
  const selectedLocationRef = useRef(null);

  // Sync doctorHasReached state with LocationTrackingContext
  useEffect(() => {
    console.log('Syncing doctorHasReached state:', {
      localDoctorHasReached: doctorHasReached,
      contextDoctorHasReached: locationTracking.doctorHasReached
    });
    
    if (locationTracking.doctorHasReached !== doctorHasReached) {
      console.log('Updating local doctorHasReached state to match context');
      setDoctorHasReached(locationTracking.doctorHasReached);
      
      // Clear ETA and directions when doctor arrives to prevent UI conflicts
      if (locationTracking.doctorHasReached) {
        console.log('Doctor has arrived - clearing ETA and directions');
        setEta(null);
        setDirections(null);
      }
    }
  }, [locationTracking.doctorHasReached, doctorHasReached]);

  // Additional effect to handle context state changes more robustly
  useEffect(() => {
    console.log('LocationTrackingContext state changed:', {
      doctorHasReached: locationTracking.doctorHasReached,
      waitingTimerActive: locationTracking.waitingTimerActive,
      waitingTimeRemaining: locationTracking.waitingTimeRemaining,
      doctorReceived: locationTracking.doctorReceived
    });
    
    // Force update local state to match context
    setDoctorHasReached(locationTracking.doctorHasReached);
    
    // Clear ETA and directions when doctor arrives
    if (locationTracking.doctorHasReached) {
      setEta(null);
      setDirections(null);
    }
  }, [locationTracking.doctorHasReached, locationTracking.waitingTimerActive, locationTracking.waitingTimeRemaining, locationTracking.doctorReceived]);

  // Sync ETA and doctor location from LocationTrackingContext
  useEffect(() => {
    console.log('Syncing ETA and doctor location from context:', {
      contextEta: locationTracking.eta,
      contextDoctorLocation: locationTracking.doctorLocation,
      contextPatientLocation: locationTracking.patientLocation
    });
    
    // Sync ETA from context
    if (locationTracking.eta && !locationTracking.doctorHasReached) {
      setEta(locationTracking.eta);
    }
    
    // Sync doctor location from context
    if (locationTracking.doctorLocation) {
      setDoctorLocation(locationTracking.doctorLocation);
    }
    
    // Sync patient location from context
    if (locationTracking.patientLocation) {
      setPatientLocation(locationTracking.patientLocation);
    }
  }, [locationTracking.eta, locationTracking.doctorLocation, locationTracking.patientLocation, locationTracking.doctorHasReached]);

  // Add after the doctorHasReached syncing effect
  useEffect(() => {
    console.log('Syncing doctorReceived state:', {
      localDoctorReceived: doctorReceived,
      contextDoctorReceived: locationTracking.doctorReceived
    });
    if (locationTracking.doctorReceived !== doctorReceived) {
      console.log('Updating local doctorReceived state to match context');
      setDoctorReceived(locationTracking.doctorReceived);
    }
  }, [locationTracking.doctorReceived, doctorReceived]);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        
        // Request location permissions
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setIsLoading(false);
          return;
        }

        // Get current location
        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        // Check if we have a location from route params (selected by user)
        // This is the key fix - prioritize the location from route params over current GPS location
        // Store the selected location in a ref to maintain consistency throughout the session
        if (route.params?.patientData?.location) {
          // Use the location that was selected by the user
          const userSelectedLocation = route.params.patientData.location;
          setLocation(userSelectedLocation);
          setPatientLocation(userSelectedLocation);
          // Store this selected location in the ref to use consistently throughout the session
          selectedLocationRef.current = userSelectedLocation;
          console.log('Using selected location from params:', userSelectedLocation);
          
          // Try to get address from coordinates for better UX
          getDetailedAddress(userSelectedLocation);
        } else if (selectedLocationRef.current) {
          // If we already have a stored location in the ref, use that instead of current GPS
          console.log('Using previously stored selected location:', selectedLocationRef.current);
          setLocation(selectedLocationRef.current);
          setPatientLocation(selectedLocationRef.current);
        } else {
          // Fall back to current GPS location if no selected location
          setLocation(currentLocation.coords);
          setPatientLocation(currentLocation.coords);
          
          // Try to get address from coordinates for better UX
          getDetailedAddress(currentLocation.coords);
        }
        
        // Note: We don't need to listen for active patient requests here
        // The request is created when coming from booking screen
        // and cancelled properly when needed

        // Check if we're coming from the booking screen
        const isFromBooking = route.params?.fromBooking;
        setShowingDoctors(isFromBooking);

        if (isFromBooking) {
          // Reset cancellation state when starting a new request
          setVisitWasCancelled(false);
          setVisitCancelledByDoctor(false);
          
          // Debug: Log addressDetails from route and patientData
          console.log('DEBUG: route.params.addressDetails:', route.params?.addressDetails);
          console.log('DEBUG: route.params.patientData.addressDetails:', route.params?.patientData?.addressDetails);
          // Set a 5-minute timeout for finding doctors
          const searchTimeout = setTimeout(() => {
            if (nearbyDoctors.length === 0) {
              setErrorMsg('No doctors found in your area. Please try again later.');
              setIsLoading(false);
            }
          }, 5 * 60 * 1000); // 5 minutes
          
          // Create a patient request in the database
          const createRequest = async () => {
            try {
              // Get patient information from route params or user profile
              // Create the patient request with properly formatted location
              const patientData = route.params?.patientData || {};
              const symptoms = patientData.symptoms || route.params?.symptoms || 'Not specified';
              const description = patientData.description || route.params?.description || 'Not specified';
              const age = patientData.age || route.params?.age || 30; // Default age if not provided
              
              // Always use the stored selected location if available, then route params, then current location
              // This is the key fix - consistently use the selected location even after switching modes
              const patientLocation = selectedLocationRef.current || route.params?.patientData?.location || currentLocation.coords;
              
              // Create the patient request with properly formatted location
              const formattedLocation = {
                latitude: patientLocation.latitude,
                longitude: patientLocation.longitude
              };
              
              // Make sure we keep the selected location in our ref for consistency
              if (!selectedLocationRef.current && route.params?.patientData?.location) {
                selectedLocationRef.current = route.params.patientData.location;
              }
              
              console.log('Creating patient request with location:', formattedLocation);
              
              // Get agreed price if available
              const agreedPrice = route.params?.patientData?.agreedPrice || 0;
              
              console.log('MapScreen: route.params.patientData:', route.params?.patientData);
              console.log('MapScreen: attachedImage to be sent:', route.params?.patientData?.attachedImage);
              const requestId = await createPatientRequest({
                patientId: auth.currentUser.uid,
                patientName: auth.currentUser.displayName || 'Patient',
                location: formattedLocation,
                symptoms,
                description,
                age,
                agreedPrice,
                addressDetails: patientData.addressDetails || route.params?.addressDetails || '',
                attachedImage: route.params?.patientData?.attachedImage || null
              });
              
              console.log('Patient request created with ID:', requestId);
              
              // Store the request ID for later use
              setRequestId(requestId);
              setIsLoading(false);
              
              // Listen for doctor matches
              const unsubscribe = listenToDoctorMatches(requestId, (matches) => {
                console.log('Received doctor matches:', matches);
                
                if (matches.length === 0) {
                  console.log('No doctor matches received yet');
                  return;
                }
                
                // Check if any doctor has just accepted the request
                const newAcceptedDoctor = matches.find(match => {
                  // Check if this is a new match we haven't processed yet
                  const isNew = !nearbyDoctors.some(doc => doc.doctorId === match.doctorId);
                  return isNew;
                });
                
                if (newAcceptedDoctor && !acceptedDoctorOffer) {
                  console.log('New doctor offer received:', newAcceptedDoctor);
                  
                  // Format the doctor data
                  const doctorData = {
                    id: matches.length, // Use a unique ID
                    name: newAcceptedDoctor.name,
                    specialty: newAcceptedDoctor.specialty || 'General Physician',
                    distance: newAcceptedDoctor.distance || 'Calculating...',
                    eta: newAcceptedDoctor.eta || 'Calculating...',
                    location: newAcceptedDoctor.location || location,
                    image: require('../assets/doctor-icon-new.png'),
                    doctorId: newAcceptedDoctor.doctorId,
                    offeredAt: newAcceptedDoctor.offeredAt,
                    fee: newAcceptedDoctor.fee,
                  };
                  
                  // Set the accepted doctor offer
                  setAcceptedDoctorOffer(doctorData);
                  
                  // Start the 10-second countdown timer
                  setDoctorOfferTimer(10);
                  
                  // Clear any existing timer
                  if (doctorOfferTimerRef.current) {
                    clearInterval(doctorOfferTimerRef.current);
                  }
                  
                  // Start a new timer
                  doctorOfferTimerRef.current = setInterval(() => {
                    setDoctorOfferTimer(prev => {
                      if (prev <= 1) {
                        // Time's up, clear the interval and reset the offer
                        clearInterval(doctorOfferTimerRef.current);
                        setAcceptedDoctorOffer(null);
                        return 0;
                      }
                      return prev - 1;
                    });
                  }, 1000);
                  
                  // Show an alert to notify the patient about the doctor offer
                  Alert.alert(
                    'Doctor Available!',
                    `Dr. ${doctorData.name} has accepted your request. You have 10 seconds to accept or decline.`,
                    [{ text: 'View Offer' }],
                    { cancelable: false }
                  );
                }
                
                // Convert doctor matches to the format expected by the UI
                const doctors = matches.map((match, index) => {
                  // Handle doctor location data properly
                  let doctorLocation = currentLocation.coords;
                  if (match.location) {
                    if (typeof match.location.latitude === 'function') {
                      doctorLocation = {
                        latitude: match.location.latitude(),
                        longitude: match.location.longitude()
                      };
                    } else if (typeof match.location.latitude === 'number') {
                      doctorLocation = {
                        latitude: match.location.latitude,
                        longitude: match.location.longitude
                      };
                    }
                  }
                  return {
                    id: match.doctorId || (index + 1),
                    name: match.doctorName,
                    specialty: match.specialty || 'General Physician',
                    distance: match.distance || 'Calculating...',
                    eta: match.eta || 'Calculating...',
                    location: doctorLocation,
                    image: require('../assets/doctor-icon-new.png'),
                    doctorId: match.doctorId,
                    offeredAt: match.offeredAt,
                    fee: match.fee,
                  };
                });
                
                setNearbyDoctors(doctors);
                
                // Initialize timers for new doctors
                const newTimers = {};
                
                // Start countdown timers for each doctor
                doctors.forEach(doctor => {
                  // Only initialize timer for new doctors
                  if (!doctorTimers[doctor.id]) {
                    newTimers[doctor.id] = 10;
                  }
                });
                
                if (Object.keys(newTimers).length > 0) {
                  setDoctorTimers(prev => ({ ...prev, ...newTimers }));
                  
                  // Start countdown timers for each new doctor
                  Object.keys(newTimers).forEach(doctorId => {
                    timerRefs.current[doctorId] = setInterval(() => {
                      setDoctorTimers(prev => {
                        const newTimers = {...prev};
                        if (newTimers[doctorId] > 0) {
                          newTimers[doctorId] -= 1;
                        } else {
                          // Time's up, clear the interval and remove the doctor card
                          clearInterval(timerRefs.current[doctorId]);
                          setNearbyDoctors(prev => prev.filter(d => d.id !== parseInt(doctorId)));
                        }
                        return newTimers;
                      });
                    }, 1000);
                  });
                }
              });
              
              // Store the unsubscribe function
              unsubscribeRef.current = unsubscribe;
            } catch (error) {
              console.error('Error creating patient request:', error);
              Alert.alert('Error', 'Could not create patient request. Please try again.');
              setIsLoading(false);
            }
          };
          
          createRequest();
          
          // Clean up the search timeout and listeners
          return () => {
            clearTimeout(searchTimeout);
            if (unsubscribeRef.current) {
              unsubscribeRef.current();
            }
            Object.values(timerRefs.current).forEach(timer => {
              clearInterval(timer);
            });
            if (doctorOfferTimerRef.current) {
              clearInterval(doctorOfferTimerRef.current);
            }
          };
        } else {
          // If not from booking, we're just showing the location selection screen
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error getting location:', error);
        setErrorMsg('Could not fetch your location. Please try again.');
        setIsLoading(false);
      }
    })();
  }, [route.params]);

  // Function to get detailed address from coordinates
  const getDetailedAddress = async (coordinates) => {
    try {
      const addresses = await Location.reverseGeocodeAsync(coordinates);
      if (addresses.length > 0) {
        const address = addresses[0];
        
        // Create a more detailed address format including all available fields
        const addressComponents = [
          address.name,                // Building name/number
          address.streetNumber,        // Street number
          address.street,              // Street name
          address.district,            // District/neighborhood
          address.subregion,           // Subregion (e.g., block number)
          address.city,                // City
          address.region,              // Region/state/province
          address.postalCode,          // Postal code
          address.country              // Country
        ].filter(Boolean); // Remove any undefined or empty values
        
        // Join all available address components
        const formattedAddress = addressComponents.join(', ');
        console.log('Detailed address:', formattedAddress);
        console.log('Raw address data:', address);
        
        // Set the search location to the formatted address
        setSearchLocation(formattedAddress);
        
        // Pre-fill the address details field with building-specific info
        const detailsComponents = [
          address.name,
          address.streetNumber,
          address.street,
          address.district,
          address.subregion
        ].filter(Boolean);
        
        if (detailsComponents.length > 0) {
          setAddressDetails(detailsComponents.join(', '));
        }
      }
    } catch (error) {
      console.error('Error getting detailed address:', error);
    }
  };

  const handleLocationSearch = async () => {
    if (searchLocation.trim() === '') return;
    
    try {
      const result = await Location.geocodeAsync(searchLocation);
      if (result.length > 0) {
        const { latitude, longitude } = result[0];
        setLocation({ latitude, longitude });
      } else {
        Alert.alert('Location not found', 'Please try a different location');
      }
    } catch (error) {
      console.error('Error searching location:', error);
      Alert.alert('Error', 'Could not search for this location');
    }
  };

  const handleDoctorSelect = (doctor) => {
    setSelectedDoctor(doctor);
  };

  // Handle accepting a doctor directly from the card
  const handleAcceptDoctorFromCard = async (doctor) => {
    if (!doctor || !requestId) {
      Alert.alert('Error', 'Unable to accept doctor. Please try again.');
      return;
    }

    try {
      console.log('Accepting doctor from card:', doctor);
      
      // Show confirmation dialog
      Alert.alert(
        'Accept Doctor',
        `Do you want to accept Dr. ${doctor.name}? They will be on their way to your location.`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Accept',
            onPress: async () => {
              try {
                // Accept the doctor's offer in Firebase
                const newMatchId = await acceptDoctorOffer(requestId, doctor.doctorId);
                console.log('Match created with ID:', newMatchId);
                
                // Set match ID and tracking state
                setMatchId(newMatchId);
                setTrackingDoctor(true);
                console.log('Setting tracking doctor to true');
                
                // Clear all timers
                Object.keys(timerRefs.current).forEach(key => {
                  clearInterval(timerRefs.current[key]);
                });
                
                // Use the location tracking context from the component level
                const { startPatientLocationTracking } = locationTracking;
                
                // Always use the stored selected location if available, then route params, then current location
                const currentPatientLocation = selectedLocationRef.current || route.params?.patientData?.location || location;
                
                // Update the patientLocation state
                setPatientLocation(currentPatientLocation);
                console.log('Setting patient location:', currentPatientLocation);
                
                // Start location tracking if available, passing the selected location
                if (startPatientLocationTracking) {
                  const success = await startPatientLocationTracking(newMatchId, doctor.doctorId, currentPatientLocation);
                  console.log('Location tracking started:', success);
                }
                
                // Update the unsubscribe reference
                if (unsubscribeRef.current) {
                  unsubscribeRef.current();
                }
                unsubscribeRef.current = null;
                
                // Preserve the doctor information for tracking
                setTrackingDoctorInfo(doctor);
                
                // Set doctor location to initialize the route
                if (doctor.location) {
                  setDoctorLocation(doctor.location);
                }
                
                // Show success message
                Alert.alert(
                  'Doctor Accepted!',
                  `Dr. ${doctor.name} is on their way to your location. You can track their progress on the map.`,
                  [{ text: 'OK' }]
                );
              } catch (error) {
                console.error('Error accepting doctor from card:', error);
                Alert.alert('Error', 'Could not accept doctor. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error handling accept doctor from card:', error);
      Alert.alert('Error', 'Could not process your request. Please try again.');
    }
  };
  
  const handleCancelRequest = async () => {
    if (requestId) {
      try {
        // Show confirmation dialog
        Alert.alert(
          'Cancel Request',
          'Are you sure you want to cancel your doctor request?',
          [
            {
              text: 'No',
              style: 'cancel'
            },
            {
              text: 'Yes, Cancel',
              style: 'destructive',
              onPress: async () => {
                try {
                  // Cancel the request in Firebase
                  await cancelPatientRequest(requestId);
                  
                  // Clean up timers and listeners
                  if (unsubscribeRef.current) {
                    unsubscribeRef.current();
                  }
                  
                  Object.keys(timerRefs.current).forEach(key => {
                    clearInterval(timerRefs.current[key]);
                  });
                  
                  // Reset state
                  setRequestId(null);
                  setNearbyDoctors([]);
                  setSelectedDoctor(null);
                  setShowingDoctors(false);
                  
                  // Navigate back to home
                  navigation.navigate('Home');
                } catch (error) {
                  console.error('Error cancelling request:', error);
                  Alert.alert('Error', 'Could not cancel your request. Please try again.');
                }
              }
            }
          ]
        );
      } catch (error) {
        console.error('Error handling cancel request:', error);
        Alert.alert('Error', 'Could not process your request. Please try again.');
      }
    }
  };

  // Handle accepting a doctor offer - now only used with bottom UI
  const handleAcceptDoctorOffer = async () => {
    if (!acceptedDoctorOffer || !requestId) return;
    
    try {
      console.log('Accepting doctor offer:', acceptedDoctorOffer);
      // Clear the timer
      if (doctorOfferTimerRef.current) {
        clearInterval(doctorOfferTimerRef.current);
      }
      
      // Accept the doctor's offer in Firebase
      const matchId = await acceptDoctorOffer(requestId, acceptedDoctorOffer.doctorId);
      console.log('Match created with ID:', matchId);
      
      // Set match ID and tracking state
      setMatchId(matchId);
      setTrackingDoctor(true);
      console.log('Setting tracking doctor to true');
      
      // Use the location tracking context from the component level
      // We already have locationTracking from the top level of the component
      const { startPatientLocationTracking } = locationTracking;
      
      // Always use the stored selected location if available, then route params, then current location
      // This ensures we're using the manually selected location, not the current GPS location
      const currentPatientLocation = selectedLocationRef.current || route.params?.patientData?.location || location;
      
      // Update the patientLocation state
      setPatientLocation(currentPatientLocation);
      console.log('Setting patient location:', currentPatientLocation);
      
      // Start location tracking if available, passing the selected location
      if (startPatientLocationTracking) {
        const success = await startPatientLocationTracking(matchId, acceptedDoctorOffer.doctorId, currentPatientLocation);
        console.log('Location tracking started:', success);
      }
      
      // The LocationTrackingContext will handle listening to doctor location updates
      // No need for duplicate listener here
      
      // Update the unsubscribe reference
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      unsubscribeRef.current = null; // No need for match listener since context handles it
      
      // Preserve the doctor information for tracking
      setTrackingDoctorInfo(acceptedDoctorOffer);
      
      // Reset the doctor offer state
      setAcceptedDoctorOffer(null);
      setDoctorOfferTimer(0);
      
      // Show confirmation to the user
      Alert.alert(
        'Doctor Accepted!',
        `You've accepted Dr. ${acceptedDoctorOffer.name}. They are on their way to your location.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error accepting doctor offer:', error);
      Alert.alert('Error', 'Could not accept doctor offer. Please try again.');
    }
  };
  
  // Handle declining a doctor offer from the countdown card
  const handleDeclineDoctorOffer = () => {
    // Clear the timer
    if (doctorOfferTimerRef.current) {
      clearInterval(doctorOfferTimerRef.current);
    }
    
    // Reset the accepted offer
    setAcceptedDoctorOffer(null);
  };
  
  // Render the doctor offer card with countdown - removed to use only bottom UI
  const renderDoctorOfferCard = () => {
    // Return null to not render the middle overlay
    return null;
  };
  
  const confirmBooking = () => {
    if (selectedDoctor && requestId) {
      // Accept the doctor's offer
      Alert.alert(
        'Confirm Doctor',
        `Do you want to confirm ${selectedDoctor.name} as your doctor?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                // Accept the doctor's offer in the database
                const newMatchId = await acceptDoctorOffer(requestId, selectedDoctor.doctorId);
                setMatchId(newMatchId);
                setTrackingDoctor(true);
                console.log('Setting tracking doctor to true in confirmBooking');
                
                // Set doctor location to initialize the route
                if (selectedDoctor.location) {
                  setDoctorLocation(selectedDoctor.location);
                }
                
                // Clear all timers
                Object.keys(timerRefs.current).forEach(key => {
                  clearInterval(timerRefs.current[key]);
                });
                
                // Use the location tracking context from the component level
                const { startPatientLocationTracking } = locationTracking;
                
                // Always use the stored selected location if available, then route params, then current location
                // This ensures we're using the manually selected location, not the current GPS location
                const currentPatientLocation = selectedLocationRef.current || route.params?.patientData?.location || location;
                
                // Update the patientLocation state
                setPatientLocation(currentPatientLocation);
                console.log('Setting patient location in confirmBooking:', currentPatientLocation);
                
                // Start location tracking if available, passing the selected location
                if (startPatientLocationTracking) {
                  const success = await startPatientLocationTracking(newMatchId, selectedDoctor.doctorId, currentPatientLocation);
                  console.log('Location tracking started in confirmBooking:', success);
                }
                
                // The LocationTrackingContext will handle listening to doctor location updates
                // No need for duplicate listener here
                
                // Update the unsubscribe reference
                if (unsubscribeRef.current) {
                  unsubscribeRef.current();
                }
                unsubscribeRef.current = null; // No need for match listener since context handles it
                
                Alert.alert(
                  'Booking Confirmed',
                  `Doctor ${selectedDoctor.name} will arrive at your location soon. You can track their progress on the map.`,
                  [
                    {
                      text: 'OK'
                    }
                  ]
                );
              } catch (error) {
                console.error('Error accepting doctor offer:', error);
                Alert.alert('Error', 'Could not confirm booking. Please try again.');
              }
            }
          }
        ]
      );
    } else {
      Alert.alert('Selection Required', 'Please select a doctor to continue');
    }
  };

  // Add this function at the top level of MapScreen (outside useEffect):
  const getDirections = async (startLoc, destinationLoc) => {
    try {
      const { getDirectionsFromApi, createStraightLineRoute } = require('../utils/directionsApi');
      const directions = await getDirectionsFromApi(startLoc, destinationLoc);
      if (directions && directions.coordinates && directions.coordinates.length > 0) {
        setRouteCoordinates(directions.coordinates);
        setDirections(directions);
        setEta({
          text: directions.duration.text,
          distance: directions.distance.text
        });
      } else {
        // Fallback to straight line
        const fallbackRoute = createStraightLineRoute(startLoc, destinationLoc);
        setRouteCoordinates(fallbackRoute.coordinates);
        setDirections(fallbackRoute);
        setEta({
          text: fallbackRoute.duration.text,
          distance: fallbackRoute.distance.text
        });
      }
    } catch (error) {
      // Fallback to straight line
      setRouteCoordinates([
        { latitude: startLoc.latitude, longitude: startLoc.longitude },
        { latitude: destinationLoc.latitude, longitude: destinationLoc.longitude }
      ]);
    }
  };

  // Add this useEffect:
  useEffect(() => {
    if (trackingDoctor && doctorLocation && patientLocation) {
      getDirections(doctorLocation, patientLocation);
    }
  }, [trackingDoctor, doctorLocation, patientLocation]);

  // Whenever matchId changes, update the ref
  useEffect(() => {
    matchIdRef.current = matchId;
  }, [matchId]);

  // Fetch doctor ratings when nearbyDoctors change
  useEffect(() => {
    const fetchRatings = async () => {
      const ratings = {};
      for (const doctor of nearbyDoctors) {
        if (doctor.doctorId && !ratings[doctor.doctorId]) {
          // Fetch all matches for this doctor
          const q = query(
            collection(db, 'doctorPatientMatches'),
            where('doctorId', '==', doctor.doctorId)
          );
          const snapshot = await getDocs(q);
          const docs = [];
          snapshot.forEach(docSnap => {
            docs.push({ id: docSnap.id, ...docSnap.data() });
          });
          const filtered = docs.filter(d => typeof d.doctorRating === 'number');
          const avg = filtered.length
            ? Math.round((filtered.reduce((a, b) => a + b.doctorRating, 0) / filtered.length) * 100) / 100
            : null;
          console.log('Fetched average rating for doctor', doctor.doctorId, ':', avg);
          ratings[doctor.doctorId] = avg !== null && avg !== undefined ? avg.toFixed(2) : 'No ratings';
        }
      }
      console.log('Final doctor ratings object:', ratings);
      setDoctorRatings(prev => ({ ...prev, ...ratings }));
    };
    if (nearbyDoctors.length > 0) fetchRatings();
  }, [nearbyDoctors]);

  useEffect(() => {
    // Check if doctor cancelled the visit
    AsyncStorage.getItem('visitCancelledByDoctor').then(flag => {
      if (flag === 'true') {
        setVisitCancelledByDoctor(true);
        AsyncStorage.removeItem('visitCancelledByDoctor'); // Clean up
        console.log('Visit cancelled by doctor - suppressing rating modal');
      }
    });
  }, []);

  // Listen for visit cancellation from LocationTrackingContext
  useEffect(() => {
    // If the visit is no longer tracking and we have no active request, check if it was cancelled
    if (!locationTracking.isTracking && locationTracking.activeRequestId === null) {
      // Check AsyncStorage again in case the flag was set after the initial check
      AsyncStorage.getItem('visitCancelledByDoctor').then(flag => {
        if (flag === 'true') {
          setVisitCancelledByDoctor(true);
          AsyncStorage.removeItem('visitCancelledByDoctor'); // Clean up
          console.log('Visit cancelled by doctor detected - suppressing rating modal');
        }
      });
    }
  }, [locationTracking.isTracking, locationTracking.activeRequestId]);

  // Listen for visit status changes
  useEffect(() => {
    if (locationTracking.visitStatus === 'cancelled') {
      setVisitCancelledByDoctor(true);
      setHasShownRatingModal(true); // Immediately prevent rating modal
      console.log('Visit status is cancelled - suppressing rating modal');
    }
  }, [locationTracking.visitStatus]);

  // Additional check for cancellation - run whenever LocationTracking state changes
  useEffect(() => {
    // Check if we should suppress rating modal based on current state
    if (locationTracking.visitStatus === 'cancelled' || visitCancelledByDoctor || visitWasCancelled) {
      console.log('Cancellation detected - ensuring rating modal is suppressed');
      setHasShownRatingModal(true); // Prevent rating modal from showing
    }
  }, [locationTracking.visitStatus, visitCancelledByDoctor, visitWasCancelled]);

  // Fetch doctor profile pictures when nearbyDoctors change
  useEffect(() => {
    const fetchPictures = async () => {
      const ids = nearbyDoctors.map(d => d.doctorId).filter(Boolean);
      if (ids.length > 0) {
        const pics = await fetchMultipleUserProfilePictures(ids);
        setDoctorProfilePictures(prev => ({ ...prev, ...pics }));
      }
    };
    fetchPictures();
  }, [nearbyDoctors]);

  // Force re-render of doctor cards when location changes to update real-time metrics
  useEffect(() => {
    if (location && nearbyDoctors.length > 0) {
      // Force a re-render by updating a state that triggers re-render
      setNearbyDoctors(prev => [...prev]);
    }
  }, [location, nearbyDoctors.length]);

  // Helper: Doctor Info Header
  const renderDoctorInfoHeader = () => {
    // Use trackingDoctorInfo when tracking, otherwise use acceptedDoctorOffer
    // If trackingDoctorInfo is not available but we're tracking, fall back to acceptedDoctorOffer
    const doctorInfo = trackingDoctor ? (trackingDoctorInfo || acceptedDoctorOffer) : acceptedDoctorOffer;
    const docId = doctorInfo?.doctorId;
    const profilePic = doctorProfilePictures[docId];
    console.log('Doctor Info Debug:', {
      doctorId: docId,
      doctorProfilePictures,
      profilePic,
      trackingDoctor,
      trackingDoctorInfo,
      acceptedDoctorOffer,
      finalDoctorInfo: doctorInfo
    });
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        {docId && profilePic === undefined ? (
          <ActivityIndicator size="small" color="#0066CC" style={{ width: 40, height: 40, marginRight: 10 }} />
        ) : profilePic ? (
          <Image source={{ uri: profilePic }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }} />
        ) : (
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
            <Ionicons name="person" size={24} color="#888" />
          </View>
        )}
        <View>
          <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{doctorInfo?.name || 'Doctor'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={{ marginLeft: 4, fontSize: 14 }}>
              {doctorRatings[docId] && doctorRatings[docId] !== 'No ratings'
                ? Number(doctorRatings[docId]).toFixed(2)
                : 'No ratings'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Ensure doctor profile picture is fetched when acceptedDoctorOffer or doctorHasReached changes
  useEffect(() => {
    if (acceptedDoctorOffer && acceptedDoctorOffer.doctorId) {
      fetchMultipleUserProfilePictures([acceptedDoctorOffer.doctorId]).then(pics => {
        setDoctorProfilePictures(prev => ({ ...prev, ...pics }));
      });
    }
  }, [acceptedDoctorOffer, doctorHasReached]);

  // Ensure trackingDoctorInfo is set when tracking starts
  useEffect(() => {
    if (trackingDoctor && !trackingDoctorInfo && acceptedDoctorOffer) {
      console.log('Setting trackingDoctorInfo from acceptedDoctorOffer:', acceptedDoctorOffer);
      setTrackingDoctorInfo(acceptedDoctorOffer);
    }
  }, [trackingDoctor, trackingDoctorInfo, acceptedDoctorOffer]);

  // Preserve doctor profile pictures and ratings when tracking starts
  useEffect(() => {
    const doctorInfo = trackingDoctor ? (trackingDoctorInfo || acceptedDoctorOffer) : acceptedDoctorOffer;
    if (trackingDoctor && doctorInfo?.doctorId) {
      // Ensure we have the doctor's profile picture and rating preserved
      const docId = doctorInfo.doctorId;
      
      // If we don't have the profile picture, fetch it
      if (!doctorProfilePictures[docId]) {
        fetchMultipleUserProfilePictures([docId]).then(pics => {
          setDoctorProfilePictures(prev => ({ ...prev, ...pics }));
        });
      }
      
      // If we don't have the rating, fetch it
      if (!doctorRatings[docId]) {
        const fetchRating = async () => {
          const q = query(
            collection(db, 'doctorPatientMatches'),
            where('doctorId', '==', docId)
          );
          const snapshot = await getDocs(q);
          const docs = [];
          snapshot.forEach(docSnap => {
            docs.push({ id: docSnap.id, ...docSnap.data() });
          });
          const filtered = docs.filter(d => typeof d.doctorRating === 'number');
          const avg = filtered.length
            ? Math.round((filtered.reduce((a, b) => a + b.doctorRating, 0) / filtered.length) * 100) / 100
            : null;
          const rating = avg !== null && avg !== undefined ? avg.toFixed(2) : 'No ratings';
          setDoctorRatings(prev => ({ ...prev, [docId]: rating }));
        };
        fetchRating();
      }
    }
  }, [trackingDoctor, trackingDoctorInfo, acceptedDoctorOffer, doctorProfilePictures, doctorRatings]);

  // Show patient rating modal at the end of the visit
  useEffect(() => {
    console.log('[MapScreen] visitCompleted:', locationTracking.visitCompleted, 'hasShownRatingModal:', hasShownRatingModal, 'visitWasCancelled:', visitWasCancelled, 'visitCancelledByDoctor:', visitCancelledByDoctor);
    if (
      locationTracking.visitCompleted &&
      !hasShownRatingModal &&
      !visitWasCancelled &&
      !visitCancelledByDoctor
    ) {
      console.log('[MapScreen] Showing rating modal (visit completed, not cancelled)');
      const currentMatchId = matchIdRef.current || matchId;
      setShowRatingModal(true);
      setLastCompletedVisitId(currentMatchId);
      setHasShownRatingModal(true);
    }
  }, [locationTracking.visitCompleted, hasShownRatingModal, visitWasCancelled, visitCancelledByDoctor, matchId]);

  // OVERRIDE: Force show rating modal when tracking stops (bypass all conditions)
  useEffect(() => {
    if (trackingDoctor && !locationTracking.isTracking && !hasShownRatingModal) {
      console.log('[MapScreen] OVERRIDE: Tracking stopped, forcing rating modal');
      const currentMatchId = matchIdRef.current || matchId;
      setTimeout(() => {
        setShowRatingModal(true);
        setLastCompletedVisitId(currentMatchId);
        setHasShownRatingModal(true);
        Alert.alert('Visit Ended', 'The doctor has ended your visit. You can now rate them.');
      }, 1000); // Small delay to ensure state is updated
    }
  }, [locationTracking.isTracking, trackingDoctor, hasShownRatingModal, matchId]);

  // Direct Firestore listener for visit completion (most reliable method)
  useEffect(() => {
    const currentMatchId = matchIdRef.current || matchId;
    if (!currentMatchId || hasShownRatingModal || visitWasCancelled || visitCancelledByDoctor) {
      console.log('[MapScreen] Skipping Firestore listener setup:', {
        currentMatchId,
        hasShownRatingModal,
        visitWasCancelled,
        visitCancelledByDoctor
      });
      return;
    }

    console.log('[MapScreen] Setting up direct Firestore listener for visit completion:', currentMatchId);
    const visitRef = doc(db, 'doctorPatientMatches', currentMatchId);
    
    const unsubscribe = onSnapshot(visitRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        console.log('[MapScreen] Direct Firestore listener - visit status:', data.status, 'hasShownRatingModal:', hasShownRatingModal);
        
        if (data.status === 'completed' && !hasShownRatingModal) {
          console.log('[MapScreen] Direct Firestore listener: Visit completed, showing rating modal');
          setShowRatingModal(true);
          setLastCompletedVisitId(currentMatchId);
          setHasShownRatingModal(true);
        }
      }
    }, (error) => {
      console.error('[MapScreen] Error in direct Firestore listener:', error);
    });

    return () => {
      console.log('[MapScreen] Cleaning up direct Firestore listener');
      unsubscribe();
    };
  }, [matchId, hasShownRatingModal, visitWasCancelled, visitCancelledByDoctor]);

  // GLOBAL LISTENER: Listen to ALL completed visits for this patient (nuclear option)
  useEffect(() => {
    if (hasShownRatingModal || visitWasCancelled || visitCancelledByDoctor) {
      return;
    }

    console.log('[MapScreen] Setting up GLOBAL listener for completed visits');
    const patientId = currentUser?.uid;
    if (!patientId) return;

    const q = query(
      collection(db, 'doctorPatientMatches'),
      where('patientId', '==', patientId),
      where('status', '==', 'completed')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified' || change.type === 'added') {
          const data = change.doc.data();
          console.log('[MapScreen] GLOBAL listener found completed visit:', change.doc.id, data);
          
          // Check if this visit was completed recently (within last 5 minutes)
          const completedAt = data.completedAt?.toDate?.() || new Date();
          const now = new Date();
          const timeDiff = (now - completedAt) / 1000 / 60; // minutes
          
          if (timeDiff <= 5 && !hasShownRatingModal) {
            console.log('[MapScreen] GLOBAL listener: Recent completed visit, showing rating modal');
            setShowRatingModal(true);
            setLastCompletedVisitId(change.doc.id);
            setHasShownRatingModal(true);
          }
        }
      });
    }, (error) => {
      console.error('[MapScreen] Error in global listener:', error);
    });

    return () => {
      console.log('[MapScreen] Cleaning up global listener');
      unsubscribe();
    };
  }, [currentUser?.uid, hasShownRatingModal, visitWasCancelled, visitCancelledByDoctor]);

  // Additional trigger: Show rating modal immediately when visit status becomes 'completed'
  useEffect(() => {
    console.log('[MapScreen] visitStatus changed:', locationTracking.visitStatus, 'hasShownRatingModal:', hasShownRatingModal, 'visitWasCancelled:', visitWasCancelled, 'visitCancelledByDoctor:', visitCancelledByDoctor);
    console.log('[MapScreen] All conditions check:', {
      visitStatus: locationTracking.visitStatus,
      isCompleted: locationTracking.visitStatus === 'completed',
      hasShownRatingModal,
      visitWasCancelled,
      visitCancelledByDoctor,
      shouldShow: locationTracking.visitStatus === 'completed' && !hasShownRatingModal && !visitWasCancelled && !visitCancelledByDoctor
    });
    
    if (
      locationTracking.visitStatus === 'completed' &&
      !hasShownRatingModal &&
      !visitWasCancelled &&
      !visitCancelledByDoctor
    ) {
      console.log('[MapScreen] Showing rating modal (visit status completed, not cancelled)');
      const currentMatchId = matchIdRef.current || matchId;
      setShowRatingModal(true);
      setLastCompletedVisitId(currentMatchId);
      setHasShownRatingModal(true);
    }
  }, [locationTracking.visitStatus, hasShownRatingModal, visitWasCancelled, visitCancelledByDoctor, matchId]);

  // Add this at the top level of the component, after other useEffects
  useEffect(() => {
    setNearbyDoctors(prev => prev.filter(d => doctorTimers[d.id] > 0));
  }, [doctorTimers]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {location && (
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          region={{
            // Always prioritize the location from route params to maintain consistency
            latitude: route.params?.patientData?.location?.latitude || location.latitude,
            longitude: route.params?.patientData?.location?.longitude || location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          customMapStyle={isDarkMode ? darkMapStyle : lightMapStyle}
          showsUserLocation={true}
          showsMyLocationButton={true}
          zoomEnabled={true}
          rotateEnabled={true}
          scrollEnabled={true}
          pitchEnabled={true}
          showsBuildings={true}
          showsTraffic={true}
          showsIndoors={true}
          showsCompass={true}
          showsScale={true}
        >
          {/* User's location marker - always use the selected location */}
          <Marker
            coordinate={{
              latitude: route.params?.patientData?.location?.latitude || location.latitude,
              longitude: route.params?.patientData?.location?.longitude || location.longitude,
            }}
            title="Your Selected Location"
            pinColor="blue"
          />
          
          {/* Service radius circle - Always show when location is available */}
          <Circle
            center={{
              latitude: route.params?.patientData?.location?.latitude || location.latitude,
              longitude: route.params?.patientData?.location?.longitude || location.longitude,
            }}
            radius={5000} // 5km radius
            strokeWidth={1}
            strokeColor={colors.primary + '80'}
            fillColor={colors.primary + '20'}
          />
          
          {/* Doctor markers with custom callouts - only show when not tracking */}
          {showingDoctors && !trackingDoctor && nearbyDoctors.map(doctor => (
            <Marker
              key={doctor.id}
              coordinate={doctor.location}
              title={doctor.name}
              description={`${doctor.specialty} - ${doctor.distance} away`}
              pinColor="red"
              tracksViewChanges={false}
            >
              <Callout tooltip>
                {console.log('Rendering map marker for doctor:', doctor.name, 'doctorId:', doctor.doctorId, 'rating:', doctorRatings[doctor.doctorId])}
                <View style={{
                  backgroundColor: colors.card,
                  borderRadius: 8,
                  padding: 10,
                  width: 180,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                  elevation: 5,
                  borderLeftWidth: 3,
                  borderLeftColor: colors.primary
                }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 5, color: colors.text }}>
                    {doctor.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 3 }}>
                    {doctor.specialty}
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.success, marginTop: 2, marginBottom: 2 }}>
                    Fee: {doctor.fee ? doctor.fee : '1500-2500'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={{ fontSize: 12, color: colors.text, marginLeft: 3 }}>
                      {doctorRatings[doctor.doctorId] && doctorRatings[doctor.doctorId] !== 'No ratings'
                        ? Number(doctorRatings[doctor.doctorId]).toFixed(2)
                        : 'No ratings'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                    <Ionicons name="location" size={12} color={colors.primary} />
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 3 }}>
                      {doctor.distance}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="time-outline" size={12} color={colors.primary} />
                    <Text style={{ fontSize: 12, color: colors.primary, marginLeft: 3, fontWeight: 'bold' }}>
                      ETA: {doctor.eta}
                    </Text>
                  </View>
                </View>
              </Callout>
            </Marker>
          ))}

          {/* Doctor's location marker (only shown when tracking) */}
          {trackingDoctor && doctorLocation && (
            <Marker
              coordinate={{
                latitude: doctorLocation.latitude,
                longitude: doctorLocation.longitude,
              }}
              title="Doctor's Location"
              description="Your doctor is here"
              pinColor="red"
              tracksViewChanges={false}
            >
              <Callout tooltip>
                <View style={{
                  backgroundColor: 'white',
                  borderRadius: 8,
                  padding: 10,
                  width: 150,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                  elevation: 5,
                }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 5, color: colors.text }}>
                    {acceptedDoctorOffer?.name || 'Your Doctor'}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {acceptedDoctorOffer?.specialty || 'Medical Professional'}
                  </Text>
                  {eta && (
                    <Text style={{ fontSize: 12, color: colors.primary, marginTop: 5 }}>
                      ETA: {eta.text}
                    </Text>
                  )}
                </View>
              </Callout>
            </Marker>
          )}
          
          {/* Route visualization between patient and doctor - White outline for better visibility */}
          {trackingDoctor && doctorLocation && patientLocation && routeCoordinates.length > 0 && (
            <>
              {console.log('routeCoordinates:', routeCoordinates)}
              {/* White outline polyline for better visibility */}
              <Polyline
                coordinates={routeCoordinates}
                strokeWidth={routeStyles.outline.strokeWidth}
                strokeColor={routeStyles.outline.strokeColor}
                lineDashPattern={routeStyles.outline.lineDashPattern}
                lineCap={routeStyles.outline.lineCap}
                lineJoin={routeStyles.outline.lineJoin}
                zIndex={998}
              />
              {/* Main route polyline */}
              <Polyline
                coordinates={routeCoordinates}
                strokeWidth={routeStyles.main.strokeWidth}
                strokeColor={routeStyles.main.strokeColor}
                lineDashPattern={routeStyles.main.lineDashPattern}
                lineCap={routeStyles.main.lineCap}
                lineJoin={routeStyles.main.lineJoin}
                zIndex={999}
              />
            </>
          )}
        </MapView>
      )}
      
      {/* Show loading overlay if still loading and we have location */}
      {isLoading && location && showingDoctors && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background + '70' }]}>
          <View style={[styles.loadingCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              {language === 'ur' ? urduText.finding_doctors : 'Finding doctors near you...'}
            </Text>
            <Text style={[styles.loadingSubText, { color: colors.textSecondary }]}>
              {language === 'ur' ? urduText.doctors_will_appear : 'Doctors will appear as they respond to your request'}
            </Text>
          </View>
        </View>
      )}

      {/* Search location input */}
      {!showingDoctors && !trackingDoctor && (
        <View style={[styles.searchContainer, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.text, backgroundColor: colors.inputBackground }]}
            placeholder={language === 'ur' ? urduText.search_location : 'Search for a location'}
            placeholderTextColor={colors.textSecondary}
            value={searchLocation}
            onChangeText={setSearchLocation}
            onSubmitEditing={handleLocationSearch}
          />
          <TouchableOpacity 
            style={[styles.searchButton, { backgroundColor: colors.primary }]}
            onPress={handleLocationSearch}
          >
            <Text style={[styles.searchButtonText, { color: colors.buttonText }]}>Search</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Address details input */}
      {!showingDoctors && !trackingDoctor && (
        <View style={[styles.addressContainer, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <Text style={[styles.addressLabel, { color: colors.text }]}>
            {language === 'ur' ? urduText.address_details : 'Address Details'}
          </Text>
          <TextInput
            style={[styles.addressInput, { color: colors.text, backgroundColor: colors.inputBackground }]}
            placeholder="House/Apartment number, Street, etc."
            placeholderTextColor={colors.textSecondary}
            value={addressDetails}
            onChangeText={setAddressDetails}
            multiline
          />
          <TouchableOpacity 
            style={[styles.confirmLocationButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Booking', { location, addressDetails })}
          >
            <Text style={[styles.confirmLocationButtonText, { color: colors.buttonText }]}> 
              {language === 'ur' ? urduText.confirm_location : 'Confirm Location'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Doctor offer card with countdown */}
      {/* Removed Doctor Available! card overlay to avoid duplicate doctor cards. */}
      {/* {acceptedDoctorOffer && !trackingDoctor && (
        <View style={[styles.doctorOfferOverlay, { backgroundColor: colors.background + '90' }]}> ... </View>
      )} */}

      {/* Tracking UI */}
      {trackingDoctor && renderTrackingUI()}

      {/* Bottom UI for doctor selection */}
      {showingDoctors && !trackingDoctor && (
        <View style={[styles.bottomContainer, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <LinearGradient
            colors={[colors.primary, isDarkMode ? '#1A3A5A' : '#4D94FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bottomHeaderGradient}
          >
            <View style={styles.bottomHeader}>
              <Text variant="subheading" weight="bold" color={colors.buttonText} style={styles.bottomTitle}>
                {language === 'ur' ? urduText.available_doctors : 'Available Doctors'}
              </Text>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleCancelRequest}
              >
                <Ionicons name="close-circle-outline" size={18} color={colors.buttonText} />
                <Text variant="caption" weight="medium" color={colors.buttonText} style={styles.cancelText}>
                  {language === 'ur' ? urduText.cancel : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
          
          {nearbyDoctors.length > 0 ? (
            <ScrollView 
              style={styles.availableDoctorsContainer}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              <FlatList
                data={nearbyDoctors}
                renderItem={({ item }) => renderDoctorCard(item)}
                keyExtractor={item => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.doctorList}
                nestedScrollEnabled={true}
              />
            </ScrollView>
          ) : (
            <View style={styles.noDoctorsContainer}>
              <Text variant="body" color={colors.textSecondary} style={styles.noDoctorsText}>
                {language === 'ur' ? urduText.waiting_for_doctors : 'Waiting for doctors to respond...'}
              </Text>
              <ActivityIndicator size="small" color={colors.primary} style={styles.noDoctorsSpinner} />
            </View>
          )}
          
          {selectedDoctor && (
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={confirmBooking}
            >
              <LinearGradient
                colors={[colors.primary, isDarkMode ? '#1A3A5A' : '#4D94FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmButtonGradient}
              >
                <Text variant="body" weight="bold" color={colors.buttonText} style={styles.confirmButtonText}>
                  {language === 'ur' ? urduText.confirm_doctor : 'Confirm Doctor'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      )}

      {showRatingModal && (
        <Modal
          visible={showRatingModal}
          transparent
          animationType="slide"
          onRequestClose={() => {}}
        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={[styles.ratingModalCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}> 
              <Text style={[styles.ratingModalTitle, { color: colors.text }]}>
                {language === 'ur' ? urduText.rate_doctor : 'Rate the Doctor'}
              </Text>
              <StarRating
                rating={doctorRating}
                onChange={setDoctorRating}
                starSize={36}
                maxStars={5}
                color={colors.primary}
              />
              <TouchableOpacity
                style={[styles.ratingModalButton, { backgroundColor: colors.success }]}
                onPress={async () => {
                  if (lastCompletedVisitId && doctorRating > 0) {
                    await saveRating(lastCompletedVisitId, 'doctor', doctorRating, currentUser?.uid);
                    refreshRatings();
                    Alert.alert(
                      language === 'ur' ? urduText.rating_submitted : 'Rating Submitted',
                      language === 'ur' ? `${urduText.doctor_rating}: ${doctorRating}` : `Doctor rating: ${doctorRating} for match: ${lastCompletedVisitId}`
                    );
                  }
                  setShowRatingModal(false);
                  setDoctorRating(0);
                  setLastCompletedVisitId(null);
                  navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                }}
                disabled={doctorRating === 0}
              >
                <Text style={[styles.ratingModalButtonText, { color: colors.buttonText }]}> 
                  {language === 'ur' ? urduText.submit_rating : 'Submit Rating'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

// Map styles are now imported from theme/mapStyles.js
// This is just a fallback in case the import fails
const fallbackDarkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "administrative.country",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#181818"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1b1b1b"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#2c2c2c"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8a8a8a"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#373737"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#3c3c3c"
      }
    ]
  },
  {
    "featureType": "road.highway.controlled_access",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#4e4e4e"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#000000"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#3d3d3d"
      }
    ]
  }
];

const createStyles = (colors) => StyleSheet.create({
  timerOnlyContainer: {
    width: '100%',
    padding: 8,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: 'transparent',
    zIndex: 999,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Tracking UI styles
  trackingContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    maxHeight: '70%', // Increased to 70% to give more space for scrolling
    width: '90%', // Increased from 70% to 90%
    alignSelf: 'center', // Center it horizontally
  },
  trackingHeaderGradient: {
    width: '100%',
    paddingVertical: 15, // Increased from 10 to 15
    paddingHorizontal: 16, // Increased from 12 to 16
  },
  trackingHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackingHeaderTitle: {
    marginLeft: 8,
    fontSize: 16, // Increased from 14 to 16
  },
  trackingContent: {
    flex: 1,
  },
  trackingScrollContent: {
    padding: 16, // Increased from 12 to 16
  },
  communicationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12, // Increased from 8 to 12
    marginBottom: 12, // Added bottom margin
  },
  communicationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12, // Increased from 8 to 12
    borderRadius: 8,
    marginHorizontal: 6, // Increased from 4 to 6
  },
  communicationButtonText: {
    marginLeft: 8, // Increased from 6 to 8
    fontSize: 14, // Increased from 12 to 14
  },
  googleMapsEtaCard: {
    padding: 16,
    borderRadius: 12,
  },
  etaHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  etaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  openGoogleMapsButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  openGoogleMapsButtonText: {
    color: '#1a73e8',
    fontSize: 12,
    fontWeight: '500',
  },
  etaDetailsContainer: {
    marginBottom: 12,
  },
  etaDuration: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  etaDistance: {
    fontSize: 14,
    color: '#666',
  },
  directionsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1A73E8',
  },
  nextDirectionLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  nextDirectionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  nextDirectionDistance: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  doctorArrivedContainer: {
    backgroundColor: '#e6f7e9',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    marginTop: 12,
  },
  doctorArrivedText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 16,
  },
  doctorArrivedSubtext: {
    color: '#4CAF50',
    fontSize: 14,
    marginTop: 4,
  },
  liveTrackingInfo: {
    backgroundColor: '#e8f0fe',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1A73E8',
  },
  liveTrackingText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1A73E8',
  },
  liveTrackingSubtext: {
    fontSize: 14,
    marginTop: 4,
    color: '#666',
  },
  etaContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  etaText: {
    fontSize: 16,
    marginBottom: 3,
  },
  distanceText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: '80%',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    textAlign: 'center',
  },
  loadingSubText: {
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    borderRadius: 10,
    padding: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  searchButton: {
    marginLeft: 10,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  searchButtonText: {
    fontWeight: 'bold',
  },
  addressContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 10,
    padding: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  addressInput: {
    height: 80,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 5,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  confirmLocationButton: {
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  confirmLocationButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 12,
    overflow: 'hidden',
    maxHeight: '60%',
    minHeight: 200,
  },
  bottomHeaderGradient: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginBottom: 15,
  },
  bottomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  bottomTitle: {
    fontSize: 18,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  cancelText: {
    marginLeft: 4,
  },
  availableDoctorsContainer: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  doctorList: {
    paddingBottom: 10,
  },
  doctorCard: {
    width: 300,
    marginRight: 15,
    marginBottom: 5,
    marginTop: 5,
    borderRadius: 16,
    overflow: 'hidden',
  },
  doctorCardContent: {
    padding: 16,
  },
  selectedDoctorCard: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  doctorImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 12,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    marginBottom: 4,
  },
  doctorSpecialty: {
    marginBottom: 8,
  },
  doctorMetrics: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorDistance: {
    marginLeft: 4,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  doctorEta: {
    marginLeft: 4,
  },
  timerContainer: {
    marginTop: 8,
  },
  timerText: {
    marginBottom: 6,
  },
  timerBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  timerBar: {
    height: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  expiredText: {
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    marginRight: 5,
  },
  declineButton: {
    backgroundColor: '#F44336',
    marginLeft: 5,
  },
  actionButtonText: {
    marginLeft: 4,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  noDoctorsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noDoctorsText: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  noDoctorsSpinner: {
    marginTop: 10,
  },
  confirmButton: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  confirmButtonText: {
    fontSize: 16,
  },
  doctorOfferOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorOfferCard: {
    width: '85%',
    borderRadius: 15,
    padding: 20,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  doctorOfferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  doctorOfferTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  doctorOfferTimer: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  doctorOfferContent: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  doctorOfferImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
  },
  doctorOfferInfo: {
    flex: 1,
  },
  doctorOfferName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  doctorOfferSpecialty: {
    fontSize: 14,
    marginBottom: 5,
  },
  doctorOfferMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  doctorOfferRating: {
    fontSize: 14,
  },
  doctorOfferDistance: {
    fontSize: 14,
  },
  doctorOfferEta: {
    fontSize: 14,
    fontWeight: '500',
  },
  doctorOfferActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  doctorOfferAcceptButton: {
    flex: 1,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    marginRight: 10,
  },
  doctorOfferDeclineButton: {
    flex: 1,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    marginLeft: 10,
  },
  doctorOfferButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  etaCard: {
    marginBottom: 12, // Increased from 10 to 12
    padding: 12, // Increased from 10 to 12
  },
  etaIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6, // Increased from 4 to 6
  },
  etaIcon: {
    width: 36, // Increased from 32 to 36
    height: 36, // Increased from 32 to 36
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  etaTextContainer: {
    marginLeft: 12, // Increased from 10 to 12
    flex: 1,
  },
  etaDuration: {
    fontSize: 16, // Increased from 14 to 16
    fontWeight: 'bold',
  },
  etaDistance: {
    fontSize: 16, // Increased from 14 to 16
    fontWeight: 'bold',
  },
  etaDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 8, // Increased from 6 to 8
  },
  directionsCard: {
    marginBottom: 12, // Increased from 10 to 12
    padding: 12, // Increased from 10 to 12
  },
  directionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8, // Increased from 6 to 8
  },
  directionsHeaderText: {
    marginLeft: 8, // Increased from 6 to 8
    fontSize: 14, // Increased from 13 to 14
  },
  directionsText: {
    fontSize: 13, // Increased from 12 to 13
    marginBottom: 6, // Increased from 4 to 6
  },
  directionsDistance: {
    fontSize: 12, // Increased from 11 to 12
  },
  statusCard: {
    marginBottom: 12, // Increased from 10 to 12
    overflow: 'hidden',
    padding: 0, // Removed padding
  },
  statusCardGradient: {
    width: '100%',
    paddingVertical: 12, // Increased from 10 to 12
    paddingHorizontal: 16, // Increased from 12 to 16
    borderRadius: 12,
  },
  statusCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconContainer: {
    marginRight: 12, // Increased from 10 to 12
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16, // Increased from 14 to 16
    marginBottom: 4, // Increased from 2 to 4
  },
  statusSubtext: {
    fontSize: 14, // Increased from 12 to 14
    opacity: 0.9,
  },
  liveTrackingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12, // Increased from 10 to 12
  },
  liveTrackingIconContainer: {
    marginRight: 12, // Increased from 10 to 12
  },
  pulsingDot: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pulsingCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0066CC',
  },
  pulsingRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0066CC',
    opacity: 0.5,
  },
  liveTrackingTextContainer: {
    flex: 1,
  },
  liveTrackingText: {
    fontSize: 15, // Increased from 13 to 15
    marginBottom: 4, // Increased from 2 to 4
  },
  liveTrackingSubtext: {
    fontSize: 13, // Increased from 11 to 13
  },
  openGoogleMapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8, // Increased from 6 to 8
    paddingHorizontal: 12, // Increased from 10 to 12
    borderRadius: 16,
  },
  openGoogleMapsButtonText: {
    marginLeft: 4,
  },
  debugButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginTop: 10,
    marginHorizontal: 10,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  cancelRequestButtonText: {
    marginLeft: 8,
    fontSize: 14,
  },
  ratingModalCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    backgroundColor: colors.card,
  },
  ratingModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.text,
  },
  ratingModalButton: {
    marginTop: 24,
    borderRadius: 8,
    padding: 12,
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.success,
  },
  ratingModalButtonText: {
    color: colors.buttonText,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default MapScreen;
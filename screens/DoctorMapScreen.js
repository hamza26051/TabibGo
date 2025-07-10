import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator, Alert, Image, Switch, FlatList, ScrollView, Linking, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Circle, Polyline, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { updateDoctorAvailability, getNearbyPatientRequests, offerHelp, updateDoctorLocation, completePatientRequest, listenToPatientRequest, markRequestSeenByDoctor } from '../firebase/patientDoctorMatching';
import WaitingTimer from '../components/WaitingTimer';
import { LinearGradient } from 'expo-linear-gradient';
import StarRating from 'react-native-star-rating-widget';
import { saveRating, getAverageRating } from '../firebase/ratingService';
import { useRating } from '../context/RatingContext';

// Import custom UI components
import { Text, Button, Input } from '../components';
import Card from '../components/Card';

// Collection names for Firebase
const DOCTOR_AVAILABILITY = 'doctorAvailability';
import { auth, db } from '../firebase/config';
import { lightMapStyle, darkMapStyle, routeStyles } from '../theme/mapStyles';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { useLocationTracking } from '../context/LocationTrackingContext';
import { useAuth } from '../context/AuthContext';
import { fetchMultipleUserProfilePictures } from '../utils/profilePictureUtils';
import { useLanguage } from '../context/LanguageContext';

const urduText = {
  online: 'آن لائن',
  offline: 'آف لائن',
  location_confirmed: 'مقام کی تصدیق ہو گئی',
  location_saved: 'آپ کا مقام محفوظ ہو گیا ہے۔ اب آپ مریض تلاش کرنے کے لیے آن لائن جا سکتے ہیں۔',
  arrival_confirmed: 'پہنچنے کی تصدیق ہو گئی',
  you_arrived: 'آپ نے مریض کے مقام پر پہنچنے کی تصدیق کر دی ہے۔ مریض کو اطلاع دے دی گئی ہے۔',
  at_patient_location: 'مریض کے مقام پر',
  en_route: 'مریض کی طرف جا رہے ہیں',
  en_route_to_patient: 'مریض کی طرف جا رہے ہیں',
  open_in_maps: 'گوگل میپس میں کھولیں',
  patient_address: 'مریض کا پتہ:',
  not_provided: 'درج نہیں',
  i_have_arrived: 'میں پہنچ گیا ہوں',
  cancel_visit: 'وزٹ منسوخ کریں',
  cancel_visit_confirm: 'کیا آپ واقعی اس وزٹ کو منسوخ کرنا چاہتے ہیں؟ مریض کو اطلاع دی جائے گی اور وزٹ ختم ہو جائے گا۔',
  no_continue: 'نہیں، جاری رکھیں',
  yes_cancel: 'ہاں، وزٹ منسوخ کریں',
  visit_cancelled: 'وزٹ منسوخ ہو گیا',
  visit_cancelled_msg: 'آپ نے یہ وزٹ منسوخ کر دیا ہے۔ مریض کو اطلاع دے دی گئی ہے۔',
  accept_request: 'درخواست قبول کریں',
  reject: 'رد کریں',
  view_details: 'تفصیلات دیکھیں',
  close: 'بند کریں',
  symptoms: 'علامات:',
  description: 'تفصیل:',
  agreed_price: 'طے شدہ قیمت:',
  enter_fee: 'اپنی فیس درج کریں (1500-2500):',
  enter_fee_placeholder: 'فیس درج کریں',
  patient: 'مریض',
  no_ratings: 'کوئی ریٹنگ نہیں',
  eta: 'متوقع وقت',
  distance: 'فاصلہ',
  waiting_time_extended: 'انتظار کا وقت 5 منٹ بڑھا دیا گیا ہے۔',
  waiting_time_extended_title: 'انتظار کا وقت بڑھا',
  visit_started: 'وزٹ شروع ہو گیا',
  visit_started_msg: 'آپ نے تصدیق کر دی ہے کہ مریض نے آپ کو وصول کر لیا ہے۔ آپ کا وزٹ اب شروع ہو جائے گا۔',
  view_image: 'تصویر دیکھیں',
  address: 'پتہ',
  i_have_arrived: 'میں پہنچ گیا ہوں',
  cancel_visit: 'وزٹ منسوخ کریں',
  cancel_visit_confirm: 'کیا آپ واقعی اس وزٹ کو منسوخ کرنا چاہتے ہیں؟ مریض کو اطلاع دی جائے گی اور وزٹ ختم ہو جائے گا۔',
  no_continue: 'نہیں، جاری رکھیں',
  yes_cancel: 'ہاں، وزٹ منسوخ کریں',
  visit_cancelled: 'وزٹ منسوخ ہو گیا',
  visit_cancelled_msg: 'آپ نے یہ وزٹ منسوخ کر دیا ہے۔ مریض کو اطلاع دے دی گئی ہے۔',
  treatment_in_progress: 'علاج جاری ہے',
  patient_received: 'مریض نے آپ کو وصول کر لیا ہے۔ نیچے سے آپشن منتخب کریں:',
  write_prescription: 'نسخہ لکھیں',
  set_reminders: 'ادویات کی یاددہانی سیٹ کریں',
  end_visit: 'وزٹ ختم کریں',
  complete_treatment: 'علاج مکمل کریں',
  chat: 'چیٹ کریں',
  call_patient: 'مریض کو کال کریں',
  // Add these for rating modal
  rate_patient: 'مریض کی درجہ بندی کریں',
  submit_rating: 'درجہ بندی جمع کروائیں',
  rating_submitted: 'درجہ بندی جمع ہوگئی',
  patient_rating: 'مریض کی درجہ بندی',
};

// Add after urduText
const urduDynamic = {
  'headache': 'سر درد',
  'pain': 'درد',
  'fever': 'بخار',
  'cough': 'کھانسی',
  'flu': 'نزلہ زکام',
  'cold': 'زکام',
  'diabetes': 'ذیابیطس',
  'hypertension': 'بلند فشار خون',
  'asthma': 'دمہ',
  'allergy': 'الرجی',
  'infection': 'انفیکشن',
  'injury': 'چوٹ',
  'fracture': 'ہڈی ٹوٹنا',
  'cancer': 'کینسر',
  'migraine': 'آدھے سر کا درد',
  'nausea': 'متلی',
  'vomiting': 'قے',
  'diarrhea': 'دست',
  'constipation': 'قبض',
  'bleeding': 'خون بہنا',
  'swelling': 'سوجن',
  'rash': 'خارش',
  'burn': 'جلنا',
  'wound': 'زخم',
  'anemia': 'خون کی کمی',
  'arthritis': 'گٹھیا',
  'epilepsy': 'مرگی',
  'tuberculosis': 'تپ دق',
  'hepatitis': 'یرقان',
  'malaria': 'ملیریا',
  'pneumonia': 'نمونیا',
  'ulcer': 'زخم',
  'stone': 'پتھری',
  'kidney': 'گردہ',
  'liver': 'جگر',
  'heart': 'دل',
  'stomach': 'معدہ',
  'skin': 'جلد',
  'eye': 'آنکھ',
  'ear': 'کان',
  'nose': 'ناک',
  'throat': 'گلا',
  'chest': 'سینہ',
  'back': 'کمر',
  'leg': 'ٹانگ',
  'arm': 'بازو',
  'hand': 'ہاتھ',
  'foot': 'پاؤں',
  'tooth': 'دانت',
  'mouth': 'منہ',
  'tongue': 'زبان',
  'head': 'سر',
  'neck': 'گردن',
  'joint': 'جوڑ',
  'muscle': 'پٹھا',
  'bone': 'ہڈی',
  'blood': 'خون',
  'sugar': 'شوگر',
  'pressure': 'پریشر',
  'pulse': 'نبض',
  'temperature': 'درجہ حرارت',
  'not specified': 'درج نہیں',
  'doctor': 'ڈاکٹر',
  'patient': 'مریض',
  'diseases': 'امراض',
  'time': 'وقت',
  'notes': 'نوٹس',
  'visit': 'وزٹ',
  'prescription': 'نسخہ',
  'medication': 'ادویات',
  'dosage': 'خوراک',
  'frequency': 'تعدد',
  'duration': 'دورانیہ',
  'instructions': 'ہدایات',
  'general info': 'عمومی معلومات',
  'medical details': 'طبی تفصیلات',
  'treatment': 'علاج',
  'description': 'تفصیل',
  'symptoms': 'علامات',
  'diagnosis': 'تشخیص',
  'location': 'مقام',
  'available': 'دستیاب',
  'close': 'بند کریں',
  'view details': 'تفصیلات دیکھیں',
};

const DoctorMapScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors);
  const locationTracking = useLocationTracking();
  const { refreshRatings } = useRating();
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [patientRequests, setPatientRequests] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [showRequestsList, setShowRequestsList] = useState(false);
  const [patientLocation, setPatientLocation] = useState(null);
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [activePatientId, setActivePatientId] = useState(null);
  const [isVisitActive, setIsVisitActive] = useState(false);
  const [eta, setEta] = useState(null);
  const [doctorHasReached, setDoctorHasReached] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [directions, setDirections] = useState(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [patientRating, setPatientRating] = useState(0);
  const [lastCompletedVisitId, setLastCompletedVisitId] = useState(null);
  const [patientAddressDetails, setPatientAddressDetails] = useState('');
  const [doctorFee, setDoctorFee] = useState('');
  const [feeError, setFeeError] = useState('');
  const [declinedRequestIds, setDeclinedRequestIds] = useState([]);
  const [acceptedRequestIds, setAcceptedRequestIds] = useState([]);
  // Add a state to store patient ratings
  const [patientRatings, setPatientRatings] = useState({});
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [patientProfilePictures, setPatientProfilePictures] = useState({});
  const [activePatientInfo, setActivePatientInfo] = useState(null);
  // Add a new state to track all seen patient request IDs
  const [seenRequestIds, setSeenRequestIds] = useState([]);
  
  // Reference to store the polling interval
  const pollingInterval = useRef(null);
  // Add at the top of the component
  const requestListenersRef = useRef({});
  
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
        setLocation(currentLocation.coords);
        
        // Check if doctor is already online in Firebase
        const availabilityQuery = query(collection(db, DOCTOR_AVAILABILITY), where("doctorId", "==", auth.currentUser.uid));
        const availabilitySnapshot = await getDocs(availabilityQuery);
        
        if (!availabilitySnapshot.empty) {
          const availabilityData = availabilitySnapshot.docs[0].data();
          console.log('Found doctor availability record:', availabilityData);
          
          // Sync local state with Firebase state
          if (availabilityData.isAvailable) {
            console.log('Doctor is already online in Firebase, syncing local state');
            // Always fetch and confirm location if doctor is already online
            try {
              let { status } = await Location.requestForegroundPermissionsAsync();
              if (status === 'granted') {
                let currentLocation = await Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.Balanced,
                });
                setLocation(currentLocation.coords);
                await updateDoctorAvailability(
                  auth.currentUser.uid,
                  true,
                  {
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude
                  }
                );
                console.log('Doctor location confirmed on mount (already online).');
              }
            } catch (error) {
              console.error('Error confirming location on mount (already online):', error);
            }
            setIsOnline(true);
            // Removed direct call to startPollingForPatients();
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error getting location or checking availability:', error);
        setErrorMsg('Could not fetch your location. Please try again.');
        setIsLoading(false);
      }
    })();

    // Cleanup function
    return () => {
      // If we were online, go offline when component unmounts
      if (isOnline) {
        try {
          // Update doctor's availability status in the database
          updateDoctorAvailability(auth.currentUser.uid, false, location);
          console.log('Doctor went offline');
        } catch (error) {
          console.error('Error updating availability status on unmount:', error);
        }
      }
      
      // Clear polling interval
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, []);

  // Listen for context state changes to force re-renders
  useEffect(() => {
    console.log('Context state changed:', {
      doctorHasReached: locationTracking.doctorHasReached,
      doctorReceived: locationTracking.doctorReceived,
      waitingTimerActive: locationTracking.waitingTimerActive
    });
    setForceUpdate(prev => prev + 1);
  }, [locationTracking.doctorHasReached, locationTracking.doctorReceived, locationTracking.waitingTimerActive]);

  // Listen for visit cancellation
  useEffect(() => {
    // If we were tracking but now we're not, and we have an active match, check if it was cancelled
    if (isVisitActive && !locationTracking.isTracking && activeMatchId) {
      console.log('Visit tracking stopped, checking if visit was cancelled');
      
      // Check the visit status in Firestore
      const checkVisitStatus = async () => {
        try {
          const visitRef = doc(db, 'doctorPatientMatches', activeMatchId);
          const visitDoc = await getDoc(visitRef);
          
          if (visitDoc.exists()) {
            const visitData = visitDoc.data();
            if (visitData.status === 'cancelled') {
              console.log('Visit was cancelled by patient');
              
              // Reset local state
              setIsVisitActive(false);
              setActiveMatchId(null);
              setActivePatientId(null);
              setActivePatientInfo(null);
              setDoctorHasReached(false);
              setPatientLocation(null);
              setEta(null);
              setRouteCoordinates([]);
              setDirections(null);
              
              // Show cancellation alert
              Alert.alert(
                'Visit Cancelled',
                'The patient has cancelled this visit.',
                [{ text: 'OK' }]
              );
            }
          }
        } catch (error) {
          console.error('Error checking visit status:', error);
        }
      };
      
      checkVisitStatus();
    }
  }, [locationTracking.isTracking, isVisitActive, activeMatchId]);

  // Fetch patient ratings when patientRequests change
  useEffect(() => {
    const fetchRatings = async () => {
      const ratings = {};
      for (const patient of patientRequests) {
        if (patient.patientId && !ratings[patient.patientId]) {
          // Fetch all matches for this patient
          const q = query(
            collection(db, 'doctorPatientMatches'),
            where('patientId', '==', patient.patientId)
          );
          const snapshot = await getDocs(q);
          const docs = [];
          snapshot.forEach(docSnap => {
            docs.push({ id: docSnap.id, ...docSnap.data() });
          });
          const filtered = docs.filter(d => typeof d.patientRating === 'number');
          const avg = filtered.length
            ? Math.round((filtered.reduce((a, b) => a + b.patientRating, 0) / filtered.length) * 100) / 100
            : null;
          ratings[patient.patientId] = avg !== null && avg !== undefined ? avg.toFixed(2) : 'No ratings';
        }
      }
      setPatientRatings(ratings);
    };
    if (patientRequests.length > 0) fetchRatings();
  }, [patientRequests]);

  // Fetch patient profile pictures when patientRequests change
  useEffect(() => {
    const fetchPictures = async () => {
      const ids = patientRequests.map(p => p.patientId).filter(Boolean);
      if (ids.length > 0) {
        const pics = await fetchMultipleUserProfilePictures(ids);
        setPatientProfilePictures(pics);
      }
    };
    fetchPictures();
  }, [patientRequests]);

  // Ensure patient profile picture and rating are fetched when visit becomes active
  useEffect(() => {
    const patientInfo = isVisitActive ? activePatientInfo : selectedPatient;
    if (isVisitActive && patientInfo?.patientId) {
      // Fetch patient profile picture if not already available
      if (!patientProfilePictures[patientInfo.patientId]) {
        fetchMultipleUserProfilePictures([patientInfo.patientId]).then(pics => {
          setPatientProfilePictures(prev => ({ ...prev, ...pics }));
        });
      }
      
      // Fetch patient rating if not already available
      if (!patientRatings[patientInfo.patientId]) {
        const fetchRating = async () => {
          const q = query(
            collection(db, 'doctorPatientMatches'),
            where('patientId', '==', patientInfo.patientId)
          );
          const snapshot = await getDocs(q);
          const docs = [];
          snapshot.forEach(docSnap => {
            docs.push({ id: docSnap.id, ...docSnap.data() });
          });
          const filtered = docs.filter(d => typeof d.patientRating === 'number');
          const avg = filtered.length
            ? Math.round((filtered.reduce((a, b) => a + b.patientRating, 0) / filtered.length) * 100) / 100
            : null;
          const rating = avg !== null && avg !== undefined ? avg.toFixed(2) : 'No ratings';
          setPatientRatings(prev => ({ ...prev, [patientInfo.patientId]: rating }));
        };
        fetchRating();
      }
    }
  }, [isVisitActive, activePatientInfo, selectedPatient, patientProfilePictures, patientRatings]);

  // Confirm doctor's location in the database
  const confirmLocation = async () => {
    if (!location) {
      Alert.alert('Location Error', 'Unable to detect your location. Please try again.');
      return;
    }

    try {
      // Ensure location is properly formatted
      const formattedLocation = {
        latitude: location.latitude,
        longitude: location.longitude
      };
      
      console.log('Confirming doctor location:', formattedLocation);

      // Update doctor's location in the database
      await updateDoctorAvailability(
        auth.currentUser.uid,
        false, // Not changing online status yet
        formattedLocation
      );

      Alert.alert(
        'Location Confirmed',
        'Your location has been saved. You can now go online to find patients.'
      );
    } catch (error) {
      console.error('Error confirming location:', error);
      Alert.alert('Error', 'Could not save your location. Please try again.');
    }
  };

  // Modified toggleOnlineStatus to always fetch latest location before going online
  const toggleOnlineStatus = async () => {
    let latestLocation = location;
    if (!isOnline) { // Only fetch if going online
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Location Required', 'Permission to access location was denied');
          return;
        }
        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        latestLocation = currentLocation.coords;
        setLocation(latestLocation);
      } catch (error) {
        Alert.alert('Location Error', 'Could not fetch your location. Please try again.');
        return;
      }
    }

    if (!latestLocation) {
      Alert.alert('Location Required', 'Your location is needed to go online');
      return;
    }

    const newStatus = !isOnline;
    setIsOnline(newStatus);

    try {
      // Ensure location is properly formatted
      const formattedLocation = {
        latitude: latestLocation.latitude,
        longitude: latestLocation.longitude
      };
      console.log('Doctor toggling availability status:', {
        doctorId: auth.currentUser.uid,
        isAvailable: newStatus,
        location: formattedLocation
      });
      // Update doctor's availability status in the database
      await updateDoctorAvailability(
        auth.currentUser.uid,
        newStatus,
        formattedLocation
      );
      console.log('Doctor availability updated successfully in Firebase');
      if (newStatus) {
        // Doctor is going online
        startPollingForPatients();
      } else {
        // Doctor is going offline
        setPatientRequests([]);
        setSelectedPatient(null);
        setShowPatientDetails(false);
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
      }
    } catch (error) {
      console.error('Error updating availability status:', error);
      Alert.alert('Error', 'Could not update your availability status. Please try again.');
      setIsOnline(!newStatus);
    }
  };

  // Always re-confirm location if doctor is online and app regains focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      if (isOnline) {
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            let currentLocation = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            setLocation(currentLocation.coords);
            await updateDoctorAvailability(
              auth.currentUser.uid,
              true,
              {
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude
              }
            );
            console.log('Doctor location re-confirmed on app focus.');
          }
        } catch (error) {
          console.error('Error re-confirming location on focus:', error);
        }
      }
    });
    return unsubscribe;
  }, [isOnline, navigation]);
  
  // Poll for nearby patient requests
  const startPollingForPatients = () => {
    // Clear any existing interval
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    
    // Function to fetch nearby patients
    const fetchNearbyPatients = async () => {
      // First check if location is available
      if (!location) {
        console.log('Not fetching patients - location is missing');
        return;
      }
      
      // Verify doctor's online status from Firebase
      try {
        const availabilityQuery = query(collection(db, DOCTOR_AVAILABILITY), where("doctorId", "==", auth.currentUser.uid));
        const availabilitySnapshot = await getDocs(availabilityQuery);
        
        if (availabilitySnapshot.empty) {
          console.log('Not fetching patients - doctor availability record not found');
          return;
        }
        
        const availabilityData = availabilitySnapshot.docs[0].data();
        if (!availabilityData.isAvailable && isOnline) {
          // Database says offline but local state says online - sync them
          console.log('Syncing online status with database (was out of sync)');
          await updateDoctorAvailability(auth.currentUser.uid, true, location);
        } else if (!availabilityData.isAvailable) {
          console.log('Not fetching patients - doctor is marked as offline in database');
          return;
        }
      } catch (error) {
        console.error('Error checking doctor availability:', error);
      }
      
      try {
        // Get doctor's profile information
        const doctorDoc = await getDoc(doc(db, 'doctors', auth.currentUser.uid));
        if (!doctorDoc.exists()) {
          console.error('Doctor profile not found in doctors collection');
          Alert.alert('Profile Error', 'Your doctor profile was not found. Please contact support.');
          return;
        }
        
        console.log('Doctor profile found:', doctorDoc.data());
        
        // Format location correctly for all operations
        const formattedLocation = {
          latitude: typeof location.latitude === 'string' ? parseFloat(location.latitude) : location.latitude,
          longitude: typeof location.longitude === 'string' ? parseFloat(location.longitude) : location.longitude
        };
        
        // Ensure values are numbers
        if (isNaN(formattedLocation.latitude) || isNaN(formattedLocation.longitude)) {
          console.error('Invalid location coordinates:', location);
          return;
        }
        
        console.log('Updating doctor location with explicit values:', formattedLocation);
        
        // Always update doctor's availability and location on each poll
        // This ensures the location is always current in Firebase
        await updateDoctorAvailability(auth.currentUser.uid, true, formattedLocation);
        console.log('Updated doctor availability and location:', formattedLocation);
        
        // Check doctor availability in the doctorAvailability collection to verify update
        const availabilityQuery = query(collection(db, 'doctorAvailability'), where("doctorId", "==", auth.currentUser.uid));
        const availabilitySnapshot = await getDocs(availabilityQuery);
        
        if (availabilitySnapshot.empty) {
          console.error('Failed to create doctor availability record');
          Alert.alert('Error', 'Could not update your availability status. Please try again.');
          return;
        } else {
          const availabilityData = availabilitySnapshot.docs[0].data();
          console.log('Verified doctor availability record:', availabilityData);
          
          // Verify location was properly saved
          if (!availabilityData.location) {
            console.error('Location missing in availability record');
            // Try to update again with explicit location
            await updateDoctorAvailability(auth.currentUser.uid, true, formattedLocation);
          }
        }
        
        console.log('Searching for patients with location:', formattedLocation);
        
        // Get nearby patient requests
        const nearbyRequests = await getNearbyPatientRequests(
          auth.currentUser.uid,
          formattedLocation,
          10 // Increased from 5km to 10km radius to find more patients
        );
        
        console.log('Found nearby requests:', nearbyRequests.length);
        
        // Check if there are any pending patient requests in the database
        const pendingRequestsQuery = query(collection(db, 'patientRequests'), where("status", "==", "pending"));
        const pendingRequestsSnapshot = await getDocs(pendingRequestsQuery);
        console.log('Total pending patient requests in database:', pendingRequestsSnapshot.size);
        
        // Log all pending requests for debugging
        pendingRequestsSnapshot.forEach(doc => {
          const data = doc.data();
          console.log(`Pending request ${doc.id} details:`, {
            patientName: data.patientName,
            location: data.location ? 'Has location' : 'No location',
            status: data.status,
            createdAt: data.createdAt
          });
        });
        
        // Process new requests that we haven't seen before
        const currentRequestIds = patientRequests.map(p => p.id);
        // In fetchNearbyPatients, before filtering newRequests, update seenRequestIds with any new IDs
        const allRequestIds = nearbyRequests.map(req => req.id);
        const unseenRequestIds = allRequestIds.filter(id => !seenRequestIds.includes(id));
        if (unseenRequestIds.length > 0) {
          setSeenRequestIds(prev => [...prev, ...unseenRequestIds]);
        }
        // Use filteredNearbyRequests instead of nearbyRequests for newRequests
        const now = Date.now();
        const filteredNearbyRequests = nearbyRequests.filter(req => {
          if (!req.seenByDoctors || !req.seenByDoctors[currentUser.uid]) return true;
          return now - req.seenByDoctors[currentUser.uid] > 60000;
        });
        // When filtering newRequests, exclude any that are in seenRequestIds
        const newRequests = filteredNearbyRequests.filter(req =>
          !currentRequestIds.includes(req.id) &&
          !acceptedRequestIds.includes(req.id)
        );
        
        if (newRequests.length > 0) {
          // Add new requests to the list
          setPatientRequests(prev => {
            // Combine existing and new requests, ensuring no duplicates
            const updatedRequests = [...prev];
            newRequests.forEach(newRequest => {
              const existingIndex = updatedRequests.findIndex(r => r.id === newRequest.id);
              if (existingIndex === -1) {
                updatedRequests.push({
                  ...newRequest,
                  name: newRequest.patientName,
                  age: newRequest.age || 'Unknown',
                  symptoms: newRequest.symptoms || 'Not specified',
                  description: newRequest.description || 'No details provided',
                  agreedPrice: newRequest.agreedPrice || 0,
                  distance: newRequest.distance || 'Unknown distance',
                  eta: newRequest.eta || 'Calculating...',
                  attachedImage: newRequest.attachedImage || null,
                  location: {
                    latitude: newRequest.location.latitude,
                    longitude: newRequest.location.longitude
                  },
                  addressDetails: newRequest.addressDetails || '',
                  patientId: newRequest.patientId // Ensure patientId is set for rating
                });
                // Mark as seen in Firestore
                markRequestSeenByDoctor(newRequest.id, currentUser.uid);
              }
            });
            // Filter out declined and accepted requests robustly
            return updatedRequests.filter(r =>
              !seenRequestIds.includes(r.id) &&
              !acceptedRequestIds.includes(r.id)
            );
          });
          // Remove all pop-ups for new requests
          // Do not show any Alert or notification here
          setShowRequestsList(true);
        }
      } catch (error) {
        console.error('Error fetching nearby patients:', error);
      }
    };
    
    // Fetch immediately
    fetchNearbyPatients();
    
    // Then set up interval to fetch every 15 seconds (reduced from 30 seconds for faster updates)
    pollingInterval.current = setInterval(fetchNearbyPatients, 15000);
  };

  // Handle accepting a patient request
  const acceptPatientRequest = async () => {
    if (!selectedPatient) return;
    const feeValue = parseFloat(doctorFee);
    if (isNaN(feeValue) || feeValue < 1500 || feeValue > 2500) {
      setFeeError('Please enter a valid fee between 1500 and 2500');
      return;
    }
    setFeeError('');
    try {
      // Get doctor's profile information
      const doctorDoc = await getDoc(doc(db, 'doctors', auth.currentUser.uid));
      if (!doctorDoc.exists()) {
        Alert.alert('Error', 'Your doctor profile is not complete. Please update your profile first.');
        return;
      }
      const doctorData = doctorDoc.data();
      // Offer help to the patient
      console.log('Offering help to patient:', selectedPatient.id);
      console.log('Doctor data:', doctorData);
      // Get doctor's current location
      const doctorLocation = {
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude)
      };
      // Make sure doctor's availability is updated with current location
      await updateDoctorAvailability(auth.currentUser.uid, true, doctorLocation);
      // Offer help with complete doctor information and fee
      await offerHelp(
        selectedPatient.id,
        auth.currentUser.uid,
        {
          name: doctorData.fullName || auth.currentUser.displayName || 'Doctor',
          specialty: doctorData.specialization || 'General Physician',
          rating: doctorData.rating || 4.5,
          location: doctorLocation, // Include doctor's current location
          fee: feeValue // Pass the entered fee
        }
      );
      // Preserve the patient information for tracking
      setActivePatientInfo(selectedPatient);
      
      // Remove the Alert for request accepted, just update state
      setShowPatientDetails(false);
      setPatientRequests(prev => prev.filter(p => p.id !== selectedPatient.id));
      listenForPatientAcceptance(selectedPatient.id);
      setSelectedPatient(null);
      setDoctorFee('');
      setAcceptedRequestIds(prev => [...prev, selectedPatient.id]);
    } catch (error) {
      console.error('Error accepting patient request:', error);
      Alert.alert('Error', `Could not accept patient request: ${error.message}`);
    }
  };
  
  // Listen for patient acceptance of doctor's offer
  const listenForPatientAcceptance = (requestId) => {
    console.log(`Setting up listener for patient acceptance on request ${requestId}`);
    
    // Set up a listener on the patient request
    const requestRef = doc(db, 'patientRequests', requestId);
    const unsubscribe = onSnapshot(requestRef, async (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        console.log(`Received update for request ${requestId}:`, {
          status: data.status,
          matchedDoctorId: data.matchedDoctorId,
          currentUserId: auth.currentUser.uid
        });
        
        // Check if the patient has accepted this doctor's offer
        if (data.status === 'matched' && data.matchedDoctorId === auth.currentUser.uid) {
          console.log('Patient has accepted doctor\'s offer!');
          
          // Find the match document
          const matchesQuery = query(
            collection(db, 'doctorPatientMatches'),
            where('requestId', '==', requestId),
            where('doctorId', '==', auth.currentUser.uid),
            where('patientId', '==', data.patientId)
          );
          
          const matchesSnapshot = await getDocs(matchesQuery);
          
          if (!matchesSnapshot.empty) {
            const matchDoc = matchesSnapshot.docs[0];
            const matchId = matchDoc.id;
            const matchData = matchDoc.data();
            
            console.log(`Found match document ${matchId}:`, {
              doctorHasReached: matchData.doctorHasReached,
              doctorReceived: matchData.doctorReceived,
              status: matchData.status
            });
            
            // Store the active match and patient IDs
            setActiveMatchId(matchId);
            setActivePatientId(matchData.patientId);
            setIsVisitActive(true);
            
            // Check if doctor has already reached
            if (matchData.doctorHasReached) {
              console.log('Doctor has already reached, syncing state');
              setDoctorHasReached(true);
            }
            
            // Get patient location from the request data
            if (data.location) {
              // Handle both GeoPoint and regular object formats for location
              let patientLoc;
              if (typeof data.location.latitude === 'function') {
                // It's a GeoPoint object
                patientLoc = {
                  latitude: data.location.latitude(),
                  longitude: data.location.longitude()
                };
              } else {
                // It's a regular object
                patientLoc = {
                  latitude: data.location.latitude,
                  longitude: data.location.longitude
                };
              }
              setPatientLocation(patientLoc);
              
              // Calculate initial ETA
              if (location) {
                try {
                  // Calculate distance and ETA
                  const distanceInKm = calculateDistance(
                    location.latitude,
                    location.longitude,
                    patientLoc.latitude,
                    patientLoc.longitude
                  );
                  
                  // Estimate time (assuming average speed of 30 km/h in urban areas)
                  const timeInMinutes = Math.round((distanceInKm / 30) * 60);
                  
                  setEta({
                    text: timeInMinutes <= 1 ? '1 minute' : `${timeInMinutes} minutes`,
                    distance: `${distanceInKm.toFixed(1)} km`
                  });
                  
                  // Get directions from doctor to patient
                  getDirections(
                    { latitude: location.latitude, longitude: location.longitude },
                    patientLoc
                  );
                } catch (error) {
                  console.error('Error calculating ETA:', error);
                }
              }
            }
            
            // Start location tracking
            if (locationTracking.startDoctorLocationTracking) {
              const trackingStarted = await locationTracking.startDoctorLocationTracking(matchId, matchData.patientId);
              console.log('Location tracking started:', trackingStarted);
            } else {
              console.warn('Location tracking function not available');
            }
            
            // Show alert to doctor
            Alert.alert(
              'Visit Started!',
              'The patient has accepted your offer. Please proceed to the patient\'s location.',
              [{ text: 'OK' }]
            );
            
            // Unsubscribe from this listener since we've confirmed the match
            unsubscribe();
          } else {
            console.error('No match document found for accepted request');
          }
        }
      } else {
        console.log(`Request ${requestId} no longer exists`);
      }
    }, (error) => {
      console.error(`Error listening to patient acceptance for request ${requestId}:`, error);
    });
    
    // Store the unsubscribe function somewhere if needed for cleanup
    return unsubscribe;
  };
  
  // Function to get directions from Google Maps Directions API
  const getDirections = async (startLoc, destinationLoc) => {
    try {
      // Import the directions API utility
      const { getDirectionsFromApi, createStraightLineRoute } = require('../utils/directionsApi');
      
      // Try to get directions from the API
      const directions = await getDirectionsFromApi(startLoc, destinationLoc);
      
      if (directions) {
        // If API call was successful, use the returned route
        setRouteCoordinates(directions.coordinates);
        
        // Set the directions information
        setDirections({
          distance: directions.distance.text,
          duration: directions.duration.text,
          steps: directions.steps.map(step => step.instructions)
        });
        
        // Update ETA
        setEta({
          text: directions.duration.text,
          distance: directions.distance.text
        });
      } else {
        // Fallback to straight line if API fails
        const fallbackRoute = createStraightLineRoute(startLoc, destinationLoc);
        
        setRouteCoordinates(fallbackRoute.coordinates);
        
        setDirections({
          distance: fallbackRoute.distance.text,
          duration: fallbackRoute.duration.text,
          steps: fallbackRoute.steps.map(step => step.instructions)
        });
        
        // Update ETA
        setEta({
          text: fallbackRoute.duration.text,
          distance: fallbackRoute.distance.text
        });
      }
    } catch (error) {
      console.error('Error getting directions:', error);
      
      // Fallback to simple straight line in case of error
      setRouteCoordinates([
        { latitude: startLoc.latitude, longitude: startLoc.longitude },
        { latitude: destinationLoc.latitude, longitude: destinationLoc.longitude }
      ]);
      
      // Calculate basic distance and ETA
      const distance = calculateDistance(
        startLoc.latitude, 
        startLoc.longitude, 
        destinationLoc.latitude, 
        destinationLoc.longitude
      );
      
      const timeInMinutes = Math.round((distance / 30) * 60);
      
      setDirections({
        distance: `${distance.toFixed(1)} km`,
        duration: `${timeInMinutes} mins`,
        steps: ["Head toward the patient's location"]
      });
      
      // Update ETA
      setEta({
        text: `${timeInMinutes} mins`,
        distance: `${distance.toFixed(1)} km`
      });
    }
  };
  
  // Helper function to decode Google Maps encoded polyline
  // This would be used with the actual Google Maps Directions API
  const decodePolyline = (encoded) => {
    const points = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5
      });
    }
    return points;
  };
  
  // Update route when doctor's location changes
  useEffect(() => {
    if (isVisitActive && location && patientLocation) {
      getDirections(
        { latitude: location.latitude, longitude: location.longitude },
        patientLocation
      );
    }
  }, [isVisitActive, location, patientLocation]);
  

  
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
  
  // Direct Firestore update function as fallback
  const updateDoctorReceivedDirectly = async (matchId) => {
    try {
      console.log(`Directly updating doctorReceived for match ${matchId}`);
      const matchRef = doc(db, 'doctorPatientMatches', matchId);
      
      await updateDoc(matchRef, {
        doctorReceived: true,
        visitStarted: true,
        receivedAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
      
      console.log(`Direct Firestore update successful for match ${matchId}`);
      return true;
    } catch (error) {
      console.error(`Direct Firestore update failed for match ${matchId}:`, error);
      return false;
    }
  };

  // Add a function to handle when doctor reaches the patient's location
  const handleDoctorReached = async () => {
    if (!activeMatchId) return;
    
    try {
      // Mark the doctor as reached in the location tracking context
      const success = await locationTracking.markDoctorAsReached();
      
      if (success) {
        // Update local state to reflect the change
        setDoctorHasReached(true);
        
        Alert.alert(
          'Arrival Confirmed',
          'You have marked yourself as arrived at the patient\'s location. The patient has been notified.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Could not mark arrival. Please try again.');
      }
    } catch (error) {
      console.error('Error marking doctor as reached:', error);
      Alert.alert('Error', 'Could not mark arrival. Please try again.');
    }
  };
  
  // Add a function to render the tracking UI
  // Helper: Patient Info Header
  const renderPatientInfoHeader = () => {
    // Use activePatientInfo when visit is active, otherwise use selectedPatient
    const patientInfo = isVisitActive ? activePatientInfo : selectedPatient;
    const patientId = patientInfo?.patientId;
    const profilePic = patientProfilePictures[patientId];
    console.log('Patient Info Debug:', {
      patientId: patientId,
      patientProfilePictures,
      profilePic,
      selectedPatient,
      activePatientInfo,
      isVisitActive
    });
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        {patientId && profilePic === undefined ? (
          <ActivityIndicator size="small" color="#0066CC" style={{ width: 40, height: 40, marginRight: 10 }} />
        ) : profilePic ? (
          <Image source={{ uri: profilePic }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }} />
        ) : (
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
            <Ionicons name="person" size={24} color="#888" />
          </View>
        )}
        <View>
          <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{patientInfo?.patientName || 'Patient'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={{ marginLeft: 4, fontSize: 14 }}>
              {patientRatings[patientId] && patientRatings[patientId] !== 'No ratings'
                ? Number(patientRatings[patientId]).toFixed(2)
                : 'No ratings'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTrackingUI = () => {
    if (!isVisitActive) return null;
    
    // For debugging
    console.log('Rendering tracking UI with states:', {
      doctorHasReached,
      waitingTimerActive: locationTracking.waitingTimerActive,
      waitingTimeRemaining: locationTracking.waitingTimeRemaining,
      doctorReceived: locationTracking.doctorReceived
    });
    
    // Manual state sync - check if we need to update local state from context
    if (doctorHasReached && !locationTracking.doctorReceived) {
      console.log('Manual state sync: doctorHasReached is true but doctorReceived is false in context');
    }
    
    // Add debug logs before rendering the address in the tracking UI
    if (!doctorHasReached && selectedPatient) {
      console.log('DEBUG (tracking UI): selectedPatient.addressDetails:', selectedPatient.addressDetails);
      console.log('DEBUG (tracking UI): patientAddressDetails:', patientAddressDetails);
    }
    
    return (
      <View style={styles.trackingContainer}>
        {/* Google Maps style ETA card */}
        <View style={styles.googleMapsEtaCard}>
          {renderPatientInfoHeader()}
          <View style={styles.etaHeaderContainer}>
            <Text style={styles.etaTitle}>
              {doctorHasReached ? (language === 'ur' ? urduText.at_patient_location : 'At patient location') : (language === 'ur' ? urduText.en_route_to_patient : 'En route to patient')}
            </Text>
            <TouchableOpacity 
              style={styles.openGoogleMapsButton}
              onPress={() => {
                if (patientLocation) {
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${patientLocation.latitude},${patientLocation.longitude}`;
                  Linking.openURL(url);
                }
              }}
              doctorReceived={locationTracking.doctorReceived}
            >
              <Text style={styles.openGoogleMapsButtonText}>
                {language === 'ur' ? urduText.open_in_maps : 'Open in Google Maps'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {!doctorHasReached && eta && (
            <View style={styles.etaDetailsContainer}>
              <Text style={styles.etaDuration}>{language === 'ur' ? urduText.eta + ': ' : ''}{eta.text}</Text>
              <Text style={styles.etaDistance}>{language === 'ur' ? urduText.distance + ': ' : ''}{eta.distance}</Text>
            </View>
          )}
          
          {/* Always render the address block if activePatientInfo exists */}
          {!doctorHasReached && activePatientInfo && (
            <View style={styles.directionsContainer}>
              <Text style={styles.nextDirectionLabel}>{language === 'ur' ? urduText.address : 'Patient Address:'}</Text>
              <Text style={styles.nextDirectionText}>
                {activePatientInfo.addressDetails || patientAddressDetails || (language === 'ur' ? urduText.not_provided : 'Not provided')}
              </Text>
            </View>
          )}
          
          {!doctorHasReached ? (
            <View>
              <TouchableOpacity 
                style={styles.arrivedButton}
                onPress={handleDoctorReached}
              >
                <Text style={styles.arrivedButtonText}>{language === 'ur' ? urduText.i_have_arrived : 'I Have Arrived'}</Text>
              </TouchableOpacity>
              
              {/* Cancel Visit Button */}
              <TouchableOpacity 
                style={[styles.cancelVisitButton, { backgroundColor: colors.error }]}
                onPress={() => {
                  Alert.alert(
                    language === 'ur' ? urduText.cancel_visit : 'Cancel Visit',
                    language === 'ur' ? urduText.cancel_visit_confirm : 'Are you sure you want to cancel this visit? The patient will be notified and the visit will end.',
                    [
                      { text: language === 'ur' ? urduText.no_continue : 'No, Continue', style: 'cancel' },
                      { 
                        text: language === 'ur' ? urduText.yes_cancel : 'Yes, Cancel Visit', 
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            const success = await locationTracking.cancelVisitByDoctor();
                            if (success) {
                              Alert.alert(
                                language === 'ur' ? urduText.visit_cancelled : 'Visit Cancelled',
                                language === 'ur' ? urduText.visit_cancelled_msg : 'You have cancelled this visit. The patient has been notified.',
                                [{ text: 'OK', onPress: () => navigation.goBack() }]
                              );
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
                <Text style={[styles.cancelVisitButtonText, { color: colors.buttonText }]}>{language === 'ur' ? urduText.cancel_visit : 'Cancel Visit'}</Text>
              </TouchableOpacity>
            </View>
          ) : locationTracking.waitingTimerActive && !locationTracking.doctorReceived ? (
            <WaitingTimer 
              isDoctor={true}
              timeRemaining={locationTracking.waitingTimeRemaining}
              isExtended={locationTracking.waitingTimerExtended}
              onReceived={async () => {
                console.log(`Doctor screen: activeMatchId = ${activeMatchId}`);
                console.log(`Doctor screen: locationTracking.activeVisitId = ${locationTracking.activeVisitId}`);
                
                // Ensure context has the correct activeVisitId before marking as received
                if (locationTracking.activeVisitId !== activeMatchId && locationTracking.setActiveVisitId) {
                  console.log(`Setting activeVisitId from ${locationTracking.activeVisitId} to ${activeMatchId}`);
                  locationTracking.setActiveVisitId(activeMatchId);
                  
                  // Add a small delay to ensure the state is updated
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                console.log(`Calling markDoctorAsReceived with activeVisitId: ${locationTracking.activeVisitId}`);
                const result = await locationTracking.markDoctorAsReceived();
                console.log(`markDoctorAsReceived result: ${result}`);
                // If context method fails, try direct Firestore update
                if (!result) {
                  console.log(`Context method failed, trying direct Firestore update`);
                  const directResult = await updateDoctorReceivedDirectly(activeMatchId);
                  console.log(`Direct update result: ${directResult}`);
                }
                // Force a re-render after the update
                setForceUpdate(prev => prev + 1);
                // FORCE manual sync from Firestore to ensure all listeners update
                if (typeof locationTracking.forceSyncFromFirestore === 'function') {
                  console.log('Calling forceSyncFromFirestore after doctor has been received button press');
                  await locationTracking.forceSyncFromFirestore();
                }
                Alert.alert(
                  'Visit Started',
                  'You have confirmed that the patient has received you. Your visit will now begin.',
                  [{ text: 'OK' }]
                );
                // After calling markDoctorAsReceived, immediately fetch and log the Firestore value
                try {
                  const visitRef = doc(db, 'doctorPatientMatches', activeMatchId);
                  const updatedDoc = await getDoc(visitRef);
                  if (updatedDoc.exists()) {
                    const updatedData = updatedDoc.data();
                    console.log('[Doctor UI] Immediate Firestore check after markDoctorAsReceived:', updatedData.doctorReceived);
                  } else {
                    console.log('[Doctor UI] Immediate Firestore check: document does not exist');
                  }
                } catch (err) {
                  console.error('[Doctor UI] Error fetching Firestore doc after markDoctorAsReceived:', err);
                }
              }}
              doctorReceived={locationTracking.doctorReceived}
              onExtend={() => {
                locationTracking.extendWaitingTimer();
                Alert.alert(
                  'Waiting Time Extended',
                  'You have extended the waiting time by 5 more minutes.',
                  [{ text: 'OK' }]
                );
              }}
              onCancel={() => {
                Alert.alert(
                  'Cancel Visit',
                  'Are you sure you want to cancel this visit? This action cannot be undone.',
                  [
                    { text: 'No', style: 'cancel' },
                    { 
                      text: 'Yes, Cancel', 
                      style: 'destructive',
                      onPress: async () => {
                        const success = await locationTracking.cancelVisitAfterWaiting();
                        if (success) {
                          Alert.alert(
                            'Visit Cancelled',
                            'The visit has been cancelled due to patient unavailability.',
                            [{ text: 'OK', onPress: () => navigation.goBack() }]
                          );
                        } else {
                          Alert.alert('Error', 'Could not cancel the visit. Please try again.');
                        }
                      }
                    }
                  ]
                );
              }}
            />
          ) : locationTracking.doctorReceived ? (
            <View style={styles.visitInProgressContainer}>
              {renderPatientInfoHeader()}
              <Text style={[styles.arrivedText, { fontSize: 18, fontWeight: 'bold', marginBottom: 15 }]}>{language === 'ur' ? urduText.treatment_in_progress : 'Treatment in Progress'}</Text>
              <Text style={[styles.arrivedText, { marginBottom: 20 }]}>{language === 'ur' ? urduText.patient_received : 'Patient has received you. Select an option below:'}</Text>
              
              {/* Treatment options */}
              <View style={styles.treatmentOptionsContainer}>
                <TouchableOpacity 
                  style={[styles.treatmentButton, { backgroundColor: colors.primary, marginTop: 10 }]}
                  onPress={() => {
                    navigation.navigate('WritePrescription', { 
                      visitId: activeMatchId,
                      patientId: activePatientId,
                      patientName: selectedPatient?.patientName || 'Patient'
                    });
                  }}
                >
                  <Ionicons name="document-text-outline" size={24} color={colors.buttonText} />
                  <Text style={[styles.treatmentButtonText, { color: colors.buttonText, fontWeight: 'bold', fontSize: 16 }]}>{language === 'ur' ? urduText.write_prescription : 'Write Prescription'}</Text>
                  <Text style={[styles.treatmentButtonSubText, { color: colors.buttonText }]}>{language === 'ur' ? urduText.set_reminders : 'Set medicine reminders'}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.treatmentButton, { backgroundColor: colors.success, marginTop: 10 }]}
                  onPress={() => {
                    Alert.alert(
                      language === 'ur' ? urduText.end_visit : 'End Visit',
                      language === 'ur' ? urduText.end_visit_confirm : 'Are you sure you want to end this visit? This will mark the treatment as complete.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: language === 'ur' ? urduText.end_visit : 'End Visit', 
                          onPress: async () => {
                            try {
                              console.log('[DoctorMapScreen] Ending visit for matchId:', activeMatchId);
                              // Update the visit status in Firestore
                              const visitRef = doc(db, 'doctorPatientMatches', activeMatchId);
                              await updateDoc(visitRef, {
                                status: 'completed',
                                completedAt: serverTimestamp(),
                                lastUpdated: serverTimestamp()
                              });
                              console.log('[DoctorMapScreen] Successfully updated Firestore with status: completed');
                              
                              // Get the request ID associated with this match
                              const matchDoc = await getDoc(visitRef);
                              if (matchDoc.exists() && matchDoc.data().requestId) {
                                const requestId = matchDoc.data().requestId;
                                // Complete the patient request to ensure it's properly archived
                                await completePatientRequest(requestId);
                                console.log('Successfully completed patient request:', requestId);
                              }
                              
                              // Stop location tracking
                              locationTracking.stopLocationTracking();
                              
                              // Reset local state
                              setIsVisitActive(false);
                              setActiveMatchId(null);
                              setActivePatientId(null);
                              setActivePatientInfo(null);
                              setDoctorHasReached(false);
                              
                              // Ensure polling continues for new patient requests
                              if (isOnline && !pollingInterval.current) {
                                console.log('Restarting polling for patient requests after visit ended');
                                startPollingForPatients();
                              }
                              
                              setShowRatingModal(true);
                              setLastCompletedVisitId(activeMatchId);
                            } catch (error) {
                              console.error('Error ending visit:', error);
                              Alert.alert('Error', 'Could not end the visit. Please try again.');
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Ionicons name="checkmark-circle-outline" size={24} color={colors.buttonText} />
                  <Text style={[styles.treatmentButtonText, { color: colors.buttonText, fontWeight: 'bold', fontSize: 16 }]}>{language === 'ur' ? urduText.complete_treatment : 'Complete Treatment'}</Text>
                  <Text style={[styles.treatmentButtonSubText, { color: colors.buttonText }]}>{language === 'ur' ? urduText.set_reminders : 'Set medicine reminders'}</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={[styles.communicationButton, { backgroundColor: colors.info, marginTop: 10 }]}
                onPress={() => {
                  navigation.navigate('Chat', { requestId: activeMatchId });
                }}
              >
                <Text style={[styles.communicationButtonText, { color: colors.buttonText }]}>{language === 'ur' ? urduText.chat : 'Continue to Chat'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.waitingForPatientContainer}>
              {renderPatientInfoHeader()}
              <Text style={styles.arrivedText}>You have arrived at the patient's location</Text>
              
              <TouchableOpacity 
                style={[styles.receivedButton, { backgroundColor: colors.success, marginTop: 10 }]}
                onPress={async () => {
                  console.log(`=== "I Have Been Received" Button Pressed ===`);
                  console.log(`Doctor screen: activeMatchId = ${activeMatchId}`);
                  console.log(`Doctor screen: locationTracking.activeVisitId = ${locationTracking.activeVisitId}`);
                  console.log(`Doctor screen: locationTracking.doctorReceived = ${locationTracking.doctorReceived}`);
                  console.log(`Doctor screen: locationTracking.doctorHasReached = ${locationTracking.doctorHasReached}`);
                  
                  // Ensure context has the correct activeVisitId before marking as received
                  if (locationTracking.activeVisitId !== activeMatchId && locationTracking.setActiveVisitId) {
                    console.log(`Setting activeVisitId from ${locationTracking.activeVisitId} to ${activeMatchId}`);
                    locationTracking.setActiveVisitId(activeMatchId);
                    
                    // Add a small delay to ensure the state is updated
                    console.log(`Waiting 100ms for state update...`);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    console.log(`After delay: locationTracking.activeVisitId = ${locationTracking.activeVisitId}`);
                  }
                  
                  console.log(`Calling markDoctorAsReceived with activeVisitId: ${locationTracking.activeVisitId}`);
                  const result = await locationTracking.markDoctorAsReceived();
                  console.log(`markDoctorAsReceived result: ${result}`);
                  // If context method fails, try direct Firestore update
                  if (!result) {
                    console.log(`Context method failed, trying direct Firestore update`);
                    const directResult = await updateDoctorReceivedDirectly(activeMatchId);
                    console.log(`Direct update result: ${directResult}`);
                  }
                  // Force a re-render after the update
                  console.log(`Forcing re-render...`);
                  setForceUpdate(prev => prev + 1);
                  // FORCE manual sync from Firestore to ensure all listeners update
                  if (typeof locationTracking.forceSyncFromFirestore === 'function') {
                    console.log('Calling forceSyncFromFirestore after doctor has been received button press');
                    await locationTracking.forceSyncFromFirestore();
                  }
                  console.log(`=== Button Press Complete ===`);
                  
                  Alert.alert(
                    'Visit Started',
                    'You have confirmed that the patient has received you. Your visit will now begin.',
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Text style={styles.receivedButtonText}>I Have Been Received</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Communication buttons */}
          <View style={styles.communicationContainer}>
            <TouchableOpacity 
              style={[styles.communicationButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (activeMatchId) {
                  navigation.navigate('Chat', { requestId: activeMatchId });
                } else {
                  Alert.alert('Chat not available', 'Chat will be available once you start the visit.');
                }
              }}
            >
              <Text style={[styles.communicationButtonText, { color: colors.buttonText }]}>{language === 'ur' ? urduText.chat : 'Chat with Patient'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.communicationButton, { backgroundColor: colors.success }]}
              onPress={() => {
                // Get patient's phone number from the match details
                if (activePatientId) {
                  // Try to get patient phone from database
                  getDoc(doc(db, 'users', activePatientId))
                    .then((docSnap) => {
                      if (docSnap.exists() && docSnap.data().phoneNumber) {
                        Linking.openURL(`tel:${docSnap.data().phoneNumber}`);
                      } else {
                        Alert.alert('Phone number not available', 'The patient\'s phone number is not available.');
                      }
                    })
                    .catch(error => {
                      console.error('Error getting patient phone:', error);
                      Alert.alert('Error', 'Could not retrieve patient\'s phone number.');
                    });
                } else {
                  Alert.alert('Phone call not available', 'Phone call will be available once you start the visit.');
                }
              }}
            >
              <Text style={[styles.communicationButtonText, { color: colors.buttonText }]}>{language === 'ur' ? urduText.call_patient : 'Call Patient'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };
  
  // Handle rejecting a patient request
  const rejectPatientRequest = () => {
    if (!selectedPatient) return;
    setDeclinedRequestIds(prev => [...prev, selectedPatient.id]);
    
    Alert.alert(
      'Confirm Rejection',
      `Are you sure you want to reject ${selectedPatient.name}'s request?`,
      [
        {
          text: 'Yes',
          onPress: () => {
            // Remove this patient from the list
            setPatientRequests(prev => 
              prev.filter(p => p.id !== selectedPatient.id)
            );
            setSelectedPatient(null);
            setShowPatientDetails(false);
          }
        },
        {
          text: 'No',
          style: 'cancel'
        }
      ]
    );
  };

  // Render patient details card
  const renderPatientDetails = () => {
    if (!selectedPatient) return null;
    return (
      <View style={styles.patientDetailsCard}>
        <Text style={styles.patientName}>{selectedPatient.name}, {selectedPatient.age}</Text>
        <Text style={styles.patientDistance}>{selectedPatient.distance} {language === 'ur' ? urduText.distance : 'away'}</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{language === 'ur' ? urduText.symptoms : 'Symptoms:'}</Text>
          <Text style={styles.detailValue}>{language === 'ur' ? translateDynamic(selectedPatient.symptoms) : selectedPatient.symptoms}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{language === 'ur' ? urduText.description : 'Description:'}</Text>
          <Text style={styles.detailValue}>{selectedPatient.description}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{language === 'ur' ? urduText.agreed_price : 'Agreed Price:'}</Text>
          <Text style={[styles.detailValue, { color: '#34C759', fontWeight: 'bold' }]}>${selectedPatient.agreedPrice ? selectedPatient.agreedPrice.toFixed(2) : '0.00'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{language === 'ur' ? urduText.enter_fee : 'Enter Your Fee (1500-2500):'}</Text>
        </View>
        <View style={{ marginBottom: 8 }}>
          <Input
            placeholder={language === 'ur' ? urduText.enter_fee_placeholder : 'Enter fee'}
            value={doctorFee}
            onChangeText={text => {
              setDoctorFee(text.replace(/[^0-9.]/g, ''));
              setFeeError('');
            }}
            keyboardType="numeric"
            error={feeError}
          />
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton, { opacity: (parseFloat(doctorFee) >= 1500 && parseFloat(doctorFee) <= 2500) ? 1 : 0.5 }]}
            onPress={acceptPatientRequest}
            disabled={!(parseFloat(doctorFee) >= 1500 && parseFloat(doctorFee) <= 2500)}
          >
            <Text style={styles.actionButtonText}>{language === 'ur' ? urduText.accept_request : 'Accept Request'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { flex: 1, marginLeft: 8, borderRadius: 8, paddingVertical: 14, backgroundColor: '#FF3B30' }]}
            onPress={rejectPatientRequest}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{language === 'ur' ? urduText.reject : 'Reject'}</Text>
          </TouchableOpacity>
        </View>
        {selectedPatient.attachedImage && (
          <TouchableOpacity
            style={{ backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 10, marginVertical: 8, alignItems: 'center' }}
            onPress={() => setImageModalVisible(true)}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{language === 'ur' ? urduText.view_image : 'View Image'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => { setShowPatientDetails(false); setDoctorFee(''); }}
        >
          <Text style={styles.closeButtonText}>{language === 'ur' ? urduText.close : 'Close'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render patient request item
  const renderPatientRequestItem = ({ item }) => {
    console.log('Rendering patient card:', item.name, 'patientId:', item.patientId, 'rating:', patientRatings[item.patientId], 'attachedImage:', item.attachedImage);
    return (
      <Card
        variant="elevated"
        elevation={3}
        style={styles.modernPatientCard}
        onPress={() => {
          setSelectedPatient(item);
          setShowPatientDetails(true);
        }}
      >
        <View style={styles.modernPatientHeader}>
          <View style={styles.modernPatientInfo}>
            <View style={styles.modernPatientAvatar}>
              {patientProfilePictures[item.patientId] ? (
                <Image source={{ uri: patientProfilePictures[item.patientId] }} style={styles.modernPatientProfileImage} />
              ) : (
                <LinearGradient
                  colors={[colors.primary + '40', colors.primary + '20']}
                  style={styles.modernAvatarGradient}
                >
                  <Text
                    variant="subheading"
                    size="lg"
                    weight="bold"
                    color={colors.primary}
                    style={styles.modernAvatarText}
                  >
                    {item.name ? item.name.charAt(0).toUpperCase() : 'P'}
                  </Text>
                </LinearGradient>
              )}
            </View>
            <View>
              <Text
                variant="subheading"
                weight="semibold"
                color={colors.text}
                style={styles.modernPatientName}
              >
                {item.name}
                {item.patientId && (
                  <Text style={{ marginLeft: 8, fontSize: 14, color: '#FFD700', fontWeight: 'bold' }}>
                    <Ionicons name="star" size={14} color="#FFD700" /> {patientRatings[item.patientId] || 'No ratings'}
                  </Text>
                )}
              </Text>
              <View style={styles.modernPatientMeta}>
                <Ionicons name="location-outline" size={14} color={colors.primary} />
                <Text
                  variant="caption"
                  color={colors.textSecondary}
                  style={styles.modernPatientDistance}
                >
                  {item.distance} {language === 'ur' ? urduText.distance : ''}
                </Text>
                <Ionicons name="time-outline" size={14} color={colors.textSecondary} style={{ marginLeft: 8 }} />
                <Text
                  variant="caption"
                  color={colors.textSecondary}
                  style={styles.modernPatientEta}
                >
                  {item.eta || (language === 'ur' ? 'حساب ہو رہا ہے...' : 'Calculating...')}
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.modernPriceTag, { backgroundColor: colors.success + '15' }]}> 
            <Text
              variant="body"
              weight="bold"
              color={colors.success}
              style={styles.modernPrice}
            >
              1500-2500
            </Text>
          </View>
        </View>
        {/* Show attached image thumbnail if present */}
        {item.attachedImage && (
          <TouchableOpacity
            style={{ alignSelf: 'flex-start', marginTop: 8, marginBottom: 4, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}
            onPress={() => {
              setSelectedPatient(item);
              setTimeout(() => setImageModalVisible(true), 0); // Ensure state updates before opening modal
            }}
          >
            <Image source={{ uri: item.attachedImage }} style={{ width: 64, height: 64, borderRadius: 8 }} resizeMode="cover" />
          </TouchableOpacity>
        )}
        <View style={[styles.modernSymptomContainer, { borderLeftColor: colors.primary }]}> 
          <Text
            variant="label"
            color={colors.textSecondary}
            style={styles.modernSymptomLabel}
          >
            {language === 'ur' ? urduText.symptoms : 'Symptoms:'}
          </Text>
          <Text
            variant="body"
            color={colors.text}
            style={styles.modernSymptomText}
          >
            {language === 'ur' ? translateDynamic(item.symptoms) : item.symptoms}
          </Text>
        </View>
        <View style={styles.modernActionButtons}>
          <TouchableOpacity
            style={[
              styles.modernAcceptButton,
              { backgroundColor: colors.primary, flex: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }
            ]}
            onPress={() => {
              setSelectedPatient(item);
              setShowPatientDetails(true);
            }}
          >
            <Ionicons name="eye-outline" size={16} color={colors.buttonText} style={{ marginRight: 6 }} />
            <Text
              variant="body"
              size="sm"
              weight="bold"
              color={colors.buttonText}
              style={styles.modernButtonText}
            >
              {language === 'ur' ? urduText.view_details : 'View Details'}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  // 1. Add a function to get detailed address:
  const getDetailedAddress = async (coordinates) => {
    try {
      const addresses = await Location.reverseGeocodeAsync(coordinates);
      if (addresses.length > 0) {
        const address = addresses[0];
        const addressComponents = [
          address.name,
          address.streetNumber,
          address.street,
          address.district,
          address.subregion,
          address.city,
          address.region,
          address.postalCode,
          address.country
        ].filter(Boolean);
        setPatientAddressDetails(addressComponents.join(', '));
      }
    } catch (error) {
      setPatientAddressDetails('');
    }
  };

  // 2. When selectedPatient or patientLocation changes, fetch address if not present:
  useEffect(() => {
    if (selectedPatient && patientLocation) {
      if (selectedPatient.addressDetails) {
        setPatientAddressDetails(selectedPatient.addressDetails);
      } else {
        getDetailedAddress(patientLocation);
      }
    }
  }, [selectedPatient, patientLocation]);

  // Add this useEffect to start polling only when both isOnline and location are set
  useEffect(() => {
    if (isOnline && location) {
      startPollingForPatients();
    }
  }, [isOnline, location]);

  // Add this useEffect after patientRequests state is updated
  useEffect(() => {
    // Clean up listeners for requests that are no longer present
    Object.keys(requestListenersRef.current).forEach((requestId) => {
      if (!patientRequests.find((r) => r.id === requestId)) {
        requestListenersRef.current[requestId](); // unsubscribe
        delete requestListenersRef.current[requestId];
      }
    });

    // Set up listeners for new requests
    patientRequests.forEach((request) => {
      if (!requestListenersRef.current[request.id]) {
        const unsubscribe = listenToPatientRequest(request.id, (updatedRequest) => {
          if (!updatedRequest || updatedRequest.status === 'cancelled') {
            setPatientRequests((prev) => prev.filter((r) => r.id !== request.id));
            // Also close details modal if the selected patient is this one
            setSelectedPatient((prev) => (prev && prev.id === request.id ? null : prev));
          }
        });
        requestListenersRef.current[request.id] = unsubscribe;
      }
    });

    // Cleanup on unmount
    return () => {
      Object.values(requestListenersRef.current).forEach((unsubscribe) => unsubscribe());
      requestListenersRef.current = {};
    };
  }, [patientRequests]);

  // Move translateDynamic inside the component to access language
  function translateDynamic(val) {
    if (language === 'ur' && typeof val === 'string') {
      const key = val.trim().toLowerCase();
      return urduDynamic[key] || val;
    }
    return val;
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        <Text 
          variant="body" 
          size="md" 
          color={colors.text} 
          style={styles.loadingText}
        >
          {language === 'ur' ? 'آپ کا مقام حاصل کیا جا رہا ہے...' : 'Getting your location...'}
        </Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text 
          variant="body" 
          size="md" 
          color={colors.error} 
          style={styles.errorText}
        >
          {errorMsg}
        </Text>
        <Button
          variant="primary"
          size="medium"
          onPress={() => navigation.goBack()}
          style={styles.retryButton}
        >
          {language === 'ur' ? 'واپس جائیں' : 'Go Back'}
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {location && (
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          region={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
          customMapStyle={isDarkMode ? darkMapStyle : lightMapStyle}
          showsBuildings={true}
          showsTraffic={true}
          showsIndoors={true}
          showsCompass={true}
          showsScale={true}
        >
          {/* User's location marker */}
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title="Your Location"
            pinColor="blue"
          />
          
          {/* Service radius circle */}
          <Circle
            center={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            radius={5000} // 5km radius
            strokeWidth={1}
            strokeColor={colors.primary + '80'}
            fillColor={colors.primary + '20'}
          />
          
          {/* Patient request markers - only show when visit is NOT active */}
          {!isVisitActive && patientRequests.map(patient => (
            <Marker
              key={patient.id}
              coordinate={patient.location}
              title={patient.name}
              description={`${patient.symptoms} - ${patient.distance} away`}
              pinColor="red"
              onPress={() => {
                setSelectedPatient(patient);
                setShowPatientDetails(true);
              }}
            />
          ))}
          
          {/* Patient location marker when visit is active */}
          {isVisitActive && patientLocation && (
            <Marker
              coordinate={patientLocation}
              title="Patient Location"
              pinColor="red"
            />
          )}
          
          {/* Route line from doctor to patient */}
          {isVisitActive && routeCoordinates.length > 0 && (
            <>
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
      
      {/* Render the Google Maps style tracking UI when a visit is active */}
      {isVisitActive && renderTrackingUI()}
      
      {/* Modern location confirmation and online status card - hide when visit is active */}
      {!isVisitActive && (
        <Card
          variant="elevated"
          elevation={4}
          style={styles.modernStatusCard}
        >
          <LinearGradient
            colors={[colors.primary, isDarkMode ? '#1A3A5A' : '#4D94FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modernStatusHeader}
          >
            <Text
              variant="heading"
              size="lg"
              weight="bold"
              color={colors.buttonText}
              style={styles.modernStatusTitle}
            >
              {isOnline
                ? (language === 'ur' ? urduText.online + ' ' + 'ہیں آپ' : 'You are online')
                : (language === 'ur' ? 'مریض تلاش کرنے کے لیے آن لائن جائیں' : 'Go online to find patients')}
            </Text>
          </LinearGradient>
          
          <View style={styles.modernStatusContent}>
            <View style={styles.modernStatusRow}>
              <View style={styles.modernLocationContainer}>
                <Ionicons name="location" size={22} color={colors.primary} />
                <Text
                  variant="body"
                  size="md"
                  weight="medium"
                  color={colors.text}
                  style={styles.modernLocationText}
                >
                  {location ? (language === 'ur' ? urduText.location_confirmed : 'Location confirmed') : (language === 'ur' ? 'مقام کی تصدیق کریں' : 'Confirm location')}
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.modernToggleButton, { backgroundColor: isOnline ? colors.success : colors.primary }]}
                onPress={location ? toggleOnlineStatus : confirmLocation}
              >
                <Ionicons 
                  name={location ? (isOnline ? "power" : "power-outline") : "location-outline"} 
                  size={18} 
                  color={colors.buttonText} 
                />
                <Text
                  variant="body"
                  size="sm"
                  weight="bold"
                  color={colors.buttonText}
                  style={styles.modernToggleText}
                >
                  {location ? (isOnline ? 'Online' : 'Go Online') : 'Confirm Location'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {isOnline && (
              <View style={styles.modernRequestsInfo}>
                <Text
                  variant="caption"
                  color={colors.textSecondary}
                  style={styles.modernRequestsCount}
                >
                  {patientRequests.length > 0 
                    ? `${patientRequests.length} patient request${patientRequests.length !== 1 ? 's' : ''} available` 
                    : 'No patient requests available'}
                </Text>
                {patientRequests.length > 0 && (
                  <TouchableOpacity
                    style={[styles.modernViewButton, { borderColor: colors.primary }]}
                    onPress={() => setShowRequestsList(!showRequestsList)}
                  >
                    <Text
                      variant="body"
                      size="sm"
                      weight="medium"
                      color={colors.primary}
                      style={styles.modernViewText}
                    >
                      {showRequestsList ? 'Hide Requests' : 'View Requests'}
                    </Text>
                    <Ionicons 
                      name={showRequestsList ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color={colors.primary} 
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </Card>
      )}
      
      {/* Patient requests list - hide when visit is active */}
      {!isVisitActive && isOnline && showRequestsList && patientRequests.length > 0 && (
        <Card
          variant="elevated"
          elevation={4}
          style={styles.modernRequestsList}
        >
          <Text
            variant="heading"
            size="lg"
            weight="semibold"
            color={colors.text}
            style={styles.modernRequestsTitle}
          >
            Patient Requests
          </Text>
          
          <FlatList
            data={patientRequests}
            renderItem={renderPatientRequestItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modernRequestsContent}
            showsVerticalScrollIndicator={false}
          />
        </Card>
      )}
      
      {/* Patient details modal */}
      {showPatientDetails && selectedPatient && (
        <Card
          variant="elevated"
          elevation={5}
          style={[
            styles.patientDetailsCard,
            {
              zIndex: 999,
              elevation: 10,
              borderRadius: 18,
              padding: 0,
              marginHorizontal: 10,
              marginTop: 30,
              overflow: 'hidden',
            },
          ]}
        >
          <LinearGradient
            colors={[colors.primary, isDarkMode ? '#1A3A5A' : '#4D94FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 48, height: 48, borderRadius: 24, backgroundColor: colors.buttonText + '22',
                alignItems: 'center', justifyContent: 'center', marginRight: 14,
              }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.buttonText }}>
                  {selectedPatient.name ? selectedPatient.name.charAt(0).toUpperCase() : 'P'}
                </Text>
              </View>
              <View>
                <Text style={{ color: colors.buttonText, fontSize: 20, fontWeight: 'bold' }}>{selectedPatient.name}</Text>
                <Text style={{ color: colors.buttonText, fontSize: 14, opacity: 0.8 }}>{selectedPatient.distance} {language === 'ur' ? urduText.distance : 'away'}</Text>
              </View>
            </View>
            <Button
              variant="text"
              size="small"
              icon="close-circle"
              iconPosition="right"
              onPress={() => { setShowPatientDetails(false); setDoctorFee(''); }}
              textStyle={{ color: colors.buttonText }}
              style={styles.closeButton}
            >
              Close
            </Button>
          </LinearGradient>
          <ScrollView style={{ padding: 20 }}>
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Ionicons name="medkit-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{language === 'ur' ? urduText.symptoms : 'Symptoms'}</Text>
              </View>
              <Text style={{ fontSize: 15, color: colors.textSecondary, marginLeft: 28 }}>{language === 'ur' ? translateDynamic(selectedPatient.symptoms) : selectedPatient.symptoms}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 8 }} />
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Ionicons name="location-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{language === 'ur' ? urduText.patient_address : 'Patient Address'}</Text>
              </View>
              <Text style={{ fontSize: 15, color: colors.textSecondary, marginLeft: 28 }}>{selectedPatient.addressDetails || patientAddressDetails || 'Not provided'}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 8 }} />
            <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="pricetag-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{language === 'ur' ? urduText.agreed_price : 'Agreed Price'}</Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#34C759' }}>1500-2500</Text>
            </View>
            <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 8 }} />
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 6 }}>{language === 'ur' ? urduText.enter_fee : 'Enter Your Fee (1500-2500):'}</Text>
              <Input
                placeholder={language === 'ur' ? urduText.enter_fee_placeholder : 'Enter fee'}
                value={doctorFee}
                onChangeText={text => {
                  setDoctorFee(text.replace(/[^0-9.]/g, ''));
                  setFeeError('');
                }}
                keyboardType="numeric"
                error={feeError}
                style={{ marginBottom: 0 }}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 }}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.acceptButton,
                  {
                    flex: 1,
                    marginRight: 8,
                    opacity: (parseFloat(doctorFee) >= 1500 && parseFloat(doctorFee) <= 2500) ? 1 : 0.5,
                    borderRadius: 8,
                    paddingVertical: 14,
                  },
                ]}
                onPress={acceptPatientRequest}
                disabled={!(parseFloat(doctorFee) >= 1500 && parseFloat(doctorFee) <= 2500)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{language === 'ur' ? urduText.accept_request : 'Accept Request'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    flex: 1,
                    marginLeft: 8,
                    borderRadius: 8,
                    paddingVertical: 14,
                    backgroundColor: '#FF3B30', // solid red
                  },
                ]}
                onPress={rejectPatientRequest}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{language === 'ur' ? urduText.reject : 'Reject'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Card>
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
                {language === 'ur' ? urduText.rate_patient : 'Rate the Patient'}
              </Text>
              <StarRating
                rating={patientRating}
                onChange={setPatientRating}
                starSize={36}
                maxStars={5}
                color={colors.primary}
              />
              <TouchableOpacity
                style={[styles.ratingModalButton, { backgroundColor: colors.success }]}
                onPress={async () => {
                  if (lastCompletedVisitId && patientRating > 0) {
                    await saveRating(lastCompletedVisitId, 'patient', patientRating, currentUser?.uid);
                    refreshRatings();
                    Alert.alert(
                      language === 'ur' ? urduText.rating_submitted : 'Rating Submitted',
                      language === 'ur' ? `${urduText.patient_rating}: ${patientRating}` : `Patient rating: ${patientRating} for match: ${lastCompletedVisitId}`
                    );
                  }
                  setShowRatingModal(false);
                  setPatientRating(0);
                  setLastCompletedVisitId(null);
                  navigation.goBack();
                }}
                disabled={patientRating === 0}
              >
                <Text style={[styles.ratingModalButtonText, { color: colors.buttonText }]}> 
                  {language === 'ur' ? urduText.submit_rating : 'Submit Rating'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      <Modal
        visible={imageModalVisible && !!selectedPatient?.attachedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 40, right: 20, zIndex: 2 }} onPress={() => setImageModalVisible(false)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          <Image
            source={{ uri: selectedPatient?.attachedImage }}
            style={{ width: 320, height: 320, borderRadius: 12, borderWidth: 2, borderColor: '#fff' }}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  // Modern UI styles
  modernStatusCard: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 10,
  },
  modernStatusHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  modernStatusTitle: {
    textAlign: 'center',
  },
  modernStatusContent: {
    padding: 16,
  },
  modernStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernLocationText: {
    marginLeft: 8,
  },
  modernToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modernToggleText: {
    marginLeft: 6,
  },
  modernRequestsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  modernRequestsCount: {
    fontSize: 14,
  },
  modernViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  modernViewText: {
    marginRight: 4,
  },
  modernRequestsList: {
    position: 'absolute',
    top: 140,
    left: 16,
    right: 16,
    maxHeight: '60%',
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 10,
  },
  modernRequestsTitle: {
    padding: 16,
    paddingBottom: 8,
  },
  modernRequestsContent: {
    padding: 8,
  },
  modernPatientCard: {
    marginBottom: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  modernPatientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  modernPatientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernPatientAvatar: {
    marginRight: 12,
  },
  modernAvatarGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernAvatarText: {
    fontSize: 18,
  },
  modernPatientName: {
    marginBottom: 2,
  },
  modernPatientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  modernPatientDistance: {
    marginLeft: 4,
  },
  modernPatientEta: {
    marginLeft: 4,
  },
  modernPriceTag: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  modernPrice: {
    fontSize: 16,
  },
  modernSymptomContainer: {
    padding: 12,
    paddingTop: 0,
    borderLeftWidth: 3,
    marginLeft: 12,
  },
  modernSymptomLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  modernSymptomText: {
    fontSize: 14,
  },
  modernActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    paddingTop: 8,
  },
  modernAcceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  modernRejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  modernButtonText: {
    marginLeft: 6,
  },
  treatmentOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  treatmentButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginHorizontal: 5,
  },
  treatmentButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  treatmentButtonSubText: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
  },
  visitInProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  waitingForPatientContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  receivedButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
  },
  receivedButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  communicationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  communicationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  communicationButtonText: {
    marginLeft: 5,
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Tracking UI styles
  trackingContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    zIndex: 10,
  },
  googleMapsEtaCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  etaHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  etaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  openGoogleMapsButton: {
    backgroundColor: colors.inputBackground,
    borderRadius: 4,
    padding: 4,
  },
  openGoogleMapsButtonText: {
    color: colors.primary,
    fontSize: 12,
  },
  etaDetailsContainer: {
    marginBottom: 12,
  },
  etaDuration: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  etaDistance: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  directionsContainer: {
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  nextDirectionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  nextDirectionText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  nextDirectionDistance: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  arrivedButton: {
    backgroundColor: '#1A73E8',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
  },
  arrivedButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cancelVisitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    padding: 12,
    marginTop: 8,
  },
  cancelVisitButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  arrivedText: {
    color: '#34A853',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
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
  directionsTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  directionsText: {
    fontSize: 14,
    marginBottom: 10,
  },
  openMapsButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignSelf: 'center',
  },
  openMapsButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  modernStatusContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  statusHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  statusHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusContent: {
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: 6,
  },
  locationText: {
    fontSize: 14,
  },
  modernActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modernActionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  patientRequestsContainer: {
    position: 'absolute',
    top: 80,
    left: 10,
    right: 10,
    maxHeight: '70%',
    borderRadius: 10,
    padding: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 20,
    display: 'flex',
    backgroundColor: '#FFFFFF',
  },
  patientRequestsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  patientRequestsScroll: {
    maxHeight: '90%',
  },
  noRequestsText: {
    textAlign: 'center',
    marginVertical: 20,
    fontStyle: 'italic',
  },
  patientRequestCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  patientRequestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  patientDetailsCard: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    elevation: 5,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 30,
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  declineButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    color: colors.buttonText,
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    padding: 5,
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  patientRequestName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  patientRequestDistance: {
    fontSize: 14,
    fontWeight: '500',
  },
  patientRequestDetails: {
    marginBottom: 12,
  },
  symptomsContainer: {
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
    marginVertical: 5,
  },
  patientRequestLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  patientRequestValue: {
    fontSize: 15,
    lineHeight: 20,
  },
  patientRequestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  patientRequestButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    elevation: 2,
  },
  patientProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  patientProfilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#eee',
  },
  patientProfilePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#eee',
  },
  patientProfileInitial: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  patientNameContainer: {
    flex: 1,
  },
  requestPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: '#f0fff0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    color: '#4CAF50',
  },
  attachedImageContainer: {
    marginVertical: 10,
    borderRadius: 8,
    overflow: 'hidden',
    height: 180,
    borderWidth: 1,
    borderColor: '#eee',
  },
  etaInfoContainer: {
    backgroundColor: '#f0f7ff',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0066CC',
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachedImage: {
    width: '100%',
    height: '100%',
  },
  confirmLocationButton: {
    marginVertical: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  confirmLocationButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  viewRequestsButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  viewRequestsButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  patientRequestsContainer: {
    position: 'absolute',
    top: 80,
    left: 10,
    right: 10,
    maxHeight: '70%',
    borderRadius: 10,
    padding: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 20,
    display: 'flex',
    backgroundColor: '#FFFFFF',
  },
  patientRequestsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  patientRequestsScroll: {
    maxHeight: '90%',
  },
  noRequestsText: {
    textAlign: 'center',
    marginVertical: 20,
    fontStyle: 'italic',
  },
  patientRequestCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  patientRequestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  patientDetailsCard: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    elevation: 5,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 30,
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  declineButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    color: colors.buttonText,
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    padding: 5,
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  patientRequestName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  patientRequestDistance: {
    fontSize: 14,
    fontWeight: '500',
  },
  patientRequestDetails: {
    marginBottom: 12,
  },
  symptomsContainer: {
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
    marginVertical: 5,
  },
  patientRequestLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  patientRequestValue: {
    fontSize: 15,
    lineHeight: 20,
  },
  patientRequestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  patientRequestButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    elevation: 2,
  },
  patientProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  patientProfilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#eee',
  },
  patientProfilePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#eee',
  },
  patientProfileInitial: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  patientNameContainer: {
    flex: 1,
  },
  requestPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: '#f0fff0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    color: '#4CAF50',
  },
  attachedImageContainer: {
    marginVertical: 10,
    borderRadius: 8,
    overflow: 'hidden',
    height: 180,
    borderWidth: 1,
    borderColor: '#eee',
  },
  statusContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    borderRadius: 10,
    padding: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10
  },
  toggleLabel: {
    marginHorizontal: 10,
    fontSize: 14
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10
  },
  detailsContent: {
    maxHeight: 300
  },
  detailsSection: {
    marginBottom: 15
  },
  detailsLabel: {
    fontSize: 14,
    marginBottom: 5
  },
  detailsValue: {
    fontSize: 16
  },
  detailsName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15
  },
  detailsActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15
  },
  detailsActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5
  },
  detailsActionButtonText: {
    fontWeight: 'bold',
    fontSize: 15
  },
  loader: {
    marginBottom: 20
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  modernPatientProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
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

export default DoctorMapScreen;
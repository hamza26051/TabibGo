import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { db } from '../firebase/config';
import { doc, updateDoc, onSnapshot, getDoc, serverTimestamp } from 'firebase/firestore';
import { completePatientRequest, cancelPatientRequest, markDoctorAsReached, markDoctorAsReceived } from '../firebase/patientDoctorMatching';
import { auth } from '../firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create the location tracking context
const LocationTrackingContext = createContext();

// Custom hook to use the location tracking context
export const useLocationTracking = () => {
  const context = useContext(LocationTrackingContext);
  if (!context) {
    throw new Error('useLocationTracking must be used within a LocationTrackingProvider');
  }
  return context;
};

// Provider component that wraps the app and provides location tracking context
export const LocationTrackingProvider = ({ children }) => {
  // State for tracking active visit
  const [activeVisitId, setActiveVisitId] = useState(null);
  const [doctorLocation, setDoctorLocation] = useState(null);
  const [patientLocation, setPatientLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [doctorHasReached, setDoctorHasReached] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [firestoreUnsubscribe, setFirestoreUnsubscribe] = useState(null);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [manualCheckInterval, setManualCheckInterval] = useState(null);
  
  // State for waiting timer
  const [waitingTimerActive, setWaitingTimerActive] = useState(false);
  const [waitingTimeRemaining, setWaitingTimeRemaining] = useState(300); // 5 minutes in seconds
  const [waitingTimerExtended, setWaitingTimerExtended] = useState(false);
  const [doctorReceived, setDoctorReceived] = useState(false);
  const [visitStatus, setVisitStatus] = useState(null); // Track visit status
  const [visitCompleted, setVisitCompleted] = useState(false);

  // Start tracking location for doctor
  const startDoctorLocationTracking = async (visitId, patientId) => {
    try {
      console.log(`Doctor side: Starting location tracking for visit ${visitId} with patient ${patientId}`);
      
      // Validate inputs
      if (!visitId || !patientId) {
        console.error('Missing required parameters for doctor location tracking');
        return false;
      }
      
      // Request location permissions if not already granted
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Location permission denied');
        return false;
      }

      // First, check if the visit document exists and get its current state
      const visitRef = doc(db, 'doctorPatientMatches', visitId);
      let visitDoc;
      
      try {
        visitDoc = await getDoc(visitRef);
        
        if (!visitDoc.exists()) {
          console.error(`Visit document ${visitId} does not exist`);
          return false;
        }
      } catch (error) {
        console.error(`Error fetching visit document ${visitId}:`, error);
        // Try one more time after a short delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          visitDoc = await getDoc(visitRef);
          if (!visitDoc.exists()) {
            console.error(`Visit document ${visitId} still does not exist after retry`);
            return false;
          }
        } catch (retryError) {
          console.error(`Error fetching visit document ${visitId} on retry:`, retryError);
          return false;
        }
      }
      
      const visitData = visitDoc.data();
      console.log(`Doctor side: Retrieved visit data for ${visitId}:`, {
        hasDocLocation: !!visitData.doctorLocation,
        hasPatLocation: !!visitData.patientLocation,
        doctorHasReached: visitData.doctorHasReached,
        status: visitData.status
      });
      
      // Set active visit ID first to ensure other functions have access to it
      setActiveVisitId(visitId);
      setIsTracking(true);
      setVisitStatus(null); // Reset visit status for new visit
      setVisitCompleted(false); // Reset visit completed state for new visit
      
      // Sync with existing Firestore state if available
      if (visitData.doctorHasReached) {
        console.log(`Doctor side: Doctor has already reached for visit ${visitId}, syncing state`);
        setDoctorHasReached(true);
        setWaitingTimerActive(visitData.waitingTimerActive || false);
        setWaitingTimerExtended(visitData.waitingTimerExtended || false);
        setDoctorReceived(visitData.doctorReceived || false);
        
        // Calculate remaining time based on reachedAt timestamp
        if (visitData.reachedAt) {
          const reachedAt = visitData.reachedAt.toDate ? visitData.reachedAt.toDate() : new Date(visitData.reachedAt);
          const currentTime = new Date();
          const elapsedSeconds = Math.floor((currentTime - reachedAt) / 1000);
          const remainingTime = visitData.waitingTimerExtended ? 600 - elapsedSeconds : 300 - elapsedSeconds;
          setWaitingTimeRemaining(Math.max(0, remainingTime));
        }
      } else {
        // Set default states
        setDoctorHasReached(false);
        setWaitingTimerActive(false);
        setWaitingTimerExtended(false);
        setDoctorReceived(false);
      }
      
      // If patient location is already available, set it
      if (visitData.patientLocation) {
        setPatientLocation(visitData.patientLocation);
      }

      // Start watching position
      console.log(`Doctor side: Starting location watch for visit ${visitId}`);
      let subscription;
      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10, // Update every 10 meters
            timeInterval: 5000, // Update every 5 seconds
          },
          (location) => {
            const { latitude, longitude } = location.coords;
            const newLocation = { latitude, longitude };
            setDoctorLocation(newLocation);

            // Update doctor's location in Firestore
            updateDoctorLocationInFirestore(visitId, newLocation);

            // Calculate ETA if we have patient location
            if (patientLocation) {
              calculateETA(newLocation, patientLocation);
            }
          }
        );

        setLocationSubscription(subscription);
      } catch (locationError) {
        console.error('Error starting location watch:', locationError);
        // Continue even if location watch fails - we can still listen to patient location
      }

      // Listen for patient location updates
      // Make sure to clean up any existing listeners first
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        setFirestoreUnsubscribe(null);
      }
      
      listenToPatientLocation(visitId, patientId);
      
      // Update visit status to 'in_progress' if it's not already
      try {
        if (visitData.status === 'accepted') {
          await updateDoc(visitRef, {
            status: 'in_progress',
            lastUpdated: serverTimestamp()
          });
          console.log(`Doctor side: Updated visit status to in_progress for ${visitId}`);
        }
      } catch (statusError) {
        console.error('Error updating visit status:', statusError);
        // Continue even if status update fails
      }
      
      console.log(`Doctor side: Successfully started location tracking for visit ${visitId}`);
      return true;
    } catch (error) {
      console.error('Error starting doctor location tracking:', error);
      return false;
    }
  };

  // Start tracking for patient (just listens to doctor location)
  const startPatientLocationTracking = async (visitId, doctorId, selectedLocation = null, requestId = null) => {
    try {
      console.log(`Patient side: Starting location tracking for visit ${visitId}`, {
        hasSelectedLocation: !!selectedLocation,
        doctorId,
        requestId
      });
      
      // Validate inputs
      if (!visitId || !doctorId) {
        console.error('Missing required parameters for patient location tracking');
        return false;
      }
      
      // Set active visit and request IDs first to ensure other functions have access to them
      setActiveVisitId(visitId);
      setActiveRequestId(requestId);
      setIsTracking(true);
      setVisitStatus(null); // Reset visit status for new visit
      setVisitCompleted(false); // Reset visit completed state for new visit
      
      // First, check if the visit document exists and get its current state
      const visitRef = doc(db, 'doctorPatientMatches', visitId);
      let visitDoc;
      
      try {
        visitDoc = await getDoc(visitRef);
        
        if (!visitDoc.exists()) {
          console.error(`Visit document ${visitId} does not exist`);
          return false;
        }
      } catch (error) {
        console.error(`Error fetching visit document ${visitId}:`, error);
        // Try one more time after a short delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          visitDoc = await getDoc(visitRef);
          if (!visitDoc.exists()) {
            console.error(`Visit document ${visitId} still does not exist after retry`);
            return false;
          }
        } catch (retryError) {
          console.error(`Error fetching visit document ${visitId} on retry:`, retryError);
          return false;
        }
      }
      
      const visitData = visitDoc.data();
      console.log(`Patient side: Retrieved visit data for ${visitId}:`, {
        hasDocLocation: !!visitData.doctorLocation,
        hasPatLocation: !!visitData.patientLocation,
        doctorHasReached: visitData.doctorHasReached,
        status: visitData.status
      });
      
      // Sync with existing Firestore state if available
      if (visitData.doctorHasReached) {
        console.log(`Patient side: Doctor has already reached for visit ${visitId}, syncing state`);
        setDoctorHasReached(true);
        setWaitingTimerActive(visitData.waitingTimerActive || true);
        setWaitingTimerExtended(visitData.waitingTimerExtended || false);
        setDoctorReceived(visitData.doctorReceived || false);
        
        // Calculate remaining time based on reachedAt timestamp
        if (visitData.reachedAt) {
          const reachedAt = visitData.reachedAt.toDate ? visitData.reachedAt.toDate() : new Date(visitData.reachedAt);
          const currentTime = new Date();
          const elapsedSeconds = Math.floor((currentTime - reachedAt) / 1000);
          const remainingTime = visitData.waitingTimerExtended ? 600 - elapsedSeconds : 300 - elapsedSeconds;
          setWaitingTimeRemaining(Math.max(0, remainingTime));
        }
      } else {
        // Set default states
        setDoctorHasReached(false);
        setWaitingTimerActive(false);
        setDoctorReceived(false);
      }
      
      // Manual check - directly query the document to see current state
      console.log(`Patient side: Manual check of visit ${visitId} state:`, {
        doctorHasReached: visitData.doctorHasReached,
        waitingTimerActive: visitData.waitingTimerActive,
        doctorReceived: visitData.doctorReceived,
        status: visitData.status,
        reachedAt: visitData.reachedAt
      });
      
      // If doctor location is already available, set it
      if (visitData.doctorLocation) {
        setDoctorLocation(visitData.doctorLocation);
      }

      // If a selected location was provided (from booking process), use that
      // Otherwise fall back to current GPS location
      let patientLoc;
      if (selectedLocation) {
        console.log('Patient side: Using selected location from booking:', selectedLocation);
        patientLoc = selectedLocation;
        setPatientLocation(patientLoc);
      } else if (visitData.patientLocation) {
        // Use existing patient location from Firestore if available
        console.log('Patient side: Using existing patient location from Firestore');
        patientLoc = visitData.patientLocation;
        setPatientLocation(patientLoc);
      } else {
        // Get patient's current location as fallback
        console.log('Patient side: Getting current location as fallback');
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
            patientLoc = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
            setPatientLocation(patientLoc);
          } else {
            console.error('Location permission denied');
            // Continue even without location permission - we can still track doctor
            patientLoc = null;
          }
        } catch (locationError) {
          console.error('Error getting patient location:', locationError);
          // Continue even if getting location fails
          patientLoc = null;
        }
      }

      // Update patient location in Firestore if we have one
      if (patientLoc) {
        try {
          await updatePatientLocationInFirestore(visitId, patientLoc);
        } catch (updateError) {
          console.error('Error updating patient location in Firestore:', updateError);
          // Continue even if update fails
        }
      }
      
      // Calculate ETA if both locations are available
      if (visitData.doctorLocation && patientLoc) {
        calculateETA(visitData.doctorLocation, patientLoc);
      }

      // Make sure to clean up any existing listeners first
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        setFirestoreUnsubscribe(null);
      }
      
      // Listen for doctor location updates
      listenToDoctorLocation(visitId, doctorId);
      
      // Add a periodic manual check to ensure state sync (fallback for listener issues)
      const manualCheckInterval = setInterval(async () => {
        try {
          const manualDoc = await getDoc(visitRef);
          if (manualDoc.exists()) {
            const manualData = manualDoc.data();
            console.log(`Patient side: Manual periodic check for visit ${visitId}:`, {
              doctorHasReached: manualData.doctorHasReached,
              waitingTimerActive: manualData.waitingTimerActive,
              doctorReceived: manualData.doctorReceived
            });
            
            // Sync state if there's a mismatch
            if (manualData.doctorHasReached !== doctorHasReached) {
              console.log(`Patient side: Manual sync - updating doctorHasReached to ${manualData.doctorHasReached}`);
              setDoctorHasReached(manualData.doctorHasReached);
              
              if (manualData.doctorHasReached) {
                setWaitingTimerActive(true);
                if (manualData.reachedAt) {
                  const reachedAt = manualData.reachedAt.toDate ? manualData.reachedAt.toDate() : new Date(manualData.reachedAt);
                  const currentTime = new Date();
                  const elapsedSeconds = Math.floor((currentTime - reachedAt) / 1000);
                  const remainingTime = manualData.waitingTimerExtended ? 600 - elapsedSeconds : 300 - elapsedSeconds;
                  setWaitingTimeRemaining(Math.max(0, remainingTime));
                  setWaitingTimerExtended(manualData.waitingTimerExtended || false);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error in manual periodic check:', error);
        }
      }, 5000); // Check every 5 seconds
      
      // Store the interval reference for cleanup
      setManualCheckInterval(manualCheckInterval);
      
      // Update visit status to 'in_progress' if it's not already
      try {
        if (visitData.status === 'accepted') {
          await updateDoc(visitRef, {
            status: 'in_progress',
            lastUpdated: serverTimestamp()
          });
          console.log(`Patient side: Updated visit status to in_progress for ${visitId}`);
        }
      } catch (statusError) {
        console.error('Error updating visit status:', statusError);
        // Continue even if status update fails
      }
      
      console.log(`Patient side: Successfully started location tracking for visit ${visitId}`);
      return true;
    } catch (error) {
      console.error('Error starting patient location tracking:', error);
      return false;
    }
  };

  // Update doctor's location in Firestore
  const updateDoctorLocationInFirestore = async (visitId, location) => {
    try {
      const visitRef = doc(db, 'doctorPatientMatches', visitId);
      await updateDoc(visitRef, {
        doctorLocation: location,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error('Error updating doctor location in Firestore:', error);
    }
  };

  // Update patient's location in Firestore
  const updatePatientLocationInFirestore = async (visitId, location) => {
    try {
      const visitRef = doc(db, 'doctorPatientMatches', visitId);
      await updateDoc(visitRef, {
        patientLocation: location,
      });
    } catch (error) {
      console.error('Error updating patient location in Firestore:', error);
    }
  };

  // Listen to doctor's location updates from Firestore
  const listenToDoctorLocation = (visitId, doctorId) => {
    console.log(`Patient side: Setting up listener for doctor location updates for visit ${visitId}`);
    const visitRef = doc(db, 'doctorPatientMatches', visitId);
    
    // Use a more robust error handling approach with the onSnapshot listener
    const unsubscribe = onSnapshot(
      visitRef,
      { includeMetadataChanges: false }, // Don't include metadata changes to avoid filtering issues
      async (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          
          console.log(`Patient side: Received update for visit ${visitId}:`, {
            hasDocLocation: !!data.doctorLocation,
            hasPatLocation: !!data.patientLocation,
            doctorHasReached: data.doctorHasReached,
            waitingTimerActive: data.waitingTimerActive,
            doctorReceived: data.doctorReceived,
            status: data.status
          });
          
          // Process ALL updates immediately
          if (data.doctorLocation) {
            setDoctorLocation(data.doctorLocation);
            
            // Calculate ETA if we have patient location
            if (data.patientLocation) {
              setPatientLocation(data.patientLocation);
              calculateETA(data.doctorLocation, data.patientLocation);
            }
          }
          
          // Check if doctor has reached - this is the critical part
          if (data.doctorHasReached === true) {
            console.log(`Patient side: Doctor has reached for visit ${visitId} - UPDATING STATE`);
            setDoctorHasReached(true);
            
            // Start waiting timer if doctor has reached
            setWaitingTimerActive(true);
            
            // Calculate remaining time based on reachedAt timestamp
            if (data.reachedAt) {
              const reachedAt = data.reachedAt.toDate ? data.reachedAt.toDate() : new Date(data.reachedAt);
              const currentTime = new Date();
              const elapsedSeconds = Math.floor((currentTime - reachedAt) / 1000);
              const remainingTime = data.waitingTimerExtended ? 600 - elapsedSeconds : 300 - elapsedSeconds;
              
              console.log(`Patient side: Setting timer for visit ${visitId}:`, {
                reachedAt: reachedAt.toISOString(),
                currentTime: currentTime.toISOString(),
                elapsedSeconds,
                remainingTime,
                isExtended: data.waitingTimerExtended
              });
              
              setWaitingTimeRemaining(Math.max(0, remainingTime));
              setWaitingTimerExtended(data.waitingTimerExtended || false);
            } else {
              // If no reachedAt timestamp, set default waiting time
              console.log(`Patient side: No reachedAt timestamp for visit ${visitId}, using default timer`);
              setWaitingTimeRemaining(300); // Default 5 minutes
              setWaitingTimerExtended(false);
            }
            
            // Check if doctor has been received
            if (data.doctorReceived) {
              console.log(`Patient side: Doctor has been received for visit ${visitId}`);
              setDoctorReceived(true);
              setWaitingTimerActive(false);
            } else if (data.doctorHasReached && !data.doctorReceived) {
              // FORCE doctorReceived to true if doctorHasReached is true and doctorReceived is still false
              // This mirrors the robust logic for doctorHasReached
              console.log('Forcing doctorReceived to true due to doctorHasReached being true and doctorReceived still false');
              setDoctorReceived(true);
              setWaitingTimerActive(false);
            }
          } else if (data.doctorHasReached === false) {
            // Also handle when doctorHasReached is explicitly set to false
            console.log(`Patient side: Doctor has NOT reached for visit ${visitId}`);
            setDoctorHasReached(false);
            setWaitingTimerActive(false);
          }
          
          // SEPARATE CHECK: Check if doctor has been received (independent of doctorHasReached)
          if (data.doctorReceived === true && !doctorReceived) {
            console.log(`Patient side: Doctor has been received for visit ${visitId} - UPDATING STATE INDEPENDENTLY`);
            console.log(`Previous doctorReceived state: ${doctorReceived}, new state: ${data.doctorReceived}`);
            setDoctorReceived(true);
            setWaitingTimerActive(false);
            console.log(`Patient side: setDoctorReceived(true) called`);
          } else if (data.doctorReceived === false && doctorReceived) {
            console.log(`Patient side: Doctor received status reset to false for visit ${visitId}`);
            setDoctorReceived(false);
            console.log(`Patient side: setDoctorReceived(false) called`);
          } else {
            console.log(`Patient side: doctorReceived state check - current: ${doctorReceived}, firestore: ${data.doctorReceived}`);
          }
          
          // Check if visit has been completed by the doctor
          if (data.status === 'completed') {
            if (!visitCompleted) {
              console.log('[LocationTrackingContext] Setting visitCompleted TRUE (visit completed)');
              setVisitCompleted(true);
            }
            if (visitStatus !== 'completed') {
              console.log('[LocationTrackingContext] Setting visitStatus to completed');
              setVisitStatus('completed');
            }
            
            // Clear the active request from AsyncStorage immediately
            if (activeRequestId) {
              console.log('Clearing active request ID from AsyncStorage:', activeRequestId);
              // Use Promise.all to ensure all async operations complete
              Promise.all([
                AsyncStorage.removeItem('activeRequestId'),
                completePatientRequest(activeRequestId).catch(error => {
                  console.error('Error completing patient request:', error);
                })
              ]).then(() => {
                console.log('Successfully completed patient request:', activeRequestId);
              });
            }
            
            // IMPORTANT: Force immediate state reset to ensure UI updates
            // This ensures the map screen will update even before the alert is shown
            setActiveVisitId(null);
            setActiveRequestId(null);
            setDoctorLocation(null);
            setPatientLocation(null);
            setEta(null);
            setIsTracking(false);
            setDoctorHasReached(false);
            setWaitingTimerActive(false);
            setWaitingTimeRemaining(300);
            setWaitingTimerExtended(false);
            setDoctorReceived(false);
            
            // Unsubscribe from Firestore immediately to prevent any race conditions
            if (firestoreUnsubscribe) {
              console.log('Unsubscribing from Firestore due to completed visit');
              firestoreUnsubscribe();
              setFirestoreUnsubscribe(null);
            }
            
            // Stop location tracking
            if (locationSubscription) {
              console.log('Removing location subscription due to completed visit');
              locationSubscription.remove();
              setLocationSubscription(null);
            }
          }
          
          // Check if visit has been cancelled
          if (data.status === 'cancelled') {
            if (visitCompleted) {
              console.log('[LocationTrackingContext] Setting visitCompleted FALSE (visit cancelled)');
              setVisitCompleted(false);
            }
            console.log('Visit cancelled detected in LocationTrackingContext - FORCING UI UPDATE');
            setVisitStatus('cancelled'); // Set visit status
            
            // Clear the active request from AsyncStorage immediately
            if (activeRequestId) {
              console.log('Clearing active request ID from AsyncStorage:', activeRequestId);
              await AsyncStorage.removeItem('activeRequestId');
            }
            
            // IMPORTANT: Force immediate state reset to ensure UI updates
            setActiveVisitId(null);
            setActiveRequestId(null);
            setDoctorLocation(null);
            setPatientLocation(null);
            setEta(null);
            setIsTracking(false);
            setDoctorHasReached(false);
            setWaitingTimerActive(false);
            setWaitingTimeRemaining(300);
            setWaitingTimerExtended(false);
            setDoctorReceived(false);
            
            // Unsubscribe from Firestore immediately to prevent any race conditions
            if (firestoreUnsubscribe) {
              console.log('Unsubscribing from Firestore due to cancelled visit');
              firestoreUnsubscribe();
              setFirestoreUnsubscribe(null);
            }
            
            // Stop location tracking
            if (locationSubscription) {
              console.log('Removing location subscription due to cancelled visit');
              locationSubscription.remove();
              setLocationSubscription(null);
            }
            
            // Check the cancellation reason to show appropriate message
            const cancellationReason = data.cancellationReason || '';
            const isDoctorCancelled = cancellationReason.includes('Doctor cancelled');
            
            // Set a flag in AsyncStorage to indicate doctor cancelled (for patient side)
            if (isDoctorCancelled) {
              await AsyncStorage.setItem('visitCancelledByDoctor', 'true');
              console.log('Doctor cancelled visit - setting AsyncStorage flag');
              // Also set the visit status immediately
              setVisitStatus('cancelled');
            }
            
            setTimeout(() => {
              Alert.alert(
                'Visit Cancelled',
                isDoctorCancelled 
                  ? 'The doctor has cancelled this visit. You can request a new doctor if needed.'
                  : 'This visit has been cancelled.',
                [{ text: 'OK' }],
                { cancelable: false }
              );
            }, 500);
          }
        }
      },
      (error) => {
        console.error(`Patient side: Error in Firestore listener for visit ${visitId}:`, error);
        // Attempt to reestablish the connection after a brief delay
        setTimeout(() => {
          if (firestoreUnsubscribe) {
            firestoreUnsubscribe();
            setFirestoreUnsubscribe(null);
            // Restart the listener
            listenToDoctorLocation(visitId, doctorId);
          }
        }, 5000);
      }
    );
    
    setFirestoreUnsubscribe(unsubscribe);
  };

  // Listen to patient's location updates from Firestore
  const listenToPatientLocation = (visitId, patientId) => {
    console.log(`Doctor side: Setting up listener for patient location updates for visit ${visitId}`);
    const visitRef = doc(db, 'doctorPatientMatches', visitId);
    
    // Use a more robust error handling approach with the onSnapshot listener
    const unsubscribe = onSnapshot(
      visitRef,
      { includeMetadataChanges: true }, // Include metadata changes to detect local vs. server updates
      async (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          const source = docSnapshot.metadata.hasPendingWrites ? "Local" : "Server";
          
          console.log(`Doctor side: Received update from ${source} for visit ${visitId}:`, {
            hasDocLocation: !!data.doctorLocation,
            hasPatLocation: !!data.patientLocation,
            doctorHasReached: data.doctorHasReached,
            waitingTimerActive: data.waitingTimerActive,
            doctorReceived: data.doctorReceived,
            status: data.status
          });
          
          // Only process server-confirmed updates for critical state changes
          if (!docSnapshot.metadata.hasPendingWrites) {
            if (data.patientLocation) {
              setPatientLocation(data.patientLocation);
              
              // Calculate ETA if we have doctor location
              if (data.doctorLocation) {
                calculateETA(data.doctorLocation, data.patientLocation);
              }
            }
            
            // Check if doctor has reached (sync state from Firestore)
            if (data.doctorHasReached && !doctorHasReached) {
              console.log(`Doctor side: Syncing doctorHasReached state to true for visit ${visitId}`);
              setDoctorHasReached(true);
              
              // Also sync timer states
              if (data.waitingTimerActive) {
                setWaitingTimerActive(true);
                setWaitingTimerExtended(data.waitingTimerExtended || false);
                
                // Calculate remaining time based on reachedAt timestamp
                if (data.reachedAt) {
                  const reachedAt = data.reachedAt.toDate ? data.reachedAt.toDate() : new Date(data.reachedAt);
                  const currentTime = new Date();
                  const elapsedSeconds = Math.floor((currentTime - reachedAt) / 1000);
                  const remainingTime = data.waitingTimerExtended ? 600 - elapsedSeconds : 300 - elapsedSeconds;
                  setWaitingTimeRemaining(Math.max(0, remainingTime));
                  
                  console.log(`Doctor side: Syncing timer state for visit ${visitId}:`, {
                    reachedAt: reachedAt.toISOString(),
                    currentTime: currentTime.toISOString(),
                    elapsedSeconds,
                    remainingTime,
                    isExtended: data.waitingTimerExtended
                  });
                }
              }
            }
            
            // Check if doctor has been received
            if (data.doctorReceived) {
              console.log(`Doctor side: Syncing doctorReceived state to true for visit ${visitId}`);
              setDoctorReceived(true);
              setWaitingTimerActive(false);
            }
            
            // Also check for completed status in the doctor's listener
            if (data.status === 'completed') {
              console.log('Visit completed detected in doctor listener');
              
              // If we have an active request ID, complete it in Firestore
              if (activeRequestId) {
                try {
                  completePatientRequest(activeRequestId);
                  console.log('Successfully completed patient request from doctor side:', activeRequestId);
                  // Clear from AsyncStorage
                  AsyncStorage.removeItem('activeRequestId');
                } catch (error) {
                  console.error('Error completing patient request from doctor side:', error);
                }
              }
              
              // Stop tracking and reset state
              stopLocationTracking();
              
              // Show completion alert to doctor as well
              setTimeout(() => {
                Alert.alert(
                  'Visit Completed',
                  'You have successfully completed this visit.',
                  [{ text: 'OK' }],
                  { cancelable: false }
                );
              }, 500);
            }
            
            // Check for cancelled status in the doctor's listener
            if (data.status === 'cancelled') {
              console.log('Visit cancelled detected in doctor listener');
              console.log('Cancellation reason:', data.cancellationReason);
              
              // Stop tracking and reset state
              stopLocationTracking();
              
              // Check if this doctor cancelled the visit
              const doctorCancelledFlag = await AsyncStorage.getItem('doctorCancelledVisit');
              const cancellationReason = data.cancellationReason || '';
              const isDoctorCancelled = cancellationReason.includes('Doctor cancelled') || 
                                       cancellationReason.includes('doctor cancelled') ||
                                       cancellationReason.includes('Doctor cancelled while en route') ||
                                       doctorCancelledFlag === 'true';
              
              console.log('Is doctor cancelled:', isDoctorCancelled, 'Reason:', cancellationReason, 'Flag:', doctorCancelledFlag);
              
              // Clear the flag if it exists
              if (doctorCancelledFlag === 'true') {
                await AsyncStorage.removeItem('doctorCancelledVisit');
              }
              
              // Only show alert if the patient cancelled, not if the doctor cancelled
              // (doctor already knows they cancelled, no need for popup)
              if (!isDoctorCancelled) {
                console.log('Patient cancelled - showing popup to doctor');
                setTimeout(() => {
                  Alert.alert(
                    'Visit Cancelled',
                    'The patient has cancelled this visit.',
                    [{ text: 'OK' }],
                    { cancelable: false }
                  );
                }, 500);
              } else {
                console.log('Doctor cancelled the visit - no popup needed for doctor');
              }
            }
          }
          
          // SEPARATE CHECK: Check if doctor has been received (works for both local and server updates)
          if (data.doctorReceived === true && !doctorReceived) {
            console.log(`Doctor side: Doctor has been received for visit ${visitId} - UPDATING STATE INDEPENDENTLY`);
            console.log(`Previous doctorReceived state: ${doctorReceived}, new state: ${data.doctorReceived}`);
            setDoctorReceived(true);
            setWaitingTimerActive(false);
          } else if (data.doctorReceived === false && doctorReceived) {
            console.log(`Doctor side: Doctor received status reset to false for visit ${visitId}`);
            setDoctorReceived(false);
          } else {
            console.log(`Doctor side: doctorReceived state check - current: ${doctorReceived}, firestore: ${data.doctorReceived}`);
          }
        }
      },
      (error) => {
        console.error(`Doctor side: Error in Firestore listener for visit ${visitId}:`, error);
        // Attempt to reestablish the connection after a brief delay
        setTimeout(() => {
          if (firestoreUnsubscribe) {
            firestoreUnsubscribe();
            setFirestoreUnsubscribe(null);
            // Restart the listener
            listenToPatientLocation(visitId, patientId);
          }
        }, 5000);
      }
    );
    
    setFirestoreUnsubscribe(unsubscribe);
  };

  // Calculate ETA between two locations
  const calculateETA = (startLocation, endLocation) => {
    try {
      // Validate input locations to prevent calculation errors
      if (!startLocation || !endLocation || 
          typeof startLocation.latitude !== 'number' || 
          typeof startLocation.longitude !== 'number' || 
          typeof endLocation.latitude !== 'number' || 
          typeof endLocation.longitude !== 'number') {
        console.error('Invalid location data for ETA calculation:', { startLocation, endLocation });
        return;
      }
      
      console.log('Calculating ETA between locations:', {
        start: `${startLocation.latitude.toFixed(6)},${startLocation.longitude.toFixed(6)}`,
        end: `${endLocation.latitude.toFixed(6)},${endLocation.longitude.toFixed(6)}`
      });
      
      // Simple distance-based calculation (could be replaced with Google Maps API for more accuracy)
      const R = 6371; // Radius of the Earth in km
      const dLat = (endLocation.latitude - startLocation.latitude) * Math.PI / 180;
      const dLon = (endLocation.longitude - startLocation.longitude) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(startLocation.latitude * Math.PI / 180) * Math.cos(endLocation.latitude * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c; // Distance in km
      
      // Assuming average speed of 30 km/h in urban areas
      const timeInHours = distance / 30;
      const timeInMinutes = Math.round(timeInHours * 60);
      
      // Format ETA string
      let etaString;
      if (timeInMinutes < 1) {
        etaString = 'Less than 1 minute';
      } else if (timeInMinutes < 60) {
        etaString = `${timeInMinutes} minute${timeInMinutes !== 1 ? 's' : ''}`;
      } else {
        const hours = Math.floor(timeInMinutes / 60);
        const minutes = timeInMinutes % 60;
        etaString = `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      }
      
      const etaData = {
        minutes: timeInMinutes,
        text: etaString,
        distance: `${distance.toFixed(1)} km`
      };
      
      console.log('ETA calculation result:', etaData);
      
      // Update the ETA state
      setEta(etaData);
      
      // If we have an active visit, update the ETA in Firestore as well
      // This ensures both doctor and patient see the same ETA
      if (activeVisitId) {
        try {
          const visitRef = doc(db, 'doctorPatientMatches', activeVisitId);
          updateDoc(visitRef, {
            eta: etaData,
            lastUpdated: new Date()
          }).catch(error => {
            console.error('Error updating ETA in Firestore:', error);
          });
        } catch (error) {
          console.error('Error updating ETA in Firestore:', error);
        }
      }
      
      return etaData;
    } catch (error) {
      console.error('Error calculating ETA:', error);
      return null;
    }
  };

  // Doctor has reached patient's location
  const markDoctorAsReached = async () => {
    try {
      if (!activeVisitId) {
        console.error('Cannot mark doctor as reached: No active visit ID');
        return false;
      }
      
      console.log(`Doctor side: Marking doctor as reached for visit ${activeVisitId}`);
      
      // Update local state first to provide immediate feedback
      setDoctorHasReached(true);
      setWaitingTimerActive(true);
      setWaitingTimeRemaining(300); // 5 minutes in seconds
      setWaitingTimerExtended(false);
      setDoctorReceived(false);
      
      // Use the new Firebase function with retry logic
      try {
        await markDoctorAsReached(activeVisitId);
        console.log(`Doctor side: Successfully marked as reached for visit ${activeVisitId}`);
        return true;
      } catch (firebaseError) {
        console.error('Error using Firebase markDoctorAsReached function:', firebaseError);
        
        // Fallback to direct Firestore update
        const visitRef = doc(db, 'doctorPatientMatches', activeVisitId);
        try {
          await updateDoc(visitRef, {
            doctorHasReached: true,
            waitingTimerActive: true,
            reachedAt: serverTimestamp(),
            lastUpdated: serverTimestamp()
          });
          console.log(`Doctor side: Fallback update succeeded for visit ${activeVisitId}`);
          return true;
        } catch (fallbackError) {
          console.error('Error in fallback update:', fallbackError);
          // Return true since local state was updated for immediate UI feedback
          return true;
        }
      }
    } catch (error) {
      console.error('Error marking doctor as reached:', error);
      return false;
    }
  };
  
  // Mark doctor as received by patient
  const markDoctorAsReceived = async () => {
    try {
      console.log(`=== markDoctorAsReceived START ===`);
      console.log(`activeVisitId: ${activeVisitId}`);
      console.log(`Current context state:`, {
        doctorHasReached,
        doctorReceived,
        waitingTimerActive,
        activeVisitId
      });
      
      if (!activeVisitId) {
        console.error('Cannot mark doctor as received: No active visit ID');
        return false;
      }
      
      // Log the value before update
      try {
        const visitRef = doc(db, 'doctorPatientMatches', activeVisitId);
        const beforeDoc = await getDoc(visitRef);
        if (beforeDoc.exists()) {
          const beforeData = beforeDoc.data();
          console.log(`[Doctor] BEFORE update: visitId=${activeVisitId}, doctorReceived=${beforeData.doctorReceived}`);
        } else {
          console.log(`[Doctor] BEFORE update: visitId=${activeVisitId}, document does not exist`);
        }
      } catch (err) {
        console.error('[Doctor] Error fetching Firestore doc BEFORE update:', err);
      }
      
      console.log(`Doctor side: Marking doctor as received for visit ${activeVisitId}`);
      
      // Update local state first to provide immediate feedback
      setDoctorReceived(true);
      setWaitingTimerActive(false);
      
      // Use the new Firebase function with retry logic
      let updateSuccess = false;
      let retries = 0;
      const maxRetries = 3;
      while (!updateSuccess && retries < maxRetries) {
        try {
          const { markDoctorAsReceived: markDoctorAsReceivedFirebase } = await import('../firebase/patientDoctorMatching.js');
          await markDoctorAsReceivedFirebase(activeVisitId);
          // Read back the document to verify
          const visitRef = doc(db, 'doctorPatientMatches', activeVisitId);
          const updatedDoc = await getDoc(visitRef);
          if (updatedDoc.exists()) {
            const updatedData = updatedDoc.data();
            console.log(`[Doctor] AFTER update: visitId=${activeVisitId}, doctorReceived=${updatedData.doctorReceived}`);
            if (updatedData.doctorReceived) {
              updateSuccess = true;
              break;
            } else {
              console.error('doctorReceived not updated in Firestore! Retrying...');
            }
          } else {
            console.error('Visit document not found after update!');
          }
        } catch (firebaseError) {
          console.error('Error using Firebase markDoctorAsReceived function:', firebaseError);
        }
        retries++;
        if (!updateSuccess && retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      if (updateSuccess) {
        if (typeof forceSyncFromFirestore === 'function') {
          await forceSyncFromFirestore();
        }
        setDoctorReceived(true);
        return true;
      }
      // Fallback to direct Firestore update
      try {
        const visitRef = doc(db, 'doctorPatientMatches', activeVisitId);
        await updateDoc(visitRef, {
          doctorReceived: true,
          waitingTimerActive: false,
          receivedAt: serverTimestamp(),
          lastUpdated: serverTimestamp()
        });
        // Read back the document to verify
        const updatedDoc = await getDoc(visitRef);
        if (updatedDoc.exists()) {
          const updatedData = updatedDoc.data();
          console.log(`[Doctor] AFTER fallback update: visitId=${activeVisitId}, doctorReceived=${updatedData.doctorReceived}`);
          if (updatedData.doctorReceived) {
            if (typeof forceSyncFromFirestore === 'function') {
              await forceSyncFromFirestore();
            }
            setDoctorReceived(true);
            return true;
          } else {
            console.error('doctorReceived not updated in Firestore after fallback!');
          }
        } else {
          console.error('Visit document not found after fallback update!');
        }
      } catch (fallbackError) {
        console.error('Error in fallback update:', fallbackError);
        setDoctorReceived(true);
        if (typeof forceSyncFromFirestore === 'function') {
          await forceSyncFromFirestore();
        }
        return true;
      }
      setDoctorReceived(true);
      if (typeof forceSyncFromFirestore === 'function') {
        await forceSyncFromFirestore();
      }
      return false;
    } catch (error) {
      console.error('Error marking doctor as received:', error);
      setDoctorReceived(true);
      if (typeof forceSyncFromFirestore === 'function') {
        await forceSyncFromFirestore();
      }
      return false;
    }
  };
  
  // Extend waiting timer by 5 more minutes
  const extendWaitingTimer = async () => {
    try {
      if (!activeVisitId) {
        console.error('Cannot extend waiting timer: No active visit ID');
        return false;
      }
      
      console.log(`Doctor side: Extending waiting timer for visit ${activeVisitId}`);
      
      // First, get the current document to ensure we're not overwriting any changes
      const visitRef = doc(db, 'doctorPatientMatches', activeVisitId);
      const visitDoc = await getDoc(visitRef);
      
      if (!visitDoc.exists()) {
        console.error(`Visit document ${activeVisitId} does not exist`);
        return false;
      }
      
      // Use a server timestamp to ensure time consistency across devices
      const timestamp = serverTimestamp();
      
      // Update the document with all necessary fields
      try {
        await updateDoc(visitRef, {
          waitingTimerExtended: true,
          waitingTimerActive: true,
          timerExtendedAt: timestamp,
          lastUpdated: timestamp
        });
        
        console.log(`Doctor side: Successfully extended timer in Firestore for visit ${activeVisitId}`);
        
        // Verify the update was successful by reading the document again
        const updatedDoc = await getDoc(visitRef);
        if (!updatedDoc.exists() || !updatedDoc.data().waitingTimerExtended) {
          console.error(`Doctor side: Failed to verify timer extension in Firestore for visit ${activeVisitId}`);
          // Try one more time if verification failed
          await updateDoc(visitRef, {
            waitingTimerExtended: true,
            waitingTimerActive: true,
            timerExtendedAt: serverTimestamp(),
            lastUpdated: serverTimestamp()
          });
          console.log(`Doctor side: Retry timer extension for visit ${activeVisitId}`);
        }
        
        return true;
      } catch (updateError) {
        console.error('Error updating Firestore:', updateError);
        // Even if Firestore update fails, we've already updated local state
        // This ensures the doctor UI still shows the correct state
        // The next sync from Firestore will correct any discrepancies
        
        // Try one more time after a short delay
        setTimeout(async () => {
          try {
            await updateDoc(visitRef, {
              waitingTimerExtended: true,
              waitingTimerActive: true,
              timerExtendedAt: serverTimestamp(),
              lastUpdated: serverTimestamp()
            });
            console.log(`Doctor side: Delayed retry timer extension for visit ${activeVisitId} succeeded`);
          } catch (retryError) {
            console.error('Error in delayed retry update:', retryError);
          }
        }, 2000);
        
        return true; // Return true since local state was updated
      }
    } catch (error) {
      console.error('Error extending waiting timer:', error);
      return false;
    }
  };
  
  // Cancel visit after waiting
  const cancelVisitAfterWaiting = async () => {
    try {
      if (!activeVisitId) return false;
      
      const visitRef = doc(db, 'doctorPatientMatches', activeVisitId);
      await updateDoc(visitRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancellationReason: 'Patient not available after waiting'
      });
      
      // Stop tracking and reset state
      stopLocationTracking();
      return true;
    } catch (error) {
      console.error('Error cancelling visit after waiting:', error);
      return false;
    }
  };

  // Cancel visit while doctor is en route
  const cancelVisitEnRoute = async () => {
    try {
      if (!activeVisitId) return false;
      
      const visitRef = doc(db, 'doctorPatientMatches', activeVisitId);
      await updateDoc(visitRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancellationReason: 'Patient cancelled while doctor was en route'
      });
      
      // Stop tracking and reset state
      stopLocationTracking(true); // Pass true to indicate this is a cancellation
      return true;
    } catch (error) {
      console.error('Error cancelling visit en route:', error);
      return false;
    }
  };

  // Cancel visit by doctor while en route
  const cancelVisitByDoctor = async () => {
    try {
      if (!activeVisitId) return false;
      
      const visitRef = doc(db, 'doctorPatientMatches', activeVisitId);
      await updateDoc(visitRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancellationReason: 'Doctor cancelled while en route'
      });
      
      // Set a flag to indicate this doctor cancelled (to prevent popup)
      await AsyncStorage.setItem('doctorCancelledVisit', 'true');
      
      // Stop tracking and reset state
      stopLocationTracking(true); // Pass true to indicate this is a cancellation
      return true;
    } catch (error) {
      console.error('Error cancelling visit by doctor:', error);
      return false;
    }
  };

  // Stop tracking location
  const stopLocationTracking = async (isCancelled = false) => {
    console.log('Stopping location tracking and resetting state', { isCancelled });
    
    // Clear the active request from AsyncStorage if it exists
    if (activeRequestId) {
      console.log('Clearing active request ID from AsyncStorage:', activeRequestId);
      await AsyncStorage.removeItem('activeRequestId');
      
      // Only complete the patient request if it's not cancelled
      if (!isCancelled) {
        try {
          await completePatientRequest(activeRequestId);
          console.log('Successfully completed patient request:', activeRequestId);
        } catch (error) {
          console.error('Error completing patient request:', error);
        }
      } else {
        // For cancelled visits, just cancel the request
        try {
          await cancelPatientRequest(activeRequestId);
          console.log('Successfully cancelled patient request:', activeRequestId);
          
          // Also clear the activeMatchId from the user's profile
          if (auth.currentUser) {
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
              activeMatchId: null
            });
            console.log('Cleared activeMatchId from user profile');
          }
        } catch (error) {
          console.error('Error cancelling patient request:', error);
        }
      }
    }
    
    // Stop location updates
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    
    // Unsubscribe from Firestore
    if (firestoreUnsubscribe) {
      firestoreUnsubscribe();
      setFirestoreUnsubscribe(null);
    }
    
    // Clear manual check interval
    if (manualCheckInterval) {
      clearInterval(manualCheckInterval);
      setManualCheckInterval(null);
    }
    
    // Reset state
    setActiveVisitId(null);
    setActiveRequestId(null);
    setDoctorLocation(null);
    setPatientLocation(null);
    setEta(null);
    setIsTracking(false);
    setDoctorHasReached(false);
    setWaitingTimerActive(false);
    setWaitingTimeRemaining(300);
    setWaitingTimerExtended(false);
    setDoctorReceived(false);
    setVisitCompleted(false); // Reset visit completed state on cleanup
  };

  // Manual force sync from Firestore
  const forceSyncFromFirestore = async () => {
    try {
      if (!activeVisitId) {
        console.log('No active visit ID for force sync');
        return;
      }
      
      console.log(`Force syncing state from Firestore for visit ${activeVisitId}`);
      const visitRef = doc(db, 'doctorPatientMatches', activeVisitId);
      const visitDoc = await getDoc(visitRef);
      
      if (visitDoc.exists()) {
        const data = visitDoc.data();
        console.log(`Force sync data for visit ${activeVisitId}:`, {
          doctorHasReached: data.doctorHasReached,
          waitingTimerActive: data.waitingTimerActive,
          doctorReceived: data.doctorReceived,
          status: data.status
        });
        
        // Force update all states
        setDoctorHasReached(data.doctorHasReached || false);
        setWaitingTimerActive(data.waitingTimerActive || false);
        setDoctorReceived(data.doctorReceived || false);
        
        if (data.doctorLocation) {
          setDoctorLocation(data.doctorLocation);
        }
        
        if (data.patientLocation) {
          setPatientLocation(data.patientLocation);
        }
        
        // Calculate timer if doctor has reached
        if (data.doctorHasReached && data.reachedAt) {
          const reachedAt = data.reachedAt.toDate ? data.reachedAt.toDate() : new Date(data.reachedAt);
          const currentTime = new Date();
          const elapsedSeconds = Math.floor((currentTime - reachedAt) / 1000);
          const remainingTime = data.waitingTimerExtended ? 600 - elapsedSeconds : 300 - elapsedSeconds;
          setWaitingTimeRemaining(Math.max(0, remainingTime));
          setWaitingTimerExtended(data.waitingTimerExtended || false);
        }
        
        console.log(`Force sync completed for visit ${activeVisitId}`);
      }
    } catch (error) {
      console.error('Error in force sync:', error);
    }
  };

  // Add a periodic poll to force sync doctorReceived from Firestore every 2 seconds (patient side)
  useEffect(() => {
    if (!activeVisitId) return;
    const interval = setInterval(async () => {
      try {
        const visitRef = doc(db, 'doctorPatientMatches', activeVisitId);
        const docSnap = await getDoc(visitRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.doctorReceived && !doctorReceived) {
            console.log('[Patient] Periodic poll: doctorReceived is true in Firestore but false in local state. Forcing local update.');
            setDoctorReceived(true);
            setWaitingTimerActive(false);
          }
          // End visit sync: if status is completed in Firestore but not in local state, force completion
          if (data.status === 'completed' && isTracking) {
            if (!visitCompleted) {
              console.log('[LocationTrackingContext] Periodic poll: Setting visitCompleted TRUE (visit completed)');
              setVisitCompleted(true);
            }
            console.log('[Patient] Periodic poll: status is completed in Firestore but visit is still active locally. Forcing completion.');
            // Stop tracking and reset state
            stopLocationTracking();
            setTimeout(() => {
              Alert.alert(
                'Visit Completed',
                'The doctor has marked this visit as completed. Thank you for using our service!',
                [{ text: 'OK' }],
                { cancelable: false }
              );
            }, 500);
          }
          
          // Check for cancelled status in periodic poll
          if (data.status === 'cancelled' && isTracking) {
            if (visitCompleted) {
              console.log('[LocationTrackingContext] Setting visitCompleted FALSE (visit cancelled)');
              setVisitCompleted(false);
            }
            console.log('[Patient] Periodic poll: status is cancelled in Firestore but visit is still active locally. Forcing cancellation.');
            // Stop tracking and reset state
            stopLocationTracking();
            
            // Check the cancellation reason to show appropriate message
            const cancellationReason = data.cancellationReason || '';
            const isDoctorCancelled = cancellationReason.includes('Doctor cancelled');
            
            // Set a flag in AsyncStorage to indicate doctor cancelled (for patient side)
            if (isDoctorCancelled) {
              await AsyncStorage.setItem('visitCancelledByDoctor', 'true');
              console.log('Doctor cancelled visit - setting AsyncStorage flag');
              // Also set the visit status immediately
              setVisitStatus('cancelled');
            }
            
            setTimeout(() => {
              Alert.alert(
                'Visit Cancelled',
                isDoctorCancelled 
                  ? 'The doctor has cancelled this visit. You can request a new doctor if needed.'
                  : 'This visit has been cancelled.',
                [{ text: 'OK' }],
                { cancelable: false }
              );
            }, 500);
          }
        }
      } catch (e) {
        console.error('[Patient] Error in periodic poll for doctorReceived:', e);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [activeVisitId, doctorReceived, isTracking, visitCompleted]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }
      if (manualCheckInterval) {
        clearInterval(manualCheckInterval);
      }
    };
  }, []);

  // Reset visitCompleted when a new visit starts or on cleanup
  useEffect(() => {
    if (!activeVisitId && visitCompleted) {
      console.log('[LocationTrackingContext] Resetting visitCompleted to FALSE (cleanup or new visit)');
      setVisitCompleted(false);
    }
  }, [activeVisitId, visitCompleted]);

  return (
    <LocationTrackingContext.Provider
      value={{
        activeVisitId,
        setActiveVisitId,
        activeRequestId,
        doctorLocation,
        patientLocation,
        eta,
        isTracking,
        doctorHasReached,
        waitingTimerActive,
        waitingTimeRemaining,
        waitingTimerExtended,
        doctorReceived,
        visitStatus,
        visitCompleted,
        setVisitCompleted,
        startDoctorLocationTracking,
        startPatientLocationTracking,
        markDoctorAsReached,
        markDoctorAsReceived,
        extendWaitingTimer,
        cancelVisitAfterWaiting,
        cancelVisitEnRoute,
        cancelVisitByDoctor,
        stopLocationTracking,
        forceSyncFromFirestore
      }}
    >
      {children}
    </LocationTrackingContext.Provider>
  );
};
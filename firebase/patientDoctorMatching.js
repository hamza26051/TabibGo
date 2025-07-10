import { db } from './config';
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, GeoPoint, Timestamp, onSnapshot, deleteDoc, arrayUnion } from 'firebase/firestore';
import { getDistance } from 'geolib';

// Collection names
const PATIENT_REQUESTS = 'patientRequests';
const DOCTOR_AVAILABILITY = 'doctorAvailability';
const DOCTOR_PATIENT_MATCHES = 'doctorPatientMatches';

/**
 * Get active patient request for a specific patient
 * @param {string} patientId - Patient's user ID
 * @returns {Promise<Object|null>} - Active request data or null if no active request
 */
export const getActivePatientRequest = async (patientId) => {
  try {
    console.log(`Checking for active request for patient ${patientId}`);
    
    // Query for active requests (status is pending or matched)
    const q = query(
      collection(db, PATIENT_REQUESTS),
      where("patientId", "==", patientId),
      where("status", "in", ["pending", "matched"])
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`No active request found for patient ${patientId}`);
      return null;
    }
    
    // Return the first active request found
    const requestDoc = querySnapshot.docs[0];
    const requestData = requestDoc.data();
    
    console.log(`Found active request for patient ${patientId}: ${requestDoc.id}`);
    
    return {
      id: requestDoc.id,
      ...requestData
    };
  } catch (error) {
    console.error('Error getting active patient request:', error);
    return null;
  }
};

/**
 * Create a new patient request in the database
 * @param {Object} patientData - Patient information
 * @param {string} patientData.patientId - Patient's user ID
 * @param {string} patientData.patientName - Patient's name
 * @param {Object} patientData.location - Patient's location {latitude, longitude}
 * @param {string} patientData.symptoms - Patient's symptoms
 * @param {string} patientData.description - Detailed description of symptoms
 * @param {number} patientData.age - Patient's age
 * @returns {Promise<string>} - Request ID
 */
export const createPatientRequest = async (patientData) => {
  try {
    console.log('createPatientRequest received patientData:', patientData);
    // First check if patient already has an active request
    const existingRequest = await getActivePatientRequest(patientData.patientId);
    if (existingRequest) {
      console.log(`Patient ${patientData.patientId} already has an active request: ${existingRequest.id}`);
      return existingRequest.id; // Return the existing request ID instead of creating a new one
    }
    const { patientId, patientName, location, symptoms, description, age, agreedPrice, addressDetails, attachedImage } = patientData;
    // Create a GeoPoint for the location
    const geoPoint = new GeoPoint(location.latitude, location.longitude);
    // Add the request to Firestore
    const docRef = await addDoc(collection(db, PATIENT_REQUESTS), {
      patientId,
      patientName,
      location: geoPoint,
      symptoms,
      description,
      age,
      agreedPrice: agreedPrice || 0, // Add agreed price field
      status: 'pending', // pending, matched, completed, cancelled
      createdAt: Timestamp.now(),
      expiresAt: new Timestamp(Timestamp.now().seconds + 1800, 0), // 30 minutes expiry
      doctorMatches: [], // Array of doctor IDs who have offered to help
      ...(addressDetails ? { addressDetails } : {}), // Add addressDetails if present
      ...(attachedImage ? { attachedImage } : {}) // Add attachedImage if present
    });
    const docSnap = await getDoc(docRef);
    console.log('Firestore patientRequest document:', docSnap.data());
    // Update user profile with active request ID
    await updateDoc(doc(db, 'users', patientId), {
      activeRequest: docRef.id,
      lastRequestDate: Timestamp.now()
    });
    console.log(`Created patient request with ID: ${docRef.id} and updated user profile`);
    return docRef.id;
  } catch (error) {
    console.error('Error creating patient request:', error);
    throw error;
  }
};

/**
 * Update doctor's availability status
 * @param {string} doctorId - Doctor's user ID
 * @param {boolean} isAvailable - Whether the doctor is available
 * @param {Object} location - Doctor's current location {latitude, longitude}
 * @returns {Promise<void>}
 */
export const updateDoctorAvailability = async (doctorId, isAvailable, location) => {
  try {
    if (!location) {
      console.error('Location is required to update doctor availability');
      throw new Error('Location is required');
    }
    
    // Ensure location is properly formatted
    const formattedLocation = {
      latitude: typeof location.latitude === 'string' ? parseFloat(location.latitude) : location.latitude,
      longitude: typeof location.longitude === 'string' ? parseFloat(location.longitude) : location.longitude
    };
    
    // Validate the location coordinates
    if (isNaN(formattedLocation.latitude) || isNaN(formattedLocation.longitude)) {
      console.error('Invalid location coordinates:', location);
      throw new Error('Invalid location coordinates');
    }
    
    // Check if doctor already has an availability record
    const q = query(collection(db, DOCTOR_AVAILABILITY), where("doctorId", "==", doctorId));
    const querySnapshot = await getDocs(q);
    
    // Create a GeoPoint for the location
    const geoPoint = new GeoPoint(formattedLocation.latitude, formattedLocation.longitude);
    
    if (querySnapshot.empty) {
      // Create new availability record
      await addDoc(collection(db, DOCTOR_AVAILABILITY), {
        doctorId,
        isAvailable,
        location: geoPoint,
        lastUpdated: Timestamp.now()
      });
      console.log(`Created new availability record for doctor: ${doctorId}`);
    } else {
      // Update existing record
      const docId = querySnapshot.docs[0].id;
      await updateDoc(doc(db, DOCTOR_AVAILABILITY, docId), {
        isAvailable,
        location: geoPoint,
        lastUpdated: Timestamp.now()
      });
      console.log(`Updated availability for doctor: ${doctorId} to ${isAvailable ? 'online' : 'offline'}`);
    }
  } catch (error) {
    console.error('Error updating doctor availability:', error);
    throw error;
  }
};

/**
 * Get nearby patient requests for a doctor
 * @param {string} doctorId - Doctor's user ID
 * @param {Object} doctorLocation - Doctor's current location {latitude, longitude}
 * @param {number} maxDistance - Maximum distance in kilometers (default: 5km)
 * @returns {Promise<Array>} - Array of patient requests
 */
export const getNearbyPatientRequests = async (doctorId, doctorLocation, maxDistance = 5) => {
  try {
    if (!doctorLocation) {
      console.error('Doctor location is required');
      throw new Error('Doctor location is required');
    }
    
    // Ensure doctor location is properly formatted
    const formattedDoctorLocation = {
      latitude: typeof doctorLocation.latitude === 'string' ? parseFloat(doctorLocation.latitude) : doctorLocation.latitude,
      longitude: typeof doctorLocation.longitude === 'string' ? parseFloat(doctorLocation.longitude) : doctorLocation.longitude
    };
    
    // Additional validation to ensure we have valid numbers
    if (isNaN(formattedDoctorLocation.latitude) || isNaN(formattedDoctorLocation.longitude)) {
      console.error('Invalid doctor location coordinates:', doctorLocation);
      throw new Error('Invalid doctor location coordinates');
    }
    
    console.log(`Searching for patient requests within ${maxDistance}km of doctor ${doctorId}`);
    console.log('Doctor location:', formattedDoctorLocation);
    
    // Get all pending patient requests
    const q = query(collection(db, PATIENT_REQUESTS), where("status", "==", "pending"));
    const querySnapshot = await getDocs(q);
    
    console.log(`Found ${querySnapshot.size} total pending patient requests in database`);
    
    const nearbyRequests = [];
    
    // Filter requests by distance
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      
      // Handle both GeoPoint and regular object formats for location
      let patientLocation;
      if (!data.location) {
        console.error(`Patient request ${docSnapshot.id} has no location data`);
        return; // Skip this request
      }
      
      try {
        if (typeof data.location.latitude === 'function') {
          // It's a GeoPoint object
          patientLocation = {
            latitude: data.location.latitude(),
            longitude: data.location.longitude()
          };
        } else if (typeof data.location.latitude === 'number') {
          // It's a regular object
          patientLocation = {
            latitude: data.location.latitude,
            longitude: data.location.longitude
          };
        } else if (typeof data.location.latitude === 'string') {
          // It's a string representation
          patientLocation = {
            latitude: parseFloat(data.location.latitude),
            longitude: parseFloat(data.location.longitude)
          };
        } else {
          console.error(`Invalid patient location format for request ${docSnapshot.id}:`, data.location);
          return; // Skip this request
        }
        
        // Validate the patient location
        if (isNaN(patientLocation.latitude) || isNaN(patientLocation.longitude)) {
          console.error(`Invalid patient location coordinates for request ${docSnapshot.id}:`, patientLocation);
          return; // Skip this request
        }
      } catch (error) {
        console.error(`Error processing location for patient request ${docSnapshot.id}:`, error);
        return; // Skip this request
      }
      
      console.log(`Patient request ${docSnapshot.id} location:`, patientLocation);
      console.log(`Patient request ${docSnapshot.id} addressDetails:`, data.addressDetails);
      console.log(`Patient request details: ${JSON.stringify({
        patientId: data.patientId,
        patientName: data.patientName,
        symptoms: data.symptoms,
        status: data.status,
        createdAt: data.createdAt
      })}`);
      
      // Calculate distance between doctor and patient
      try {
        const distanceInMeters = getDistance(
          formattedDoctorLocation,
          patientLocation
        );
        
        const distanceInKm = distanceInMeters / 1000;
        console.log(`Distance to patient ${docSnapshot.id}: ${distanceInKm.toFixed(1)} km`);
        
        // Calculate ETA based on distance (assuming average speed of 40 km/h for urban areas)
        // This gives a rough estimate in minutes
        const averageSpeedKmh = 40;
        const etaMinutes = Math.ceil((distanceInKm / averageSpeedKmh) * 60);
        const etaText = etaMinutes <= 60 
          ? `${etaMinutes} min` 
          : `${Math.floor(etaMinutes / 60)} hr ${etaMinutes % 60} min`;
        
        // Only add patients within the specified radius (5km by default)
        if (distanceInKm <= maxDistance) {
          nearbyRequests.push({
            id: docSnapshot.id,
            ...data,
            patientId: data.patientId,
            distance: `${distanceInKm.toFixed(1)} km`,
            eta: etaText,
            etaMinutes: etaMinutes,
            location: patientLocation,
            addressDetails: data.addressDetails || '' // Always include addressDetails
          });
          
          console.log(`Added patient ${docSnapshot.id} to nearby requests list. Distance: ${distanceInKm.toFixed(1)} km`);
        } else {
          console.log(`Patient ${docSnapshot.id} is outside the ${maxDistance}km radius (${distanceInKm.toFixed(1)} km). Skipping.`);
        }
      } catch (error) {
        console.error(`Error calculating distance for patient ${docSnapshot.id}:`, error);
        console.log('Doctor location:', formattedDoctorLocation);
        console.log('Patient location:', patientLocation);
        return; // Skip this request
      }
    });
    
    console.log(`Found ${nearbyRequests.length} nearby patient requests within ${maxDistance}km`);
    return nearbyRequests;
  } catch (error) {
    console.error('Error getting nearby patient requests:', error);
    throw error;
  }
};

/**
 * Doctor offers to help a patient
 * @param {string} requestId - Patient request ID
 * @param {string} doctorId - Doctor's user ID
 * @param {Object} doctorInfo - Doctor's information
 * @returns {Promise<void>}
 */
export const offerHelp = async (requestId, doctorId, doctorInfo) => {
  try {
    // Get the request
    const requestRef = doc(db, PATIENT_REQUESTS, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }
    
    const requestData = requestSnap.data();
    
    // Check if request is still pending
    if (requestData.status !== 'pending') {
      throw new Error('This request is no longer available');
    }
    
    // Check if doctor has already offered help
    const alreadyOffered = requestData.doctorMatches.some(match => match.doctorId === doctorId);
    if (alreadyOffered) {
      console.log(`Doctor ${doctorId} has already offered help for request ${requestId}`);
      return;
    }
    
    // Add doctor to matches array with location information
    // Get doctor's current location from availability record
    const availabilityQuery = query(collection(db, DOCTOR_AVAILABILITY), where("doctorId", "==", doctorId));
    const availabilitySnapshot = await getDocs(availabilityQuery);
    
    let doctorLocation = null;
    if (!availabilitySnapshot.empty) {
      const availabilityData = availabilitySnapshot.docs[0].data();
      if (availabilityData.location) {
        doctorLocation = availabilityData.location;
      }
    }
    
    // Use provided location from doctorInfo if available
    if (doctorInfo.location) {
      // Ensure location is properly formatted
      const formattedLocation = {
        latitude: typeof doctorInfo.location.latitude === 'string' ? parseFloat(doctorInfo.location.latitude) : doctorInfo.location.latitude,
        longitude: typeof doctorInfo.location.longitude === 'string' ? parseFloat(doctorInfo.location.longitude) : doctorInfo.location.longitude
      };
      
      // Validate the location coordinates
      if (!isNaN(formattedLocation.latitude) && !isNaN(formattedLocation.longitude)) {
        doctorLocation = new GeoPoint(formattedLocation.latitude, formattedLocation.longitude);
      }
    }
    
    console.log(`Adding doctor ${doctorId} to matches for request ${requestId} with location:`, doctorLocation);
    
    await updateDoc(requestRef, {
      doctorMatches: [...requestData.doctorMatches, {
        doctorId,
        doctorName: doctorInfo.name,
        specialty: doctorInfo.specialty,
        rating: doctorInfo.rating,
        location: doctorLocation,
        fee: doctorInfo.fee,
        offeredAt: Timestamp.now()
      }]
    });
    
    
    console.log(`Doctor ${doctorId} offered help for request ${requestId}`);
  } catch (error) {
    console.error('Error offering help:', error);
    throw error;
  }
};

/**
 * Patient accepts a doctor's offer
 * @param {string} requestId - Patient request ID
 * @param {string} doctorId - Doctor's user ID
 * @returns {Promise<string>} - Match ID
 */
export const acceptDoctorOffer = async (requestId, doctorId) => {
  try {
    console.log(`Patient accepting doctor offer: requestId=${requestId}, doctorId=${doctorId}`);
    
    // Get the request
    const requestRef = doc(db, PATIENT_REQUESTS, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }
    
    const requestData = requestSnap.data();
    
    // Check if request is still pending
    if (requestData.status !== 'pending') {
      throw new Error('This request is no longer available');
    }
    
    // Find the doctor in matches array
    const doctorMatch = requestData.doctorMatches.find(match => match.doctorId === doctorId);
    
    if (!doctorMatch) {
      throw new Error('Doctor not found in matches');
    }
    
    // Update request status first
    await updateDoc(requestRef, {
      status: 'matched',
      matchedDoctorId: doctorId,
      matchedAt: Timestamp.now(),
      lastUpdated: Timestamp.now()
    });
    
    console.log(`Patient accepted doctor ${doctorId} for request ${requestId}`);
    
    // Create a match record with comprehensive initial state
    const matchRef = await addDoc(collection(db, DOCTOR_PATIENT_MATCHES), {
      requestId,
      patientId: requestData.patientId,
      patientName: requestData.patientName,
      doctorId,
      doctorName: doctorMatch.doctorName,
      patientLocation: requestData.location,
      symptoms: requestData.symptoms,
      description: requestData.description,
      status: 'active', // active, completed, cancelled
      createdAt: Timestamp.now(),
      lastUpdated: Timestamp.now(),
      // Initialize tracking states
      doctorLocation: null,
      eta: null,
      doctorHasReached: false,
      doctorReceived: false,
      waitingTimerActive: false,
      waitingTimerExtended: false,
      reachedAt: null,
      receivedAt: null,
      visitStarted: false,
      visitCompleted: false,
      completedAt: null
    });
    
    console.log(`Created match record with ID: ${matchRef.id}`);
    
    // Update the request with the match ID for easier tracking
    await updateDoc(requestRef, {
      activeMatchId: matchRef.id,
      lastUpdated: Timestamp.now()
    });
    
    // Update user profiles to track active matches
    await updateDoc(doc(db, 'users', requestData.patientId), {
      activeMatchId: matchRef.id,
      lastUpdated: Timestamp.now()
    });
    
    await updateDoc(doc(db, 'users', doctorId), {
      activeMatchId: matchRef.id,
      lastUpdated: Timestamp.now()
    });
    
    console.log(`Successfully created match ${matchRef.id} and updated user profiles`);
    return matchRef.id;
  } catch (error) {
    console.error('Error accepting doctor offer:', error);
    throw error;
  }
};

/**
 * Listen for changes to a patient request
 * @param {string} requestId - Patient request ID
 * @param {Function} callback - Callback function to handle changes
 * @returns {Function} - Unsubscribe function
 */
export const listenToPatientRequest = (requestId, callback) => {
  const requestRef = doc(db, PATIENT_REQUESTS, requestId);
  return onSnapshot(requestRef, (doc) => {
    if (doc.exists()) {
      callback({
        id: doc.id,
        ...doc.data()
      });
    } else {
      callback(null);
    }
  }, (error) => {
    console.error(`Error listening to patient request ${requestId}:`, error);
  });
};

/**
 * Listen for doctor matches on a patient request
 * @param {string} requestId - Patient request ID
 * @param {Function} callback - Callback function to handle changes
 * @returns {Function} - Unsubscribe function
 */
export const listenToDoctorMatches = (requestId, callback) => {
  console.log(`Setting up listener for doctor matches on request ${requestId}`);
  const requestRef = doc(db, PATIENT_REQUESTS, requestId);
  return onSnapshot(requestRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      console.log(`Received update for request ${requestId}, matches:`, data.doctorMatches?.length || 0);
      callback(data.doctorMatches || []);
    } else {
      console.log(`Request ${requestId} does not exist`);
      callback([]);
    }
  }, (error) => {
    console.error(`Error listening to doctor matches for request ${requestId}:`, error);
  });
};

/**
 * Listen for active match details with improved error handling and reconnection
 * @param {string} matchId - Match ID
 * @param {Function} callback - Callback function to handle changes
 * @returns {Function} - Unsubscribe function
 */
export const listenToMatchDetails = (matchId, callback) => {
  console.log(`Setting up robust listener for match details on match ${matchId}`);
  
  if (!matchId) {
    console.error('Match ID is required for listening to match details');
    return () => {};
  }
  
  const matchRef = doc(db, DOCTOR_PATIENT_MATCHES, matchId);
  
  // Add retry logic and better error handling
  let retryCount = 0;
  const maxRetries = 3;
  
  const setupListener = () => {
    try {
      return onSnapshot(matchRef, 
        (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            console.log(`Received update for match ${matchId}:`, {
              status: data.status,
              doctorHasReached: data.doctorHasReached,
              doctorReceived: data.doctorReceived,
              hasDoctorLocation: !!data.doctorLocation,
              hasEta: !!data.eta
            });
            
            // Reset retry count on successful update
            retryCount = 0;
            
            callback({
              id: doc.id,
              ...data
            });
          } else {
            console.log(`Match ${matchId} does not exist`);
            callback(null);
          }
        }, 
        (error) => {
          console.error(`Error listening to match details for match ${matchId}:`, error);
          
          // Implement retry logic
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying listener for match ${matchId}, attempt ${retryCount}/${maxRetries}`);
            
            setTimeout(() => {
              setupListener();
            }, 1000 * retryCount); // Exponential backoff
          } else {
            console.error(`Max retries reached for match ${matchId} listener`);
            callback(null);
          }
        }
      );
    } catch (error) {
      console.error(`Error setting up listener for match ${matchId}:`, error);
      return () => {};
    }
  };
  
  return setupListener();
};

/**
 * Update doctor's location during an active match with retry logic
 * @param {string} matchId - Match ID
 * @param {Object} location - Doctor's current location {latitude, longitude}
 * @param {number} eta - Estimated time of arrival in minutes
 * @returns {Promise<void>}
 */
export const updateDoctorLocation = async (matchId, location, eta) => {
  try {
    if (!location) {
      throw new Error('Location is required');
    }
    
    if (!matchId) {
      throw new Error('Match ID is required');
    }
    
    const matchRef = doc(db, DOCTOR_PATIENT_MATCHES, matchId);
    
    // Get current match data to verify it exists
    const matchSnap = await getDoc(matchRef);
    if (!matchSnap.exists()) {
      throw new Error(`Match ${matchId} not found`);
    }
    
    // Create a GeoPoint for the location
    const geoPoint = new GeoPoint(location.latitude, location.longitude);
    
    // Update with retry logic
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        await updateDoc(matchRef, {
          doctorLocation: geoPoint,
          eta,
          lastLocationUpdate: Timestamp.now(),
          lastUpdated: Timestamp.now()
        });
        
        console.log(`Updated doctor location for match ${matchId}, ETA: ${eta} minutes`);
        return; // Success, exit the retry loop
      } catch (updateError) {
        retryCount++;
        console.error(`Error updating doctor location (attempt ${retryCount}/${maxRetries}):`, updateError);
        
        if (retryCount >= maxRetries) {
          throw updateError; // Re-throw the error after max retries
        }
        
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  } catch (error) {
    console.error('Error updating doctor location:', error);
    throw error;
  }
};

/**
 * Cancel a patient request
 * @param {string} requestId - Patient request ID
 * @returns {Promise<void>}
 */
export const cancelPatientRequest = async (requestId) => {
  try {
    const requestRef = doc(db, PATIENT_REQUESTS, requestId);
    
    // Verify the request exists
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) {
      throw new Error(`Request ${requestId} not found`);
    }
    
    const requestData = requestSnap.data();
    const patientId = requestData.patientId;
    
    await updateDoc(requestRef, {
      status: 'cancelled',
      cancelledAt: Timestamp.now()
    });
    
    // Clear the active request from the user's profile
    await updateDoc(doc(db, 'users', patientId), {
      activeRequest: null
    });
    
    console.log(`Cancelled patient request ${requestId} and cleared from user profile`);
  } catch (error) {
    console.error('Error cancelling patient request:', error);
    throw error;
  }
};

/**
 * Complete a doctor-patient match
 * @param {string} matchId - Match ID
 * @returns {Promise<void>}
 */
export const completeMatch = async (matchId) => {
  try {
    const matchRef = doc(db, DOCTOR_PATIENT_MATCHES, matchId);
    
    // Verify the match exists
    const matchSnap = await getDoc(matchRef);
    if (!matchSnap.exists()) {
      throw new Error(`Match ${matchId} not found`);
    }
    
    await updateDoc(matchRef, {
      status: 'completed',
      completedAt: Timestamp.now()
    });
    
    console.log(`Completed match ${matchId}`);
  } catch (error) {
    console.error('Error completing match:', error);
    throw error;
  }
};

/**
 * Complete a patient request
 * @param {string} requestId - Patient request ID
 * @returns {Promise<void>}
 */
export const completePatientRequest = async (requestId) => {
  try {
    // Get the request
    const requestRef = doc(db, PATIENT_REQUESTS, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }
    
    const requestData = requestSnap.data();
    const patientId = requestData.patientId;
    
    // Update request status
    await updateDoc(requestRef, {
      status: 'completed',
      completedAt: Timestamp.now()
    });
    
    // Clear the active request from the user's profile and update last completed visit
    await updateDoc(doc(db, 'users', patientId), {
      activeRequest: null,
      lastCompletedVisit: Timestamp.now()
    });
    
    console.log(`Completed patient request ${requestId} and cleared from user profile`);
  } catch (error) {
    console.error('Error completing patient request:', error);
    throw error;
  }
};

/**
 * Mark doctor as reached with proper state synchronization
 * @param {string} matchId - Match ID
 * @returns {Promise<void>}
 */
export const markDoctorAsReached = async (matchId) => {
  try {
    if (!matchId) {
      throw new Error('Match ID is required');
    }
    
    console.log(`Marking doctor as reached for match ${matchId}`);
    
    const matchRef = doc(db, DOCTOR_PATIENT_MATCHES, matchId);
    
    // Get current match data to verify it exists
    const matchSnap = await getDoc(matchRef);
    if (!matchSnap.exists()) {
      throw new Error(`Match ${matchId} not found`);
    }
    
    const matchData = matchSnap.data();
    
    // Check if doctor has already reached
    if (matchData.doctorHasReached) {
      console.log(`Doctor already marked as reached for match ${matchId}`);
      return;
    }
    
    // Update with retry logic
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        await updateDoc(matchRef, {
          doctorHasReached: true,
          waitingTimerActive: true,
          reachedAt: Timestamp.now(),
          lastUpdated: Timestamp.now()
        });
        
        console.log(`Successfully marked doctor as reached for match ${matchId}`);
        return; // Success, exit the retry loop
      } catch (updateError) {
        retryCount++;
        console.error(`Error marking doctor as reached (attempt ${retryCount}/${maxRetries}):`, updateError);
        
        if (retryCount >= maxRetries) {
          throw updateError; // Re-throw the error after max retries
        }
        
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  } catch (error) {
    console.error('Error marking doctor as reached:', error);
    throw error;
  }
};

/**
 * Mark doctor as received by patient
 * @param {string} matchId - Match ID
 * @returns {Promise<void>}
 */
export const markDoctorAsReceived = async (matchId) => {
  try {
    if (!matchId) {
      throw new Error('Match ID is required');
    }
    
    console.log(`Marking doctor as received for match ${matchId}`);
    
    const matchRef = doc(db, DOCTOR_PATIENT_MATCHES, matchId);
    
    // Get current match data to verify it exists
    const matchSnap = await getDoc(matchRef);
    if (!matchSnap.exists()) {
      throw new Error(`Match ${matchId} not found`);
    }
    
    const matchData = matchSnap.data();
    
    // Check if doctor has already been received
    if (matchData.doctorReceived) {
      console.log(`Doctor already marked as received for match ${matchId}`);
      return;
    }
    
    // Update with retry logic
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        await updateDoc(matchRef, {
          doctorReceived: true,
          visitStarted: true,
          receivedAt: Timestamp.now(),
          lastUpdated: Timestamp.now()
        });
        
        console.log(`Successfully marked doctor as received for match ${matchId}`);
        return; // Success, exit the retry loop
      } catch (updateError) {
        retryCount++;
        console.error(`Error marking doctor as received (attempt ${retryCount}/${maxRetries}):`, updateError);
        
        if (retryCount >= maxRetries) {
          throw updateError; // Re-throw the error after max retries
        }
        
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  } catch (error) {
    console.error('Error marking doctor as received:', error);
    throw error;
  }
};

/**
 * Mark a patient request as seen by a doctor with a timestamp
 * @param {string} requestId - Patient request ID
 * @param {string} doctorId - Doctor's user ID
 * @returns {Promise<void>}
 */
export const markRequestSeenByDoctor = async (requestId, doctorId) => {
  const requestRef = doc(db, 'patientRequests', requestId);
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) return;
  const data = requestSnap.data();
  const seenByDoctors = data.seenByDoctors || {};
  seenByDoctors[doctorId] = Date.now();
  await updateDoc(requestRef, {
    seenByDoctors
  });
};

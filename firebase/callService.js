import { db } from './config';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';

// Collection name for calls
const CALLS_COLLECTION = 'calls';

/**
 * Listen for incoming calls for the current user
 * @param {Function} callback - Function to call when an incoming call is detected
 * @returns {Function} - Unsubscribe function to stop listening
 */
export const listenForIncomingCalls = (callback) => {
  if (!callback || typeof callback !== 'function') {
    console.error('Invalid callback provided to listenForIncomingCalls');
    return () => {};
  }

  try {
    // Get the current user ID from Firebase Auth
    const auth = require('firebase/auth').getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.error('No authenticated user found');
      return () => {};
    }

    console.log('Setting up call listener for user:', currentUser.uid);

    // Create a query for incoming calls that are ringing
    const q = query(
      collection(db, CALLS_COLLECTION),
      where('recipientId', '==', currentUser.uid),
      where('status', '==', 'ringing')
    );

    // Set up the snapshot listener
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const callData = doc.data();
        // Add the document ID to the call data
        const call = {
          id: doc.id,
          ...callData
        };
        
        console.log('Incoming call detected:', call);
        callback(call);
      });
    }, (error) => {
      console.error('Error listening for calls:', error);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up call listener:', error);
    return () => {};
  }
};

/**
 * Make an outgoing call to another user
 * @param {string} recipientId - User ID of the call recipient
 * @param {string} recipientName - Name of the call recipient
 * @returns {Promise<Object>} - Call data including ID
 */
export const makeCall = async (recipientId, recipientName) => {
  try {
    // Get the current user
    const auth = require('firebase/auth').getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    // Create a new call document
    const callData = {
      callerId: currentUser.uid,
      callerName: currentUser.displayName || currentUser.email,
      recipientId,
      recipientName,
      status: 'ringing',
      startedAt: serverTimestamp(),
      endedAt: null,
      isCallerMuted: false,
      isRecipientMuted: false
    };

    const docRef = await addDoc(collection(db, CALLS_COLLECTION), callData);
    console.log('Call created with ID:', docRef.id);

    return {
      id: docRef.id,
      ...callData
    };
  } catch (error) {
    console.error('Error making call:', error);
    throw error;
  }
};

/**
 * End an ongoing call
 * @param {string} callId - ID of the call to end
 * @returns {Promise<void>}
 */
export const endCall = async (callId) => {
  try {
    const callRef = doc(db, CALLS_COLLECTION, callId);
    await updateDoc(callRef, {
      status: 'ended',
      endedAt: serverTimestamp()
    });
    console.log('Call ended:', callId);
  } catch (error) {
    console.error('Error ending call:', error);
    throw error;
  }
};

/**
 * Answer an incoming call
 * @param {string} callId - ID of the call to answer
 * @returns {Promise<void>}
 */
export const answerCall = async (callId) => {
  try {
    const callRef = doc(db, CALLS_COLLECTION, callId);
    await updateDoc(callRef, {
      status: 'connected',
      answeredAt: serverTimestamp()
    });
    console.log('Call answered:', callId);
  } catch (error) {
    console.error('Error answering call:', error);
    throw error;
  }
};

/**
 * Decline an incoming call
 * @param {string} callId - ID of the call to decline
 * @returns {Promise<void>}
 */
export const declineCall = async (callId) => {
  try {
    const callRef = doc(db, CALLS_COLLECTION, callId);
    await updateDoc(callRef, {
      status: 'declined',
      endedAt: serverTimestamp()
    });
    console.log('Call declined:', callId);
  } catch (error) {
    console.error('Error declining call:', error);
    throw error;
  }
};

/**
 * Toggle mute status for a user in a call
 * @param {string} callId - ID of the call
 * @param {boolean} isCaller - Whether the user is the caller (true) or recipient (false)
 * @param {boolean} isMuted - New mute status
 * @returns {Promise<void>}
 */
export const toggleMute = async (callId, isCaller, isMuted) => {
  try {
    const callRef = doc(db, CALLS_COLLECTION, callId);
    const updateData = {};
    
    if (isCaller) {
      updateData.isCallerMuted = isMuted;
    } else {
      updateData.isRecipientMuted = isMuted;
    }
    
    await updateDoc(callRef, updateData);
    console.log(`User ${isCaller ? 'caller' : 'recipient'} mute status set to ${isMuted}`);
  } catch (error) {
    console.error('Error toggling mute status:', error);
    throw error;
  }
};

/**
 * Get details of a specific call
 * @param {string} callId - ID of the call
 * @returns {Promise<Object|null>} - Call data or null if not found
 */
export const getCallDetails = async (callId) => {
  try {
    const callRef = doc(db, CALLS_COLLECTION, callId);
    const callSnapshot = await getDoc(callRef);
    
    if (callSnapshot.exists()) {
      return {
        id: callSnapshot.id,
        ...callSnapshot.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting call details:', error);
    throw error;
  }
};
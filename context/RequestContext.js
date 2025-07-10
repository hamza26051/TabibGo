import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActivePatientRequest } from '../firebase/patientDoctorMatching';
import { auth } from '../firebase/config';

// Create the request context
const RequestContext = createContext();

// Custom hook to use the request context
export const useRequest = () => {
  const context = useContext(RequestContext);
  if (!context) {
    throw new Error('useRequest must be used within a RequestProvider');
  }
  return context;
};

// Provider component that wraps the app and provides request context
export const RequestProvider = ({ children }) => {
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [activeRequestData, setActiveRequestData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Store request ID in AsyncStorage
  const storeRequestId = async (id) => {
    try {
      if (id) {
        await AsyncStorage.setItem('activeRequestId', id);
        console.log('Stored active request ID in RequestContext:', id);
      } else {
        await AsyncStorage.removeItem('activeRequestId');
        console.log('Removed active request ID from RequestContext');
      }
    } catch (error) {
      console.error('Error storing request ID in AsyncStorage:', error);
    }
  };

  // Set active request and store in AsyncStorage
  const setActiveRequest = async (requestId, requestData = null) => {
    setActiveRequestId(requestId);
    setActiveRequestData(requestData);
    await storeRequestId(requestId);
  };

  // Clear active request
  const clearActiveRequest = async () => {
    setActiveRequestId(null);
    setActiveRequestData(null);
    await storeRequestId(null);
  };

  // Check for existing active request
  const checkForActiveRequest = async () => {
    try {
      setLoading(true);
      if (!auth.currentUser) {
        setLoading(false);
        return null;
      }
      
      // First check AsyncStorage for stored request ID
      const storedRequestId = await AsyncStorage.getItem('activeRequestId');
      console.log('Checking for active request, stored ID:', storedRequestId);
      
      if (storedRequestId) {
        // Verify the request is still active in Firestore
        const requestData = await getActivePatientRequest(auth.currentUser.uid);
        
        if (requestData && requestData.id === storedRequestId) {
          console.log('Found active request in Firestore matching stored ID:', requestData);
          setActiveRequestId(requestData.id);
          setActiveRequestData(requestData);
          setLoading(false);
          return requestData;
        } else {
          // Request no longer active, clear from AsyncStorage
          console.log('Stored request ID no longer active, clearing');
          await clearActiveRequest();
        }
      }
      
      // If no valid stored ID, check Firestore directly
      const requestData = await getActivePatientRequest(auth.currentUser.uid);
      if (requestData) {
        console.log('Found active request in Firestore:', requestData);
        await setActiveRequest(requestData.id, requestData);
        setLoading(false);
        return requestData;
      }
      
      setLoading(false);
      return null;
    } catch (error) {
      console.error('Error checking for active request:', error);
      setLoading(false);
      return null;
    }
  };

  // Check for active request on mount
  useEffect(() => {
    checkForActiveRequest();
  }, []);

  return (
    <RequestContext.Provider
      value={{
        activeRequestId,
        activeRequestData,
        loading,
        setActiveRequest,
        clearActiveRequest,
        checkForActiveRequest,
      }}
    >
      {children}
    </RequestContext.Provider>
  );
};
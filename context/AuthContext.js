import React, { createContext, useState, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import { auth, db } from '../firebase/config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Create the authentication context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const ModeContext = createContext({
  currentMode: 'patient',
  setCurrentMode: () => {},
});

export const useMode = () => useContext(ModeContext);

// Provider component that wraps the app and provides auth context
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [currentMode, setCurrentMode] = useState('patient');

  // Function to sign up a new user
  const signup = async (email, password, username) => {
    try {
      if (!auth) {
        throw new Error('Auth not initialized');
      }
      
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create a user profile document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        username,
        email,
        createdAt: new Date().toISOString(),
      });
      
      return user;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  // Function to log in a user
  const login = async (email, password) => {
    try {
      if (!auth) {
        throw new Error('Auth not initialized');
      }
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  };

  // Function to log out a user
  const logout = async () => {
    try {
      if (!auth) {
        throw new Error('Auth not initialized');
      }
      
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  // Function to fetch user profile data
  const fetchUserProfile = async (uid) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
        return userDoc.data();
      } else {
        console.log('No user profile found!');
        return null;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Effect to handle auth state changes
  useEffect(() => {
    let unsubscribe;
    
    const initializeAuth = async () => {
      try {
        // Wait a bit for auth to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!auth) {
          console.error('Auth is not initialized');
          setLoading(false);
          return;
        }

        unsubscribe = onAuthStateChanged(auth, async (user) => {
          console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
          setCurrentUser(user);
          
          if (user) {
            await fetchUserProfile(user.uid);
          } else {
            setUserProfile(null);
          }
          
          setLoading(false);
          setAuthInitialized(true);
        });

      } catch (error) {
        console.error('Error initializing auth listener:', error);
        setLoading(false);
        setAuthInitialized(true);
      }
    };

    initializeAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    authInitialized,
    signup,
    login,
    logout,
    fetchUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      <ModeContext.Provider value={{ currentMode, setCurrentMode }}>
        {children}
      </ModeContext.Provider>
    </AuthContext.Provider>
  );
};
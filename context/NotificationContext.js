import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebase/config';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, getDoc, getDocs } from 'firebase/firestore';

// Create the notification context
const NotificationContext = createContext();

// Custom hook to use the notification context
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Provider component that wraps the app and provides notification context
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState('patient'); // 'patient' or 'doctor'
  const previousUserIdRef = React.useRef(null);

  // Initialize notifications from AsyncStorage and Firestore
  useEffect(() => {
    let unsubscribe = null;
    const initializeNotifications = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        setNotifications([]);
        setUnreadCount(0);
        if (unsubscribe) unsubscribe();
        // Only clear the notification cache for the previous user
        if (previousUserIdRef.current) {
          const prevCacheKey = `notifications_${previousUserIdRef.current}`;
          await AsyncStorage.removeItem(prevCacheKey);
        }
        previousUserIdRef.current = null;
        return;
      }
      try {
        setLoading(true);
        // Check if user is a doctor
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists() && userDoc.data().isDoctor) {
          setUserType('doctor');
        } else {
          setUserType('patient');
        }
        // Load cached notifications from AsyncStorage (user-specific)
        const userId = auth.currentUser.uid;
        previousUserIdRef.current = userId;
        const cacheKey = `notifications_${userId}`;
        const cachedNotifications = await AsyncStorage.getItem(cacheKey);
        if (cachedNotifications) {
          const parsedNotifications = JSON.parse(cachedNotifications);
          setNotifications(parsedNotifications);
          setUnreadCount(parsedNotifications.filter(n => !n.read).length);
        }
        // Set up listeners for new notifications
        if (unsubscribe) unsubscribe();
        unsubscribe = setupNotificationListeners(userId, cacheKey);
        setLoading(false);
      } catch (error) {
        console.error('Error initializing notifications:', error);
        setLoading(false);
      }
    };
    initializeNotifications();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [auth.currentUser]);

  // Set up listeners for different notification types based on user type
  const setupNotificationListeners = (userId, cacheKey) => {
    if (!userId) return;
    // Listen to notifications for this user
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const newNotifications = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        newNotifications.push({
          id: doc.id,
          ...data,
        });
      });
      console.log('[NotificationContext] onSnapshot fired. Notifications:', newNotifications);
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.read).length);
      AsyncStorage.setItem(cacheKey, JSON.stringify(newNotifications));
    });
    return unsubscribe;
  };

  // Mark a notification as read
  const markAsRead = async (notificationId) => {
    try {
      const updatedNotifications = notifications.map(notification => {
        if (notification.id === notificationId && !notification.read) {
          return { ...notification, read: true };
        }
        return notification;
      });

      setNotifications(updatedNotifications);
      setUnreadCount(updatedNotifications.filter(n => !n.read).length);
      
      // Update AsyncStorage (user-specific)
      const userId = auth.currentUser?.uid;
      if (userId) {
        const cacheKey = `notifications_${userId}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(updatedNotifications));
      }

      // If it's a Firestore notification, update the read status in Firestore
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && notification.type === 'system') {
        await updateDoc(doc(db, 'notifications', notificationId), {
          read: true
        });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const updatedNotifications = notifications.map(notification => {
        return { ...notification, read: true };
      });

      setNotifications(updatedNotifications);
      setUnreadCount(updatedNotifications.filter(n => !n.read).length);
      
      // Update AsyncStorage (user-specific)
      const userId = auth.currentUser?.uid;
      if (userId) {
        const cacheKey = `notifications_${userId}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(updatedNotifications));
      }

      // Update all system notifications in Firestore
      const systemNotifications = notifications.filter(n => n.type === 'system' && !n.read);
      for (const notification of systemNotifications) {
        await updateDoc(doc(db, 'notifications', notification.id), {
          read: true
        });
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Clear a notification
  const clearNotification = async (notificationId) => {
    try {
      const updatedNotifications = notifications.filter(notification => notification.id !== notificationId);
      setNotifications(updatedNotifications);
      setUnreadCount(updatedNotifications.filter(n => !n.read).length);
      
      // Update AsyncStorage (user-specific)
      const userId = auth.currentUser?.uid;
      if (userId) {
        const cacheKey = `notifications_${userId}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(updatedNotifications));
      }
    } catch (error) {
      console.error('Error clearing notification:', error);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    try {
      setNotifications([]);
      setUnreadCount(0);
      
      // Update AsyncStorage (user-specific)
      const userId = auth.currentUser?.uid;
      if (userId) {
        const cacheKey = `notifications_${userId}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify([]));
      }
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  // Add a manual notification (for testing or system messages)
  const addNotification = async (notification) => {
    try {
      const newNotification = {
        id: `manual-${Date.now()}`,
        createdAt: new Date(),
        read: false,
        ...notification
      };

      const updatedNotifications = [newNotification, ...notifications];
      setNotifications(updatedNotifications);
      setUnreadCount(updatedNotifications.filter(n => !n.read).length);
      
      // Update AsyncStorage (user-specific)
      const userId = auth.currentUser?.uid;
      if (userId) {
        const cacheKey = `notifications_${userId}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(updatedNotifications));
      }
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        userType,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications,
        addNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
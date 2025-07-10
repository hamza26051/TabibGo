import React, { useState, useEffect } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { TouchableOpacity, Text, StyleSheet, View, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { uploadImageToCloudinary } from '../utils/cloudinaryUtils';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { useNotification } from '../context/NotificationContext';
import HomeScreen from '../screens/HomeScreen';
import BookingScreen from '../screens/BookingScreen';
import MapScreen from '../screens/MapScreen';
import LocationScreen from '../screens/LocationScreen';
import HistoryScreen from '../screens/HistoryScreen';
import DoctorScreen from '../screens/DoctorScreen';
import DoctorDashboardScreen from '../screens/DoctorDashboardScreen';
import DoctorMapScreen from '../screens/DoctorMapScreen';
import HelpScreen from '../screens/HelpScreen';
import SupportFormScreen from '../screens/SupportFormScreen';
import ChatScreen from '../screens/ChatScreen';
import SupportHistoryScreen from '../screens/SupportHistoryScreen';
import DoctorFAQScreen from '../screens/DoctorFAQScreen';
import AppointmentFAQScreen from '../screens/AppointmentFAQScreen';
import PrescriptionFAQScreen from '../screens/PrescriptionFAQScreen';
import SettingsScreen from '../screens/SettingsScreen';
import DoctorHelpScreen from '../screens/DoctorHelpScreen';
import DoctorVerificationFAQScreen from '../screens/DoctorVerificationFAQScreen';
import PatientManagementFAQScreen from '../screens/PatientManagementFAQScreen';
import WritePrescriptionScreen from '../screens/WritePrescriptionScreen';
import DoctorHistoryScreen from '../screens/DoctorHistoryScreen';
import NotificationScreen from '../screens/NotificationScreen';
import { Card } from '../components';
import StarRating from 'react-native-star-rating-widget';
import { getAverageRating, fetchUserRatings } from '../firebase/ratingService';
import { useRating } from '../context/RatingContext';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import CallAmbulanceScreen from '../screens/CallAmbulanceScreen';
import { useMode } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

// Create drawer navigator
const Drawer = createDrawerNavigator();

// Custom drawer content component
const CustomDrawerContent = (props) => {
  const { navigation } = props;
  const { logout, currentUser } = useAuth();
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const { unreadCount } = useNotification();
  const { lastUpdated } = useRating();
  const { currentMode, setCurrentMode } = useMode();
  const [isDoctor, setIsDoctor] = useState(false);
  const [averageRating, setAverageRating] = useState(null);
  const [rawRatings, setRawRatings] = useState([]);
  const [profilePicture, setProfilePicture] = useState(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [hasUnreadSupport, setHasUnreadSupport] = useState(false);
  const { language } = useLanguage();
  
  // Check if user is a doctor and load profile picture
  useEffect(() => {
    const checkDoctorStatus = async () => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.isDoctor) {
          setIsDoctor(true);
            // For doctors, try to load verification selfie as profile picture
            if (userData.verificationSelfie) {
              setProfilePicture(userData.verificationSelfie);
            } else if (userData.profilePicture) {
              setProfilePicture(userData.profilePicture);
            }
          } else {
            // For patients, load regular profile picture
            if (userData.profilePicture) {
              setProfilePicture(userData.profilePicture);
            }
          }
        }
      }
    };
    
    checkDoctorStatus();
  }, [currentUser]);
  
  useEffect(() => {
    const fetchAllMatches = async () => {
      if (currentUser && currentMode === 'patient') {
        const q = query(
          collection(db, 'doctorPatientMatches'),
          where('patientId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const docs = [];
        snapshot.forEach(docSnap => {
          docs.push({ id: docSnap.id, ...docSnap.data() });
        });
        console.log('ALL MATCHES FOR PATIENT:', docs);
        setRawRatings(docs.map(d => d.patientRating));
        const ratings = docs.filter(d => typeof d.patientRating === 'number');
        setAverageRating(
          ratings.length
            ? Math.round((ratings.reduce((a, b) => a + b.patientRating, 0) / ratings.length) * 100) / 100
            : null
        );
      } else if (currentUser && currentMode === 'doctor') {
        // Doctor mode: show all doctorRating
        const q = query(
          collection(db, 'doctorPatientMatches'),
          where('doctorId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const docs = [];
        snapshot.forEach(docSnap => {
          docs.push({ id: docSnap.id, ...docSnap.data() });
        });
        console.log('ALL MATCHES FOR DOCTOR:', docs);
        setRawRatings(docs.map(d => d.doctorRating));
        const ratings = docs.filter(d => typeof d.doctorRating === 'number');
        setAverageRating(
          ratings.length
            ? Math.round((ratings.reduce((a, b) => a + b.doctorRating, 0) / ratings.length) * 100) / 100
            : null
        );
      }
    };
    fetchAllMatches();
  }, [currentUser, currentMode, lastUpdated]);

  useEffect(() => {
    let unsubscribe;
    if (currentUser) {
      const requestsQuery = query(
        collection(db, 'supportRequests'),
        where('userId', '==', currentUser.uid),
        where('adminReplied', '==', true),
        where('userViewed', '==', false)
      );
      unsubscribe = onSnapshot(requestsQuery, (querySnapshot) => {
        setHasUnreadSupport(!querySnapshot.empty);
      });
    }
    return () => unsubscribe && unsubscribe();
  }, [currentUser]);
  
  const handleLogout = async () => {
    try {
      await logout();
      // Navigation to Login screen is handled by AppNavigator based on auth state
    } catch (error) {
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  const pickProfilePicture = async () => {
    // Check if user is a doctor - if so, prevent profile picture change
    if (isDoctor) {
      Alert.alert(
        'Profile Picture Locked', 
        'As a verified doctor, your profile picture is locked to your verification selfie and cannot be changed.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need media library permission to select a profile picture');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for profile picture
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        await uploadProfilePicture(imageUri);
      }
    } catch (error) {
      console.error('Error picking profile picture:', error);
      Alert.alert('Error', 'Failed to select profile picture. Please try again.');
    }
  };

  const uploadProfilePicture = async (imageUri) => {
    try {
      setUploadingProfile(true);
      
      // Upload to Cloudinary
      const imageUrl = await uploadImageToCloudinary(imageUri, 'profile_pictures');
      
      // Update user document in Firestore
      await updateDoc(doc(db, 'users', currentUser.uid), {
        profilePicture: imageUrl
      });
      
      // Update local state
      setProfilePicture(imageUrl);
      setUploadingProfile(false);
      
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setUploadingProfile(false);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
    }
  };

  const toggleMode = () => {
    if (isDoctor) {
      const newMode = currentMode === 'patient' ? 'doctor' : 'patient';
      setCurrentMode(newMode);
      
      if (newMode === 'doctor') {
        navigation.navigate('DoctorDashboard');
      } else {
        navigation.navigate('Home');
      }
    } else {
      // If not a doctor, redirect to doctor application screen
      navigation.navigate('Doctor');
    }
  };

  const urduText = {
    go_to_dashboard: 'ڈیش بورڈ پر جائیں',
    notifications: 'اطلاعات',
    call_ambulance: 'ایمبولینس بلائیں',
    my_history: 'میری تاریخ',
    request_doctor: 'ڈاکٹر کی درخواست کریں',
    support_help: 'سپورٹ اور مدد',
    my_support_tickets: 'میری سپورٹ ٹکٹس',
    settings: 'ترتیبات',
    doctor_dashboard: 'ڈاکٹر ڈیش بورڈ',
    find_patient: 'مریض تلاش کریں',
    patient_history: 'وزٹ',
    logout: 'لاگ آؤٹ',
    switch_to_doctor: 'ڈاکٹر موڈ پر جائیں',
    switch_to_patient: 'مریض موڈ پر جائیں',
    become_doctor: 'ڈاکٹر بنیں',
    profile_picture_locked: 'پروفائل تصویر تصدیقی سیلفی پر مقفل ہے',
    doctor_rating: 'ڈاکٹر ریٹنگ',
    patient_rating: 'مریض ریٹنگ',
    no_doctor_ratings: 'ابھی تک کوئی ڈاکٹر ریٹنگ نہیں',
    no_patient_ratings: 'ابھی تک کوئی مریض ریٹنگ نہیں',
  };

  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: colors.background }}>
      <Card variant="elevated" elevation={6} style={[styles.drawerCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}> 
        {/* User Info (optional) */}
        {currentUser && (
          <View style={styles.userInfoSection}>
            <TouchableOpacity 
              style={[
                styles.profilePictureContainer,
                isDoctor && styles.profilePictureContainerLocked
              ]} 
              onPress={pickProfilePicture}
              disabled={uploadingProfile}
            >
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.profilePicture} />
              ) : (
                <View style={[styles.profilePicturePlaceholder, { backgroundColor: colors.inputBackground }]}>
                  <Ionicons name="person" size={32} color={colors.primary} />
                </View>
              )}
              <View style={[styles.profilePictureOverlay, { backgroundColor: colors.primary + '20' }]}>
                {uploadingProfile ? (
                  <Ionicons name="cloud-upload" size={20} color={colors.primary} />
                ) : isDoctor ? (
                  <Ionicons name="lock-closed" size={20} color={colors.primary} />
                ) : (
                  <Ionicons name="camera" size={20} color={colors.primary} />
                )}
              </View>
                          </TouchableOpacity>
            {isDoctor && (
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4, textAlign: 'center' }}>
                {language === 'ur' ? urduText.profile_picture_locked : 'Profile picture locked to verification selfie'}
              </Text>
            )}
            <Text variant="subheading" weight="bold" style={{ color: colors.primary, marginBottom: 2 }}>
              {currentUser.displayName || currentUser.email || 'User'}
            </Text>
            <Text style={{ color: colors.textLight, fontSize: 14, marginBottom: 2 }}>{currentUser.email}</Text>
            <View style={{ alignItems: 'center', marginVertical: 4 }}>
              <StarRating
                rating={averageRating ? Math.round(averageRating) : 0}
                onChange={() => {}}
                starSize={20}
                maxStars={5}
                color="#FFD700"
                enableSwiping={false}
                enableHalfStar={true}
                disabled={true}
              />
              <Text style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                {averageRating ? (language === 'ur' ? `${currentMode === 'doctor' ? urduText.doctor_rating : urduText.patient_rating}: ${averageRating.toFixed(2)}` : `${currentMode === 'doctor' ? 'Doctor' : 'Patient'} Rating: ${averageRating.toFixed(2)}`) : (language === 'ur' ? (currentMode === 'doctor' ? urduText.no_doctor_ratings : urduText.no_patient_ratings) : `No ${currentMode === 'doctor' ? 'doctor' : 'patient'} ratings yet`)}
              </Text>
            </View>
          </View>
        )}
        {/* Mode Switch */}
        <TouchableOpacity 
          style={[
            styles.modeSwitchModern,
            { borderColor: colors.primary },
            currentMode === 'doctor'
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.card }
          ]}
          onPress={toggleMode}
        >
          <Text variant="body" weight="semibold" style={{ color: currentMode === 'doctor' ? colors.buttonText : colors.primary }}>
            {isDoctor 
              ? (language === 'ur' ? (currentMode === 'patient' ? urduText.switch_to_doctor : urduText.switch_to_patient) : `Switch to ${currentMode === 'patient' ? 'Doctor' : 'Patient'} Mode`)
              : (language === 'ur' ? urduText.become_doctor : 'Become a Doctor')}
          </Text>
        </TouchableOpacity>
        {/* Menu Items */}
        <View style={styles.menuSection}>
          {currentMode === 'patient' ? (
            <>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Home')}>
                <Text variant="body" style={{ color: colors.text }}>{language === 'ur' ? urduText.go_to_dashboard : 'Go to Dashboard'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Notification')}>
                <View style={styles.menuItemRow}>
                  <Text variant="body" style={{ color: colors.text }}>{language === 'ur' ? urduText.notifications : 'Notifications'}</Text>
                  {unreadCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}> 
                      <Text style={[styles.badgeText, { color: colors.buttonText }]}>{unreadCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('CallAmbulance')}>
                <View style={styles.menuItemRow}>
                  <Ionicons name="medkit" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text variant="body" style={{ color: colors.text }}>{language === 'ur' ? urduText.call_ambulance : 'Call an Ambulance'}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('History')}>
                <Text variant="body" style={{ color: colors.text }}>{language === 'ur' ? urduText.my_history : 'My History'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Location')}>
                <Text variant="body" style={{ color: colors.text }}>{language === 'ur' ? urduText.request_doctor : 'Request a Doctor'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Help')}>
                <Text variant="body" style={{ color: colors.text }}>{language === 'ur' ? urduText.support_help : 'Support & Help'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('SupportHistory')}>
                <View style={styles.menuItemRow}>
                  <Text variant="body" style={{ color: colors.text }}>{language === 'ur' ? urduText.my_support_tickets : 'My Support Tickets'}</Text>
                  {hasUnreadSupport && (
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#2196F3', marginLeft: 8 }} />
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Settings')}>
                <Text variant="body" style={{ color: colors.text }}>{language === 'ur' ? urduText.settings : 'Settings'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('DoctorDashboard')}>
                <Text variant="body" style={{ color: colors.text }}>{language === 'ur' ? urduText.doctor_dashboard : 'Doctor Dashboard'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Notification')}>
                <View style={styles.menuItemRow}>
                  <Text variant="body" style={{ color: colors.text }}>{language === 'ur' ? urduText.notifications : 'Notifications'}</Text>
                  {unreadCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}> 
                      <Text style={[styles.badgeText, { color: colors.buttonText }]}>{unreadCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('DoctorMap')}>
                <Text variant="body" style={{ color: colors.text }}>{language === 'ur' ? urduText.find_patient : 'Find a Patient'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('DoctorHistory')}>
                <Text variant="body" style={{ color: colors.text }}>{language === 'ur' ? urduText.patient_history : 'Patient History'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('DoctorHelp')}>
                <Text variant="body" style={{ color: colors.text }}>{language === 'ur' ? urduText.support_help : 'Support & Help'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('SupportHistory')}>
                <View style={styles.menuItemRow}>
                  <Text variant="body" style={{ color: colors.text }}>{language === 'ur' ? urduText.my_support_tickets : 'My Support Tickets'}</Text>
                  {hasUnreadSupport && (
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#2196F3', marginLeft: 8 }} />
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Settings')}>
                <Text variant="body" style={{ color: colors.text }}>{language === 'ur' ? urduText.settings : 'Settings'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        {/* Logout Button */}
        <TouchableOpacity style={[styles.logoutButtonModern, { backgroundColor: colors.error }]} onPress={handleLogout}>
          <Text variant="body" weight="bold" style={{ color: colors.buttonText }}>{language === 'ur' ? urduText.logout : 'Logout'}</Text>
        </TouchableOpacity>
      </Card>
    </DrawerContentScrollView>
  );
};

// Custom header with menu button
const CustomHeader = ({ navigation, title }) => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  
  return (
    <View style={{ height: 0, backgroundColor: 'transparent' }} />
  );
};

const DrawerNavigator = () => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation, route }) => ({
        headerShown: true,
        header: (props) => <CustomHeader {...props} title={route.name} navigation={navigation} />,
        drawerStyle: {
          width: 200,
          backgroundColor: colors.background,
        },
      })}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Booking" component={BookingScreen} />
      <Drawer.Screen name="Map" component={MapScreen} />
      <Drawer.Screen name="Location" component={LocationScreen} />
      <Drawer.Screen name="History" component={HistoryScreen} />
      <Drawer.Screen name="Doctor" component={DoctorScreen} />
      <Drawer.Screen name="DoctorDashboard" component={DoctorDashboardScreen} />
      <Drawer.Screen name="DoctorMap" component={DoctorMapScreen} />
      <Drawer.Screen name="Help" component={HelpScreen} />
      <Drawer.Screen name="SupportForm" component={SupportFormScreen} />
      <Drawer.Screen name="Chat" component={ChatScreen} />
      <Drawer.Screen name="SupportHistory" component={SupportHistoryScreen} />
      <Drawer.Screen name="DoctorFAQ" component={DoctorFAQScreen} />
      <Drawer.Screen name="AppointmentFAQ" component={AppointmentFAQScreen} />
      <Drawer.Screen name="PrescriptionFAQ" component={PrescriptionFAQScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="DoctorHelp" component={DoctorHelpScreen} />
      <Drawer.Screen name="DoctorVerificationFAQ" component={DoctorVerificationFAQScreen} />
      <Drawer.Screen name="PatientManagementFAQ" component={PatientManagementFAQScreen} />
      <Drawer.Screen name="WritePrescription" component={WritePrescriptionScreen} />
      <Drawer.Screen name="DoctorHistory" component={DoctorHistoryScreen} />
      <Drawer.Screen name="Notification" component={NotificationScreen} />
      <Drawer.Screen name="CallAmbulance" component={CallAmbulanceScreen} options={{ title: 'Call an Ambulance' }} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerCard: {
    flex: 1,
    margin: 10,
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 0,
    elevation: 8,
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  userInfoSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
  },
  profilePicturePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePictureOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profilePictureContainerLocked: {
    opacity: 0.8,
  },
  modeSwitchModern: {
    alignSelf: 'center',
    borderRadius: 32,
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 28,
    marginBottom: 18,
    marginTop: 2,
    backgroundColor: 'transparent',
  },
  menuSection: {
    flex: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    marginHorizontal: 8,
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  divider: {
    height: 1.5,
    marginVertical: 12,
    marginHorizontal: 18,
    borderRadius: 2,
  },
  logoutButtonModern: {
    marginHorizontal: 18,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    elevation: 2,
  },
});

export default DrawerNavigator;
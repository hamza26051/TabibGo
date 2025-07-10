import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Animated,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotification } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Text, Card, Button } from '../components';
import { useLanguage } from '../context/LanguageContext';

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  backButton: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  actionButton: {
    marginLeft: 8,
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  notificationItem: {
    marginBottom: 12,
    borderLeftWidth: 4,
    padding: 0,
    overflow: 'hidden',
  },
  notificationContent: {
    flex: 1,
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    marginBottom: 4,
  },
  notificationMessage: {
    marginBottom: 4,
  },
  notificationDate: {
    marginTop: 4,
  },
  deleteButton: {
    padding: 12,
    position: 'absolute',
    top: 0,
    right: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
  },
});

const NotificationScreen = () => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors);
  const navigation = useNavigation();
  
  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(20));
  
  // Animation effect on component mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);
  
  // Function to provide haptic feedback on button press
  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  
  const {
    notifications,
    unreadCount,
    loading,
    userType,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications
  } = useNotification();

  const { language } = useLanguage();

  // Urdu translation mapping for all user-facing text
  const urduText = {
    notifications: 'اطلاعات',
    mark_all_read: 'سب کو پڑھا ہوا بنائیں',
    clear_all: 'سب صاف کریں',
    clear_all_title: 'تمام اطلاعات صاف کریں',
    clear_all_message: 'کیا آپ واقعی تمام اطلاعات صاف کرنا چاہتے ہیں؟',
    cancel: 'منسوخ کریں',
    clear: 'صاف کریں',
    no_notifications: 'ابھی تک کوئی اطلاع نہیں',
  };

  // Urdu mapping for common notification titles and messages
  const urduNotificationMap = {
    // Titles
    'Appointment Confirmed': 'اپوائنٹمنٹ کی تصدیق',
    'Prescription Ready': 'نسخہ تیار ہے',
    'Doctor Assigned': 'ڈاکٹر مقرر ہو گیا',
    'Request Accepted': 'درخواست منظور ہو گئی',
    'Request Rejected': 'درخواست مسترد ہو گئی',
    'New Message': 'نیا پیغام',
    'Support Reply': 'سپورٹ کا جواب',
    'System Alert': 'سسٹم الرٹ',
    'Match Found': 'ڈاکٹر مل گیا',
    'New Support Message': 'نیا سپورٹ پیغام',
    'New Support Image': 'نئی سپورٹ تصویر',
    'Doctor Application Approved': 'ڈاکٹر کی درخواست منظور ہو گئی',
    'New Prescription': 'نیا نسخہ',
    'You received a new rating!': 'آپ کو نئی ریٹنگ ملی ہے!',
    // Messages
    'Your appointment is confirmed for tomorrow.': 'آپ کی اپوائنٹمنٹ کل کے لیے تصدیق ہو گئی ہے۔',
    'Your prescription is ready.': 'آپ کا نسخہ تیار ہے۔',
    'A doctor has been assigned to your case.': 'آپ کے کیس کے لیے ڈاکٹر مقرر ہو گیا ہے۔',
    'Your request has been accepted.': 'آپ کی درخواست منظور ہو گئی ہے۔',
    'Your request has been rejected.': 'آپ کی درخواست مسترد ہو گئی ہے۔',
    'You have a new message.': 'آپ کے پاس نیا پیغام ہے۔',
    'Support has replied to your ticket.': 'سپورٹ نے آپ کی ٹکٹ کا جواب دیا ہے۔',
    'This is a system alert.': 'یہ ایک سسٹم الرٹ ہے۔',
    'A match has been found for your request.': 'آپ کی درخواست کے لیے ڈاکٹر مل گیا ہے۔',
    'Dr. has written you a new prescription': 'ڈاکٹر نے آپ کے لیے نیا نسخہ لکھا ہے',
    'Congratulations! Your application to become a doctor has been approved.': 'مبارک ہو! آپ کی ڈاکٹر بننے کی درخواست منظور ہو گئی ہے۔',
    'You received a rating from the patient.': 'آپ کو مریض کی طرف سے ریٹنگ ملی ہے۔',
    'You received a rating from the doctor.': 'آپ کو ڈاکٹر کی طرف سے ریٹنگ ملی ہے۔',
  };

  // Urdu numerals and months
  const urduNumerals = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  const urduMonths = ['جنوری','فروری','مارچ','اپریل','مئی','جون','جولائی','اگست','ستمبر','اکتوبر','نومبر','دسمبر'];
  function toUrduNumber(str) {
    return String(str).replace(/[0-9]/g, d => urduNumerals[d]);
  }
  function formatUrduDate(date) {
    if (!(date instanceof Date)) return '';
    const day = toUrduNumber(date.getDate());
    const month = urduMonths[date.getMonth()];
    const year = toUrduNumber(date.getFullYear());
    let hour = toUrduNumber(date.getHours());
    let minute = toUrduNumber(date.getMinutes().toString().padStart(2, '0'));
    return `${day} ${month} ${year}، ${hour}:${minute}`;
  }

  // Helper to translate notification titles/messages
  function translateNotification(val) {
    if (language === 'ur' && typeof val === 'string') {
      return urduNotificationMap[val.trim()] || val;
    }
    return val;
  }

  // Handle notification press
  const handleNotificationPress = (notification) => {
    // Provide haptic feedback
    triggerHaptic();
    
    // Mark notification as read
    markAsRead(notification.id);
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'prescription':
        navigation.navigate('History'); // Navigate to prescriptions/history
        break;
      case 'match':
        if (userType === 'patient') {
          navigation.navigate('Map', { fromNotification: true });
        } else {
          navigation.navigate('DoctorMap', { fromNotification: true });
        }
        break;
      case 'request':
        navigation.navigate('DoctorMap', { fromNotification: true });
        break;
      case 'system':
        // Just mark as read, no navigation needed
        break;
      default:
        break;
    }
  };

  // Render notification item
  const renderNotificationItem = ({ item }) => {
    let notificationDate;
    if (item.createdAt && typeof item.createdAt.toDate === 'function') {
      notificationDate = item.createdAt.toDate();
    } else if (item.createdAt && typeof item.createdAt === 'object' && item.createdAt.seconds) {
      // Firestore Timestamp as plain object
      notificationDate = new Date(item.createdAt.seconds * 1000);
    } else {
      notificationDate = new Date(item.createdAt);
    }
    const formattedDate = isNaN(notificationDate.getTime())
      ? ''
      : (language === 'ur'
          ? formatUrduDate(notificationDate)
          : `${notificationDate.toLocaleDateString()} ${notificationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    
    // Choose icon based on notification type
    let iconName = 'notifications-outline';
    switch (item.type) {
      case 'prescription':
        iconName = 'document-text-outline';
        break;
      case 'match':
        iconName = 'people-outline';
        break;
      case 'request':
        iconName = 'medkit-outline';
        break;
      case 'system':
        iconName = 'information-circle-outline';
        break;
      default:
        break;
    }
    
    return (
      <Card
        variant="elevated"
        elevation={2}
        style={[styles.notificationItem, 
          { borderLeftColor: item.read ? colors.divider : colors.primary }
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 102, 204, 0.1)' }]}>
              <Ionicons name={iconName} size={22} color={colors.primary} />
            </View>
            <View style={styles.notificationTextContainer}>
              <Text variant="body" weight="semibold" style={styles.notificationTitle}>
                {translateNotification(item.title)}
              </Text>
              <Text variant="body" color={colors.textSecondary} style={styles.notificationMessage}>
                {translateNotification(item.message)}
              </Text>
              <Text variant="caption" color={colors.textTertiary} style={styles.notificationDate}>
                {formattedDate}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => {
            triggerHaptic();
            clearNotification(item.id);
          }}
        >
          <Ionicons name="close-circle-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </Card>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={60} color={colors.textTertiary} />
      <Text variant="body" size="lg" color={colors.textSecondary} style={styles.emptyText}>
        {language === 'ur' ? urduText.no_notifications : 'No notifications yet'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      {/* Header with gradient */}
      <LinearGradient
        colors={[colors.primary, isDarkMode ? '#1A3A5A' : '#4D94FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity 
          onPress={() => {
            triggerHaptic();
            navigation.goBack();
          }} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.buttonText} />
        </TouchableOpacity>
        <Text variant="subheading" color={colors.buttonText} style={styles.headerTitle}>
          {language === 'ur' ? urduText.notifications : 'Notifications'} {unreadCount > 0 && `(${unreadCount})`}
        </Text>
      </LinearGradient>
      
      <View style={styles.contentContainer}>
        {notifications.length > 0 && (
          <View style={styles.headerButtons}>
            <Button 
              variant="outline" 
              size="small"
              icon="checkmark-done-outline"
              onPress={() => {
                triggerHaptic();
                markAllAsRead();
              }}
              style={styles.actionButton}
            >
              {language === 'ur' ? urduText.mark_all_read : 'Mark All Read'}
            </Button>
            <Button 
              variant="outline" 
              size="small"
              icon="trash-outline"
              onPress={() => {
                triggerHaptic();
                Alert.alert(
                  language === 'ur' ? urduText.clear_all_title : 'Clear All Notifications',
                  language === 'ur' ? urduText.clear_all_message : 'Are you sure you want to clear all notifications?',
                  [
                    { text: language === 'ur' ? urduText.cancel : 'Cancel', style: 'cancel' },
                    { text: language === 'ur' ? urduText.clear : 'Clear All', style: 'destructive', onPress: clearAllNotifications }
                  ]
                );
              }}
              style={[styles.actionButton, { borderColor: colors.error }]}
              textStyle={{ color: colors.error }}
            >
              {language === 'ur' ? urduText.clear_all : 'Clear All'}
            </Button>
          </View>
        )}
        
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          flex: 1
        }}>
          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

export default NotificationScreen;
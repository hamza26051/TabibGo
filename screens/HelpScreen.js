import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Animated,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Text, Card, Button } from '../components';
// import translations from '../translations/appTranslations';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../translations';

const createStyles = (colors) => {
  return StyleSheet.create({
    container: {
      flex: 1,
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
    supportHoursContainer: {
      marginBottom: 20,
      padding: 16,
    },
    supportHoursText: {
      marginBottom: 8,
    },
    supportLink: {
      textDecorationLine: 'underline',
    },
    sectionTitle: {
      marginBottom: 16,
    },
    topicsContainer: {
      marginBottom: 20,
    },
    topicItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    topicContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    topicTitle: {
      fontSize: 16,
    },
    supportHistoryButton: {
      marginBottom: 30,
    },
  });
};

const HelpScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors);
  const { language } = useLanguage();
  
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
  
  // Support topics for medical app
  const supportTopics = [
    { id: 1, title: 'Booking a Doctor', icon: 'medkit-outline' },
    { id: 2, title: 'Doctor Verification', icon: 'shield-checkmark-outline' },
    { id: 3, title: 'Appointments', icon: 'calendar-outline' },
    { id: 4, title: 'Prescriptions', icon: 'document-text-outline' },
    { id: 5, title: 'App Issues', icon: 'phone-portrait-outline' },
    { id: 6, title: 'About MUCUS', icon: 'information-circle-outline' },
  ];

  const handleTopicPress = (topic) => {
    // Provide haptic feedback
    triggerHaptic();
    
    // Navigate to the appropriate FAQ screen based on the topic
    switch(topic.title) {
      case 'Booking a Doctor':
      case 'Doctor Verification':
        navigation.navigate('DoctorFAQ');
        break;
      case 'Appointments':
        navigation.navigate('AppointmentFAQ');
        break;
      case 'Prescriptions':
        navigation.navigate('PrescriptionFAQ');
        break;
      default:
        // For other topics, navigate directly to the support form
        navigation.navigate('SupportForm', { topic: topic.title });
        break;
    }
  };

  // Add Urdu topic mapping
  const urduTopics = {
    'Booking a Doctor': 'ڈاکٹر کی بکنگ',
    'Doctor Verification': 'ڈاکٹر کی تصدیق',
    'Appointments': 'اپوائنٹمنٹس',
    'Prescriptions': 'نسخے',
    'App Issues': 'ایپ کے مسائل',
    'About MUCUS': 'ایم یو کس کے بارے میں',
  };

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
        <Text variant="subheading" color={colors.buttonText} style={styles.headerTitle}>{t('help_header', language)}</Text>
      </LinearGradient>

      <ScrollView 
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}>
          <Card 
            variant="elevated" 
            elevation={2}
            style={styles.supportHoursContainer}
          >
            <Text variant="body" style={styles.supportHoursText}>{t('help_support_hours', language)}</Text>
            <TouchableOpacity 
              onPress={() => {
                triggerHaptic();
                navigation.navigate('SupportForm');
              }}
            >
              <Text variant="body" style={styles.supportLink}>{t('help_support_form', language)}</Text>
            </TouchableOpacity>
          </Card>

          <Text variant="heading" size="lg" weight="semibold" style={styles.sectionTitle}>{t('help_support_history', language)}</Text>

          <TouchableOpacity
            style={styles.supportHistoryButton}
            onPress={() => navigation.navigate('SupportHistory')}
          >
            <Text variant="body" style={styles.supportLink}>{t('help_support_history', language)}</Text>
          </TouchableOpacity>

          <Text variant="heading" size="lg" weight="semibold" style={styles.sectionTitle}>{t('help_header', language)}</Text>

          <View style={styles.topicsContainer}>
            {supportTopics.map((topic) => (
              <TouchableOpacity
                key={topic.id}
                style={styles.topicItem}
                onPress={() => handleTopicPress(topic)}
              >
                <View style={styles.topicContent}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.primary + '22' }]}> 
                    <Ionicons name={topic.icon} size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.topicTitle}>
                    {language === 'ur' ? urduTopics[topic.title] || topic.title : topic.title}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HelpScreen;
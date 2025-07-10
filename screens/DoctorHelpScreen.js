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
import { useLanguage } from '../context/LanguageContext';

const DoctorHelpScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  
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
  // Support topics for doctors
  const supportTopics = [
    { id: 1, title: 'Doctor Verification', icon: 'shield-checkmark-outline' },
    { id: 2, title: 'Patient Management', icon: 'people-outline' },
    { id: 3, title: 'Prescriptions', icon: 'document-text-outline' },
    { id: 4, title: 'Appointments', icon: 'calendar-outline' },
    { id: 5, title: 'Payment & Earnings', icon: 'cash-outline' },
    { id: 6, title: 'App Issues', icon: 'phone-portrait-outline' },
  ];

  const handleTopicPress = (topic) => {
    // Navigate to the appropriate FAQ screen based on the topic
    switch(topic.title) {
      case 'Doctor Verification':
        navigation.navigate('DoctorVerificationFAQ');
        break;
      case 'Patient Management':
        navigation.navigate('PatientManagementFAQ');
        break;
      case 'Prescriptions':
        navigation.navigate('PrescriptionFAQ');
        break;
      case 'Appointments':
        navigation.navigate('AppointmentFAQ');
        break;
      default:
        // For other topics, navigate directly to the support form
        navigation.navigate('SupportForm', { topic: topic.title });
        break;
    }
  };

  const createStyles = (colors) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: colors.buttonText,
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
      color: colors.text,
    },
    supportLink: {
      textDecorationLine: 'underline',
      color: colors.primary,
    },
    sectionTitle: {
      marginBottom: 16,
      color: colors.text,
    },
    topicsContainer: {
      marginBottom: 20,
    },
    topicItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      marginBottom: 12,
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
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
      backgroundColor: colors.primary + '1A', // Adjusted for dark mode
    },
    topicTitle: {
      fontSize: 16,
      color: colors.text,
    },
    supportHistoryButton: {
      marginVertical: 16,
    },
  });

  const styles = createStyles(colors);

  const urduText = {
    header: 'ڈاکٹر سپورٹ اور مدد',
    support_hours: 'ڈاکٹر سپورٹ کے اوقات: روزانہ 09:00-00:00۔ تکنیکی مسائل یا اکاؤنٹ سے متعلق سوالات کے لیے کسی بھی وقت درخواست جمع کروائیں۔',
    support_form: 'سپورٹ فارم',
    main_topics: 'اہم موضوعات',
    view_tickets: 'میری سپورٹ ٹکٹ دیکھیں',
    topics: {
      'Doctor Verification': 'ڈاکٹر کی تصدیق',
      'Patient Management': 'مریض کا انتظام',
      'Prescriptions': 'نسخے',
      'Appointments': 'اپوائنٹمنٹس',
      'Payment & Earnings': 'ادائیگی اور آمدنی',
      'App Issues': 'ایپ کے مسائل',
    },
  };
  const { language } = useLanguage();

  return (
    <SafeAreaView style={styles.container}>
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
        <Text variant="subheading" color={colors.buttonText} style={styles.headerTitle}>{language === 'ur' ? urduText.header : 'Doctor Support & Help'}</Text>
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
            <Text variant="body" style={styles.supportHoursText}>{language === 'ur' ? urduText.support_hours : 'Doctor support hours: 09:00-00:00 daily. For technical issues or inquiries about your account, submit a request anytime.'}</Text>
            <TouchableOpacity 
              onPress={() => {
                triggerHaptic();
                navigation.navigate('SupportForm', { topic: 'Doctor Support' });
              }}
            >
              <Text variant="body" weight="semibold" color={colors.primary} style={styles.supportLink}>{language === 'ur' ? urduText.support_form : 'Support Form'}</Text>
            </TouchableOpacity>
          </Card>

          <Text variant="heading" size="lg" weight="semibold" style={styles.sectionTitle}>{language === 'ur' ? urduText.main_topics : 'Main topics'}</Text>

          <View style={styles.topicsContainer}>
            {supportTopics.map((topic) => (
              <Card 
                key={topic.id} 
                variant="elevated"
                elevation={2}
                style={styles.topicItem}
                onPress={() => {
                  triggerHaptic();
                  handleTopicPress(topic);
                }}
              >
                <View style={styles.topicContent}>
                  <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 102, 204, 0.1)' }]}>
                    <Ionicons name={topic.icon} size={22} color={colors.primary} />
                  </View>
                  <Text variant="body" weight="medium" style={styles.topicTitle}>{language === 'ur' ? urduText.topics[topic.title] || topic.title : topic.title}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              </Card>
            ))}
          </View>

          <Button 
            variant="primary" 
            fullWidth 
            icon="document-text-outline"
            style={styles.supportHistoryButton}
            onPress={() => {
              triggerHaptic();
              navigation.navigate('SupportHistory');
            }}
          >
            {language === 'ur' ? urduText.view_tickets : 'View My Support Tickets'}
          </Button>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DoctorHelpScreen;
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Text, Card, Button } from '../components';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../translations';

const AppointmentFAQScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
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
  // FAQ items for appointments section
  const faqItems = [
    {
      id: 1,
      question: t('appointmentFAQ_1_q', language),
      answer: t('appointmentFAQ_1_a', language)
    },
    {
      id: 2,
      question: t('appointmentFAQ_2_q', language),
      answer: t('appointmentFAQ_2_a', language)
    },
    {
      id: 3,
      question: t('appointmentFAQ_3_q', language),
      answer: t('appointmentFAQ_3_a', language)
    },
    {
      id: 4,
      question: t('appointmentFAQ_4_q', language),
      answer: t('appointmentFAQ_4_a', language)
    },
    {
      id: 5,
      question: t('appointmentFAQ_5_q', language),
      answer: t('appointmentFAQ_5_a', language)
    },
    {
      id: 6,
      question: t('appointmentFAQ_6_q', language),
      answer: t('appointmentFAQ_6_a', language)
    },
    {
      id: 7,
      question: t('appointmentFAQ_7_q', language),
      answer: t('appointmentFAQ_7_a', language)
    },
  ];

  // 1. Ensure styles is only used inside the component, after it is defined.
  // 2. Move any helper functions or code that uses styles inside the component, or pass styles as an argument.
  // 3. Do not use styles in the global scope.
  const createStyles = (colors) => StyleSheet.create({
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
    sectionTitle: {
      marginBottom: 16,
    },
    faqItem: {
      marginBottom: 12,
      padding: 16,
      overflow: 'hidden',
    },
    question: {
      marginBottom: 8,
    },
    answer: {
      lineHeight: 20,
    },
    contactContainer: {
      padding: 20,
      marginTop: 24,
      marginBottom: 40,
      alignItems: 'center',
    },
    contactText: {
      marginBottom: 16,
    },
  });

  const styles = createStyles(colors);

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
        <Text variant="subheading" color={colors.buttonText} style={styles.headerTitle}>{t('appointmentFAQ_title', language)}</Text>
      </LinearGradient>

      <ScrollView 
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}>
          <Text variant="heading" size="lg" weight="semibold" style={styles.sectionTitle}>{t('appointmentFAQ_section', language)}</Text>
          
          {faqItems.map((item) => (
            <Card
              key={item.id}
              variant="elevated"
              elevation={2}
              style={styles.faqItem}
            >
              <Text variant="subtitle" weight="semibold" style={[styles.question, { color: colors.text }]}>{item.question}</Text>
              <Text variant="body" color={colors.textSecondary} style={styles.answer}>{item.answer}</Text>
            </Card>
          ))}

          <Card
            variant="elevated"
            elevation={3}
            style={styles.contactContainer}
          >
            <Text variant="body" center style={styles.contactText}>
              {t('appointmentFAQ_contact', language)}
            </Text>
            <Button 
              variant="primary"
              icon="mail-outline"
              onPress={() => {
                triggerHaptic();
                navigation.navigate('SupportForm', { topic: 'Appointment Inquiry' });
              }}
            >
              {language === 'ur' ? 'سپورٹ سے رابطہ کریں' : 'Contact Support'}
            </Button>
          </Card>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};


export default AppointmentFAQScreen;
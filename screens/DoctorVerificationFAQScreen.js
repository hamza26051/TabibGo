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
import { Text, Card } from '../components';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../translations';

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
  },
  question: {
    marginBottom: 8,
  },
  answer: {
    lineHeight: 20,
  },
  contactContainer: {
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
    marginBottom: 30,
    alignItems: 'center',
  },
  contactText: {
    marginBottom: 16,
  },
  contactButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
});

const DoctorVerificationFAQScreen = ({ navigation }) => {
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
  // FAQ items for doctor verification section
  const faqItems = [
    { id: 1, question: t('verificationFAQ_1_q', language), answer: t('verificationFAQ_1_a', language) },
    { id: 2, question: t('verificationFAQ_2_q', language), answer: t('verificationFAQ_2_a', language) },
    { id: 3, question: t('verificationFAQ_3_q', language), answer: t('verificationFAQ_3_a', language) },
    { id: 4, question: t('verificationFAQ_4_q', language), answer: t('verificationFAQ_4_a', language) },
    { id: 5, question: t('verificationFAQ_5_q', language), answer: t('verificationFAQ_5_a', language) },
    { id: 6, question: t('verificationFAQ_6_q', language), answer: t('verificationFAQ_6_a', language) },
    { id: 7, question: t('verificationFAQ_7_q', language), answer: t('verificationFAQ_7_a', language) },
  ];

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
        <Text variant="subheading" color={colors.buttonText} style={styles.headerTitle}>{t('verificationFAQ_title', language)}</Text>
      </LinearGradient>

      <ScrollView 
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}>
          <Text variant="heading" size="lg" weight="semibold" style={styles.sectionTitle}>{t('verificationFAQ_section', language)}</Text>
          
          {faqItems.map((item) => (
            <Card 
              key={item.id} 
              variant="elevated" 
              elevation={2}
              style={styles.faqItem}
            >
              <Text variant="subheading" size="md" weight="semibold" style={[styles.question, { color: colors.text }]}>{item.question}</Text>
              <Text variant="body" color={colors.textSecondary} style={styles.answer}>{item.answer}</Text>
            </Card>
          ))}

          <Card 
            variant="elevated" 
            elevation={3}
            style={[styles.contactContainer, { backgroundColor: colors.primary + '15' }]}
          >
            <Text variant="body" center style={styles.contactText}>
              {t('verificationFAQ_contact', language)}
            </Text>
            <TouchableOpacity 
              style={[styles.contactButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                triggerHaptic();
                navigation.navigate('SupportForm', { topic: 'Doctor Verification Inquiry' });
              }}
            >
              <Text variant="body" weight="semibold" color={colors.buttonText}>{language === 'ur' ? 'سپورٹ سے رابطہ کریں' : 'Contact Support'}</Text>
            </TouchableOpacity>
          </Card>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DoctorVerificationFAQScreen;
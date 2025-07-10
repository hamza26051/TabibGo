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

const DoctorFAQScreen = ({ navigation }) => {
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
  
  // FAQ items for doctors section
  const faqItems = [
    { id: 1, question: t('doctorFAQ_1_q', language), answer: t('doctorFAQ_1_a', language) },
    { id: 2, question: t('doctorFAQ_2_q', language), answer: t('doctorFAQ_2_a', language) },
    { id: 3, question: t('doctorFAQ_3_q', language), answer: t('doctorFAQ_3_a', language) },
    { id: 4, question: t('doctorFAQ_4_q', language), answer: t('doctorFAQ_4_a', language) },
    { id: 5, question: t('doctorFAQ_5_q', language), answer: t('doctorFAQ_5_a', language) },
    { id: 6, question: t('doctorFAQ_6_q', language), answer: t('doctorFAQ_6_a', language) },
    { id: 7, question: t('doctorFAQ_7_q', language), answer: t('doctorFAQ_7_a', language) },
    { id: 8, question: t('doctorFAQ_8_q', language), answer: t('doctorFAQ_8_a', language) },
    { id: 9, question: t('doctorFAQ_9_q', language), answer: t('doctorFAQ_9_a', language) },
  ];

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
    faqList: {
      marginBottom: 20,
    },
    faqItemModern: {
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      paddingVertical: 18,
      paddingHorizontal: 18,
      marginBottom: 14,
      borderRadius: 18,
      backgroundColor: colors.cardBackground, // TODO: Replace with theme color
      shadowColor: colors.shadow, // TODO: Replace with theme color
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    questionModern: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
      color: colors.textPrimary, // TODO: Replace with theme color
    },
    answerModern: {
      fontSize: 15,
      color: colors.textSecondary, // TODO: Replace with theme color
      lineHeight: 21,
    },
    contactContainerModern: {
      padding: 20,
      marginTop: 24,
      marginBottom: 40,
      alignItems: 'center',
      borderRadius: 18,
      backgroundColor: colors.cardBackground, // TODO: Replace with theme color
      shadowColor: colors.shadow, // TODO: Replace with theme color
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    contactTextModern: {
      marginBottom: 16,
      fontSize: 15,
      color: colors.textSecondary, // TODO: Replace with theme color
      textAlign: 'center',
    },
    contactButtonModern: {
      marginTop: 4,
      width: '100%',
      borderRadius: 12,
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
        <Text variant="subheading" color={colors.buttonText} style={styles.headerTitle}>{t('doctorFAQ_title', language)}</Text>
      </LinearGradient>

      <ScrollView 
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}>
          <Text variant="heading" size="lg" weight="semibold" style={styles.sectionTitle}>{t('doctorFAQ_section', language)}</Text>
          <View style={styles.faqList}>
            {faqItems.map((item) => (
              <Card
                key={item.id}
                variant="elevated"
                elevation={2}
                style={styles.faqItemModern}
              >
                <Text variant="subtitle" weight="semibold" style={[styles.question, { color: colors.text }]}>{item.question}</Text>
                <Text variant="body" color={colors.textSecondary} style={styles.answer}>{item.answer}</Text>
              </Card>
            ))}
          </View>
          <Card
            variant="elevated"
            elevation={3}
            style={styles.contactContainerModern}
          >
            <Text variant="body" center style={styles.contactText}>
              {t('doctorFAQ_contact', language)}
            </Text>
            <Button 
              variant="primary"
              fullWidth
              icon="mail-outline"
              style={styles.contactButtonModern}
              onPress={() => {
                triggerHaptic();
                navigation.navigate('SupportForm', { topic: 'Doctor Inquiry' });
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


export default DoctorFAQScreen;
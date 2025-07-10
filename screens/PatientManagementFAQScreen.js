import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../translations';

const PatientManagementFAQScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const { language } = useLanguage();
  // FAQ items for patient management section
  const faqItems = [
    { id: 1, question: t('patientFAQ_1_q', language), answer: t('patientFAQ_1_a', language) },
    { id: 2, question: t('patientFAQ_2_q', language), answer: t('patientFAQ_2_a', language) },
    { id: 3, question: t('patientFAQ_3_q', language), answer: t('patientFAQ_3_a', language) },
    { id: 4, question: t('patientFAQ_4_q', language), answer: t('patientFAQ_4_a', language) },
    { id: 5, question: t('patientFAQ_5_q', language), answer: t('patientFAQ_5_a', language) },
    { id: 6, question: t('patientFAQ_6_q', language), answer: t('patientFAQ_6_a', language) },
    { id: 7, question: t('patientFAQ_7_q', language), answer: t('patientFAQ_7_a', language) },
  ];

  const createStyles = (colors) => StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
    },
    backButton: {
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    contentContainer: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    faqItem: {
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    question: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    answer: {
      fontSize: 14,
      lineHeight: 20,
    },
    contactContainer: {
      borderRadius: 8,
      padding: 16,
      marginTop: 20,
      marginBottom: 30,
      alignItems: 'center',
    },
    contactText: {
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 12,
    },
    contactButton: {
      borderRadius: 4,
      paddingVertical: 10,
      paddingHorizontal: 20,
    },
    contactButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 14,
    },
  });

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.headerText }]}>{t('patientFAQ_title', language)}</Text>
      </View>

      <ScrollView style={styles.contentContainer}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('patientFAQ_section', language)}</Text>
        
        {faqItems.map((item) => (
          <View key={item.id} style={[styles.faqItem, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
            <Text style={[styles.question, { color: colors.text }]}>{item.question}</Text>
            <Text style={[styles.answer, { color: colors.textSecondary }]}>{item.answer}</Text>
          </View>
        ))}

        <View style={[styles.contactContainer, { backgroundColor: colors.contactContainer }]}>
          <Text style={[styles.contactText, { color: colors.text }]}>
            {t('patientFAQ_contact', language)}
          </Text>
          <TouchableOpacity 
            style={[styles.contactButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('SupportForm', { topic: 'Patient Management Inquiry' })}
          >
            <Text style={styles.contactButtonText}>{t('patientFAQ_contactBtn', language)}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PatientManagementFAQScreen;
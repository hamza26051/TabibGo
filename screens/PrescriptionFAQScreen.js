import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../translations';

const PrescriptionFAQScreen = ({ navigation }) => {
  // Add theme colors if not present
  const colors = {
    white: '#fff',
    black: '#000',
    gray: '#888',
    darkGray: '#333',
    lightGray: '#f5f5f5',
    lightBlue: '#e3f2fd',
    green: '#4CAF50',
    primary: '#1976D2',
    card: '#fff',
    shadow: '#000',
  };
  const styles = createStyles(colors);
  const { language } = useLanguage();

  // FAQ items for prescriptions section
  const faqItems = [
    { id: 1, question: t('prescriptionFAQ_1_q', language), answer: t('prescriptionFAQ_1_a', language) },
    { id: 2, question: t('prescriptionFAQ_2_q', language), answer: t('prescriptionFAQ_2_a', language) },
    { id: 3, question: t('prescriptionFAQ_3_q', language), answer: t('prescriptionFAQ_3_a', language) },
    { id: 4, question: t('prescriptionFAQ_4_q', language), answer: t('prescriptionFAQ_4_a', language) },
    { id: 5, question: t('prescriptionFAQ_5_q', language), answer: t('prescriptionFAQ_5_a', language) },
    { id: 6, question: t('prescriptionFAQ_6_q', language), answer: t('prescriptionFAQ_6_a', language) },
    { id: 7, question: t('prescriptionFAQ_7_q', language), answer: t('prescriptionFAQ_7_a', language) },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('prescriptionFAQ_title', language)}</Text>
      </View>

      <ScrollView style={styles.contentContainer}>
        <Text style={styles.sectionTitle}>{t('prescriptionFAQ_section', language)}</Text>
        
        {faqItems.map((item) => (
          <View key={item.id} style={styles.faqItem}>
            <Text style={[styles.question, { color: colors.text }]}>{item.question}</Text>
            <Text style={styles.answer}>{item.answer}</Text>
          </View>
        ))}

        <View style={styles.contactContainer}>
          <Text style={styles.contactText}>
            {t('prescriptionFAQ_contact', language)}
          </Text>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => navigation.navigate('SupportForm', { topic: 'Prescription Inquiry' })}
          >
            <Text style={styles.contactButtonText}>{t('prescriptionFAQ_contactBtn', language)}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.lightGray,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.white,
      borderBottomWidth: 1,
      borderBottomColor: colors.lightGray,
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
      color: colors.primary,
    },
    faqItem: {
      backgroundColor: colors.white,
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    question: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.darkGray,
      marginBottom: 8,
    },
    answer: {
      fontSize: 14,
      color: colors.gray,
      lineHeight: 20,
    },
    contactContainer: {
      backgroundColor: colors.lightBlue,
      borderRadius: 8,
      padding: 16,
      marginTop: 20,
      marginBottom: 40,
      alignItems: 'center',
    },
    contactText: {
      fontSize: 14,
      color: colors.darkGray,
      textAlign: 'center',
      marginBottom: 12,
    },
    contactButton: {
      backgroundColor: colors.green,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    contactButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '600',
    },
  });
};

export default PrescriptionFAQScreen;
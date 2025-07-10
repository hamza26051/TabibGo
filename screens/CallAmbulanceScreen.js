import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';

const urduText = {
  call_ambulance: 'ایمبولینس کو کال کریں',
  choose_region: 'صحیح ایمبولینس نمبر کے لیے اپنا علاقہ منتخب کریں:',
  kpk_punjab: 'اگر آپ کے پی کے، اسلام آباد یا پنجاب میں ہیں',
  sindh_balochistan: 'اگر آپ سندھ یا بلوچستان میں ہیں',
};

const CallAmbulanceScreen = () => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors);
  const { language } = useLanguage();

  const dialNumber = (number) => {
    let phoneNumber = '';
    if (Platform.OS === 'android') {
      phoneNumber = `tel:${number}`;
    } else {
      phoneNumber = `telprompt:${number}`;
    }
    Linking.openURL(phoneNumber);
  };

  return (
    <View style={styles.container}>
      <Ionicons name="medkit" size={48} color={colors.error} style={{ marginBottom: 16 }} />
      <Text style={styles.title}>{language === 'ur' ? urduText.call_ambulance : 'Call an Ambulance'}</Text>
      <Text style={styles.subtitle}>{language === 'ur' ? urduText.choose_region : 'Choose your region to call the correct ambulance number:'}</Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={() => dialNumber('1122')}
      >
        <Ionicons name="call" size={22} color={colors.buttonText} style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>{language === 'ur' ? urduText.kpk_punjab : 'If you are in KPK, Islamabad, or Punjab'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.success }]}
        onPress={() => dialNumber('1158')}
      >
        <Ionicons name="call" size={22} color={colors.buttonText} style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>{language === 'ur' ? urduText.sindh_balochistan : 'If you are in Sindh or Balochistan'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginVertical: 10,
    width: '100%',
    justifyContent: 'center',
    elevation: 2,
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CallAmbulanceScreen; 
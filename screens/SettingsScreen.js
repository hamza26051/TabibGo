import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Switch,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { useLanguage, languages } from '../context/LanguageContext';
import { getColors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Text, Card, Button } from '../components';

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
  section: {
    marginBottom: 20,
    padding: 0,
    overflow: 'hidden',
  },
  sectionTitle: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  optionContent: {
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
  optionText: {
    fontSize: 16,
  },
  optionValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    marginRight: 4,
  },
  selectedOption: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  languageList: {
    maxHeight: 400,
  },
  languageGroupTitle: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  languageName: {
    fontSize: 16,
  },
  selectedLanguage: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  divider: {
    height: 8,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
});

const SettingsScreen = ({ navigation }) => {
  const { themeMode, setThemeMode, isDarkMode } = useTheme();
  const { language, setLanguage, getLanguageName } = useLanguage();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  
  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(20));
  
  // Get theme colors based on current mode
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors);

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

  // Handle theme mode changes
  const handleThemeChange = (mode) => {
    triggerHaptic();
    setThemeMode(mode);
  };

  // Handle language selection
  const handleLanguageSelect = (langCode) => {
    triggerHaptic();
    setLanguage(langCode);
    setLanguageModalVisible(false);
  };

  const urduText = {
    settings: 'ترتیبات',
    theme: 'تھیم',
    light_mode: 'روشن موڈ',
    dark_mode: 'تاریک موڈ',
    system_default: 'سسٹم ڈیفالٹ',
    language: 'زبان',
    app_language: 'ایپ کی زبان',
    about: 'ایپ کے بارے میں',
    app_version: 'ایپ ورژن',
    privacy_policy: 'پرائیویسی پالیسی',
    terms_of_service: 'سروس کی شرائط',
    select_language: 'زبان منتخب کریں',
    preferred_languages: 'پسندیدہ زبانیں',
    other_languages: 'دیگر زبانیں',
    close: 'بند کریں',
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
        <Text variant="subheading" color={colors.buttonText} style={styles.headerTitle}>{language === 'ur' ? urduText.settings : 'Settings'}</Text>
      </LinearGradient>

      <ScrollView 
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}>
          {/* Theme Settings Section */}
          <Card 
            variant="elevated" 
            elevation={3}
            style={styles.section}
          >
            <Text variant="heading" size="lg" weight="semibold" style={styles.sectionTitle}>{language === 'ur' ? urduText.theme : 'Theme'}</Text>
            
            <TouchableOpacity 
              style={[styles.optionItem, themeMode === ThemeMode.LIGHT && [styles.selectedOption, { backgroundColor: colors.primary + '15' }]]}
              onPress={() => handleThemeChange(ThemeMode.LIGHT)}
            >
              <View style={styles.optionContent}>
                <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 102, 204, 0.1)' }]}>
                  <Ionicons name="sunny-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.optionText}>{language === 'ur' ? urduText.light_mode : 'Light Mode'}</Text>
              </View>
              {themeMode === ThemeMode.LIGHT && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.optionItem, themeMode === ThemeMode.DARK && [styles.selectedOption, { backgroundColor: colors.primary + '15' }]]}
              onPress={() => handleThemeChange(ThemeMode.DARK)}
            >
              <View style={styles.optionContent}>
                <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 102, 204, 0.1)' }]}>
                  <Ionicons name="moon-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.optionText}>{language === 'ur' ? urduText.dark_mode : 'Dark Mode'}</Text>
              </View>
              {themeMode === ThemeMode.DARK && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.optionItem, themeMode === ThemeMode.SYSTEM && [styles.selectedOption, { backgroundColor: colors.primary + '15' }]]}
              onPress={() => handleThemeChange(ThemeMode.SYSTEM)}
            >
              <View style={styles.optionContent}>
                <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 102, 204, 0.1)' }]}>
                  <Ionicons name="phone-portrait-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.optionText}>{language === 'ur' ? urduText.system_default : 'System Default'}</Text>
              </View>
              {themeMode === ThemeMode.SYSTEM && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          </Card>
          
          {/* Language Settings Section */}
          <Card 
            variant="elevated" 
            elevation={3}
            style={styles.section}
          >
            <Text variant="heading" size="lg" weight="semibold" style={styles.sectionTitle}>{language === 'ur' ? urduText.language : 'Language'}</Text>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                triggerHaptic();
                setLanguageModalVisible(true);
              }}
            >
              <View style={styles.optionContent}>
                <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 102, 204, 0.1)' }]}>
                  <Ionicons name="language-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.optionText}>{language === 'ur' ? urduText.app_language : 'App Language'}</Text>
              </View>
              <View style={styles.optionValue}>
                <Text variant="caption" style={styles.valueText}>{getLanguageName(language)}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              </View>
            </TouchableOpacity>
          </Card>
          
          {/* About Section */}
          <Card 
            variant="elevated" 
            elevation={3}
            style={styles.section}
          >
            <Text variant="heading" size="lg" weight="semibold" style={styles.sectionTitle}>{language === 'ur' ? urduText.about : 'About'}</Text>
            
            <TouchableOpacity style={styles.optionItem}>
              <View style={styles.optionContent}>
                <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 102, 204, 0.1)' }]}>
                  <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.optionText}>{language === 'ur' ? urduText.app_version : 'App Version'}</Text>
              </View>
              <Text variant="caption" style={styles.valueText}>1.0.0</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionItem}>
              <View style={styles.optionContent}>
                <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 102, 204, 0.1)' }]}>
                  <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.optionText}>{language === 'ur' ? urduText.privacy_policy : 'Privacy Policy'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionItem}>
              <View style={styles.optionContent}>
                <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 102, 204, 0.1)' }]}>
                  <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.optionText}>{language === 'ur' ? urduText.terms_of_service : 'Terms of Service'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
          </Card>
        </Animated.View>
      </ScrollView>
      
      {/* Language Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={languageModalVisible}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text variant="subheading" style={styles.modalTitle}>{language === 'ur' ? urduText.select_language : 'Select Language'}</Text>
              <TouchableOpacity 
                onPress={() => {
                  triggerHaptic();
                  setLanguageModalVisible(false);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.languageList}>
              {/* Top Languages Section */}
              <Text variant="caption" weight="semibold" style={styles.languageGroupTitle}>{language === 'ur' ? urduText.preferred_languages : 'Preferred Languages'}</Text>
              {languages.top.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.languageItem, language === lang.code && [styles.selectedLanguage, { backgroundColor: colors.primary + '20' }]]}
                  onPress={() => handleLanguageSelect(lang.code)}
                >
                  <Text style={styles.languageName}>{lang.name}</Text>
                  {language === lang.code && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
              
              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              
              {/* Other Languages Section */}
              <Text variant="caption" weight="semibold" style={styles.languageGroupTitle}>{language === 'ur' ? urduText.other_languages : 'Other Languages'}</Text>
              {languages.others.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.languageItem, language === lang.code && [styles.selectedLanguage, { backgroundColor: colors.primary + '20' }]]}
                  onPress={() => handleLanguageSelect(lang.code)}
                >
                  <Text style={styles.languageName}>{lang.name}</Text>
                  {language === lang.code && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <Button 
                variant="primary" 
                fullWidth 
                onPress={() => setLanguageModalVisible(false)}
                icon="close-circle-outline"
              >
                {language === 'ur' ? urduText.close : 'Close'}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SettingsScreen;
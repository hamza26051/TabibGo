import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text as RNText, View, Image, TouchableOpacity, Alert, Animated, Dimensions, ScrollView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Text } from '../components';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../context/LanguageContext';

const DoctorDashboardScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));
  const [slideAnim] = useState(new Animated.Value(-20));
  const [servicesAnim] = useState(new Animated.Value(0));
  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;
  const scrollViewRef = useRef(null);
  
  const urduText = {
    hello_doctor: 'سلام ڈاکٹر',
    dashboard: 'ڈاکٹر ڈیش بورڈ',
    ready_to_help: 'مریضوں کی مدد کے لیے تیار',
    find_patients: 'مریض تلاش کریں',
    help_patients: 'اپنے علاقے کے مریضوں کی مدد کریں',
    your_services: 'آپ کی خدمات',
    patient_history: 'وزٹ', // Use the same as urduText.visit
    support: 'سپورٹ',
    settings: 'ترتیبات',
    quick_access: 'فوری رسائی',
    contact_support: 'سپورٹ سے رابطہ کریں',
    get_help: 'کسی بھی مسئلے میں مدد حاصل کریں',
    faqs: 'عمومی سوالات',
    common_questions: 'عام سوالات اور جوابات',
  };

  const { language } = useLanguage();

  // Animation effect on component mount
  useEffect(() => {
    const animationSequence = Animated.stagger(150, [
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(servicesAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ]);
    
    animationSequence.start();
  }, []);
  
  // Function to provide haptic feedback on button press
  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const createStyles = (colors) => StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 30,
    },
    header: {
      width: '100%',
      paddingTop: Platform.OS === 'ios' ? 50 : 40,
      paddingBottom: 30,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
    navbar: {
      width: '100%',
      height: 60,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
    },
    navButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    navLogo: {
      width: 42,
      height: 42,
    },
    headerContent: {
      paddingHorizontal: 20,
      paddingTop: 15,
      paddingBottom: 25,
    },
    greeting: {
      fontSize: 18,
      color: 'rgba(255, 255, 255, 0.9)',
      marginBottom: 8,
    },
    welcomeText: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    welcomeSubtext: {
      fontSize: 18,
      color: 'rgba(255, 255, 255, 0.9)',
      letterSpacing: 0.3,
    },
    content: {
      padding: 20,
    },
    cardContainer: {
      marginTop: -40,
      marginBottom: 25,
    },
    requestBox: {
      borderRadius: 16,
      width: '100%',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 10,
    },
    requestBoxContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    requestBoxGradient: {
      padding: 22,
      borderRadius: 16,
    },
    requestIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 15,
    },
    requestTextContainer: {
      flex: 1,
    },
    requestText: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 6,
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
    requestSubtext: {
      fontSize: 15,
      color: 'rgba(255, 255, 255, 0.9)',
    },
    arrowContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    featuresSection: {
      marginTop: 10,
      marginBottom: 20,
    },
    sectionTitleContainer: {
      marginBottom: 20,
      marginLeft: 5,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    titleUnderline: {
      width: 40,
      height: 3,
      borderRadius: 1.5,
    },
    featuresGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    featureCard: {
      width: '48%',
      borderRadius: 16,
      padding: 18,
      marginBottom: 16,
      alignItems: 'center',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 5,
    },
    featureIconBg: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    featureText: {
      fontSize: 15,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 4,
    },
    quickAccessSection: {
      marginTop: 25,
    },
    quickAccessTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 15,
      marginLeft: 5,
    },
    quickAccessCard: {
      marginBottom: 12,
      borderRadius: 16,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    quickAccessContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    quickAccessIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    quickAccessTextContainer: {
      flex: 1,
    }
  });

  const styles = createStyles(colors);

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <LinearGradient
        colors={[colors.primary, isDarkMode ? '#1A3A5A' : '#4D94FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.navbar}>
          <TouchableOpacity 
            onPress={() => {
              triggerHaptic();
              navigation.openDrawer();
            }}
            style={styles.navButton}
          >
            <Ionicons name="menu-outline" size={28} color={colors.buttonText} />
          </TouchableOpacity>
          <Image
            source={require('../assets/logo.png')}
            style={styles.navLogo}
            resizeMode="contain"
          />
          <TouchableOpacity 
            onPress={() => {
              triggerHaptic();
              navigation.navigate('Notification');
            }}
            style={styles.navButton}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.buttonText} />
          </TouchableOpacity>
        </View>
        
        <Animated.View style={[styles.headerContent, {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }]}>
          <Text style={styles.greeting}>{language === 'ur' ? urduText.hello_doctor : 'Hello Doctor'}</Text>
          <Text style={styles.welcomeText}>{language === 'ur' ? urduText.dashboard : 'Doctor Dashboard'}</Text>
          <Text style={styles.welcomeSubtext}>{language === 'ur' ? urduText.ready_to_help : 'Ready to help patients'}</Text>
        </Animated.View>
      </LinearGradient>

      <View style={styles.content}>
        <Animated.View style={[styles.cardContainer, {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }, { translateY: slideAnim }]
        }]}>
          <TouchableOpacity
            style={[styles.requestBox, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic();
              navigation.navigate('DoctorMap');
            }}
          >
            <LinearGradient
              colors={[colors.primary, isDarkMode ? '#1A3A5A' : '#4D94FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.requestBoxGradient}
            >
              <View style={styles.requestBoxContent}>
                <View style={styles.requestIconContainer}>
                  <Ionicons name="location" size={28} color="#FFFFFF" />
                </View>
                <View style={styles.requestTextContainer}>
                  <Text style={styles.requestText}>{language === 'ur' ? urduText.find_patients : 'Find Patients'}</Text>
                  <Text style={styles.requestSubtext}>{language === 'ur' ? urduText.help_patients : 'Help patients in your area'}</Text>
                </View>
                <View style={styles.arrowContainer}>
                  <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
        
        <Animated.View 
          style={[styles.featuresSection, {
            opacity: servicesAnim,
            transform: [{ translateY: slideAnim }]
          }]}
        >
          <View style={styles.sectionTitleContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'ur' ? urduText.your_services : 'Your Services'}</Text>
            <View style={[styles.titleUnderline, { backgroundColor: colors.primary }]} />
          </View>
          
          <View style={styles.featuresGrid}>
            <Card 
              variant="elevated"
              elevation={3}
              onPress={() => {
                triggerHaptic();
                navigation.navigate('DoctorHistory');
              }}
              style={styles.featureCard}
            >
              <View style={[styles.featureIconBg, { backgroundColor: isDarkMode ? 'rgba(33, 150, 243, 0.15)' : 'rgba(0, 102, 204, 0.1)' }]}>
                <Ionicons name="time-outline" size={26} color={colors.primary} />
              </View>
              <Text variant="label" weight="semibold" center style={styles.featureText}>{language === 'ur' ? urduText.patient_history : 'Patient History'}</Text>
            </Card>
            
            <Card 
              variant="elevated"
              elevation={3}
              onPress={() => {
                triggerHaptic();
                navigation.navigate('DoctorHelp');
              }}
              style={styles.featureCard}
            >
              <View style={[styles.featureIconBg, { backgroundColor: isDarkMode ? 'rgba(33, 150, 243, 0.15)' : 'rgba(0, 102, 204, 0.1)' }]}>
                <Ionicons name="help-buoy-outline" size={26} color={colors.primary} />
              </View>
              <Text variant="label" weight="semibold" center style={styles.featureText}>{language === 'ur' ? urduText.support : 'Support'}</Text>
            </Card>
            
            <Card 
              variant="elevated"
              elevation={3}
              onPress={() => {
                triggerHaptic();
                navigation.navigate('Settings');
              }}
              style={styles.featureCard}
            >
              <View style={[styles.featureIconBg, { backgroundColor: isDarkMode ? 'rgba(33, 150, 243, 0.15)' : 'rgba(0, 102, 204, 0.1)' }]}>
                <Ionicons name="settings-outline" size={26} color={colors.primary} />
              </View>
              <Text variant="label" weight="semibold" center style={styles.featureText}>{language === 'ur' ? urduText.settings : 'Settings'}</Text>
            </Card>
          </View>
          
          <View style={styles.quickAccessSection}>
            <Text style={[styles.quickAccessTitle, { color: colors.text }]}>{language === 'ur' ? urduText.quick_access : 'Quick Access'}</Text>
            
            <Card
              variant="elevated"
              elevation={2}
              style={styles.quickAccessCard}
              onPress={() => {
                triggerHaptic();
                navigation.navigate('SupportForm');
              }}
            >
              <View style={styles.quickAccessContent}>
                <View style={[styles.quickAccessIcon, { backgroundColor: isDarkMode ? 'rgba(102, 187, 106, 0.15)' : 'rgba(76, 175, 80, 0.1)' }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.secondary} />
                </View>
                <View style={styles.quickAccessTextContainer}>
                  <Text variant="subheading" weight="semibold" style={{ fontSize: 16 }}>{language === 'ur' ? urduText.contact_support : 'Contact Support'}</Text>
                  <Text variant="caption" style={{ marginTop: 2 }}>{language === 'ur' ? urduText.get_help : 'Get help with any issues'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>
            </Card>
            
            <Card
              variant="elevated"
              elevation={2}
              style={styles.quickAccessCard}
              onPress={() => {
                triggerHaptic();
                navigation.navigate('DoctorFAQ');
              }}
            >
              <View style={styles.quickAccessContent}>
                <View style={[styles.quickAccessIcon, { backgroundColor: isDarkMode ? 'rgba(255, 183, 77, 0.15)' : 'rgba(255, 160, 0, 0.1)' }]}>
                  <Ionicons name="information-circle-outline" size={24} color={colors.accent} />
                </View>
                <View style={styles.quickAccessTextContainer}>
                  <Text variant="subheading" weight="semibold" style={{ fontSize: 16 }}>{language === 'ur' ? urduText.faqs : 'FAQs'}</Text>
                  <Text variant="caption" style={{ marginTop: 2 }}>{language === 'ur' ? urduText.common_questions : 'Common questions & answers'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>
            </Card>
          </View>
        </Animated.View>
      </View>

      <StatusBar style="light" />  
    </ScrollView>
  );
};

export default DoctorDashboardScreen;

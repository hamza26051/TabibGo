import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  Image,
  Alert,
  Animated,
  Platform
} from 'react-native';
import { useRequest } from '../context/RequestContext';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text, Card, Button } from '../components';
import { uploadImageToCloudinary } from '../utils/cloudinaryUtils';
import { useLanguage } from '../context/LanguageContext';

const symptoms = [
  { id: 1, name: 'Fever', icon: '🤒', ionicon: 'thermometer-outline' },
  { id: 2, name: 'Pain', icon: '😣', ionicon: 'fitness-outline' },
  { id: 3, name: 'Cough', icon: '😷', ionicon: 'medical-outline' },
  { id: 4, name: 'Headache', icon: '🤕', ionicon: 'pulse-outline' },
  { id: 5, name: 'Dehydration', icon: '💧', ionicon: 'water-outline' },
  { id: 6, name: 'Rash', icon: '🔴', ionicon: 'bandage-outline' },
  { id: 7, name: 'Nausea', icon: '🤢', ionicon: 'medkit-outline' },
  { id: 8, name: 'Dizziness', icon: '😵', ionicon: 'body-outline' },
  { id: 9, name: 'Others', icon: '➕', ionicon: 'add-circle-outline' },
];

const BookingScreen = ({ navigation, route }) => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const { activeRequestId, activeRequestData, loading: requestLoading, checkForActiveRequest } = useRequest();
  const { language } = useLanguage();
  
  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(20));
  const [scaleAnim] = useState(new Animated.Value(0.95));
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSymptom, setSelectedSymptom] = useState(null);
  const [image, setImage] = useState(null);
  const [customSymptom, setCustomSymptom] = useState('');
  const initialAddress = route.params?.addressDetails && route.params.addressDetails.trim() ? route.params.addressDetails : '';
  const [addressDetails, setAddressDetails] = useState(initialAddress);
  
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
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
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
  
  // Check for active request when component mounts
  useEffect(() => {
    const checkActiveRequest = async () => {
      const activeRequest = await checkForActiveRequest();
      
      if (activeRequest) {
        // User has an active request, redirect to Map screen
        Alert.alert(
          'Active Request Found',
          'You already have an active doctor request. Redirecting to your current request.',
          [{ text: 'OK', onPress: () => navigation.navigate('Map', { fromBooking: true }) }]
        );
      }
    };
    
    checkActiveRequest();
  }, []);
  
  // Check for active request when the screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Check for active request when screen comes into focus
      checkForActiveRequest();
    });

    return unsubscribe;
  }, [navigation, checkForActiveRequest]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera roll permission to upload images');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const urduDynamic = {
    'fever': 'بخار',
    'pain': 'درد',
    'cough': 'کھانسی',
    'headache': 'سر درد',
    'dehydration': 'پانی کی کمی',
    'rash': 'خارش',
    'nausea': 'متلی',
    'dizziness': 'چکر آنا',
    'others': 'دیگر',
  };
  function translateDynamic(val) {
    if (language === 'ur' && typeof val === 'string') {
      const key = val.trim().toLowerCase();
      return urduDynamic[key] || val;
    }
    return val;
  }

  const renderSymptomSelection = () => (
    <Animated.View 
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
      }}
    >
      <Card 
        variant="elevated" 
        elevation={3}
        style={styles.stepContainer}
      >
        <Text variant="heading" size="xl" weight="semibold" style={styles.stepTitle}>{language === 'ur' ? 'علامات منتخب کریں' : 'Select Symptoms'}</Text>
        <View style={styles.symptomsGrid}>
          {symptoms.map((symptom) => (
            <TouchableOpacity
              key={symptom.id}
              style={[styles.symptomItemContainer]}
              onPress={() => {
                triggerHaptic();
                setSelectedSymptom(symptom.id);
              }}
              activeOpacity={0.7}
            >
              <Card
                variant={selectedSymptom === symptom.id ? 'elevated' : 'flat'}
                elevation={selectedSymptom === symptom.id ? 4 : 0}
                style={[
                  styles.symptomItem,
                  selectedSymptom === symptom.id && {
                    borderColor: colors.primary,
                    backgroundColor: isDarkMode ? 'rgba(33, 150, 243, 0.15)' : 'rgba(0, 102, 204, 0.1)'
                  }
                ]}
              >
                <View style={[styles.symptomIconContainer, selectedSymptom === symptom.id && { backgroundColor: colors.primary }]}>
                  <Ionicons 
                    name={symptom.ionicon} 
                    size={24} 
                    color={selectedSymptom === symptom.id ? colors.buttonText : colors.primary} 
                  />
                </View>
                <Text 
                  variant="body" 
                  weight={selectedSymptom === symptom.id ? 'semibold' : 'medium'} 
                  color={selectedSymptom === symptom.id ? colors.primary : undefined}
                  style={styles.symptomText}
                >
                  {language === 'ur' ? translateDynamic(symptom.name.toLowerCase()) : symptom.name}
                </Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
        
        {selectedSymptom === 9 && (
          <View style={styles.customSymptomContainer}>
            <Text variant="label" weight="medium" style={styles.customSymptomLabel}>{language === 'ur' ? 'براہ کرم علامت درج کریں' : 'Please specify symptom'}</Text>
            <TextInput
              style={[styles.customSymptomInput, { backgroundColor: colors.inputBackground, borderColor: colors.primary, color: colors.text }]}
              placeholder={language === 'ur' ? 'علامت درج کریں' : 'Enter symptom'}
              placeholderTextColor={colors.placeholder}
              value={customSymptom}
              onChangeText={setCustomSymptom}
            />
          </View>
        )}
        
        <Button 
          variant="primary"
          size="large"
          fullWidth
          disabled={!selectedSymptom || (selectedSymptom === 9 && !customSymptom.trim())}
          onPress={() => {
            triggerHaptic();
            if (selectedSymptom && (selectedSymptom !== 9 || customSymptom.trim())) {
              setCurrentStep(2);
            }
          }}
          icon="arrow-forward-outline"
          iconPosition="right"
        >
          {language === 'ur' ? 'اگلا' : 'Next'}
        </Button>
      </Card>
    </Animated.View>
  );

  const renderImageUpload = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{language === 'ur' ? 'تصویر اپ لوڈ کریں (اختیاری)' : 'Upload Photo (Optional)'}</Text>
      <Text style={styles.uploadDescription}>{language === 'ur' ? 'بہتر وضاحت کے لیے اپنی علامات کی تصویر اپ لوڈ کریں۔' : 'Upload a photo of your symptoms for better clarity.'}</Text>
      
      <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
        <Text style={styles.uploadButtonText}>
          {image ? (language === 'ur' ? 'تصویر تبدیل کریں' : 'Change Photo') : (language === 'ur' ? 'تصویر منتخب کریں' : 'Select Photo')}
        </Text>
      </TouchableOpacity>
      
      {image && (
        <Image source={{ uri: image }} style={styles.uploadedImage} />
      )}
      
      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentStep(1)}
        >
          <Text style={styles.backButtonText}>{language === 'ur' ? 'پیچھے' : 'Back'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => setCurrentStep(3)}
        >
          <Text style={styles.nextButtonText}>{language === 'ur' ? 'اگلا' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSummary = () => {
    const selectedSymptomObj = symptoms.find(s => s.id === selectedSymptom);
    const displaySymptom = selectedSymptom === 9 ? customSymptom : (selectedSymptomObj ? selectedSymptomObj.name : '');
    return (
      <Animated.View 
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
        }}
      >
        <Card 
          variant="elevated" 
          elevation={4}
          style={styles.stepContainer}
        >
          <LinearGradient
            colors={[colors.primary, isDarkMode ? '#1A3A5A' : '#4D94FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryHeader}
          >
            <Text variant="heading" size="xl" weight="semibold" color={colors.buttonText} style={{textAlign: 'center'}}>
              {language === 'ur' ? 'بکنگ کا خلاصہ' : 'Booking Summary'}
            </Text>
          </LinearGradient>
          <Card variant="flat" style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryIconContainer}>
                <Ionicons 
                  name={selectedSymptomObj?.ionicon || 'medical-outline'} 
                  size={24} 
                  color={colors.primary} 
                />
              </View>
              <View style={styles.summaryTextContainer}>
                <Text variant="label" weight="medium" color={colors.textSecondary}>
                  {language === 'ur' ? 'علامت' : 'Symptom'}
                </Text>
                <Text variant="body" weight="semibold" style={styles.summaryValue}>
                  {language === 'ur' ? translateDynamic(displaySymptom.toLowerCase()) : displaySymptom}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="location-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.summaryTextContainer}>
                <Text variant="label" weight="medium" color={colors.textSecondary}>
                  {language === 'ur' ? 'پتہ' : 'Address'}
                </Text>
                <Text variant="body" weight="semibold" style={styles.summaryValue}>
                  {addressDetails || (language === 'ur' ? 'درج نہیں' : 'Not provided')}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            {image && (
              <>
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <View style={styles.summaryIconContainer}>
                    <Ionicons name="image-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.summaryTextContainer}>
                    <Text variant="label" weight="medium" color={colors.textSecondary}>
                      {language === 'ur' ? 'اپ لوڈ کردہ تصویر' : 'Uploaded Image'}
                    </Text>
                    <Image source={{ uri: image }} style={styles.summaryImage} />
                  </View>
                </View>
              </>
            )}
          </Card>
          <Card 
            variant="elevated" 
            elevation={2}
            style={styles.costEstimate}
          >
            <View style={styles.costRow}>
              <Ionicons name="wallet-outline" size={24} color={colors.primary} />
              <View style={styles.costTextContainer}>
                <Text variant="label" weight="medium" color={colors.primary}>
                  {language === 'ur' ? 'تخمینی لاگت' : 'Estimated Cost'}
                </Text>
                <Text variant="subheading" weight="bold" color={colors.primary} style={styles.costValue}>
                  {'₨1500 - ₨2500'}
                </Text>
              </View>
            </View>
          </Card>
          <View style={styles.navigationButtons}>
            <Button 
              variant="outline" 
              size="large" 
              icon="arrow-back-outline"
              iconPosition="left"
              onPress={() => {
                triggerHaptic();
                setCurrentStep(2);
              }}
              style={{flex: 1, marginRight: 10}}
            >
              {language === 'ur' ? 'پیچھے' : 'Back'}
            </Button>
            <Button 
              variant="primary" 
              size="large" 
              icon="checkmark-circle-outline"
              iconPosition="left"
              style={{flex: 1, backgroundColor: colors.success}}
              onPress={async () => {
                triggerHaptic();
                const selectedSymptomObj = symptoms.find(s => s.id === selectedSymptom);
                const symptomName = selectedSymptom === 9 ? customSymptom : (selectedSymptomObj ? selectedSymptomObj.name : '');
                const userLocation = route.params?.userLocation;
                if (!userLocation) {
                  Alert.alert(
                    language === 'ur' ? 'مقام درکار ہے' : 'Location Required',
                    language === 'ur' ? 'براہ کرم پہلے اپنا مقام منتخب کریں۔' : 'Please select your location first.',
                    [{ text: language === 'ur' ? 'اوکے' : 'OK', onPress: () => navigation.navigate('Location') }]
                  );
                  return;
                }
                let attachedImageUrl = null;
                if (image) {
                  attachedImageUrl = await uploadImageToCloudinary(image, 'patient_requests');
                  console.log('Cloudinary image URL:', attachedImageUrl);
                }
                const patientData = {
                  symptoms: symptomName,
                  attachedImage: attachedImageUrl,
                  location: userLocation,
                  addressDetails: addressDetails
                };
                console.log('BookingScreen patientData:', patientData);
                Alert.alert(
                  language === 'ur' ? 'بکنگ کی تصدیق ہوگئی' : 'Booking Confirmed',
                  language === 'ur' ? 'آپ کی درخواست جمع ہو گئی ہے۔ اب آپ اپنے علاقے میں دستیاب ڈاکٹروں میں سے انتخاب کر سکتے ہیں۔' : 'Your request has been submitted. Now you can select from available doctors in your area.',
                  [{ text: language === 'ur' ? 'ڈاکٹر تلاش کریں' : 'Find Doctors', onPress: () => navigation.navigate('Map', { fromBooking: true, patientData: patientData }) }]
                );
              }}
            >
              {language === 'ur' ? 'بکنگ کی تصدیق کریں' : 'Confirm Booking'}
            </Button>
          </View>
        </Card>
      </Animated.View>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderSymptomSelection();
      case 2:
        return renderImageUpload();
      case 3:
        return renderSummary();
      default:
        return renderSymptomSelection();
    }
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
        <Text variant="subheading" color={colors.buttonText} style={styles.headerTitle}>{language === 'ur' ? 'ڈاکٹر بک کریں' : 'Book Doctor'}</Text>
      </LinearGradient>
      
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((step) => (
            <View 
              key={step} 
              style={[
                styles.progressStep,
                step <= currentStep ? [styles.activeStep, { backgroundColor: colors.primary }] : [styles.inactiveStep, { backgroundColor: colors.divider }],
              ]}
            />
          ))}
        </View>
        {renderCurrentStep()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  progressStep: {
    width: '18%',
    height: 6,
    borderRadius: 3,
  },
  activeStep: {
    backgroundColor: '#0066CC',
  },
  inactiveStep: {
    backgroundColor: '#D1D1D1',
  },
  stepContainer: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 16,
  },
  stepTitle: {
    marginBottom: 20,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  symptomItemContainer: {
    width: '48%',
    marginBottom: 16,
  },
  symptomItem: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  symptomIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  symptomText: {
    textAlign: 'center',
    marginTop: 4,
  },
  customSymptomContainer: {
    marginBottom: 20,
  },
  customSymptomLabel: {
    marginBottom: 8,
  },
  customSymptomInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
  },
  uploadDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  uploadButton: {
    backgroundColor: '#0066CC',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  uploadedImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    borderWidth: 1,
    borderColor: '#0066CC',
    borderRadius: 10,
    padding: 15,
    width: '48%',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#0066CC',
    borderRadius: 10,
    padding: 15,
    width: '48%',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  summaryHeader: {
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    padding: 16,
    marginBottom: 16,
  },
  summaryCard: {
    padding: 0,
    marginBottom: 16,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryValue: {
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginHorizontal: 16,
  },
  summaryImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginTop: 8,
  },
  costEstimate: {
    marginTop: 8,
    marginBottom: 16,
    padding: 0,
    overflow: 'hidden',
  },
  costRow: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  costTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  costValue: {
    marginTop: 4,
  },
});

export default BookingScreen;
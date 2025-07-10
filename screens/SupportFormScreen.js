import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  StatusBar,
  Animated,
  Image,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth, useMode } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Text, Card, Button } from '../components';
import { uploadImageToCloudinary, uploadMultipleImagesToCloudinary } from '../utils/cloudinaryUtils';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../translations';

const SupportFormScreen = ({ navigation, route }) => {
  const { currentUser } = useAuth();
  const { isDarkMode } = useTheme();
  const { currentMode } = useMode();
  const colors = getColors(isDarkMode);
  const selectedTopic = route.params?.topic || '';
  
  const [subject, setSubject] = useState(selectedTopic);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Pakistan');
  const [language, setLanguage] = useState('English');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  
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

  // List of countries for the dropdown
  const countries = [
    'Pakistan', 'India', 'Bangladesh', 'Afghanistan', 
    'United Arab Emirates', 'Saudi Arabia', 'United Kingdom', 'United States', 
    'Canada', 'Australia', 'Other'
  ];

  // List of languages for the dropdown
  const languages = [
    'English', 'Urdu'
  ];

  const pickImage = async () => {
    // Provide haptic feedback
    triggerHaptic();
    
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(t('support_permission_title', appLanguage), t('support_permission_message', appLanguage));
      return;
    }

    // Limit to 3 images
    if (images.length >= 3) {
      Alert.alert(t('support_limit_title', appLanguage), t('support_limit_message', appLanguage));
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      // Add the selected image to the images array
      setImages([...images, result.assets[0].uri]);
    }
  };

  const removeImage = (index) => {
    triggerHaptic();
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const handleSubmit = async () => {
    // Provide haptic feedback
    triggerHaptic();
    
    // Validate form
    if (!subject.trim()) {
      Alert.alert(t('support_error_title', appLanguage), t('support_error_subject', appLanguage));
      return;
    }

    if (!name.trim()) {
      Alert.alert(t('support_error_title', appLanguage), t('support_error_name', appLanguage));
      return;
    }

    if (!email.trim()) {
      Alert.alert(t('support_error_title', appLanguage), t('support_error_email', appLanguage));
      return;
    }

    try {
      setIsSubmitting(true);
      setUploading(true);
      
      // Upload images if any
      let imageUrls = [];
      if (images.length > 0) {
        imageUrls = await uploadMultipleImagesToCloudinary(images, 'support_requests');
      }

      // Create support request in Firestore
      await addDoc(collection(db, 'supportRequests'), {
        subject,
        name,
        email,
        phone,
        country,
        language,
        comment,
        imageUrls,
        userId: currentUser?.uid || null,
        userType: currentMode,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setIsSubmitting(false);
      setUploading(false);
      Alert.alert(
        t('support_success_title', appLanguage),
        t('support_success_message', appLanguage),
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    } catch (error) {
      console.error('Error submitting support request:', error);
      setIsSubmitting(false);
      setUploading(false);
      Alert.alert(t('support_error_title', appLanguage), t('support_error_submit', appLanguage));
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
    },
    contentContainer: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 24,
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
    formGroup: {
      marginBottom: 20,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    label: {
      marginBottom: 8,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 10,
      overflow: 'hidden',
      height: 50,
    },
    inputIcon: {
      paddingHorizontal: 12,
    },
    input: {
      flex: 1,
      height: 50,
      fontSize: 16,
      paddingRight: 12,
    },
    textAreaContainer: {
      flexDirection: 'row',
      borderWidth: 1,
      borderRadius: 10,
      overflow: 'hidden',
      minHeight: 120,
    },
    textArea: {
      flex: 1,
      minHeight: 120,
      fontSize: 16,
      paddingTop: 12,
      paddingRight: 12,
      paddingBottom: 12,
      textAlignVertical: 'top',
    },
    charCount: {
      textAlign: 'right',
      marginTop: 4,
    },
    phoneInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    countryCode: {
      borderWidth: 1,
      borderRadius: 10,
      height: 50,
      width: 60,
      justifyContent: 'center',
      alignItems: 'center',
    },
    phoneInputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 10,
      overflow: 'hidden',
      height: 50,
    },
    phoneInput: {
      flex: 1,
      height: 50,
      fontSize: 16,
      paddingRight: 12,
    },
    pickerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 10,
      overflow: 'hidden',
      height: 50,
    },
    picker: {
      flex: 1,
      height: 50,
      marginLeft: -10, // Adjust for icon spacing
    },
    uploadSection: {
      marginTop: 8,
    },
    uploadButton: {
      width: 100,
      height: 100,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    uploadText: {
      marginTop: 8,
    },
    uploadHint: {
      marginTop: 4,
    },
    imagePreviewContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 16,
      gap: 12,
    },
    imagePreview: {
      position: 'relative',
      width: 100,
      height: 100,
    },
    previewImage: {
      width: '100%',
      height: '100%',
      borderRadius: 8,
      borderWidth: 1,
    },
    removeImageButton: {
      position: 'absolute',
      top: -8,
      right: -8,
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1.5,
      elevation: 2,
    },
    submitButton: {
      marginTop: 8,
      marginBottom: 24,
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: '#ddd',
      borderStyle: 'dashed',
    },
    uploadHint: {
      fontSize: 12,
      color: '#999',
      marginTop: 8,
    },
    submitButton: {
      backgroundColor: '#4CAF50',
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 40,
    },
    submitButtonDisabled: {
      backgroundColor: '#a5d6a7',
    },
    submitButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    imagePreviewContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 10,
    },
    imagePreview: {
      width: 80,
      height: 80,
      marginRight: 10,
      marginBottom: 10,
      position: 'relative',
    },
    previewImage: {
      width: '100%',
      height: '100%',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ddd',
    },
    removeImageButton: {
      position: 'absolute',
      top: -8,
      right: -8,
      backgroundColor: 'white',
      borderRadius: 10,
    },
  });

  const styles = createStyles(colors);
  const { language: appLanguage } = useLanguage();

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
        <Text variant="subheading" color={colors.buttonText} style={styles.headerTitle}>{t('support_header', appLanguage)}</Text>
      </LinearGradient>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
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
            elevation={3}
            style={styles.section}
          >
            <Text variant="heading" size="lg" weight="semibold" style={styles.sectionTitle}>{t('support_section', appLanguage)}</Text>
            
            <View style={styles.formGroup}>
              <Text variant="body" weight="medium" style={styles.label}>{t('support_subject', appLanguage)}</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                <Ionicons name="help-circle-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('support_subject_placeholder', appLanguage)}
                  placeholderTextColor={colors.placeholder}
                  value={subject}
                  onChangeText={setSubject}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text variant="body" weight="medium" style={styles.label}>{t('support_name', appLanguage)}</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('support_name_placeholder', appLanguage)}
                  placeholderTextColor={colors.placeholder}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text variant="body" weight="medium" style={styles.label}>{t('support_email', appLanguage)}</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('support_email_placeholder', appLanguage)}
                  placeholderTextColor={colors.placeholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text variant="body" weight="medium" style={styles.label}>{t('support_phone', appLanguage)}</Text>
              <View style={styles.phoneInputContainer}>
                <View style={[styles.countryCode, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                  <Text style={{ color: colors.text }}>+92</Text>
                </View>
                <View style={[styles.phoneInputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                  <Ionicons name="call-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.phoneInput, { color: colors.text }]}
                    placeholder={t('support_phone_placeholder', appLanguage)}
                    placeholderTextColor={colors.placeholder}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text variant="body" weight="medium" style={styles.label}>{t('support_country', appLanguage)}</Text>
              <View style={[styles.pickerContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, flexDirection: 'row', alignItems: 'center' }]}> 
                <Ionicons name="globe-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                <Text style={{ color: colors.text, fontSize: 16, marginLeft: 8 }}>Pakistan</Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text variant="body" weight="medium" style={styles.label}>{t('support_language', appLanguage)}</Text>
              <TouchableOpacity
                style={[styles.pickerContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, flexDirection: 'row', alignItems: 'center' }]}
                onPress={() => setLanguageModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="language-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                <Text style={{ color: colors.text, fontSize: 16, marginLeft: 8 }}>{language}</Text>
              </TouchableOpacity>
              <Modal
                animationType="slide"
                transparent={true}
                visible={languageModalVisible}
                onRequestClose={() => setLanguageModalVisible(false)}
              >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                  <View style={{ width: '80%', backgroundColor: colors.card, borderRadius: 12, padding: 24 }}>
                    <Text variant="subheading" style={{ color: colors.text, marginBottom: 16 }}>{t('support_language', appLanguage)}</Text>
                    {['English', 'Urdu'].map((lang) => (
                      <TouchableOpacity
                        key={lang}
                        style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}
                        onPress={() => {
                          setLanguage(lang);
                          setLanguageModalVisible(false);
                        }}
                      >
                        <Text style={{ color: colors.text, fontSize: 16, flex: 1 }}>{lang}</Text>
                        {language === lang && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                    <Button
                      variant="outline"
                      style={{ marginTop: 16 }}
                      onPress={() => setLanguageModalVisible(false)}
                    >
                      {t('close', appLanguage) || 'Close'}
                    </Button>
                  </View>
                </View>
              </Modal>
            </View>
          </Card>
          
          <Card 
            variant="elevated" 
            elevation={3}
            style={styles.section}
          >
            <Text variant="heading" size="lg" weight="semibold" style={styles.sectionTitle}>{t('support_medical_section', appLanguage)}</Text>

            <View style={styles.formGroup}>
              <Text variant="body" weight="medium" style={styles.label}>{t('support_medical_issue', appLanguage)}</Text>
              <View style={[styles.textAreaContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                <Ionicons name="medical-outline" size={20} color={colors.primary} style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 12 }]} />
                <TextInput
                  style={[styles.textArea, { color: colors.text }]}
                  placeholder={t('support_medical_placeholder', appLanguage)}
                  placeholderTextColor={colors.placeholder}
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              <Text variant="caption" color={colors.textLight} style={styles.charCount}>{comment.length}/5000</Text>
            </View>

            <View style={styles.formGroup}>
              <Text variant="body" weight="medium" style={styles.label}>{t('support_file_upload', appLanguage)}</Text>
              <View style={styles.uploadSection}>
                <TouchableOpacity 
                  style={[styles.uploadButton, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 102, 204, 0.1)' }]} 
                  onPress={pickImage}
                >
                  <Ionicons name="image-outline" size={24} color={colors.primary} />
                  <Text variant="caption" color={colors.primary} style={styles.uploadText}>{t('support_add_image', appLanguage)}</Text>
                </TouchableOpacity>
                <Text variant="caption" color={colors.textLight} style={styles.uploadHint}>{t('support_upload_hint', appLanguage)}</Text>
              </View>
              
              {/* Display selected images */}
              {images.length > 0 && (
                <View style={styles.imagePreviewContainer}>
                  {images.map((uri, index) => (
                    <View key={index} style={styles.imagePreview}>
                      <Image source={{ uri }} style={[styles.previewImage, { borderColor: colors.border }]} />
                      <TouchableOpacity 
                        style={[styles.removeImageButton, { backgroundColor: colors.card }]}
                        onPress={() => removeImage(index)}
                      >
                        <Ionicons name="close-circle" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Card>

          <Button 
            variant="primary" 
            fullWidth 
            icon={isSubmitting ? null : "paper-plane-outline"}
            isLoading={isSubmitting || uploading}
            disabled={isSubmitting || uploading}
            onPress={handleSubmit}
            style={styles.submitButton}
          >
            {isSubmitting ? t('support_submitting', appLanguage) : uploading ? t('support_uploading', appLanguage) : t('support_submit', appLanguage)}
          </Button>
        </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SupportFormScreen;
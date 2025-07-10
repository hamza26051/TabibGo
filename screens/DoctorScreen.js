import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, addDoc, Timestamp, doc, setDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { uploadMultipleImagesToCloudinary } from '../utils/cloudinaryUtils';
import StarRating from 'react-native-star-rating-widget';
import { getAverageRating } from '../firebase/ratingService';
// Add imports for themed components
import Card from '../components/Card';
import Button from '../components/Button';
import Text from '../components/Text';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';

const DoctorScreen = () => {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [verificationData, setVerificationData] = useState(null);
  const [canReapply, setCanReapply] = useState(false);
  const [averageRating, setAverageRating] = useState(null);
  
  // Only keep document image states
  const [cnicImage, setCnicImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [pmcCertificate, setPmcCertificate] = useState(null);
  const [mbbs, setMbbs] = useState(null);
  const [cv, setCv] = useState(null);
  const [specializationCertificate, setSpecializationCertificate] = useState(null);
  // Only keep errors for images
  const [errors, setErrors] = useState({
    cnicImage: '',
    selfieImage: '',
    pmcCertificate: '',
    mbbs: ''
  });

  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors);

  const urduText = {
    become_doctor: 'ڈاکٹر بنیں',
    join_network: 'ہمارے ہیلتھ کیئر نیٹ ورک میں شامل ہوں',
    required_documents: 'ضروری دستاویزات',
    provide_documents: 'رجسٹریشن مکمل کرنے کے لیے درج ذیل دستاویزات فراہم کریں:',
    cnic_picture: 'شناختی کارڈ کی تصویر',
    cnic_caption: 'براہ کرم اپنے شناختی کارڈ (سامنے کا رخ) کی واضح تصویر اپ لوڈ کریں',
    no_image: 'کوئی تصویر منتخب نہیں ہوئی',
    take_photo: 'تصویر لیں',
    choose_gallery: 'گیلری سے منتخب کریں',
    selfie_verification: 'سیلفی تصدیق',
    selfie_caption: 'شناخت کی تصدیق کے لیے واضح سیلفی لیں (صرف کیمرہ)',
    no_selfie: 'کوئی سیلفی نہیں لی گئی',
    take_selfie: 'سیلفی لیں',
    retake: 'دوبارہ لیں',
    pmc_certificate: 'پی ایم سی سرٹیفکیٹ',
    pmc_caption: 'اپنا پاکستان میڈیکل کمیشن سرٹیفکیٹ اپ لوڈ کریں',
    no_certificate: 'کوئی سرٹیفکیٹ منتخب نہیں ہوا',
    mbbs_degree: 'ایم بی بی ایس ڈگری',
    mbbs_caption: 'اپنی ایم بی بی ایس ڈگری اپ لوڈ کریں',
    no_degree: 'کوئی ڈگری منتخب نہیں ہوئی',
    cv_resume: 'سی وی/ریزیومے',
    cv_caption: 'اگر دستیاب ہو تو اپنی سی وی یا ریزیومے اپ لوڈ کریں',
    no_cv: 'کوئی سی وی منتخب نہیں ہوئی',
    specialization_certificate: 'اسپیشلائزیشن سرٹیفکیٹ',
    specialization_caption: 'اگر دستیاب ہو تو اپنا اسپیشلائزیشن سرٹیفکیٹ اپ لوڈ کریں',
    submit_application: 'درخواست جمع کروائیں',
    loading: 'لوڈ ہو رہا ہے...',
    application_under_review: 'درخواست زیرِ جائزہ',
    under_review_msg: 'آپ کی درخواست کا جائزہ لیا جا رہا ہے۔ ہماری ٹیم 2 سے 3 کاروباری دنوں میں دستاویزات کا جائزہ لے گی۔',
    appreciate_patience: 'اس عمل کے دوران آپ کے صبر کی قدر کرتے ہیں۔ فیصلہ ہونے پر آپ کو مطلع کیا جائے گا۔',
    what_next: 'آگے کیا ہوگا؟',
    verify_credentials: '• ہماری ٹیم آپ کی اسناد کی تصدیق کرے گی',
    may_contact: '• مزید معلومات کے لیے آپ سے رابطہ کیا جا سکتا ہے',
    once_approved: '• منظوری کے بعد آپ اپائنٹمنٹس قبول کر سکیں گے',
    congratulations: 'مبارک ہو!',
    approved_msg: 'آپ اب ہمارے پلیٹ فارم پر تصدیق شدہ ڈاکٹر ہیں۔ آپ اپائنٹمنٹس قبول کر سکتے ہیں اور مریضوں کو خدمات فراہم کر سکتے ہیں۔',
    thank_you: 'ہمارے نیٹ ورک میں شامل ہونے کا شکریہ۔ آئیے مل کر صحت کی سہولیات سب کے لیے قابلِ رسائی بنائیں۔',
    go_dashboard: 'ڈاکٹر ڈیش بورڈ پر جائیں',
    not_approved: 'درخواست منظور نہیں ہوئی',
    rejected_msg: 'معذرت کے ساتھ، آپ کی درخواست اس وقت منظور نہیں کی جا سکی۔',
    reason_rejection: 'ردی کی وجہ:',
    can_reapply: 'اب آپ ضروری تصحیحات کے ساتھ نئی درخواست جمع کروا سکتے ہیں۔',
    wait_reapply: 'ردی کی تاریخ کے 24 گھنٹے بعد آپ نئی درخواست جمع کروا سکتے ہیں۔',
    submit_new_application: 'نئی درخواست جمع کروائیں',
    cnic_required: 'شناختی کارڈ کی تصویر ضروری ہے',
    selfie_required: 'سیلفی ضروری ہے',
    pmc_required: 'پی ایم سی سرٹیفکیٹ ضروری ہے',
    mbbs_required: 'ایم بی بی ایس ڈگری ضروری ہے',
    submission_failed: 'درخواست جمع نہیں ہو سکی',
    submission_error: 'درخواست جمع کرتے وقت خرابی پیش آئی۔ براہ کرم دوبارہ کوشش کریں۔',
    permission_needed: 'اجازت درکار ہے',
    camera_permission: 'تصاویر لینے کے لیے کیمرہ اجازت درکار ہے',
    media_permission: 'تصاویر منتخب کرنے کے لیے میڈیا اجازت درکار ہے',
    selfie_permission: 'سیلفی لینے کے لیے کیمرہ اجازت درکار ہے',
    error: 'خرابی',
    failed_select_image: 'تصویر منتخب نہیں ہو سکی۔ براہ کرم دوبارہ کوشش کریں۔',
    failed_select_doc: 'دستاویز منتخب نہیں ہو سکی۔ براہ کرم دوبارہ کوشش کریں۔',
    ok: 'ٹھیک ہے',
  };

  // Check verification status when component mounts
  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (!currentUser) return;
      
      setIsLoading(true);
      try {
        // Check if user is already a doctor
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists() && userDoc.data().isDoctor) {
          setVerificationStatus('approved');
          setIsLoading(false);
          return;
        }
        
        // Check for verification requests
        const verificationQuery = query(
          collection(db, 'doctorVerifications'),
          where('userId', '==', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(verificationQuery);
        
        if (!querySnapshot.empty) {
          // Get the most recent verification request
          let latestRequest = null;
          let latestTimestamp = null;
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            const timestamp = data.submissionDate?.toDate() || new Date(0);
            
            if (!latestTimestamp || timestamp > latestTimestamp) {
              latestTimestamp = timestamp;
              latestRequest = { id: doc.id, ...data };
            }
          });
          
          setVerificationData(latestRequest);
          setVerificationStatus(latestRequest.status);
          
          // Check if user can reapply after rejection
          if (latestRequest.status === 'rejected') {
            const rejectionDate = latestRequest.rejectedAt?.toDate() || new Date(0);
            const oneDayAfterRejection = new Date(rejectionDate);
            oneDayAfterRejection.setDate(oneDayAfterRejection.getDate() + 1);
            
            setCanReapply(new Date() >= oneDayAfterRejection);
          }
        } else {
          // No verification requests found
          setVerificationStatus('none');
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
        Alert.alert(language === 'ur' ? urduText.error : 'Error', language === 'ur' ? urduText.submission_error : 'Failed to check verification status. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkVerificationStatus();
  }, [currentUser]);

  useEffect(() => {
    const fetchRating = async () => {
      if (currentUser) {
        const avg = await getAverageRating(currentUser.uid, 'doctor');
        setAverageRating(avg);
      }
    };
    fetchRating();
  }, [currentUser]);

  // Remove validation for text fields, only validate images
  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      cnicImage: '',
      selfieImage: '',
      pmcCertificate: '',
      mbbs: ''
    };
    if (!cnicImage) {
      newErrors.cnicImage = language === 'ur' ? urduText.cnic_required : 'CNIC image is required';
      isValid = false;
    }
    if (!selfieImage) {
      newErrors.selfieImage = language === 'ur' ? urduText.selfie_required : 'Selfie image is required';
      isValid = false;
    }
    if (!pmcCertificate) {
      newErrors.pmcCertificate = language === 'ur' ? urduText.pmc_required : 'PMC Certificate is required';
      isValid = false;
    }
    if (!mbbs) {
      newErrors.mbbs = language === 'ur' ? urduText.mbbs_required : 'MBBS Degree is required';
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  // Update handleSubmit to only submit userId, email, and imageUrls
  const handleSubmit = async () => {
    if (validateForm()) {
      setIsLoading(true);
      try {
        const imagesToUpload = [];
        if (cnicImage) imagesToUpload.push(cnicImage);
        if (selfieImage) imagesToUpload.push(selfieImage);
        if (pmcCertificate) imagesToUpload.push(pmcCertificate);
        if (mbbs) imagesToUpload.push(mbbs);
        if (cv) imagesToUpload.push(cv);
        if (specializationCertificate) imagesToUpload.push(specializationCertificate);
        const uploadedImageUrls = await uploadMultipleImagesToCloudinary(imagesToUpload);
        const verificationData = {
          userId: currentUser.uid,
          email: currentUser.email,
          imageUrls: uploadedImageUrls,
          status: 'pending',
          submissionDate: Timestamp.now(),
          notes: '',
        };
        await addDoc(collection(db, 'doctorVerifications'), verificationData);
        await setDoc(doc(db, 'users', currentUser.uid), {
          appliedForDoctor: true,
          doctorApplicationDate: Timestamp.now()
        }, { merge: true });
        setIsLoading(false);
        setVerificationStatus('pending');
        setCnicImage(null);
        setSelfieImage(null);
        setPmcCertificate(null);
        setMbbs(null);
        setCv(null);
        setSpecializationCertificate(null);
      } catch (error) {
        console.error('Error submitting doctor application:', error);
        setIsLoading(false);
        Alert.alert(
          language === 'ur' ? urduText.submission_failed : 'Submission Failed',
          language === 'ur' ? urduText.submission_error : 'There was an error submitting your application. Please try again later.',
          [{ text: language === 'ur' ? urduText.ok : 'OK' }]
        );
      }
    }
  };

  const pickImage = async (useCamera = false) => {
    try {
      // Request permissions
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(language === 'ur' ? urduText.permission_needed : 'Permission needed', language === 'ur' ? urduText.camera_permission : 'We need camera permission to take pictures');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(language === 'ur' ? urduText.permission_needed : 'Permission needed', language === 'ur' ? urduText.media_permission : 'We need media library permission to select images');
          return;
        }
      }

      // Launch camera or image picker
      let result;
      if (useCamera) {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
        });
      }

      if (!result.canceled) {
        setCnicImage(result.assets[0].uri);
        // Clear any error when image is selected
        if (errors.cnicImage) {
          setErrors({...errors, cnicImage: ''});
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(language === 'ur' ? urduText.error : 'Error', language === 'ur' ? urduText.failed_select_image : 'Failed to select image. Please try again.');
    }
  };
  
  const takeSelfie = async () => {
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(language === 'ur' ? urduText.permission_needed : 'Permission needed', language === 'ur' ? urduText.selfie_permission : 'We need camera permission to take a selfie');
        return;
      }

      // Launch camera for selfie
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],  // Square aspect ratio for selfie
        quality: 1,
        cameraType: ImagePicker.CameraType.front,  // Use front camera for selfie
      });

      if (!result.canceled) {
        setSelfieImage(result.assets[0].uri);
        // Clear any error when selfie is taken
        if (errors.selfieImage) {
          setErrors({...errors, selfieImage: ''});
        }
      }
    } catch (error) {
      console.error('Error taking selfie:', error);
      Alert.alert(language === 'ur' ? urduText.error : 'Error', language === 'ur' ? urduText.failed_select_image : 'Failed to take selfie. Please try again.');
    }
  };

  const pickDocument = async (documentType) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(language === 'ur' ? urduText.permission_needed : 'Permission needed', language === 'ur' ? urduText.media_permission : 'We need media library permission to select documents');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        
        // Set the appropriate state based on document type
        switch(documentType) {
          case 'pmc':
            setPmcCertificate(imageUri);
            if (errors.pmcCertificate) setErrors({...errors, pmcCertificate: ''});
            break;
          case 'mbbs':
            setMbbs(imageUri);
            if (errors.mbbs) setErrors({...errors, mbbs: ''});
            break;
          case 'cv':
            setCv(imageUri);
            break;
          case 'specialization':
            setSpecializationCertificate(imageUri);
            break;
          default:
            break;
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert(language === 'ur' ? urduText.error : 'Error', language === 'ur' ? urduText.failed_select_doc : 'Failed to select document. Please try again.');
    }
  };

  // Render different screens based on verification status
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    switch (verificationStatus) {
      case 'pending':
        return renderPendingScreen();
      case 'approved':
        return renderApprovedScreen();
      case 'rejected':
        return renderRejectedScreen();
      case 'none':
      default:
        return renderApplicationForm();
    }
  };

  // In renderPendingScreen, update all user-facing text for Urdu
  const renderPendingScreen = () => {
    return (
      <View style={styles.statusContainer}>
        <Image
          source={require('../assets/doctor-icon-new.png')}
          style={styles.statusIcon}
          resizeMode="contain"
        />
        <Text style={styles.statusTitle}>{language === 'ur' ? urduText.application_under_review : 'Application Under Review'}</Text>
        <Text style={styles.statusMessage}>
          {language === 'ur' ? urduText.under_review_msg : 'Thank you for submitting your application to join our network of healthcare professionals.\nOur team will review your documents within 2 to 3 business days.'}
        </Text>
        <Text style={styles.statusSubMessage}>
          {language === 'ur' ? urduText.appreciate_patience : 'We appreciate your patience during this process. You will be notified once a decision has been made.'}
        </Text>
        <View style={styles.statusInfoBox}>
          <Text style={styles.statusInfoTitle}>{language === 'ur' ? urduText.what_next : 'What happens next?'}</Text>
          <Text style={styles.statusInfoText}>{language === 'ur' ? urduText.verify_credentials : '• Our team will verify your credentials'}</Text>
          <Text style={styles.statusInfoText}>{language === 'ur' ? urduText.may_contact : '• You may be contacted for additional information'}</Text>
          <Text style={styles.statusInfoText}>{language === 'ur' ? urduText.once_approved : '• Once approved, you can start accepting appointments'}</Text>
        </View>
      </View>
    );
  };

  // In renderApprovedScreen, update all user-facing text for Urdu
  const renderApprovedScreen = () => {
    return (
      <View style={styles.statusContainer}>
        <Image
          source={require('../assets/doctor-icon-new.png')}
          style={[styles.statusIcon, { tintColor: '#28a745' }]}
          resizeMode="contain"
        />
        <Text style={[styles.statusTitle, { color: '#28a745' }]}>{language === 'ur' ? urduText.congratulations : 'Congratulations!'}</Text>
        <Text style={styles.statusMessage}>
          {language === 'ur' ? urduText.approved_msg : 'You are now a certified doctor on our platform. You can start accepting appointments and providing\nhealthcare services to patients.'}
        </Text>
        <Text style={styles.statusSubMessage}>
          {language === 'ur' ? urduText.thank_you : 'Thank you for joining our network of healthcare professionals. Together, we can make healthcare\nmore accessible to everyone.'}
        </Text>
        <TouchableOpacity 
          style={styles.statusButton}
          onPress={() => navigation.navigate('DoctorDashboard')}
        >
          <Text style={styles.statusButtonText}>{language === 'ur' ? urduText.go_dashboard : 'Go to Doctor Dashboard'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // In renderRejectedScreen, update all user-facing text for Urdu
  const renderRejectedScreen = () => {
    return (
      <View style={styles.statusContainer}>
        {/* Remove the red box/image and replace with a relevant emoji */}
        <Text style={{ fontSize: 48, marginBottom: 8, textAlign: 'center' }}>❌</Text>
        <Text style={[styles.statusTitle, { color: '#dc3545' }]}>{language === 'ur' ? urduText.not_approved : 'Application Not Approved'}</Text>
        <Text style={styles.statusMessage}>
          {language === 'ur' ? urduText.rejected_msg : "We're sorry to inform you that your application to become a doctor on our platform has not been approved at this time."}
        </Text>
        {verificationData && verificationData.rejectionReason && (
          <View style={styles.rejectionReasonBox}>
            <Text style={styles.rejectionReasonTitle}>{language === 'ur' ? urduText.reason_rejection : 'Reason for rejection:'}</Text>
            <Text style={styles.rejectionReasonText}>{verificationData.rejectionReason}</Text>
          </View>
        )}
        <Text style={styles.statusSubMessage}>
          {canReapply ? 
            (language === 'ur' ? urduText.can_reapply : 'You can now submit a new application with the necessary corrections.') : 
            (language === 'ur' ? urduText.wait_reapply : 'You can submit a new application after 24 hours from the rejection date.')}
        </Text>
        {canReapply && (
          <TouchableOpacity 
            style={styles.statusButton}
            onPress={() => setVerificationStatus('none')}
          >
            <Text style={styles.statusButtonText}>{language === 'ur' ? urduText.submit_new_application : 'Submit New Application'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // In renderApplicationForm, update all user-facing text for Urdu
  const renderApplicationForm = () => {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}>
          {/* Wrap the header and subtitle in an outlined Card */}
          <Card variant="outlined" style={{ margin: 16, padding: 20, alignItems: 'center' }}>
            <Text variant="heading" size="xl" weight="bold" style={{ color: colors.primary }}>
              {language === 'ur' ? urduText.become_doctor : 'Become a Doctor'} <Text style={{ fontSize: 32 }}>🩺</Text>
            </Text>
            <Text variant="body" size="md" center style={{ color: colors.textSecondary, marginTop: 8 }}>
              {language === 'ur' ? urduText.join_network : 'Join our network of healthcare professionals'}
            </Text>
          </Card>
          <Card variant="elevated" style={{ margin: 16, backgroundColor: colors.card }}>
            <Text variant="subheading" size="lg" weight="semibold" style={{ marginBottom: 8 }}>{language === 'ur' ? urduText.required_documents : 'Required Documents'}</Text>
            <Text variant="body" size="sm" style={{ color: colors.textSecondary, marginBottom: 16 }}>
              {language === 'ur' ? urduText.provide_documents : 'You need to provide the following documents to complete your registration:'}
            </Text>
            {/* CNIC Upload Section */}
            <Card variant="outlined" style={{ marginBottom: 16 }}>
              <Text variant="label">{language === 'ur' ? urduText.cnic_picture : 'CNIC Picture'}</Text>
              <Text variant="caption" style={{ marginBottom: 8 }}>
                {language === 'ur' ? urduText.cnic_caption : 'Please upload a clear picture of your CNIC (front side)'}
              </Text>
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                {cnicImage ? (
                  <Image source={{ uri: cnicImage }} style={{ width: 120, height: 80, borderRadius: 8, marginBottom: 8 }} />
                ) : (
                  <View style={{ width: 120, height: 80, borderRadius: 8, backgroundColor: colors.inputBackground, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <Text variant="caption" style={{ color: colors.textSecondary }}>{language === 'ur' ? urduText.no_image : 'No image selected'}</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                <Button size="small" icon="camera-outline" onPress={() => pickImage(true)} style={{ marginRight: 8 }}>{language === 'ur' ? urduText.take_photo : 'Take Photo'}</Button>
                <Button size="small" icon="image-outline" onPress={() => pickImage(false)}>{language === 'ur' ? urduText.choose_gallery : 'Choose from Gallery'}</Button>
              </View>
              {errors.cnicImage ? <Text variant="caption" style={{ color: colors.error, marginTop: 4 }}>{language === 'ur' ? urduText.cnic_required : errors.cnicImage}</Text> : null}
            </Card>
            {/* Selfie Upload Section */}
            <Card variant="outlined" style={{ marginBottom: 16 }}>
              <Text variant="label">{language === 'ur' ? urduText.selfie_verification : 'Selfie Verification'}</Text>
              <Text variant="caption" style={{ marginBottom: 8 }}>
                {language === 'ur' ? urduText.selfie_caption : 'Please take a clear selfie for identity verification (camera only)'}
              </Text>
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                {selfieImage ? (
                  <View style={{ alignItems: 'center' }}>
                    <Image source={{ uri: selfieImage }} style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 8 }} />
                    <Button size="small" icon="refresh-outline" variant="outline" onPress={takeSelfie}>{language === 'ur' ? urduText.retake : 'Retake'}</Button>
                  </View>
                ) : (
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.inputBackground, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <Text variant="caption" style={{ color: colors.textSecondary }}>{language === 'ur' ? urduText.no_selfie : 'No selfie taken'}</Text>
                  </View>
                )}
              </View>
              {!selfieImage && (
                <Button size="small" icon="camera-outline" onPress={takeSelfie}>{language === 'ur' ? urduText.take_selfie : 'Take Selfie'}</Button>
              )}
              {errors.selfieImage ? <Text variant="caption" style={{ color: colors.error, marginTop: 4 }}>{language === 'ur' ? urduText.selfie_required : errors.selfieImage}</Text> : null}
            </Card>
            {/* PMC Certificate Upload Section */}
            <Card variant="outlined" style={{ marginBottom: 16 }}>
              <Text variant="label">{language === 'ur' ? urduText.pmc_certificate : 'PMC Certificate'}</Text>
              <Text variant="caption" style={{ marginBottom: 8 }}>
                {language === 'ur' ? urduText.pmc_caption : 'Please upload your Pakistan Medical Commission certificate'}
              </Text>
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                {pmcCertificate ? (
                  <Image source={{ uri: pmcCertificate }} style={{ width: 120, height: 80, borderRadius: 8, marginBottom: 8 }} />
                ) : (
                  <View style={{ width: 120, height: 80, borderRadius: 8, backgroundColor: colors.inputBackground, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <Text variant="caption" style={{ color: colors.textSecondary }}>{language === 'ur' ? urduText.no_certificate : 'No certificate selected'}</Text>
                  </View>
                )}
              </View>
              <Button size="small" icon="image-outline" onPress={() => pickDocument('pmc')}>{language === 'ur' ? urduText.choose_gallery : 'Choose from Gallery'}</Button>
              {errors.pmcCertificate ? <Text variant="caption" style={{ color: colors.error, marginTop: 4 }}>{language === 'ur' ? urduText.pmc_required : errors.pmcCertificate}</Text> : null}
            </Card>
            {/* MBBS Degree Upload Section */}
            <Card variant="outlined" style={{ marginBottom: 16 }}>
              <Text variant="label">{language === 'ur' ? urduText.mbbs_degree : 'MBBS Degree'}</Text>
              <Text variant="caption" style={{ marginBottom: 8 }}>
                {language === 'ur' ? urduText.mbbs_caption : 'Please upload your MBBS degree certificate'}
              </Text>
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                {mbbs ? (
                  <Image source={{ uri: mbbs }} style={{ width: 120, height: 80, borderRadius: 8, marginBottom: 8 }} />
                ) : (
                  <View style={{ width: 120, height: 80, borderRadius: 8, backgroundColor: colors.inputBackground, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <Text variant="caption" style={{ color: colors.textSecondary }}>{language === 'ur' ? urduText.no_degree : 'No degree selected'}</Text>
                  </View>
                )}
              </View>
              <Button size="small" icon="image-outline" onPress={() => pickDocument('mbbs')}>{language === 'ur' ? urduText.choose_gallery : 'Choose from Gallery'}</Button>
              {errors.mbbs ? <Text variant="caption" style={{ color: colors.error, marginTop: 4 }}>{language === 'ur' ? urduText.mbbs_required : errors.mbbs}</Text> : null}
            </Card>
            {/* CV Upload Section (Optional) */}
            <Card variant="outlined" style={{ marginBottom: 16 }}>
              <Text variant="label">{language === 'ur' ? urduText.cv_resume : 'CV/Resume'} <Text variant="caption" style={{ color: colors.textSecondary }}>(Optional)</Text></Text>
              <Text variant="caption" style={{ marginBottom: 8 }}>
                {language === 'ur' ? urduText.cv_caption : 'You may upload your CV or resume if available'}
              </Text>
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                {cv ? (
                  <Image source={{ uri: cv }} style={{ width: 120, height: 80, borderRadius: 8, marginBottom: 8 }} />
                ) : (
                  <View style={{ width: 120, height: 80, borderRadius: 8, backgroundColor: colors.inputBackground, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <Text variant="caption" style={{ color: colors.textSecondary }}>{language === 'ur' ? urduText.no_cv : 'No CV selected'}</Text>
                  </View>
                )}
              </View>
              <Button size="small" icon="image-outline" onPress={() => pickDocument('cv')}>{language === 'ur' ? urduText.choose_gallery : 'Choose from Gallery'}</Button>
            </Card>
            {/* Specialization Certificate Upload Section (Optional) */}
            <Card variant="outlined" style={{ marginBottom: 16 }}>
              <Text variant="label">{language === 'ur' ? urduText.specialization_certificate : 'Specialization Certificate'} <Text variant="caption" style={{ color: colors.textSecondary }}>(Optional)</Text></Text>
              <Text variant="caption" style={{ marginBottom: 8 }}>
                {language === 'ur' ? urduText.specialization_caption : 'You may upload your specialization certificate if available'}
              </Text>
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                {specializationCertificate ? (
                  <Image source={{ uri: specializationCertificate }} style={{ width: 120, height: 80, borderRadius: 8, marginBottom: 8 }} />
                ) : (
                  <View style={{ width: 120, height: 80, borderRadius: 8, backgroundColor: colors.inputBackground, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <Text variant="caption" style={{ color: colors.textSecondary }}>{language === 'ur' ? urduText.no_certificate : 'No certificate selected'}</Text>
                  </View>
                )}
              </View>
              <Button size="small" icon="image-outline" onPress={() => pickDocument('specialization')}>{language === 'ur' ? urduText.choose_gallery : 'Choose from Gallery'}</Button>
            </Card>
            <Button
              variant="primary"
              size="large"
              fullWidth
              isLoading={isLoading}
              onPress={handleSubmit}
              style={{ marginTop: 12 }}
            >
              {language === 'ur' ? urduText.submit_application : 'Submit Application'}
            </Button>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.container, { paddingTop: 24 }]}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      paddingBottom: 30,
    },
    header: {
      alignItems: 'center',
      padding: 20,
      backgroundColor: colors.primary,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.buttonText,
      marginTop: 10,
    },
    headerSubtitle: {
      fontSize: 16,
      color: colors.buttonText,
      opacity: 0.8,
      marginTop: 5,
    },
    doctorIcon: {
      width: 80,
      height: 80,
      tintColor: colors.buttonText,
    },
    formContainer: {
      backgroundColor: colors.card,
      borderRadius: 10,
      margin: 15,
      padding: 20,
      shadowColor: colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    inputContainer: {
      marginBottom: 15,
    },
    label: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 5,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 5,
      padding: 10,
      fontSize: 16,
      color: colors.text,
    },
    inputError: {
      borderColor: colors.error,
    },
    errorText: {
      color: colors.error,
      fontSize: 12,
      marginTop: 5,
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: 5,
      padding: 15,
      alignItems: 'center',
      marginTop: 10,
    },
    submitButtonText: {
      color: colors.buttonText,
      fontSize: 16,
      fontWeight: 'bold',
    },
    documentSection: {
      marginBottom: 20,
      padding: 15,
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    documentTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 10,
    },
    documentDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 15,
    },
    documentItem: {
      marginBottom: 15,
    },
    documentLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 5,
    },
    documentInstructions: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 10,
    },
    imagePreviewContainer: {
      width: '100%',
      height: 200,
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    imagePreview: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
    },
    placeholderImage: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
    },
    placeholderText: {
      color: colors.textSecondary,
      fontSize: 16,
    },
    uploadButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    uploadButton: {
      backgroundColor: colors.primary,
      borderRadius: 5,
      padding: 10,
      alignItems: 'center',
      flex: 0.48,
    },
    uploadButtonText: {
      color: colors.buttonText,
      fontSize: 14,
      fontWeight: '500',
    },
    selfieButton: {
      flex: 1,
      marginTop: 10,
    },
    selfiePreviewWrapper: {
      position: 'relative',
      width: '100%',
      height: '100%',
    },
    retakeButton: {
      position: 'absolute',
      bottom: 10,
      right: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      borderRadius: 5,
      padding: 8,
    },
    retakeButtonText: {
      color: colors.buttonText,
      fontSize: 12,
      fontWeight: '500',
    },
    optionalText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontStyle: 'italic',
    },
    // Status screen styles
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: colors.textSecondary,
    },
    statusContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: colors.card,
    },
    statusIcon: {
      width: 80,
      height: 80,
      marginBottom: 16,
      tintColor: colors.primary,
    },
    statusTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    statusMessage: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 12,
      textAlign: 'center',
    },
    statusSubMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 20,
      textAlign: 'center',
    },
    statusInfoBox: {
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      padding: 16,
      marginTop: 10,
      width: '100%',
    },
    statusInfoTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 8,
    },
    statusInfoText: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 4,
    },
    statusButton: {
      backgroundColor: '#0066CC',
      borderRadius: 5,
      padding: 15,
      alignItems: 'center',
      width: '100%',
      marginTop: 10,
    },
    statusButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    rejectionReasonBox: {
      width: '100%',
      backgroundColor: '#fff8f8',
      borderRadius: 8,
      padding: 15,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#dc3545',
    },
    rejectionReasonTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#dc3545',
      marginBottom: 10,
    },
    rejectionReasonText: {
      fontSize: 14,
      color: '#444',
      lineHeight: 20,
    },
  });
};

export default DoctorScreen;
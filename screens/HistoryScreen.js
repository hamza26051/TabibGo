import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { db } from '../firebase/config';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Text, Card } from '../components';
// import translations from '../translations/appTranslations';
import { useLanguage } from '../context/LanguageContext';

// Urdu translation mapping for all user-facing text
const urduText = {
  history_header: 'طبی تاریخ',
  filter_all: 'تمام',
  filter_prescriptions: 'نسخے',
  filter_visits: 'وزٹ',
  loading: 'تاریخ لوڈ ہو رہی ہے...',
  no_history: 'کوئی طبی تاریخ نہیں ملی',
  doctor: 'ڈاکٹر:',
  date: 'تاریخ:',
  diagnosis: 'تشخیص:',
  not_specified: 'درج نہیں',
  medications: 'ادویات:',
  dosage: 'خوراک:',
  frequency: 'تعدد:',
  duration: 'دورانیہ:',
  instructions: 'ہدایات:',
  prescription: 'نسخہ',
  visit: 'وزٹ',
  view_details: 'تفصیلات دیکھیں',
  close: 'بند کریں',
  unknown: 'نامعلوم',
  prescription_details: 'نسخہ کی تفصیلات',
};

// Add Urdu mappings for dynamic values
const urduDynamic = {
  // Symptoms & Diseases
  'headache': 'سر درد',
  'pain': 'درد',
  'fever': 'بخار',
  'cough': 'کھانسی',
  'flu': 'نزلہ زکام',
  'cold': 'زکام',
  'diabetes': 'ذیابیطس',
  'hypertension': 'بلند فشار خون',
  'asthma': 'دمہ',
  'allergy': 'الرجی',
  'infection': 'انفیکشن',
  'injury': 'چوٹ',
  'fracture': 'ہڈی ٹوٹنا',
  'cancer': 'کینسر',
  'migraine': 'آدھے سر کا درد',
  'nausea': 'متلی',
  'vomiting': 'قے',
  'diarrhea': 'دست',
  'constipation': 'قبض',
  'bleeding': 'خون بہنا',
  'swelling': 'سوجن',
  'rash': 'خارش',
  'burn': 'جلنا',
  'wound': 'زخم',
  'anemia': 'خون کی کمی',
  'arthritis': 'گٹھیا',
  'epilepsy': 'مرگی',
  'tuberculosis': 'تپ دق',
  'hepatitis': 'یرقان',
  'malaria': 'ملیریا',
  'pneumonia': 'نمونیا',
  'ulcer': 'زخم',
  'stone': 'پتھری',
  // Body parts
  'kidney': 'گردہ',
  'liver': 'جگر',
  'heart': 'دل',
  'stomach': 'معدہ',
  'skin': 'جلد',
  'eye': 'آنکھ',
  'ear': 'کان',
  'nose': 'ناک',
  'throat': 'گلا',
  'chest': 'سینہ',
  'back': 'کمر',
  'leg': 'ٹانگ',
  'arm': 'بازو',
  'hand': 'ہاتھ',
  'foot': 'پاؤں',
  'tooth': 'دانت',
  'mouth': 'منہ',
  'tongue': 'زبان',
  'head': 'سر',
  'neck': 'گردن',
  'joint': 'جوڑ',
  'muscle': 'پٹھا',
  'bone': 'ہڈی',
  'blood': 'خون',
  // Medical terms
  'sugar': 'شوگر',
  'pressure': 'پریشر',
  'pulse': 'نبض',
  'temperature': 'درجہ حرارت',
  'not specified': 'درج نہیں',
  'doctor': 'ڈاکٹر',
  'patient': 'مریض',
  'diseases': 'امراض',
  'time': 'وقت',
  'notes': 'نوٹس',
  // Months
  'january': 'جنوری',
  'february': 'فروری',
  'march': 'مارچ',
  'april': 'اپریل',
  'may': 'مئی',
  'june': 'جون',
  'july': 'جولائی',
  'august': 'اگست',
  'september': 'ستمبر',
  'october': 'اکتوبر',
  'november': 'نومبر',
  'december': 'دسمبر',
  // Visit/Prescription
  'visit': 'وزٹ',
  'prescription': 'نسخہ',
  'medication': 'ادویات',
  'dosage': 'خوراک',
  'frequency': 'تعدد',
  'duration': 'دورانیہ',
  'instructions': 'ہدایات',
  'general info': 'عمومی معلومات',
  'medical details': 'طبی تفصیلات',
  'treatment': 'علاج',
  'description': 'تفصیل',
  'symptoms': 'علامات',
  'diagnosis': 'تشخیص',
  'location': 'مقام',
  'available': 'دستیاب',
  'close': 'بند کریں',
  'view details': 'تفصیلات دیکھیں',
};

const createStyles = (colors) => {
  return StyleSheet.create({
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
    filterContainer: {
      flexDirection: 'row',
      padding: 10,
      borderBottomWidth: 1,
      marginBottom: 5,
    },
    filterButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 8,
      marginHorizontal: 4,
    },
    activeFilter: {
      borderLeftWidth: 3,
    },
    listContainer: {
      padding: 16,
      paddingBottom: 30,
    },
    historyCard: {
      padding: 0,
      marginBottom: 16,
      overflow: 'hidden',
    },
    historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
      borderBottomWidth: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 10,
    },
    headerLeft: {
      flex: 1,
    },
    doctorName: {
      marginBottom: 5,
    },
    typeContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
      marginRight: 5,
      marginBottom: 5,
    },
    prescriptionBadge: {
      backgroundColor: '#FF9800',
    },
    typeBadgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
      marginLeft: 3,
    },
    visitDate: {
      marginTop: 2,
    },
    historyContent: {
      marginBottom: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    infoRow: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    infoLabel: {
      marginRight: 5,
      width: 90,
    },
    infoValue: {
      flex: 1,
    },
    prescriptionIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      backgroundColor: 'rgba(0, 102, 204, 0.1)',
      padding: 8,
      borderRadius: 8,
    },
    prescriptionIndicatorText: {
      marginLeft: 8,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0, 0, 0, 0.05)',
    },
    viewDetailsText: {
      marginLeft: 5,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
      width: '100%',
      maxHeight: '90%',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
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
    modalBody: {
      padding: 16,
    },
    modalFooter: {
      padding: 16,
      borderTopWidth: 1,
    },
    closeModalButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 10,
    },
    closeButtonIcon: {
      marginRight: 8,
    },
    detailSection: {
      marginBottom: 16,
      padding: 16,
    },
    detailSectionTitle: {
      marginBottom: 12,
    },
    detailRow: {
      flexDirection: 'row',
      marginBottom: 10,
    },
    detailLabel: {
      width: 100,
    },
    detailValue: {
      flex: 1,
    },
    prescriptionTextContainer: {
      padding: 16,
      marginVertical: 12,
    },
    prescriptionText: {
      lineHeight: 22,
    },
    prescriptionImageContainer: {
      alignItems: 'center',
      marginVertical: 12,
      padding: 8,
      overflow: 'hidden',
    },
    prescriptionImage: {
      width: '100%',
      height: 200,
      borderRadius: 8,
    },
    prescriptionType: {
      fontStyle: 'italic',
      textAlign: 'right',
      marginTop: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorText: {
      marginTop: 16,
      textAlign: 'center',
      marginBottom: 24,
    },
    retryButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 10,
    },
    retryButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    emptyText: {
      marginTop: 20,
    },
    emptySubText: {
      marginTop: 10,
      textAlign: 'center',
      maxWidth: '80%',
    },
    medicationsContainer: {
      marginVertical: 12,
    },
    medicationsTitle: {
      marginBottom: 10,
    },
    medicationItem: {
      padding: 12,
      marginBottom: 10,
    },
    medicationName: {
      marginBottom: 6,
    },
    medicationDetail: {
      marginBottom: 4,
    },
  });
};

const HistoryScreen = ({ navigation, route }) => {
  const { currentUser } = useAuth();
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'visits', 'prescriptions'
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(20));

  const { language } = useLanguage();

  // Set filter from navigation params if provided
  useEffect(() => {
    if (route && route.params && route.params.filter) {
      setActiveFilter(route.params.filter);
    }
  }, [route && route.params && route.params.filter]);

  useEffect(() => {
    fetchVisitHistory();
    
    // Animation effect on component mount
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

  const fetchVisitHistory = async () => {
    if (!currentUser) {
      setError('Please log in to view your history.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const visitsList = [];
      
      // Fetch completed doctor-patient matches from doctorPatientMatches collection
      const matchesRef = collection(db, 'doctorPatientMatches');
      const matchesQuery = query(
        matchesRef,
        where('patientId', '==', currentUser.uid),
        where('status', '==', 'completed'),
        orderBy('completedAt', 'desc') // Sort by completion date, newest first
      );

      const matchesSnapshot = await getDocs(matchesQuery);
      
      matchesSnapshot.forEach((doc) => {
        visitsList.push({
          id: doc.id,
          type: 'visit',
          ...doc.data(),
          visitDate: doc.data().completedAt || doc.data().createdAt,
        });
      });
      
      // Fetch visits from the visits collection (for backward compatibility)
      try {
        const visitsRef = collection(db, 'visits');
        const visitsQuery = query(
          visitsRef,
          where('patientId', '==', currentUser.uid),
          orderBy('visitDate', 'desc') // Sort by date, newest first
        );

        const visitsSnapshot = await getDocs(visitsQuery);

        visitsSnapshot.forEach((doc) => {
          visitsList.push({
            id: doc.id,
            type: 'visit',
            ...doc.data(),
          });
        });
      } catch (visitsError) {
        console.error('Error fetching from visits collection:', visitsError);
        // Check if this is an indexing error
        if (visitsError.message && visitsError.message.includes('requires an index')) {
          console.log('Index required for visits collection query');
          // Continue with the rest of the function, we'll just skip the visits collection data
          // We could show a specific message to the admin here if needed
        } else {
          // For other errors, we might want to throw and handle in the outer catch
          throw visitsError;
        }
      }

      // Fetch prescriptions from the prescriptions collection
      const prescriptionsRef = collection(db, 'prescriptions');
      const prescriptionsQuery = query(
        prescriptionsRef,
        where('patientId', '==', currentUser.uid),
        orderBy('createdAt', 'desc') // Sort by date, newest first
      );

      const prescriptionsSnapshot = await getDocs(prescriptionsQuery);
      
      // Add prescriptions to the visits list if they don't already have a corresponding visit
      prescriptionsSnapshot.forEach((doc) => {
        const prescriptionData = doc.data();
        
        // Check if this prescription is already part of a visit
        const existingVisit = visitsList.find(visit => 
          visit.prescriptionId === doc.id || visit.id === prescriptionData.visitId
        );
        
        if (!existingVisit) {
          // This is a standalone prescription, add it to the list
          visitsList.push({
            id: doc.id,
            type: 'prescription',
            ...prescriptionData,
          });
        } else {
          // This prescription belongs to a visit, add prescription data to the visit
          const visitIndex = visitsList.findIndex(visit => 
            visit.id === prescriptionData.visitId || visit.prescriptionId === doc.id
          );
          
          if (visitIndex !== -1) {
            visitsList[visitIndex].prescriptionData = prescriptionData;
            visitsList[visitIndex].hasPrescription = true;
          }
        }
      });

      // Sort the combined list by date
      const sortedVisits = visitsList.sort((a, b) => {
        const dateA = a.visitDate || a.createdAt;
        const dateB = b.visitDate || b.createdAt;
        
        if (!dateA) return 1;
        if (!dateB) return -1;
        
        const timeA = dateA.toDate ? dateA.toDate().getTime() : new Date(dateA).getTime();
        const timeB = dateB.toDate ? dateB.toDate().getTime() : new Date(dateB).getTime();
        
        return timeB - timeA; // Descending order (newest first)
      });

      setVisits(sortedVisits);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching visit history:', error);
      // Check if this is an indexing error
      if (error.message && error.message.includes('requires an index')) {
        setError('Indexing error. Please try again later.');
      } else {
        setError('Failed to load history. Please try again.');
      }
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date unknown';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFilteredVisits = () => {
    if (activeFilter === 'all') return visits;
    if (activeFilter === 'prescription') {
      // Show all items that have a prescription (either type 'prescription' or hasPrescription true)
      return visits.filter(item => item.type === 'prescription' || item.hasPrescription);
    }
    return visits.filter(item => item.type === activeFilter);
  };

  // Function to provide haptic feedback on button press
  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  
  const openVisitDetails = (visit) => {
    triggerHaptic();
    setSelectedVisit(visit);
    setModalVisible(true);
  };

  // Helper to translate dynamic values
  function translateDynamic(val) {
    if (language === 'ur' && typeof val === 'string') {
      const key = val.trim().toLowerCase();
      return urduDynamic[key] || val;
    }
    return val;
  }

  const renderVisitItem = ({ item }) => {
    const isVisit = item.type === 'visit';
    const isPrescription = item.type === 'prescription' || item.hasPrescription;

    return (
      <Card
        variant="elevated"
        elevation={3}
        style={styles.historyCard}
        onPress={() => openVisitDetails(item)}
      >
        <View style={[styles.historyHeader, { borderBottomColor: colors.divider }]}> 
          <View style={styles.headerLeft}>
            <Text variant="subheading" color={colors.primary} style={styles.doctorName}>
              {item.doctorName || (language === 'ur' ? urduText.unknown : 'Unknown Doctor')}
            </Text>
            <View style={styles.typeContainer}>
              {isVisit && (
                <View style={[styles.typeBadge, { backgroundColor: colors.success }]}> 
                  <Ionicons name="medical-outline" size={12} color="#fff" />
                  <Text style={styles.typeBadgeText}>{language === 'ur' ? urduText.visit : 'Visit'}</Text>
                </View>
              )}
              {isPrescription && (
                <View style={[styles.typeBadge, styles.prescriptionBadge, { backgroundColor: colors.warning }]}> 
                  <Ionicons name="document-text-outline" size={12} color="#fff" />
                  <Text style={styles.typeBadgeText}>{language === 'ur' ? urduText.prescription : 'Prescription'}</Text>
                </View>
              )}
            </View>
          </View>
          <Text variant="caption" color={colors.textLight} style={styles.visitDate}>
            {formatDate(item.visitDate || item.createdAt)}
          </Text>
        </View>
        <View style={styles.historyContent}>
          {isVisit && item.symptoms && (
            <View style={styles.infoRow}>
              <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.infoLabel}>{language === 'ur' ? 'علامات:' : 'Symptoms:'}</Text>
              <Text variant="body" color={colors.text} style={styles.infoValue}>{translateDynamic(item.symptoms)}</Text>
            </View>
          )}
          {isVisit && item.description && (
            <View style={styles.infoRow}>
              <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.infoLabel}>{language === 'ur' ? 'تفصیل:' : 'Description:'}</Text>
              <Text variant="body" color={colors.text} style={styles.infoValue}>{translateDynamic(item.description)}</Text>
            </View>
          )}
          {isVisit && item.diagnosis && (
            <View style={styles.infoRow}>
              <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.infoLabel}>{language === 'ur' ? urduText.diagnosis : 'Diagnosis:'}</Text>
              <Text variant="body" color={colors.text} style={styles.infoValue}>{translateDynamic(item.diagnosis)}</Text>
            </View>
          )}
          {isPrescription && (
            <View style={styles.prescriptionIndicator}>
              <Ionicons name="document-text" size={16} color={colors.primary} />
              <Text variant="body" color={colors.primary} style={styles.prescriptionIndicatorText}>
                {language === 'ur' ? 'نسخہ دستیاب ہے' : 'Prescription available'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.cardFooter}>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          <Text variant="caption" weight="semibold" color={colors.primary} style={styles.viewDetailsText}>
            {language === 'ur' ? urduText.view_details : 'View Details'}
          </Text>
        </View>
      </Card>
    );
  };

  const renderVisitDetailsModal = () => {
    if (!selectedVisit) return null;
    const isVisit = selectedVisit.type === 'visit';
    const prescriptionData = selectedVisit.prescriptionData || selectedVisit;
    const hasPrescription = selectedVisit.hasPrescription || selectedVisit.type === 'prescription';
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          triggerHaptic();
          setModalVisible(false);
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}> 
          <View style={[styles.modalContent, { backgroundColor: colors.card, shadowColor: colors.shadow }]}> 
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}> 
              <Text variant="subheading" style={styles.modalTitle}>
                {isVisit ? (language === 'ur' ? 'وزٹ کی تفصیلات' : 'Visit Details') : (language === 'ur' ? urduText.prescription_details : 'Prescription Details')}
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  triggerHaptic();
                  setModalVisible(false);
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Card variant="flat" style={[styles.detailSection, { borderBottomColor: colors.divider }]}> 
                <Text variant="heading" size="md" weight="semibold" color={colors.primary} style={styles.detailSectionTitle}>
                  {language === 'ur' ? 'عمومی معلومات' : 'General Info'}
                </Text>
                <View style={styles.detailRow}>
                  <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.detailLabel}>{language === 'ur' ? urduText.doctor : 'Doctor:'}</Text>
                  <Text variant="body" color={colors.text} style={styles.detailValue}>{translateDynamic(selectedVisit.doctorName) || (language === 'ur' ? urduText.unknown : 'Unknown Doctor')}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.detailLabel}>{language === 'ur' ? urduText.date : 'Date:'}</Text>
                  <Text variant="body" color={colors.text} style={styles.detailValue}>{formatDate(selectedVisit.visitDate || selectedVisit.completedAt || selectedVisit.createdAt)}</Text>
                </View>
                {isVisit && selectedVisit.location && (
                  <View style={styles.detailRow}>
                    <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.detailLabel}>{language === 'ur' ? 'مقام:' : 'Location:'}</Text>
                    <Text variant="body" color={colors.text} style={styles.detailValue}>{selectedVisit.location}</Text>
                  </View>
                )}
              </Card>
              {isVisit && (
                <Card variant="flat" style={[styles.detailSection, { borderBottomColor: colors.divider }]}> 
                  <Text variant="heading" size="md" weight="semibold" color={colors.primary} style={styles.detailSectionTitle}>
                    {language === 'ur' ? 'طبی تفصیلات' : 'Medical Details'}
                  </Text>
                  {selectedVisit.symptoms && (
                    <View style={styles.detailRow}>
                      <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.detailLabel}>{language === 'ur' ? 'علامات:' : 'Symptoms:'}</Text>
                      <Text variant="body" color={colors.text} style={styles.detailValue}>{translateDynamic(selectedVisit.symptoms)}</Text>
                    </View>
                  )}
                  {selectedVisit.description && (
                    <View style={styles.detailRow}>
                      <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.detailLabel}>{language === 'ur' ? 'تفصیل:' : 'Description:'}</Text>
                      <Text variant="body" color={colors.text} style={styles.detailValue}>{translateDynamic(selectedVisit.description)}</Text>
                    </View>
                  )}
                  {selectedVisit.diagnosis && (
                    <View style={styles.detailRow}>
                      <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.detailLabel}>{language === 'ur' ? urduText.diagnosis : 'Diagnosis:'}</Text>
                      <Text variant="body" color={colors.text} style={styles.detailValue}>{translateDynamic(selectedVisit.diagnosis)}</Text>
                    </View>
                  )}
                  {selectedVisit.treatment && (
                    <View style={styles.detailRow}>
                      <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.detailLabel}>{language === 'ur' ? 'علاج:' : 'Treatment:'}</Text>
                      <Text variant="body" color={colors.text} style={styles.detailValue}>{selectedVisit.treatment}</Text>
                    </View>
                  )}
                  {selectedVisit.notes && (
                    <View style={styles.detailRow}>
                      <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.detailLabel}>{language === 'ur' ? 'نوٹس:' : 'Notes:'}</Text>
                      <Text variant="body" color={colors.text} style={styles.detailValue}>{selectedVisit.notes}</Text>
                    </View>
                  )}
                </Card>
              )}
              {hasPrescription && (
                <Card variant="flat" style={[styles.detailSection, { borderBottomColor: colors.divider }]}> 
                  <Text variant="heading" size="md" weight="semibold" color={colors.primary} style={styles.detailSectionTitle}>
                    {language === 'ur' ? urduText.prescription : 'Prescription'}
                  </Text>
                  {prescriptionData.diagnosis && (
                    <View style={styles.detailRow}>
                      <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.detailLabel}>{language === 'ur' ? urduText.diagnosis : 'Diagnosis:'}</Text>
                      <Text variant="body" color={colors.text} style={styles.detailValue}>{prescriptionData.diagnosis}</Text>
                    </View>
                  )}
                  {prescriptionData.medications && prescriptionData.medications.length > 0 && (
                    <View style={styles.detailRow}>
                      <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.detailLabel}>{language === 'ur' ? urduText.medications : 'Medications:'}</Text>
                      <View style={styles.detailValue}>
                        {prescriptionData.medications.map((med, idx) => (
                          <View key={idx} style={{ marginBottom: 8 }}>
                            <Text style={{ fontWeight: 'bold' }}>{translateDynamic(med.name)}</Text>
                            <Text>{language === 'ur' ? urduText.dosage : 'Dosage:'} {translateDynamic(med.dosage)}</Text>
                            <Text>{language === 'ur' ? urduText.frequency : 'Frequency:'} {translateDynamic(med.frequency)}</Text>
                            <Text>{language === 'ur' ? urduText.duration : 'Duration:'} {translateDynamic(med.duration)}</Text>
                            {med.instructions ? <Text>{language === 'ur' ? urduText.instructions : 'Instructions:'} {translateDynamic(med.instructions)}</Text> : null}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  {prescriptionData.prescriptionText && (
                    <View style={styles.prescriptionTextContainer}>
                      <Text style={styles.prescriptionText}>{prescriptionData.prescriptionText}</Text>
                    </View>
                  )}
                  {prescriptionData.prescriptionImageUrl && (
                    <View style={styles.prescriptionImageContainer}>
                      <Image 
                        source={{ uri: prescriptionData.prescriptionImageUrl }} 
                        style={styles.prescriptionImage} 
                        resizeMode="contain"
                      />
                    </View>
                  )}
                </Card>
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.closeModalButton} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.primary} style={styles.closeButtonIcon} />
                <Text variant="body" color={colors.primary}>{language === 'ur' ? urduText.close : 'Close'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text variant="body" style={styles.loadingText}>Loading history...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <Ionicons name="alert-circle-outline" size={50} color={colors.error} />
        <Text variant="body" style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: colors.primary }]} 
          onPress={() => {
            triggerHaptic();
            fetchVisitHistory();
          }}
        >
          <Text style={styles.retryButtonText} color={colors.buttonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (visits.length === 0) {
    return (
      <SafeAreaView style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <Ionicons name="calendar-outline" size={70} color={colors.disabled} />
        <Text variant="heading" style={styles.emptyText}>No history found</Text>
        <Text variant="body" color={colors.textSecondary} style={styles.emptySubText}>
          You haven't recorded any medical history yet.
        </Text>
      </SafeAreaView>
    );
  }

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
        <Text variant="subheading" color={colors.buttonText} style={styles.headerTitle}>
          {language === 'ur' ? urduText.history_header : 'Medical History'}
        </Text>
      </LinearGradient>
      
      <Animated.View style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        flex: 1
      }}>
        <View style={[styles.filterContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={[styles.filterButton, activeFilter === 'all' && [styles.activeFilter, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]]}
            onPress={() => {
              triggerHaptic();
              setActiveFilter('all');
            }}
          >
            <Text 
              variant="label" 
              color={activeFilter === 'all' ? colors.primary : colors.textSecondary}
              weight={activeFilter === 'all' ? 'semibold' : 'regular'}
            >
              {language === 'ur' ? urduText.filter_all : 'All'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, activeFilter === 'visit' && [styles.activeFilter, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]]}
            onPress={() => {
              triggerHaptic();
              setActiveFilter('visit');
            }}
          >
            <Text 
              variant="label" 
              color={activeFilter === 'visit' ? colors.primary : colors.textSecondary}
              weight={activeFilter === 'visit' ? 'semibold' : 'regular'}
            >
              {language === 'ur' ? urduText.filter_visits : 'Visits'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, activeFilter === 'prescription' && [styles.activeFilter, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]]}
            onPress={() => {
              triggerHaptic();
              setActiveFilter('prescription');
            }}
          >
            <Text 
              variant="label" 
              color={activeFilter === 'prescription' ? colors.primary : colors.textSecondary}
              weight={activeFilter === 'prescription' ? 'semibold' : 'regular'}
            >
              {language === 'ur' ? urduText.filter_prescriptions : 'Prescriptions'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={getFilteredVisits()}
          renderItem={renderVisitItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={fetchVisitHistory}
        />
      </Animated.View>
      
      {renderVisitDetailsModal()}
    </SafeAreaView>
  );
};

export default HistoryScreen;
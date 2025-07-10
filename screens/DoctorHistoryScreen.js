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
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { db } from '../firebase/config';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Text, Card } from '../components';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { toUrduNumber } from '../utils/numberUtils';

const DoctorHistoryScreen = ({ navigation }) => {
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
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(20))[0];

  const urduText = {
    visit: 'وزٹ',
    prescription: 'نسخہ',
    unknown_patient: 'نامعلوم مریض',
    symptoms: 'علامات:',
    description: 'تفصیل:',
    diagnosis: 'تشخیص:',
    treatment: 'علاج:',
    notes: 'نوٹس:',
    patient: 'مریض:',
    date: 'تاریخ:',
    general_info: 'عمومی معلومات',
    medical_details: 'طبی تفصیلات',
    prescription_details: 'نسخہ کی تفصیلات',
    medications: 'ادویات:',
    dosage: 'خوراک:',
    frequency: 'تعدد:',
    duration: 'دورانیہ:',
    instructions: 'ہدایات:',
    prescription_available: 'نسخہ دستیاب ہے',
    view_details: 'تفصیلات دیکھیں',
    loading: 'مریض کی تاریخ لوڈ ہو رہی ہے...',
    retry: 'دوبارہ کوشش کریں',
    no_history: 'کوئی مریض کی تاریخ نہیں ملی',
  };

  const urduDynamic = {
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

  function translateDynamic(val) {
    if (language === 'ur' && typeof val === 'string') {
      const key = val.trim().toLowerCase();
      return urduDynamic[key] || val;
    }
    return val;
  }

  // Update formatDate to show Urdu months and numerals
  function formatDateLocalized(timestamp) {
    if (!timestamp) return language === 'ur' ? 'نامعلوم' : 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (language === 'ur') {
      const urduMonths = ['جنوری','فروری','مارچ','اپریل','مئی','جون','جولائی','اگست','ستمبر','اکتوبر','نومبر','دسمبر'];
      const day = toUrduNumber(date.getDate());
      const month = urduMonths[date.getMonth()];
      const year = toUrduNumber(date.getFullYear());
      let hour = toUrduNumber(date.getHours());
      let minute = toUrduNumber(date.getMinutes().toString().padStart(2, '0'));
      return `${day} ${month} ${year}، ${hour}:${minute}`;
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const { language } = useLanguage();

  useEffect(() => {
    fetchVisitHistory();
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
      setError('You must be logged in to view patient history');
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
        where('doctorId', '==', currentUser.uid),
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
      
      // Fetch prescriptions from the prescriptions collection
      const prescriptionsRef = collection(db, 'prescriptions');
      const prescriptionsQuery = query(
        prescriptionsRef,
        where('doctorId', '==', currentUser.uid),
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
        setError('This feature requires a database index. Please contact the administrator to set up the required index.');
      } else {
        setError('Failed to load patient history. Please try again later.');
      }
      setLoading(false);
    }
  };

  const getFilteredVisits = () => {
    if (activeFilter === 'all') return visits;
    if (activeFilter === 'prescription') {
      // Show all items that have a prescription (either type 'prescription' or hasPrescription true)
      return visits.filter(item => item.type === 'prescription' || item.hasPrescription);
    }
    return visits.filter(item => item.type === activeFilter);
  };

  const openVisitDetails = (visit) => {
    setSelectedVisit(visit);
    setModalVisible(true);
  };

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
            <Text variant="subheading" color={colors.primary} style={styles.patientName}>
              {item.patientName || (language === 'ur' ? urduText.unknown_patient : 'Unknown Patient')}
            </Text>
            <View style={styles.typeContainer}>
              {isVisit && (
                <View style={[styles.typeBadge, { backgroundColor: colors.success }]}>
                  <Ionicons name="medical-outline" size={12} color={colors.buttonText} />
                  <Text style={styles.typeBadgeText}>{language === 'ur' ? urduText.visit : 'Visit'}</Text>
                </View>
              )}
              {isPrescription && (
                <View style={[styles.typeBadge, styles.prescriptionBadge, { backgroundColor: colors.warning }]}>
                  <Ionicons name="document-text-outline" size={12} color={colors.buttonText} />
                  <Text style={styles.typeBadgeText}>{language === 'ur' ? urduText.prescription : 'Prescription'}</Text>
                </View>
              )}
            </View>
          </View>
          <Text variant="caption" color={colors.textLight} style={styles.visitDate}>
            {formatDateLocalized(item.visitDate || item.createdAt)}
          </Text>
        </View>
        <View style={styles.historyContent}>
          {isVisit && item.symptoms && (
            <View style={styles.infoRow}>
              <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.infoLabel}>{language === 'ur' ? urduText.symptoms : 'Symptoms:'}</Text>
              <Text variant="body" color={colors.text} style={styles.infoValue}>{translateDynamic(item.symptoms)}</Text>
            </View>
          )}
          {isVisit && item.description && (
            <View style={styles.infoRow}>
              <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.infoLabel}>{language === 'ur' ? urduText.description : 'Description:'}</Text>
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
                {language === 'ur' ? urduText.prescription_available : 'Prescription available'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.cardFooter}>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          <Text variant="caption" weight="semibold" color={colors.primary} style={styles.viewDetailsText}>{language === 'ur' ? urduText.view_details : 'View details'}</Text>
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
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
              <Text variant="subheading" style={styles.modalTitle}>
                {isVisit ? (language === 'ur' ? urduText.prescription_details : 'Visit Details') : (language === 'ur' ? urduText.prescription_details : 'Prescription Details')}
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Card variant="flat" style={[styles.detailSection, { borderBottomColor: colors.divider }]}> 
                <Text variant="heading" size="md" weight="semibold" color={colors.primary} style={styles.detailSectionTitle}>{language === 'ur' ? urduText.general_info : 'General Information'}</Text>
                <View style={styles.detailRow}>
                  <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.detailLabel}>{language === 'ur' ? urduText.patient : 'Patient:'}</Text>
                  <Text variant="body" color={colors.text} style={styles.detailValue}>{translateDynamic(selectedVisit.patientName) || (language === 'ur' ? urduText.unknown_patient : 'Unknown')}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.detailLabel}>{language === 'ur' ? urduText.date : 'Date:'}</Text>
                  <Text variant="body" color={colors.text} style={styles.detailValue}>{formatDateLocalized(selectedVisit.visitDate || selectedVisit.completedAt || selectedVisit.createdAt)}</Text>
                </View>
              </Card>
              {isVisit && (
                <Card variant="flat" style={[styles.detailSection, { borderBottomColor: colors.divider }]}> 
                  <Text variant="heading" size="md" weight="semibold" color={colors.primary} style={styles.detailSectionTitle}>{language === 'ur' ? urduText.medical_details : 'Medical Details'}</Text>
                  {selectedVisit.symptoms && (
                    <View style={styles.detailRow}>
                      <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.detailLabel}>{language === 'ur' ? urduText.symptoms : 'Symptoms:'}</Text>
                      <Text variant="body" color={colors.text} style={styles.detailValue}>{translateDynamic(selectedVisit.symptoms)}</Text>
                    </View>
                  )}
                  {selectedVisit.description && (
                    <View style={styles.detailRow}>
                      <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.detailLabel}>{language === 'ur' ? urduText.description : 'Description:'}</Text>
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
                      <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.detailLabel}>{language === 'ur' ? urduText.treatment : 'Treatment:'}</Text>
                      <Text variant="body" color={colors.text} style={styles.detailValue}>{translateDynamic(selectedVisit.treatment)}</Text>
                    </View>
                  )}
                  {selectedVisit.notes && (
                    <View style={styles.detailRow}>
                      <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.detailLabel}>{language === 'ur' ? urduText.notes : 'Notes:'}</Text>
                      <Text variant="body" color={colors.text} style={styles.detailValue}>{translateDynamic(selectedVisit.notes)}</Text>
                    </View>
                  )}
                </Card>
              )}
              {hasPrescription && (
                <Card variant="flat" style={[styles.detailSection, { borderBottomColor: colors.divider }]}> 
                  <Text variant="heading" size="md" weight="semibold" color={colors.primary} style={styles.detailSectionTitle}>{language === 'ur' ? urduText.prescription : 'Prescription'}</Text>
                  {prescriptionData.diagnosis && (
                    <View style={styles.detailRow}>
                      <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.detailLabel}>{language === 'ur' ? urduText.diagnosis : 'Diagnosis:'}</Text>
                      <Text variant="body" color={colors.text} style={styles.detailValue}>{translateDynamic(prescriptionData.diagnosis)}</Text>
                    </View>
                  )}
                  {prescriptionData.medications && prescriptionData.medications.length > 0 && (
                    <View style={styles.medicationsContainer}>
                      <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.medicationsTitle}>{language === 'ur' ? urduText.medications : 'Medications:'}</Text>
                      {prescriptionData.medications.map((med, index) => (
                        <Card key={index} variant="outlined" style={styles.medicationItem}>
                          <Text variant="subheading" weight="semibold" style={styles.medicationName}>{translateDynamic(med.name)}</Text>
                          {med.dosage && <Text variant="caption" color={colors.textSecondary} style={styles.medicationDetail}>{language === 'ur' ? urduText.dosage : 'Dosage:'} {translateDynamic(med.dosage)}</Text>}
                          {med.frequency && <Text variant="caption" color={colors.textSecondary} style={styles.medicationDetail}>{language === 'ur' ? urduText.frequency : 'Frequency:'} {translateDynamic(med.frequency)}</Text>}
                          {med.duration && <Text variant="caption" color={colors.textSecondary} style={styles.medicationDetail}>{language === 'ur' ? urduText.duration : 'Duration:'} {translateDynamic(med.duration)}</Text>}
                          {med.instructions && <Text variant="caption" color={colors.textSecondary} style={styles.medicationDetail}>{language === 'ur' ? urduText.instructions : 'Instructions:'} {translateDynamic(med.instructions)}</Text>}
                        </Card>
                      ))}
                    </View>
                  )}
                  {prescriptionData.notes && (
                    <View style={styles.detailRow}>
                      <Text variant="label" weight="semibold" color={colors.textSecondary} style={styles.detailLabel}>{language === 'ur' ? urduText.notes : 'Notes:'}</Text>
                      <Text variant="body" color={colors.text} style={styles.detailValue}>{translateDynamic(prescriptionData.notes)}</Text>
                </View>
                  )}
                </Card>
              )}
            </ScrollView>
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
        <Text variant="body" style={styles.loadingText}>{language === 'ur' ? urduText.loading : 'Loading patient history...'}</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.errorContainer, { backgroundColor: colors.background }]}> 
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <Ionicons name="alert-circle" size={50} color={colors.error} />
        <Text variant="body" style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={fetchVisitHistory}
        >
          <Text style={styles.retryButtonText} color={colors.buttonText}>{language === 'ur' ? urduText.retry : 'Retry'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (visits.length === 0) {
    return (
      <SafeAreaView style={[styles.emptyContainer, { backgroundColor: colors.background }]}> 
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <Ionicons name="document-text-outline" size={70} color={colors.primary} />
        <Text style={[styles.emptyText, { color: colors.text }]}>{language === 'ur' ? urduText.no_history : 'No patient history found'}</Text>
        <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>Your completed patient visits and prescriptions will appear here</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={[colors.primary, isDarkMode ? '#1A3A5A' : '#4D94FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.buttonText} />
        </TouchableOpacity>
        <Text variant="subheading" color={colors.buttonText} style={styles.headerTitle}>Patient Medical History</Text>
      </LinearGradient>
      <Animated.View style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        flex: 1
      }}>
        <View style={[styles.filterContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}> 
          <TouchableOpacity 
            style={[styles.filterButton, activeFilter === 'all' && [styles.activeFilter, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]]}
            onPress={() => setActiveFilter('all')}
          >
            <Text 
              variant="label" 
              color={activeFilter === 'all' ? colors.primary : colors.textSecondary}
              weight={activeFilter === 'all' ? 'semibold' : 'regular'}
            >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
            style={[styles.filterButton, activeFilter === 'visit' && [styles.activeFilter, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]]}
          onPress={() => setActiveFilter('visit')}
        >
            <Text 
              variant="label" 
              color={activeFilter === 'visit' ? colors.primary : colors.textSecondary}
              weight={activeFilter === 'visit' ? 'semibold' : 'regular'}
            >
            Visits
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
            style={[styles.filterButton, activeFilter === 'prescription' && [styles.activeFilter, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]]}
          onPress={() => setActiveFilter('prescription')}
        >
            <Text 
              variant="label" 
              color={activeFilter === 'prescription' ? colors.primary : colors.textSecondary}
              weight={activeFilter === 'prescription' ? 'semibold' : 'regular'}
            >
            Prescriptions
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={getFilteredVisits()}
        renderItem={renderVisitItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      </Animated.View>
      {renderVisitDetailsModal()}
    </SafeAreaView>
  );
};

const createStyles = (colors) => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorText: {
      fontSize: 16,
      textAlign: 'center',
      marginVertical: 20,
    },
    retryButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
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
      fontSize: 18,
      fontWeight: 'bold',
      marginTop: 20,
    },
    emptySubText: {
      fontSize: 14,
      textAlign: 'center',
      marginTop: 10,
      maxWidth: '80%',
    },
    filterContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 15,
      borderBottomWidth: 1,
    },
    filterButton: {
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    activeFilterButton: {
      borderWidth: 1,
    },
    filterText: {
      fontSize: 14,
    },
    activeFilterText: {
      fontWeight: 'bold',
    },
    listContainer: {
      padding: 15,
    },
    historyCard: {
      borderRadius: 10,
      marginBottom: 15,
      padding: 15,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      borderBottomWidth: 1,
      paddingBottom: 10,
      marginBottom: 10,
    },
    headerLeft: {
      flex: 1,
    },
    patientName: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    visitDate: {
      fontSize: 12,
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
      marginLeft: 5,
    },
    typeBadgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
      marginLeft: 3,
    },
    historyContent: {
      marginBottom: 10,
    },
    infoRow: {
      marginBottom: 5,
    },
    infoLabel: {
      fontSize: 12,
      marginBottom: 2,
    },
    infoValue: {
      fontSize: 14,
    },
    prescriptionIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 5,
    },
    prescriptionIndicatorText: {
      marginLeft: 5,
      fontSize: 14,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    viewDetailsText: {
      fontSize: 14,
      marginLeft: 5,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      width: '90%',
      maxHeight: '80%',
      borderRadius: 10,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      padding: 15,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    closeButton: {
      padding: 5,
    },
    modalBody: {
      padding: 15,
    },
    detailSection: {
      marginBottom: 20,
      paddingBottom: 15,
      borderBottomWidth: 1,
    },
    detailSectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    detailRow: {
      marginBottom: 8,
    },
    detailLabel: {
      fontSize: 14,
      marginBottom: 2,
    },
    detailValue: {
      fontSize: 15,
    },
    medicationItem: {
      marginBottom: 15,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    medicationName: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    medicationDosage: {
      fontSize: 14,
      marginBottom: 3,
    },
    medicationDuration: {
      fontSize: 14,
      marginBottom: 3,
    },
    medicationInstructions: {
      fontSize: 14,
      fontStyle: 'italic',
    },
    prescriptionInstructions: {
      marginTop: 10,
    },
    instructionsTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    instructionsText: {
      fontSize: 14,
      lineHeight: 20,
    },
    medicationsContainer: {
      marginTop: 10,
    },
    medicationsTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    medicationDetail: {
      marginTop: 3,
    },
    header: {
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
      paddingBottom: 10,
      paddingHorizontal: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      padding: 5,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    activeFilter: {
      backgroundColor: '#E0F2FE', // Light blue background for active filter
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#4D94FF', // Primary color border
      paddingHorizontal: 15,
      paddingVertical: 8,
    },
  });
};

export default DoctorHistoryScreen;
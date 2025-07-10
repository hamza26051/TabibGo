import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useLanguage } from '../context/LanguageContext';

// Urdu translation mapping for all user-facing text
const urduText = {
  loading: 'نسخے لوڈ ہو رہے ہیں...',
  error_login: 'نسخے دیکھنے کے لیے لاگ ان ہونا ضروری ہے',
  error_load: 'نسخے لوڈ کرنے میں ناکامی۔ براہ کرم بعد میں دوبارہ کوشش کریں۔',
  retry: 'دوبارہ کوشش کریں',
  no_prescriptions: 'ابھی تک کوئی نسخہ نہیں',
  no_prescriptions_sub: 'آپ کے ڈاکٹر کی نسخے یہاں ظاہر ہوں گے',
  prescription_details: 'نسخے کی تفصیلات',
  doctor: 'ڈاکٹر:',
  date: 'تاریخ:',
  diagnosis: 'تشخیص:',
  not_specified: 'درج نہیں',
  medications: 'ادویات:',
  dosage: 'خوراک:',
  frequency: 'تعدد:',
  duration: 'دورانیہ:',
  instructions: 'ہدایات:',
  text_prescription: 'تحریری نسخہ',
  image_prescription: 'تصویری نسخہ',
  unknown: 'نامعلوم',
};

const PrescriptionsScreen = () => {
  const { currentUser } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    if (!currentUser) {
      setError('You must be logged in to view prescriptions');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Create a query against the prescriptions collection
      const prescriptionsRef = collection(db, 'prescriptions');
      const q = query(
        prescriptionsRef,
        where('patientId', '==', currentUser.uid),
        orderBy('createdAt', 'desc') // Sort by date, newest first
      );

      const querySnapshot = await getDocs(q);
      const prescriptionsList = [];

      querySnapshot.forEach((doc) => {
        prescriptionsList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setPrescriptions(prescriptionsList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      setError('Failed to load prescriptions. Please try again later.');
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return language === 'ur' ? urduText.unknown : 'Unknown date';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    // Optionally, add Urdu numerals here if needed
    return date.toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openModal = (item) => {
    console.log('Selected prescription:', item);
    setSelectedPrescription(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedPrescription(null);
  };

  const renderPrescriptionItem = ({ item }) => (
    <TouchableOpacity onPress={() => openModal(item)}>
      <View style={styles.prescriptionCard}>
        <View style={styles.prescriptionHeader}>
          <Text style={styles.doctorName}>{language === 'ur' ? 'ڈاکٹر ' : 'Dr. '}{item.doctorName || (language === 'ur' ? urduText.unknown : 'Unknown')}</Text>
          <Text style={styles.prescriptionDate}>{formatDate(item.createdAt)}</Text>
        </View>
        {item.diagnosis && (
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontWeight: 'bold', color: '#333' }}>{language === 'ur' ? urduText.diagnosis : 'Diagnosis:'}</Text>
            <Text style={{ color: '#444', marginLeft: 4 }}>{item.diagnosis}</Text>
          </View>
        )}
        {item.prescriptionText && (
          <View style={styles.prescriptionTextContainer}>
            <Text style={styles.prescriptionText}>{item.prescriptionText}</Text>
          </View>
        )}
        {item.prescriptionImageUrl && (
          <View style={styles.prescriptionImageContainer}>
            <Image 
              source={{ uri: item.prescriptionImageUrl }} 
              style={styles.prescriptionImage} 
              resizeMode="contain"
            />
          </View>
        )}
        <View style={styles.prescriptionFooter}>
          <Text style={styles.prescriptionType}>
            {item.prescriptionType === 'text'
              ? (language === 'ur' ? urduText.text_prescription : 'Text Prescription')
              : (language === 'ur' ? urduText.image_prescription : 'Image Prescription')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>{language === 'ur' ? urduText.loading : 'Loading prescriptions...'}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={50} color="#FF6B6B" />
        <Text style={styles.errorText}>{language === 'ur' ? (error === 'You must be logged in to view prescriptions' ? urduText.error_login : urduText.error_load) : error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchPrescriptions}>
          <Text style={styles.retryButtonText}>{language === 'ur' ? urduText.retry : 'Retry'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={70} color="#CCCCCC" />
        <Text style={styles.emptyText}>{language === 'ur' ? urduText.no_prescriptions : 'No prescriptions yet'}</Text>
        <Text style={styles.emptySubText}>
          {language === 'ur' ? urduText.no_prescriptions_sub : 'Prescriptions from your doctor visits will appear here'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={prescriptions}
        renderItem={renderPrescriptionItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={fetchPrescriptions}
      />
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%', maxHeight: '85%' }}>
            <ScrollView>
              {selectedPrescription && (
                <>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#0066CC' }}>{language === 'ur' ? urduText.prescription_details : 'Prescription Details'}</Text>
                  <Text style={{ fontWeight: 'bold', color: '#333' }}>{language === 'ur' ? urduText.doctor : 'Doctor:'}</Text>
                  <Text style={{ marginBottom: 6 }}>{selectedPrescription.doctorName || (language === 'ur' ? urduText.unknown : 'Unknown')}</Text>
                  <Text style={{ fontWeight: 'bold', color: '#333' }}>{language === 'ur' ? urduText.date : 'Date:'}</Text>
                  <Text style={{ marginBottom: 6 }}>{formatDate(selectedPrescription.createdAt)}</Text>
                  <Text style={{ fontWeight: 'bold', color: '#333' }}>{language === 'ur' ? urduText.diagnosis : 'Diagnosis:'}</Text>
                  <Text style={{ marginBottom: 6 }}>{selectedPrescription.diagnosis ? selectedPrescription.diagnosis : (language === 'ur' ? urduText.not_specified : 'Not specified')}</Text>
                  {selectedPrescription.medications && selectedPrescription.medications.length > 0 && (
                    <>
                      <Text style={{ fontWeight: 'bold', color: '#333', marginTop: 8 }}>{language === 'ur' ? urduText.medications : 'Medications:'}</Text>
                      {selectedPrescription.medications.map((med, idx) => (
                        <View key={idx} style={{ marginBottom: 8, marginLeft: 8 }}>
                          <Text style={{ fontWeight: 'bold' }}>{med.name}</Text>
                          <Text>{language === 'ur' ? urduText.dosage : 'Dosage:'} {med.dosage}</Text>
                          <Text>{language === 'ur' ? urduText.frequency : 'Frequency:'} {med.frequency}</Text>
                          <Text>{language === 'ur' ? urduText.duration : 'Duration:'} {med.duration}</Text>
                          {med.instructions ? <Text>{language === 'ur' ? urduText.instructions : 'Instructions:'} {med.instructions}</Text> : null}
                        </View>
                      ))}
                    </>
                  )}
                  {selectedPrescription.notes && (
                    <>
                      <Text style={{ fontWeight: 'bold', color: '#333', marginTop: 8 }}>Notes:</Text>
                      <Text style={{ marginBottom: 6 }}>{selectedPrescription.notes}</Text>
                    </>
                  )}
                  {selectedPrescription.prescriptionImageUrl && (
                    <Image source={{ uri: selectedPrescription.prescriptionImageUrl }} style={{ width: '100%', height: 200, borderRadius: 8, marginTop: 10 }} resizeMode="contain" />
                  )}
                </>
              )}
              <TouchableOpacity onPress={closeModal} style={{ marginTop: 18, alignSelf: 'center', backgroundColor: '#0066CC', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f5f5f5',
    },
    listContainer: {
      padding: 15,
      paddingBottom: 30,
    },
    prescriptionCard: {
      backgroundColor: '#ffffff',
      borderRadius: 10,
      padding: 15,
      marginBottom: 15,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
    prescriptionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
      paddingBottom: 10,
    },
    doctorName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#0066CC',
    },
    prescriptionDate: {
      fontSize: 12,
      color: '#888888',
    },
    prescriptionTextContainer: {
      backgroundColor: '#f9f9f9',
      padding: 10,
      borderRadius: 5,
      marginVertical: 10,
    },
    prescriptionText: {
      fontSize: 14,
      color: '#333333',
      lineHeight: 20,
    },
    prescriptionImageContainer: {
      alignItems: 'center',
      marginVertical: 10,
    },
    prescriptionImage: {
      width: '100%',
      height: 200,
      borderRadius: 5,
    },
    prescriptionFooter: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: '#f0f0f0',
    },
    prescriptionType: {
      fontSize: 12,
      color: '#888888',
      fontStyle: 'italic',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#ffffff',
    },
    loadingText: {
      marginTop: 10,
      color: '#666666',
      fontSize: 16,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      padding: 20,
    },
    errorText: {
      marginTop: 10,
      color: '#FF6B6B',
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 20,
    },
    retryButton: {
      backgroundColor: '#0066CC',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 5,
    },
    retryButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      padding: 20,
    },
    emptyText: {
      marginTop: 20,
      fontSize: 18,
      fontWeight: 'bold',
      color: '#666666',
    },
    emptySubText: {
      marginTop: 10,
      fontSize: 14,
      color: '#888888',
      textAlign: 'center',
    },
  });
};

export default PrescriptionsScreen;
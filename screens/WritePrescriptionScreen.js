import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { Picker } from '@react-native-picker/picker';
import { useLanguage } from '../context/LanguageContext';

const urduText = {
  write_prescription: 'نسخہ لکھیں',
  patient: 'مریض',
  diagnosis: 'تشخیص',
  select_diagnosis: 'تشخیص منتخب کریں',
  enter_diagnosis: 'تشخیص درج کریں',
  medication: 'ادویات',
  medication_name: 'ادویات کا نام',
  dosage: 'خوراک (مثلاً 500 ملی گرام)',
  frequency: 'تعدد (مثلاً دن میں 3 بار)',
  duration: 'دورانیہ (مثلاً 7 دن)',
  instructions: 'خصوصی ہدایات',
  set_reminder: 'یاددہانی سیٹ کریں',
  reminder_time: 'یاددہانی کا وقت',
  add_medication: 'ادویات شامل کریں',
  remove: 'ہٹائیں',
  notes: 'نوٹس',
  save: 'محفوظ کریں',
  cancel: 'منسوخ کریں',
  prescription_saved: 'نسخہ محفوظ ہو گیا',
  prescription_saved_msg: 'نسخہ کامیابی سے محفوظ ہو گیا ہے۔',
  incomplete_info: 'نامکمل معلومات',
  fill_all: 'براہ کرم تمام ادویات کے لیے نام اور خوراک درج کریں۔',
  diagnosis_required: 'تشخیص درکار ہے',
  select_or_enter_diagnosis: 'براہ کرم تشخیص منتخب یا درج کریں۔',
  cannot_remove: 'ہٹایا نہیں جا سکتا',
  must_have_one: 'نسخے میں کم از کم ایک دوا ہونی چاہیے۔',
  new_prescription: 'نیا نسخہ',
  new_prescription_msg: 'ڈاکٹر نے آپ کے لیے نیا نسخہ لکھا ہے',
};

const createStyles = (colors) => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    header: {
      marginBottom: 20,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    patientName: {
      fontSize: 16,
      marginBottom: 10,
    },
    medicationContainer: {
      padding: 15,
      borderRadius: 10,
      marginBottom: 15,
      borderWidth: 1,
    },
    medicationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    medicationTitle: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    input: {
      height: 50,
      borderWidth: 1,
      borderRadius: 8,
      marginBottom: 12,
      paddingHorizontal: 12,
      fontSize: 16,
    },
    notesInput: {
      borderWidth: 1,
      borderRadius: 8,
      marginTop: 10,
      marginBottom: 20,
      paddingHorizontal: 12,
      paddingTop: 12,
      fontSize: 16,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    reminderContainer: {
      marginTop: 5,
      marginBottom: 10,
    },
    reminderToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    reminderText: {
      fontSize: 16,
    },
    toggleButton: {
      width: 50,
      height: 26,
      borderRadius: 13,
      justifyContent: 'center',
    },
    toggleCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      position: 'absolute',
    },
    timePickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 50,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
    },
    timePickerText: {
      fontSize: 16,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 8,
      marginBottom: 20,
    },
    addButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    button: {
      flex: 1,
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      marginRight: 10,
    },
    saveButton: {
      marginLeft: 10,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
  });
};

const WritePrescriptionScreen = ({ navigation, route }) => {
  const { currentUser } = useAuth();
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const { language } = useLanguage();
  
  // Get visit data from route params
  const { visitId, patientId, patientName } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  const [medications, setMedications] = useState([{ 
    name: '', 
    dosage: '', 
    frequency: '',
    duration: '',
    instructions: '',
    reminderTime: new Date(),
    enableReminder: false,
    showTimePicker: false
  }]);
  const [notes, setNotes] = useState('');
  // Add diagnosis state
  const [diagnosis, setDiagnosis] = useState('');
  const [customDiagnosis, setCustomDiagnosis] = useState('');

  // Example disease list (replace/expand with 100-200 real diseases)
  const diseaseList = [
    'Hypertension', 'Diabetes Mellitus', 'Asthma', 'COPD', 'Pneumonia', 'Tuberculosis', 'COVID-19',
    'Migraine', 'Epilepsy', 'Stroke', 'Heart Failure', 'Coronary Artery Disease', 'Arrhythmia',
    'Gastritis', 'Peptic Ulcer', 'Hepatitis', 'Cirrhosis', 'Cholecystitis', 'Appendicitis',
    'UTI', 'Nephrolithiasis', 'CKD', 'Anemia', 'Leukemia', 'Lymphoma', 'Malaria', 'Dengue',
    'Typhoid', 'Chickenpox', 'Measles', 'Mumps', 'Rheumatoid Arthritis', 'Osteoarthritis',
    'Psoriasis', 'Eczema', 'Depression', 'Anxiety', 'Schizophrenia', 'Bipolar Disorder',
    // ... add more diseases up to 100-200
    'Others'
  ];
  
  // Handle adding a new medication to the list
  const addMedication = () => {
    setMedications([...medications, { 
      name: '', 
      dosage: '', 
      frequency: '',
      duration: '',
      instructions: '',
      reminderTime: new Date(),
      enableReminder: false,
      showTimePicker: false
    }]);
  };
  
  // Handle removing a medication from the list
  const removeMedication = (index) => {
    if (medications.length === 1) {
      Alert.alert(language === 'ur' ? urduText.cannot_remove : 'Cannot Remove', language === 'ur' ? urduText.must_have_one : 'You must have at least one medication in the prescription.');
      return;
    }
    
    const updatedMedications = [...medications];
    updatedMedications.splice(index, 1);
    setMedications(updatedMedications);
  };
  
  // Handle updating medication fields
  const updateMedication = (index, field, value) => {
    const updatedMedications = [...medications];
    updatedMedications[index][field] = value;
    setMedications(updatedMedications);
  };
  
  // Toggle reminder for a medication
  const toggleReminder = (index) => {
    const updatedMedications = [...medications];
    updatedMedications[index].enableReminder = !updatedMedications[index].enableReminder;
    setMedications(updatedMedications);
  };
  
  // Show time picker for a medication
  const showTimePicker = (index) => {
    const updatedMedications = [...medications];
    updatedMedications[index].showTimePicker = true;
    setMedications(updatedMedications);
  };
  
  // Handle time change for a medication reminder
  const handleTimeChange = (index, event, selectedTime) => {
    const updatedMedications = [...medications];
    updatedMedications[index].showTimePicker = false;
    
    if (selectedTime) {
      updatedMedications[index].reminderTime = selectedTime;
    }
    
    setMedications(updatedMedications);
  };
  
  // Format time for display
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Save the prescription
  const savePrescription = async () => {
    // Validate inputs
    const isValid = medications.every(med => med.name.trim() !== '' && med.dosage.trim() !== '');
    
    if (!isValid) {
      Alert.alert(language === 'ur' ? urduText.incomplete_info : 'Incomplete Information', language === 'ur' ? urduText.fill_all : 'Please fill in at least the name and dosage for all medications.');
      return;
    }
    
    if (!diagnosis || (diagnosis === 'Others' && !customDiagnosis.trim())) {
      Alert.alert(language === 'ur' ? urduText.diagnosis_required : 'Diagnosis Required', language === 'ur' ? urduText.select_or_enter_diagnosis : 'Please select or enter a diagnosis.');
      setLoading(false);
      return;
    }
    const finalDiagnosis = diagnosis === 'Others' ? customDiagnosis.trim() : diagnosis;
    
    try {
      setLoading(true);
      
      // Format medications for storage
      const formattedMedications = medications.map(med => ({
        name: med.name.trim(),
        dosage: med.dosage.trim(),
        frequency: med.frequency.trim(),
        duration: med.duration.trim(),
        instructions: med.instructions.trim(),
        reminderEnabled: med.enableReminder,
        reminderTime: med.enableReminder ? med.reminderTime.toISOString() : null
      }));
      
      // Create prescription document
      const prescriptionData = {
        patientId,
        doctorId: currentUser.uid,
        doctorName: currentUser.displayName || 'Doctor',
        visitId,
        medications: formattedMedications,
        notes: notes.trim(),
        createdAt: serverTimestamp(),
        prescriptionType: 'text',
        diagnosis: finalDiagnosis || 'Not specified'
      };
      
      console.log('Saving prescriptionData:', prescriptionData);
      // Add to prescriptions collection
      const docRef = await addDoc(collection(db, 'prescriptions'), prescriptionData);
      
      // Update the visit record to include the prescription
      if (visitId) {
        await updateDoc(doc(db, 'doctorPatientMatches', visitId), {
          hasPrescription: true,
          prescriptionId: docRef.id,
          lastUpdated: serverTimestamp()
        });
      }

      // After adding the prescription and updating the visit, add this:
      await addDoc(collection(db, 'notifications'), {
        userId: patientId,
        type: 'prescription',
        title: 'New Prescription',
        message: `${language === 'ur' ? urduText.new_prescription_msg : 'Dr. '}${currentUser.displayName || 'Doctor'} has written you a new prescription`,
        createdAt: serverTimestamp(),
        read: false,
        prescriptionId: docRef.id,
        visitId
      });
      
      setLoading(false);
      
      Alert.alert(
        language === 'ur' ? urduText.prescription_saved : 'Prescription Saved',
        language === 'ur' ? urduText.prescription_saved_msg : 'The prescription has been saved successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error saving prescription:', error);
      setLoading(false);
      Alert.alert('Error', language === 'ur' ? urduText.prescription_saved_msg : 'Failed to save prescription. Please try again.');
    }
  };
  
  // Render a medication input form
  const renderMedicationInput = (medication, index) => {
    const styles = createStyles(colors);
    return (
      <View key={index} style={[styles.medicationContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.medicationHeader}>
          <Text style={[styles.medicationTitle, { color: colors.text }]}>{language === 'ur' ? urduText.medication : `Medication ${index + 1}`}</Text>
          <TouchableOpacity onPress={() => removeMedication(index)}>
            <Ionicons name="close-circle" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>
        
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
          placeholder={language === 'ur' ? urduText.medication_name : 'Medication Name'}
          placeholderTextColor={colors.placeholder}
          value={medication.name}
          onChangeText={(text) => updateMedication(index, 'name', text)}
        />
        
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
          placeholder={language === 'ur' ? urduText.dosage : 'Dosage (e.g., 500mg)'}
          placeholderTextColor={colors.placeholder}
          value={medication.dosage}
          onChangeText={(text) => updateMedication(index, 'dosage', text)}
        />
        
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
          placeholder={language === 'ur' ? urduText.frequency : 'Frequency (e.g., 3 times daily)'}
          placeholderTextColor={colors.placeholder}
          value={medication.frequency}
          onChangeText={(text) => updateMedication(index, 'frequency', text)}
        />
        
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
          placeholder={language === 'ur' ? urduText.duration : 'Duration (e.g., 7 days)'}
          placeholderTextColor={colors.placeholder}
          value={medication.duration}
          onChangeText={(text) => updateMedication(index, 'duration', text)}
        />
        
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
          placeholder={language === 'ur' ? urduText.instructions : 'Special Instructions'}
          placeholderTextColor={colors.placeholder}
          value={medication.instructions}
          onChangeText={(text) => updateMedication(index, 'instructions', text)}
          multiline
          numberOfLines={2}
        />
        
        <View style={styles.reminderContainer}>
          <View style={styles.reminderToggle}>
            <Text style={[styles.reminderText, { color: colors.text }]}>{language === 'ur' ? urduText.set_reminder : 'Set Reminder'}</Text>
            <TouchableOpacity 
              style={[styles.toggleButton, medication.enableReminder ? { backgroundColor: colors.primary } : { backgroundColor: colors.inputBorder }]}
              onPress={() => toggleReminder(index)}
            >
              <View style={[styles.toggleCircle, medication.enableReminder ? { right: 2 } : { left: 2 }, { backgroundColor: colors.card }]} />
            </TouchableOpacity>
          </View>
          
          {medication.enableReminder && (
            <TouchableOpacity 
              style={[styles.timePickerButton, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
              onPress={() => showTimePicker(index)}
            >
              <Text style={[styles.timePickerText, { color: colors.text }]}>
                {formatTime(medication.reminderTime)}
              </Text>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
          
          {medication.showTimePicker && (
            <DateTimePicker
              value={medication.reminderTime}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={(event, selectedTime) => handleTimeChange(index, event, selectedTime)}
            />
          )}
        </View>
      </View>
    );
  };
  
  const styles = createStyles(colors);

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{language === 'ur' ? urduText.write_prescription : 'Write Prescription'}</Text>
          <Text style={[styles.patientName, { color: colors.textSecondary }]}>{language === 'ur' ? urduText.patient : 'Patient'}: {patientName || 'Unknown'}</Text>
        </View>
        
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 6, color: colors.text }}>{language === 'ur' ? urduText.diagnosis : 'Diagnosis'}</Text>
          <View style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, backgroundColor: colors.inputBackground }}>
            <Picker
              selectedValue={diagnosis}
              onValueChange={(itemValue) => setDiagnosis(itemValue)}
              style={{ height: 50, color: colors.text }}
              dropdownIconColor={colors.text}
            >
              <Picker.Item label={language === 'ur' ? urduText.select_diagnosis : 'Select Diagnosis'} value="" />
              {diseaseList.map((disease, idx) => (
                <Picker.Item key={disease + idx} label={disease} value={disease} />
              ))}
              <Picker.Item label={language === 'ur' ? urduText.enter_diagnosis : 'Enter Diagnosis'} value="Others" />
            </Picker>
          </View>
          {diagnosis === 'Others' && (
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder, marginTop: 8 }]}
              placeholder={language === 'ur' ? urduText.enter_diagnosis : 'Enter custom diagnosis'}
              placeholderTextColor={colors.placeholder}
              value={customDiagnosis}
              onChangeText={setCustomDiagnosis}
            />
          )}
        </View>
        
        {medications.map((medication, index) => renderMedicationInput(medication, index))}
        
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={addMedication}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.buttonText} />
          <Text style={[styles.addButtonText, { color: colors.buttonText }]}>{language === 'ur' ? urduText.add_medication : 'Add Another Medication'}</Text>
        </TouchableOpacity>
        
        <TextInput
          style={[styles.notesInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
          placeholder={language === 'ur' ? urduText.notes : 'Additional Notes'}
          placeholderTextColor={colors.placeholder}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton, { backgroundColor: colors.error }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>{language === 'ur' ? urduText.cancel : 'Cancel'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.saveButton, { backgroundColor: colors.success }]}
            onPress={savePrescription}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.buttonText} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.buttonText }]}>{language === 'ur' ? urduText.save : 'Save Prescription'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default WritePrescriptionScreen;
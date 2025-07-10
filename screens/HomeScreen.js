import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text as RNText, View, Image, TouchableOpacity, Alert, Animated, Dimensions, ScrollView, Platform, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { useRequest } from '../context/RequestContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Text, HealthTracker } from '../components';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { Easing } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../translations';

const HomeScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const { activeRequestId, activeRequestData, checkForActiveRequest } = useRequest();
  const { userProfile } = useAuth();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));
  const [slideAnim] = useState(new Animated.Value(-20));
  const [servicesAnim] = useState(new Animated.Value(0));
  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;
  const scrollViewRef = useRef(null);
  const chatScrollRef = useRef(null);
  
  // AI Chat State
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiChat, setAiChat] = useState([]);
  const [aiFallbackCount, setAiFallbackCount] = useState(0);
  
  const aiButtonScale = useRef(new Animated.Value(1)).current;

  // Health Tracker State
  const [healthTrackerVisible, setHealthTrackerVisible] = useState(false);

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
  
  // Scroll to bottom when chat updates
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollToEnd({ animated: true });
    }
  }, [aiChat, aiLoading]);
  
  // Function to provide haptic feedback on button press
  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Data-driven AI triage logic
  const diseaseDatabase = [
    {
      name: 'Flu / Viral Infection',
      symptoms: ['fever', 'cough', 'body pain', 'sore throat', 'runny nose', 'fatigue'],
      medicines: ['Panadol', 'Brufen', 'Arinac Forte', 'Actifed', 'Calpol']
    },
    {
      name: 'Migraine / Headache',
      symptoms: ['headache', 'migraine', 'nausea', 'light sensitivity'],
      medicines: ['Panadol', 'Brufen', 'Disprin', 'Synflex']
    },
    {
      name: 'Gastroenteritis',
      symptoms: ['stomach pain', 'diarrhea', 'vomiting', 'nausea', 'loose motion'],
      medicines: ['ORS', 'Flagyl', 'Buscopan', 'Imodium']
    },
    {
      name: 'Throat Infection',
      symptoms: ['sore throat', 'throat pain', 'difficulty swallowing'],
      medicines: ['Strepsils', 'Panadol', 'Augmentin', 'Azomax']
    },
    {
      name: 'Allergy / Common Cold',
      symptoms: ['sneeze', 'allergy', 'runny nose', 'itchy eyes'],
      medicines: ['Cetirizine', 'Loratadine', 'Panadol', 'Telfast']
    },
    {
      name: 'Chest Pain / Heart Pain',
      symptoms: ['chest pain', 'heart pain', 'tightness', 'shortness of breath'],
      medicines: ['Consult a doctor immediately', 'Panadol (if mild and not cardiac)']
    },
    {
      name: 'Body Pain / Muscle Pain',
      symptoms: ['body pain', 'muscle pain', 'joint pain', 'back pain'],
      medicines: ['Panadol', 'Brufen', 'Myogesic']
    },
    {
      name: 'Diabetes',
      symptoms: ['frequent urination', 'increased thirst', 'weight loss', 'fatigue'],
      medicines: ['Metformin', 'Gluconorm', 'Amaryl']
    },
    {
      name: 'Hypertension',
      symptoms: ['high blood pressure', 'headache', 'dizziness', 'blurred vision'],
      medicines: ['Amlodipine', 'Concor', 'Losartan']
    },
    {
      name: 'Dengue',
      symptoms: ['fever', 'body pain', 'rash', 'bleeding', 'headache'],
      medicines: ['Panadol', 'ORS', 'Rest', 'Consult a doctor']
    },
    {
      name: 'COVID-19',
      symptoms: ['fever', 'cough', 'loss of taste', 'loss of smell', 'shortness of breath'],
      medicines: ['Panadol', 'ORS', 'Consult a doctor', 'Isolation']
    },
    {
      name: 'Constipation',
      symptoms: ['constipation', 'hard stool', 'difficulty passing stool'],
      medicines: ['Duphalac', 'Cremaffin', 'Isabgol']
    },
    {
      name: 'Acidity / Heartburn',
      symptoms: ['acidity', 'heartburn', 'indigestion', 'burning chest'],
      medicines: ['Gaviscon', 'Omeprazole', 'Risek', 'Antacid']
    },
    // Skin
    {
      name: 'Acne',
      symptoms: ['pimples', 'acne', 'oily skin', 'blackheads'],
      medicines: ['Benzac', 'Acne Aid', 'Clindasol Gel']
    },
    {
      name: 'Eczema',
      symptoms: ['itchy skin', 'red patches', 'dry skin', 'eczema'],
      medicines: ['Dermovate', 'Elica', 'Hydrocortisone Cream']
    },
    {
      name: 'Fungal Infection',
      symptoms: ['itchy rash', 'ringworm', 'white patches', 'fungal infection'],
      medicines: ['Canesten', 'Daktarin', 'Lamisil']
    },
    // Heart
    {
      name: 'Angina',
      symptoms: ['chest pain', 'angina', 'tightness on exertion'],
      medicines: ['Nitroglycerin', 'Aspirin', 'Consult a cardiologist']
    },
    {
      name: 'Arrhythmia',
      symptoms: ['irregular heartbeat', 'palpitations', 'fluttering chest'],
      medicines: ['Verapamil', 'Amiodarone', 'Consult a cardiologist']
    },
    // Liver
    {
      name: 'Hepatitis',
      symptoms: ['yellow eyes', 'yellow skin', 'dark urine', 'hepatitis', 'liver pain'],
      medicines: ['Consult a doctor', 'Liv-52', 'Rest']
    },
    {
      name: 'Fatty Liver',
      symptoms: ['fatty liver', 'mild liver pain', 'tiredness', 'abdominal discomfort'],
      medicines: ['Liv-52', 'Essentiale', 'Diet control']
    },
    // Head
    {
      name: 'Sinusitis',
      symptoms: ['sinus pain', 'facial pain', 'blocked nose', 'sinusitis'],
      medicines: ['Panadol', 'Actifed', 'Sinarest']
    },
    {
      name: 'Meningitis',
      symptoms: ['neck stiffness', 'high fever', 'severe headache', 'photophobia'],
      medicines: ['Consult a doctor immediately', 'IV antibiotics']
    },
    // Arms/Legs
    {
      name: 'Sprain',
      symptoms: ['swollen ankle', 'sprain', 'twisted foot', 'joint swelling'],
      medicines: ['RICE (Rest, Ice, Compression, Elevation)', 'Brufen', 'Moov Cream']
    },
    {
      name: 'Fracture',
      symptoms: ['broken bone', 'fracture', 'severe pain after injury'],
      medicines: ['Immobilization', 'Consult orthopedic', 'Painkillers']
    },
    // Mouth
    {
      name: 'Mouth Ulcers',
      symptoms: ['mouth ulcer', 'painful sore in mouth', 'aphthous ulcer'],
      medicines: ['Pyralvex', 'Kenalog Orabase', 'B-complex']
    },
    {
      name: 'Toothache',
      symptoms: ['tooth pain', 'toothache', 'sensitive teeth'],
      medicines: ['Panadol', 'Clove Oil', 'Consult dentist']
    },
    // Eyes
    {
      name: 'Conjunctivitis',
      symptoms: ['red eyes', 'itchy eyes', 'eye discharge', 'conjunctivitis'],
      medicines: ['Tobrex Eye Drops', 'Refresh Tears', 'Ciplox Eye Drops']
    },
    {
      name: 'Dry Eyes',
      symptoms: ['dry eyes', 'gritty eyes', 'burning eyes'],
      medicines: ['Refresh Tears', 'Systane', 'Lubricant Eye Drops']
    },
    // Nose
    {
      name: 'Allergic Rhinitis',
      symptoms: ['runny nose', 'sneezing', 'nasal congestion', 'allergy nose'],
      medicines: ['Cetirizine', 'Loratadine', 'Nasonex Nasal Spray']
    },
    // Ears
    {
      name: 'Ear Infection',
      symptoms: ['ear pain', 'ear discharge', 'blocked ear', 'ear infection'],
      medicines: ['Ciplox Ear Drops', 'Panadol', 'Consult ENT']
    },
    {
      name: 'Ear Wax',
      symptoms: ['blocked ear', 'ear wax', 'hearing loss'],
      medicines: ['Waxsol Drops', 'Olive Oil Drops']
    },
    // Hair
    {
      name: 'Hair Fall',
      symptoms: ['hair fall', 'hair loss', 'thinning hair'],
      medicines: ['Minoxidil', 'Biotin', 'Nutrifactor Hair Supplements']
    },
    {
      name: 'Dandruff',
      symptoms: ['dandruff', 'itchy scalp', 'flaky scalp'],
      medicines: ['Selsun Blue', 'Nizoral Shampoo', 'Head & Shoulders']
    },
  ];

  function matchDisease(symptomText) {
    const s = symptomText.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;
    for (const disease of diseaseDatabase) {
      let score = 0;
      for (const symptom of disease.symptoms) {
        if (s.includes(symptom)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = disease;
      }
    }
    // If a good match is found (at least 1 symptom), return it
    if (bestMatch && bestScore > 0) {
      return bestMatch;
    }
    return null;
  }

  const aiDiagnose = (symptoms, chatHistory = []) => {
    const s = symptoms.toLowerCase();
    // 1. Try to match a disease
    const disease = matchDisease(s);
    if (disease) {
      return {
        diagnosis: `${t('😊 Most likely: ', language)}${language === 'ur' && t(disease.name, language) !== disease.name ? t(disease.name, language) : disease.name}. ${t("You're not alone—I'm here to help you feel better!\nIf you have more symptoms, let me know. 💙", language)}`,
        medicines: disease.medicines.map(med => `💊 ${language === 'ur' && t(med, language) !== med ? t(med, language) : med}`)
      };
    }
    // Friendly greetings
    if (/\b(hi|hello|salam|assalam|hey|good morning|good evening)\b/.test(s)) {
      return {
        diagnosis: t('👋 Hello! I hope you are having a wonderful day. How can I help you feel your best today? 😊', language),
        medicines: []
      };
    }
    // Friendly thanks
    if (/\b(thank you|thanks|shukriya|jazakallah|appreciate)\b/.test(s)) {
      return {
        diagnosis: t("🥰 You're so welcome! If you need anything else, I'm always here for you.", language),
        medicines: []
      };
    }
    // Friendly help
    if (/\b(help|what can you do|how does this work|who are you)\b/.test(s)) {
      return {
        diagnosis: t("🤖 I'm your friendly health assistant! Just tell me your symptoms or ask anything about your health. I'll do my best to help you. 💙", language),
        medicines: []
      };
    }
    // Friendly feeling unwell
    if (/\b(not feeling well|unwell|sick|ill|bimar|bimaar)\b/.test(s)) {
      return {
        diagnosis: t("😔 I'm sorry you're not feeling well. Can you tell me more about your symptoms? I'm here to listen and help!", language),
        medicines: []
      };
    }
    // Friendly pain
    if (/\b(pain|dard)\b/.test(s) && !s.includes('chest pain')) {
      return {
        diagnosis: t("🩹 Oh no! Where exactly are you feeling pain? (e.g., head, stomach, back, etc.) I'll try my best to help you feel better!", language),
        medicines: []
      };
    }
    // Symptom-based cases (always check these first)
    if ((s.includes('fever') && s.includes('cough')) || s.includes('flu')) {
      return {
        diagnosis: t('Likely Flu or Viral Infection', language),
        medicines: ['Panadol', 'Brufen', 'Arinac Forte'].map(med => language === 'ur' && t(med, language) !== med ? t(med, language) : med)
      };
    }
    if (s.includes('fever') && s.includes('pain')) {
      return {
        diagnosis: t('Likely Viral Infection with Body Pain', language),
        medicines: ['Panadol', 'Brufen', 'Arinac Forte'].map(med => language === 'ur' && t(med, language) !== med ? t(med, language) : med)
      };
    }
    if (s.includes('fever')) {
      return {
        diagnosis: t('Fever can be caused by many things. If you have other symptoms, let me know. For fever relief:', language),
        medicines: ['Panadol', 'Brufen'].map(med => language === 'ur' && t(med, language) !== med ? t(med, language) : med)
      };
    }
    if (s.includes('headache')) {
      return {
        diagnosis: t('Likely Migraine or Tension Headache', language),
        medicines: ['Panadol', 'Brufen', 'Disprin'].map(med => language === 'ur' && t(med, language) !== med ? t(med, language) : med)
      };
    }
    if (s.includes('stomach') || s.includes('diarrhea')) {
      return {
        diagnosis: t('Likely Gastroenteritis', language),
        medicines: ['ORS', 'Flagyl', 'Buscopan'].map(med => language === 'ur' && t(med, language) !== med ? t(med, language) : med)
      };
    }
    if (s.includes('sore throat')) {
      return {
        diagnosis: t('Likely Throat Infection', language),
        medicines: ['Strepsils', 'Panadol', 'Augmentin'].map(med => language === 'ur' && t(med, language) !== med ? t(med, language) : med)
      };
    }
    if (s.includes('allergy') || s.includes('sneeze')) {
      return {
        diagnosis: t('Likely Allergy or Common Cold', language),
        medicines: ['Cetirizine', 'Loratadine', 'Panadol'].map(med => language === 'ur' && t(med, language) !== med ? t(med, language) : med)
      };
    }
    if (s.includes('chest pain') || s.includes('heart pain')) {
      return {
        diagnosis: t('Chest or heart pain can be serious. If it is severe, radiates to your arm/jaw, or is associated with sweating or shortness of breath, seek urgent medical attention. For mild pain:', language),
        medicines: ['Consult a doctor immediately', 'Panadol (if mild and not cardiac)'].map(med => language === 'ur' && t(med, language) !== med ? t(med, language) : med)
      };
    }
    if (s.includes('body pain') || s.includes('muscle pain')) {
      return {
        diagnosis: t('Body or muscle pain can be due to viral infection, overexertion, or other causes.', language),
        medicines: ['Panadol', 'Brufen'].map(med => language === 'ur' && t(med, language) !== med ? t(med, language) : med)
      };
    }
    // Handle laughter and casual responses
    if (/\b(haha|lol|lmao|rofl|funny|hahaha|hehe|xd)\b/.test(s)) {
      return {
        diagnosis: t("😄 Laughter is the best medicine! If you have any health questions, I'm here for you. Stay happy! ✨", language),
        medicines: []
      };
    }
    if (/\b(ok|okay|fine|alright|thik|theek|acha|hmm|hmmm|huh|hmmm)\b/.test(s)) {
      return {
        diagnosis: t("👍 Great! If you want to talk about your health or just chat, I'm always here for you. 💬", language),
        medicines: []
      };
    }
    if (/\b(sad|upset|depressed|down|unhappy)\b/.test(s)) {
      return {
        diagnosis: t("💙 I'm really sorry you're feeling this way. Remember, you're not alone. If you want to talk, I'm here to listen and support you! 🌈", language),
        medicines: []
      };
    }
    if (/\b(angry|mad|frustrated|annoyed)\b/.test(s)) {
      return {
        diagnosis: t("😤 It's okay to feel angry sometimes. If something is bothering you, you can share it with me. I'll always listen!", language),
        medicines: []
      };
    }
    if (/\b(bored|boring)\b/.test(s)) {
      return {
        diagnosis: t("😅 Boredom happens! If you want to learn about health or just chat, I'm here to brighten your day! 🌟", language),
        medicines: []
      };
    }
    if (/\b(hungry|starving|bhook|bhookha|bhooki)\b/.test(s)) {
      return {
        diagnosis: t("🍎 If you're hungry, have a healthy snack! If you have any tummy troubles, let me know. I care about your well-being! 😊", language),
        medicines: []
      };
    }
    // Handle goodbye
    if (/\b(bye|goodbye|khuda hafiz|allah hafiz|see you|take care)\b/.test(s)) {
      return {
        diagnosis: t("👋 Goodbye! Take care and remember, I'm always here if you need a friend or health advice! 💙", language),
        medicines: []
      };
    }
    // Count how many times fallback has been triggered in this session
    let fallbackCount = aiFallbackCount;
    if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1]?.from === 'ai' && chatHistory[chatHistory.length - 1]?.text?.includes("I'm here to help")) {
      fallbackCount++;
    } else {
      fallbackCount = 1;
    }
    setAiFallbackCount(fallbackCount);
    let fallbackResponses = [
      t("😊 I'm here to help you with any health questions or just to chat! Tell me anything, I'm always happy to listen.", language),
      t("💬 I want to make sure I understand you. Could you tell me a bit more about your health or how you're feeling?", language),
      t("🤗 I'm still learning! If you have a specific symptom or question, let me know. Otherwise, I'm here for you!", language),
      t("🌟 I may not have an answer for that, but I'm always here to listen or help with health advice.", language),
      t("💙 If you want to talk about your health, just let me know your symptoms or concerns!", language)
    ];
    // Cycle through fallback responses
    const fallbackText = fallbackResponses[(fallbackCount - 1) % fallbackResponses.length];
    return {
      diagnosis: fallbackText,
      medicines: []
    };
  };

  // Open AI modal and start chat
  const openAiChat = () => {
    setAiModalVisible(true);
    setAiChat([
      {
        from: 'ai',
        text: t('aiGreeting', language).replace('{username}', userProfile?.username ? ' ' + userProfile.username : '')
      }
    ]);
    setAiInput('');
  };

  // Handle user sending a message
  const handleAiSend = () => {
    if (!aiInput.trim()) return;
    const userMsg = { from: 'user', text: aiInput.trim() };
    setAiChat(prev => [...prev, userMsg]);
    setAiLoading(true);
    setAiInput('');
    setTimeout(() => {
      const result = aiDiagnose(userMsg.text, [...aiChat, userMsg]);
      let aiText = result.diagnosis;
      if (result.medicines.length > 0) {
        aiText += '\n' + t('Recommended Medicines: ', language) + result.medicines.join(', ');
      }
      setAiChat(prev => [...prev, { from: 'ai', text: aiText }]);
      setAiLoading(false);
    }, 800);
  };

  const handleAiButtonPressIn = () => {
    Animated.spring(aiButtonScale, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };
  const handleAiButtonPressOut = () => {
    Animated.spring(aiButtonScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
    openAiChat();
  };

  // 1. Move StyleSheet.create into a createStyles(colors) function.
  // 2. Inside the component, after defining colors, call const styles = createStyles(colors).
  // 3. Replace all uses of styles with the new styles object.
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
  },
  fabModernContainer: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    zIndex: 100,
    elevation: 8,
    shadowColor: '#005BEA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  fabModern: {
    borderRadius: 32,
    overflow: 'hidden',
  },
  fabModernGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#005BEA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    borderColor: colors.divider,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.primary,
  },
  chatContainer: {
    width: '100%',
    flex: 1,
    minHeight: 180,
    maxHeight: 260,
    marginBottom: 8,
    paddingVertical: 8,
  },
  chatBubble: {
    marginVertical: 4,
    maxWidth: '85%',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  aiBubble: {
    backgroundColor: colors.card,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  userBubble: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  aiText: {
    color: colors.primary,
    fontSize: 15,
  },
  userText: {
    color: colors.buttonText,
    fontSize: 15,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  chatInput: {
    flex: 1,
    borderColor: colors.divider,
    borderWidth: 1,
    borderRadius: 20,
    padding: 10,
    fontSize: 16,
    backgroundColor: colors.inputBackground,
    color: colors.text,
    marginRight: 8,
    minHeight: 40,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    marginTop: 8,
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderColor: colors.divider,
    borderWidth: 1,
  },
  closeButtonText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  healthTrackerBanner: {
    borderRadius: 20,
    marginBottom: 28,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
    position: 'relative',
},
healthTrackerGradient: {
  padding: 18, // reduced from 32
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 110, // reduced from 200
  position: 'relative',
},
healthTrackerCircle: {
  position: 'absolute',
  top: -30, // slightly less
  right: -30, // slightly less
  width: 80, // reduced from 120
  height: 80, // reduced from 120
  borderRadius: 40, // reduced from 60
  backgroundColor: 'rgba(33, 230, 193, 0.12)',
  zIndex: 0,
},
healthTrackerWave: {
  position: 'absolute',
  bottom: -6, // slightly less
  left: 0,
  width: '100%',
  height: 22, // reduced from 40
  backgroundColor: 'rgba(39, 142, 165, 0.18)',
  borderTopLeftRadius: 22, // reduced from 40
  borderTopRightRadius: 22, // reduced from 40
  zIndex: 0,
},
healthTrackerTitle: {
  fontSize: 22, // reduced from 28
  fontWeight: 'bold',
  color: '#fff',
  marginBottom: 4, // reduced from 10
  textAlign: 'center',
  zIndex: 1,
  letterSpacing: 0.5,
},
healthTrackerSubtitle: {
  fontSize: 14, // reduced from 17
  color: 'rgba(200, 230, 255, 0.95)',
  textAlign: 'center',
  marginBottom: 14, // reduced from 28
  zIndex: 1,
  fontWeight: '500',
},
healthTrackerButton: {
  zIndex: 2,
  borderRadius: 14,
  overflow: 'hidden',
  shadowColor: '#21e6c1',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.18,
  shadowRadius: 8,
  elevation: 3,
},
healthTrackerButtonGradient: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 8, // reduced from 13
  paddingHorizontal: 18, // reduced from 28
  borderRadius: 14,
},
healthTrackerButtonText: {
  color: '#fff',
  fontSize: 17,
  fontWeight: 'bold',
  letterSpacing: 0.2,
},
});

  const styles = createStyles(colors);
  const { language } = useLanguage();

  return (
    <View style={{ flex: 1 }}>
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
            <Text style={styles.greeting}>{t('greeting', language)}</Text>
            <Text style={styles.welcomeText}>{t('welcome', language)}</Text>
            <Text style={styles.welcomeSubtext}>{t('subtext', language)}</Text>
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
              onPress={async () => {
                triggerHaptic();
                // Check for active request before navigating
                const activeRequest = await checkForActiveRequest();
                
                if (activeRequest) {
                  // User has an active request, redirect to Map screen
                  Alert.alert(
                    'Active Request Found',
                    'You already have an active doctor request. Redirecting to your current request.',
                    [{ text: 'OK', onPress: () => navigation.navigate('Map', { fromBooking: true }) }]
                  );
                } else {
                  // No active request, proceed to location selection
                  navigation.navigate('Location');
                }
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
                    <Ionicons name="medkit" size={28} color={colors.buttonText} />
                  </View>
                  <View style={styles.requestTextContainer}>
                    <Text style={styles.requestText}>{t('requestDoctor', language)}</Text>
                    <Text style={styles.requestSubtext}>{t('requestSubtext', language)}</Text>
                  </View>
                  <View style={styles.arrowContainer}>
                    <Ionicons name="chevron-forward" size={24} color={colors.buttonText} />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          
          <View style={styles.healthTrackerBanner}>
            <LinearGradient
              colors={["#162447", "#1f4068", "#5f2c82"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.healthTrackerGradient}
            >
              {/* Decorative circle */}
              <View style={styles.healthTrackerCircle} />
              {/* Decorative wave */}
              <View style={styles.healthTrackerWave} />
              <Text style={styles.healthTrackerTitle}>{t('healthTracker', language)}</Text>
              <Text style={styles.healthTrackerSubtitle}>{t('healthTrackerSubtitle', language)}</Text>
              <TouchableOpacity
                style={styles.healthTrackerButton}
                onPress={() => setHealthTrackerVisible(true)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#21e6c1", "#278ea5"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.healthTrackerButtonGradient}
                >
                  <Ionicons name="analytics-outline" size={22} color={colors.buttonText} style={{ marginRight: 8 }} />
                  <Text style={styles.healthTrackerButtonText}>{t('viewHealthInsights', language)}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          <Animated.View 
            style={[styles.featuresSection, {
              opacity: servicesAnim,
              transform: [{ translateY: slideAnim }]
            }]}
          >
            <View style={styles.sectionTitleContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('ourServices', language)}</Text>
              <View style={[styles.titleUnderline, { backgroundColor: colors.primary }]} />
            </View>
            
            <View style={styles.featuresGrid}>
              {/* Existing feature cards below */}
              <Card 
                variant="elevated"
                elevation={3}
                onPress={() => {
                  triggerHaptic();
                  navigation.navigate('History');
                }}
                style={styles.featureCard}
              >
                <View style={[styles.featureIconBg, { backgroundColor: isDarkMode ? 'rgba(33, 150, 243, 0.15)' : 'rgba(0, 102, 204, 0.1)' }]}> 
                  <Ionicons name="time-outline" size={26} color={colors.primary} />
                </View>
                <Text variant="label" weight="semibold" center style={styles.featureText}>{t('visitHistory', language)}</Text>
              </Card>
              
              <Card 
                variant="elevated"
                elevation={3}
                onPress={() => {
                  triggerHaptic();
                  navigation.navigate('History', { filter: 'prescription' });
                }}
                style={styles.featureCard}
              >
                <View style={[styles.featureIconBg, { backgroundColor: isDarkMode ? 'rgba(33, 150, 243, 0.15)' : 'rgba(0, 102, 204, 0.1)' }]}> 
                  <Ionicons name="document-text-outline" size={26} color={colors.primary} />
                </View>
                <Text variant="label" weight="semibold" center style={styles.featureText}>{t('prescriptions', language)}</Text>
              </Card>
              
              <Card 
                variant="elevated"
                elevation={3}
                onPress={() => {
                  triggerHaptic();
                  navigation.navigate('Help');
                }}
                style={styles.featureCard}
              >
                <View style={[styles.featureIconBg, { backgroundColor: isDarkMode ? 'rgba(33, 150, 243, 0.15)' : 'rgba(0, 102, 204, 0.1)' }]}> 
                  <Ionicons name="help-buoy-outline" size={26} color={colors.primary} />
                </View>
                <Text variant="label" weight="semibold" center style={styles.featureText}>{t('support', language)}</Text>
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
                <Text variant="label" weight="semibold" center style={styles.featureText}>{t('settings', language)}</Text>
              </Card>
            </View>
            
            <View style={styles.quickAccessSection}>
              <Text style={[styles.quickAccessTitle, { color: colors.text }]}>{t('quickAccess', language)}</Text>
              
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
                    <Text variant="subheading" weight="semibold" style={{ fontSize: 16 }}>{t('contactSupport', language)}</Text>
                    <Text variant="caption" style={{ marginTop: 2 }}>{t('getHelp', language)}</Text>
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
                  navigation.navigate('AppointmentFAQ');
                }}
              >
                <View style={styles.quickAccessContent}>
                  <View style={[styles.quickAccessIcon, { backgroundColor: isDarkMode ? 'rgba(255, 183, 77, 0.15)' : 'rgba(255, 160, 0, 0.1)' }]}> 
                    <Ionicons name="information-circle-outline" size={24} color={colors.accent} />
                  </View>
                  <View style={styles.quickAccessTextContainer}>
                    <Text variant="subheading" weight="semibold" style={{ fontSize: 16 }}>{t('faqs', language)}</Text>
                    <Text variant="caption" style={{ marginTop: 2 }}>{t('commonQuestions', language)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>
              </Card>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
      {/* Floating Ask AI Button */}
      <Animated.View style={[styles.fabModernContainer, { transform: [{ scale: aiButtonScale }] }]}> 
        <TouchableOpacity
          style={styles.fabModern}
          onPressIn={handleAiButtonPressIn}
          onPressOut={handleAiButtonPressOut}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#00C6FB", "#005BEA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabModernGradient}
          >
            <Ionicons name="chatbubbles" size={28} color={colors.buttonText} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
      {/* AI Chat Modal */}
      <Modal
        visible={aiModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAiModalVisible(false)}
      >
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: 0, minHeight: 400 }]}> 
            <RNText style={styles.modalTitle}>{t('aiTitle', language)}</RNText>
            <ScrollView
              style={styles.chatContainer}
              contentContainerStyle={{ paddingBottom: 8 }}
              ref={chatScrollRef}
              showsVerticalScrollIndicator={false}
            >
              {aiChat.map((msg, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.chatBubble,
                    msg.from === 'ai' ? styles.aiBubble : styles.userBubble
                  ]}
                >
                  <RNText style={msg.from === 'ai' ? styles.aiText : styles.userText}>{msg.text}</RNText>
                </View>
              ))}
              {aiLoading && (
                <View style={[styles.chatBubble, styles.aiBubble]}>
                  <RNText style={styles.aiText}>...</RNText>
                </View>
              )}
            </ScrollView>
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder={t('aiPlaceholder', language)}
                value={aiInput}
                onChangeText={setAiInput}
                multiline
                numberOfLines={2}
                editable={!aiLoading}
                onSubmitEditing={handleAiSend}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleAiSend}
                disabled={aiLoading || !aiInput.trim()}
              >
                <Ionicons name="send" size={22} color={colors.buttonText} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setAiModalVisible(false);
                setAiInput('');
                setAiChat([]);
              }}
            >
              <RNText style={styles.closeButtonText}>{t('close', language)}</RNText>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* HealthTracker Modal */}
      {healthTrackerVisible && (
        <Modal
          visible={healthTrackerVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setHealthTrackerVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, width: '90%' }}>
              <HealthTracker />
              <TouchableOpacity onPress={() => setHealthTrackerVisible(false)} style={{ marginTop: 18, alignSelf: 'center', backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 }}>
                <Text style={{ color: colors.buttonText, fontWeight: 'bold', fontSize: 16 }}>{t('close', language)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      <StatusBar style="light" />  
    </View>
  );
};

export default HomeScreen;

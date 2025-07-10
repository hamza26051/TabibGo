import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import Card from './Card';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../translations';
import { toUrduNumber } from '../utils/numberUtils';

// Simple mapping of symptoms to diseases (reuse from HomeScreen)
const diseaseDatabase = [
  { name: 'Gastroenteritis', symptoms: ['stomach pain', 'diarrhea', 'vomiting', 'nausea', 'loose motion'] },
  { name: 'Migraine / Headache', symptoms: ['headache', 'migraine', 'nausea', 'light sensitivity'] },
  { name: 'Flu / Viral Infection', symptoms: ['fever', 'cough', 'body pain', 'sore throat', 'runny nose', 'fatigue'] },
  { name: 'Throat Infection', symptoms: ['sore throat', 'throat pain', 'difficulty swallowing'] },
  { name: 'Allergy / Common Cold', symptoms: ['sneeze', 'allergy', 'runny nose', 'itchy eyes'] },
  { name: 'Chest Pain / Heart Pain', symptoms: ['chest pain', 'heart pain', 'tightness', 'shortness of breath'] },
  { name: 'Body Pain / Muscle Pain', symptoms: ['body pain', 'muscle pain', 'joint pain', 'back pain'] },
  // ... add more as needed
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
  if (bestMatch && bestScore > 0) {
    return bestMatch;
  }
  return null;
}

const HealthTracker = () => {
  const { currentUser } = useAuth();
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const { language } = useLanguage();

  useEffect(() => {
    if (!currentUser) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch visits
        const visitsRef = collection(db, 'doctorPatientMatches');
        const visitsQuery = query(
          visitsRef,
          where('patientId', '==', currentUser.uid),
          where('status', '==', 'completed'),
          orderBy('completedAt', 'desc')
        );
        const visitsSnapshot = await getDocs(visitsQuery);
        const visits = [];
        visitsSnapshot.forEach(doc => visits.push(doc.data()));

        // Fetch prescriptions
        const prescriptionsRef = collection(db, 'prescriptions');
        const prescriptionsQuery = query(
          prescriptionsRef,
          where('patientId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const prescriptionsSnapshot = await getDocs(prescriptionsQuery);
        const prescriptions = [];
        prescriptionsSnapshot.forEach(doc => prescriptions.push(doc.data()));

        // Analyze symptoms from visits and prescriptions
        const symptomCounts = {};
        const allSymptoms = [];
        // Assume each visit has a 'symptoms' field (string or array)
        visits.forEach(v => {
          let symptoms = v.symptoms;
          if (typeof symptoms === 'string') symptoms = [symptoms];
          if (Array.isArray(symptoms)) {
            symptoms.forEach(s => {
              const key = s.toLowerCase();
              symptomCounts[key] = (symptomCounts[key] || 0) + 1;
              allSymptoms.push(key);
            });
          }
        });
        // Also check prescriptions for diagnosis field
        prescriptions.forEach(p => {
          if (p.diagnosis) {
            const key = p.diagnosis.toLowerCase();
            symptomCounts[key] = (symptomCounts[key] || 0) + 1;
            allSymptoms.push(key);
          }
        });

        // Find most frequent symptoms this week
        // (for simplicity, just show top symptoms overall)
        const sortedSymptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]);
        const topSymptoms = sortedSymptoms.slice(0, 3);
        // Try to match a likely disease
        const likelyDisease = matchDisease(allSymptoms.join(' '));
        // Build summary
        setSummary({
          topSymptoms,
          likelyDisease: likelyDisease ? likelyDisease.name : null,
          warning: topSymptoms.length > 0 && topSymptoms[0][1] >= 3 ? `You have had ${topSymptoms[0][1]} times ${topSymptoms[0][0]} recently. Consider seeing a doctor.` : null
        });
        setLoading(false);
      } catch (err) {
        setError('Failed to analyze health data.');
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  if (!currentUser) return null;
  return (
    <Card variant="elevated" elevation={4} style={{ marginVertical: 12 }}>
      <Text style={styles.header}>{t('smartAiHealthTracker', language)}</Text>
      {loading ? (
        <ActivityIndicator size="small" />
      ) : error ? (
        <Text style={styles.error}>{t('failedToAnalyze', language)}</Text>
      ) : summary ? (
        <View>
          {summary.topSymptoms.length > 0 ? (
            <View style={{ marginBottom: 8 }}>
              {summary.topSymptoms.map(([symptom, count]) => (
                <Text key={symptom} style={styles.symptom}>{t('timesSymptom', language)
                  .replace('{count}', language === 'ur' ? toUrduNumber(count) : count)
                  .replace('{symptom}', language === 'ur' && t(symptom, language) !== symptom ? t(symptom, language) : symptom)
                }</Text>
              ))}
            </View>
          ) : (
            <Text>{t('noSymptoms', language)}</Text>
          )}
          {summary.likelyDisease && (
            <Text style={styles.disease}>{t('mostLikelyDisease', language) + (language === 'ur' && t(summary.likelyDisease, language) !== summary.likelyDisease ? t(summary.likelyDisease, language) : summary.likelyDisease)}</Text>
          )}
          {summary.warning && (
            <Text style={styles.warning}>{t('healthWarning', language)
              .replace('{count}', language === 'ur' ? toUrduNumber(summary.topSymptoms[0][1]) : summary.topSymptoms[0][1])
              .replace('{symptom}', language === 'ur' && t(summary.topSymptoms[0][0], language) !== summary.topSymptoms[0][0] ? t(summary.topSymptoms[0][0], language) : summary.topSymptoms[0][0])
            }</Text>
          )}
        </View>
      ) : null}
    </Card>
  );
};

const createStyles = (colors) => StyleSheet.create({
  header: { fontWeight: 'bold', fontSize: 16, marginBottom: 4, color: colors.text },
  symptom: { fontSize: 14, color: colors.textSecondary },
  disease: { fontSize: 14, color: colors.primary, marginTop: 4 },
  warning: { fontSize: 14, color: colors.error, marginTop: 4 },
  error: { color: colors.error, fontSize: 14 },
});

export default HealthTracker; 
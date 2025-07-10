import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { Card, Text } from '../components';
import { t } from '../translations';
import { useLanguage } from '../context/LanguageContext';

const SupportHistoryScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();

  useEffect(() => {
    if (!currentUser) return;

    // Query for user's support requests
    const requestsQuery = query(
      collection(db, 'supportRequests'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(requestsQuery, (querySnapshot) => {
      const requestsList = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Convert Firestore timestamp to JS Date
        const createdAt = data.createdAt ? new Date(data.createdAt.toDate()) : new Date();
        const updatedAt = data.updatedAt ? new Date(data.updatedAt.toDate()) : createdAt;
        
        requestsList.push({
          id: doc.id,
          ...data,
          createdAt,
          updatedAt
        });
      });
      
      setRequests(requestsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return colors.warning; // Amber
      case 'active':
        return colors.info; // Blue
      case 'resolved':
        return colors.success; // Green
      default:
        return colors.disabled; // Grey
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Add Urdu status mapping
  const urduStatus = {
    pending: 'زیر التواء',
    active: 'فعال',
    resolved: 'حل شدہ',
    unknown: 'نامعلوم',
  };

  const renderRequestItem = ({ item }) => {
    const hasUnreadMessages = item.adminReplied && !item.userViewed;
    
    return (
      <TouchableOpacity 
        style={[styles.requestItem, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => navigation.navigate('Chat', { requestId: item.id })}
      >
        <View style={styles.requestHeader}>
          <View style={styles.subjectContainer}>
            <Text style={[styles.requestSubject, { color: colors.text }]} numberOfLines={1}>
              {item.subject}
            </Text>
            {hasUnreadMessages && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>New</Text>
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>
              {language === 'ur' ? (urduStatus[item.status] || urduStatus.unknown) :
                item.status === 'pending' ? 'Pending' :
                item.status === 'active' ? 'Active' :
                item.status === 'resolved' ? 'Resolved' : 'Unknown'}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.requestPreview, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.comment || t('support_history_no_description', language)}
        </Text>
        
        <View style={[styles.requestFooter, { borderTopColor: colors.divider }]}>
          <Text style={[styles.requestDate, { color: colors.textLight }]}>
            {t('support_history_created', language)} {formatDate(item.createdAt)}
          </Text>
          {item.updatedAt > item.createdAt && (
            <Text style={[styles.requestDate, { color: colors.textLight }]}>
              {t('support_history_updated', language)} {formatDate(item.updatedAt)}
            </Text>
          )}
        </View>
        
        <View style={styles.requestAction}>
          <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.floatingHeader, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text variant="heading" weight="bold" style={[styles.headerTitle, { color: colors.primary }]}>{t('support_history_header', language)}</Text>
        <TouchableOpacity 
          style={styles.newRequestButton}
          onPress={() => navigation.navigate('SupportForm')}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1, paddingTop: 70 }}>
        {loading ? (
          <Card variant="elevated" elevation={2} style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.secondary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('support_history_loading', language)}</Text>
          </Card>
        ) : requests.length > 0 ? (
          <FlatList
            data={requests}
            renderItem={renderRequestItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.requestsList}
          />
        ) : (
          <Card variant="elevated" elevation={2} style={styles.emptyCard}>
            <Ionicons name="chatbubble-ellipses-outline" size={64} color={colors.disabled} style={{ alignSelf: 'center' }} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('support_history_empty', language)}</Text>
            <TouchableOpacity 
              style={[styles.createRequestButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('SupportForm')}
            >
              <Text style={styles.createRequestButtonText}>{t('support_history_create', language)}</Text>
            </TouchableOpacity>
          </Card>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    margin: 12,
    elevation: 4,
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  backButton: {
    marginRight: 16,
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    flex: 1,
    textAlign: 'center',
  },
  newRequestButton: {
    padding: 8,
    backgroundColor: 'transparent',
    borderRadius: 20,
  },
  loadingCard: {
    margin: 24,
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
  },
  loadingText: {
    marginTop: 10,
  },
  requestsList: {
    padding: 16,
  },
  requestItem: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowOpacity: 0.10,
    shadowRadius: 6,
    borderWidth: 0,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestSubject: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#f44336',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  requestPreview: {
    fontSize: 14,
    marginBottom: 12,
  },
  requestFooter: {
    borderTopWidth: 1,
    paddingTop: 8,
  },
  requestDate: {
    fontSize: 12,
  },
  requestAction: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
  emptyCard: {
    margin: 24,
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  createRequestButton: {
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 12,
  },
  createRequestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SupportHistoryScreen;
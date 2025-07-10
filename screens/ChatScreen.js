import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { uploadImageToCloudinary } from '../utils/cloudinaryUtils';
import ChatImagePicker from '../components/ChatImagePicker';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { Card } from '../components';
import { useLanguage } from '../context/LanguageContext';

const urduText = {
  chat: 'چیٹ',
  loading: 'پیغامات لوڈ ہو رہے ہیں...',
  input_placeholder: 'اپنا پیغام لکھیں...',
  send: 'بھیجیں',
  send_image: 'تصویر بھیجیں',
  resolved: 'یہ چیٹ حل ہو چکی ہے',
  support_team: 'سپورٹ ٹیم',
  status_active: 'فعال',
  status_resolved: 'حل شدہ',
  go_back: 'واپس جائیں',
  not_provided: 'درج نہیں',
};

const ChatScreen = ({ navigation, route }) => {
  const { currentUser } = useAuth();
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const { requestId } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [requestDetails, setRequestDetails] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [fullSizeImage, setFullSizeImage] = useState(null);
  const flatListRef = useRef(null);
  const { language } = useLanguage();

  // Listen for messages in this chat
  useEffect(() => {
    if (!requestId) return;

    // Query for request details
    const requestRef = doc(db, 'supportRequests', requestId);
    const unsubscribeRequest = onSnapshot(requestRef, (docSnap) => {
      if (docSnap.exists()) {
        setRequestDetails({
          id: docSnap.id,
          ...docSnap.data()
        });
      }
    });

    // Query for messages
    const messagesQuery = query(
      collection(db, 'supportMessages'),
      where('requestId', '==', requestId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, (querySnapshot) => {
      const messageList = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Convert Firestore timestamp to JS Date
        const createdAt = data.createdAt ? new Date(data.createdAt.toDate()) : new Date();
        
        messageList.push({
          id: doc.id,
          ...data,
          createdAt
        });
      });
      
      setMessages(messageList);
      setLoading(false);
      
      // Scroll to bottom when new messages arrive
      if (messageList.length > 0 && flatListRef.current) {
        setTimeout(() => {
          flatListRef.current.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    // Mark request as viewed by user if they're not admin
    const updateRequestAsViewed = async () => {
      if (currentUser && !currentUser.isAdmin) {
        await updateDoc(requestRef, {
          userViewed: true,
          updatedAt: serverTimestamp()
        });
      }
    };

    updateRequestAsViewed();

    return () => {
      unsubscribeMessages();
      unsubscribeRequest();
    };
  }, [requestId, currentUser]);

  // Handle image selection from ChatImagePicker
  const handleImageSelected = (uri) => {
    setSelectedImage(uri);
  };

  // Handle image upload to Cloudinary
  const handleImageUploaded = async (imageUrl) => {
    try {
      // Add message with image URL to Firestore
      await addDoc(collection(db, 'supportMessages'), {
        text: '',
        imageURL: imageUrl,
        createdAt: serverTimestamp(),
        requestId: requestId,
        userId: currentUser.uid,
        userType: currentUser.isAdmin ? 'admin' : (currentUser.isDoctor ? 'doctor' : 'patient'),
        userName: currentUser.displayName || 'User'
      });

      // Only send notification to the user when the sender is admin
      if (currentUser.isAdmin && requestDetails && requestDetails.userId && requestDetails.userId !== currentUser.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: requestDetails.userId,
          title: 'New Support Image',
          message: `${currentUser.displayName || 'Support Team'} sent an image`,
          requestId: requestId,
          type: 'support',
          read: false,
          createdAt: serverTimestamp(),
          link: `/support/${requestId}`
        });
        console.log('Notification sent to user:', requestDetails.userId);
      }

      // Update the request's last activity timestamp
      const requestRef = doc(db, 'supportRequests', requestId);
      
      // Create an update object with only defined fields
      const updateData = {
        lastActivity: serverTimestamp(),
        adminViewed: currentUser.isAdmin ? true : false,
        status: 'active',
        updatedAt: serverTimestamp()
      };
      
      // Only add these fields if they should have a value
      if (currentUser.isAdmin) {
        updateData.adminReplied = true;
      }
      
      if (!currentUser.isAdmin) {
        updateData.userViewed = true;
      }
      
      // Check if the request document exists before updating
      const docSnap = await getDoc(requestRef);
      if (docSnap.exists()) {
        await updateDoc(requestRef, updateData);
      } else {
        console.log('Support request document does not exist, creating it');
        // Create the document if it doesn't exist
        await setDoc(requestRef, {
          ...updateData,
          createdAt: serverTimestamp(),
          userId: currentUser.uid,
          userType: currentUser.isAdmin ? 'admin' : (currentUser.isDoctor ? 'doctor' : 'patient'),
          topic: 'Support Chat',
          ticketNumber: requestId.substring(0, 6)
        });
      }
      
      // Clear input
      setInputText('');
      setUploading(false);
    } catch (error) {
      setUploading(false);
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    }
  };

  const renderMessage = ({ item }) => {
    const isCurrentUser = item.userId === currentUser?.uid;
    
    return (
      <View style={[styles.messageContainer, isCurrentUser ? styles.userMessage : styles.otherMessage]}>
        <View style={[
          styles.messageBubble, 
          isCurrentUser ? 
            [styles.userBubble, { backgroundColor: colors.primary }] : 
            [styles.otherBubble, { backgroundColor: colors.card }]
        ]}>
          {!isCurrentUser && item.userType === 'admin' && (
            <Text style={[styles.messageSender, { color: isCurrentUser ? colors.buttonText : colors.text }]}>
              {language === 'ur' ? urduText.support_team : 'Support Team'}
            </Text>
          )}
          {item.text ? 
            <Text style={[styles.messageText, { color: isCurrentUser ? colors.buttonText : colors.text }]}>
              {item.text}
            </Text> : null}
          
          {item.imageURL && (
            <TouchableOpacity onPress={() => viewFullSizeImage(item.imageURL)} style={styles.imageContainer}>
              <Image source={{ uri: item.imageURL }} style={styles.messageImage} />
            </TouchableOpacity>
          )}
          
          <Text style={[styles.messageTime, { color: isCurrentUser ? colors.buttonText + '99' : colors.textLight }]}>
            {item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    try {
      // Add message to Firestore
      await addDoc(collection(db, 'supportMessages'), {
        text: inputText.trim(),
        createdAt: serverTimestamp(),
        requestId: requestId,
        userId: currentUser.uid,
        userType: currentUser.isAdmin ? 'admin' : (currentUser.isDoctor ? 'doctor' : 'patient'),
        userName: currentUser.displayName || 'User'
      });

      // Only send notification to the user when the sender is admin
      if (currentUser.isAdmin && requestDetails && requestDetails.userId && requestDetails.userId !== currentUser.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: requestDetails.userId,
          title: 'New Support Message',
          message: `${currentUser.displayName || 'Support Team'}: ${inputText.trim().slice(0, 50)}`,
          requestId: requestId,
          type: 'support',
          read: false,
          createdAt: serverTimestamp(),
          link: `/support/${requestId}`
        });
        console.log('Notification sent to user:', requestDetails.userId);
      }

      // Update the request's last activity timestamp
      const requestRef = doc(db, 'supportRequests', requestId);
      
      // Create an update object with only defined fields
      const updateData = {
        lastActivity: serverTimestamp(),
        adminViewed: currentUser.isAdmin ? true : false,
        status: 'active',
        updatedAt: serverTimestamp()
      };
      
      // Only add these fields if they should have a value
      if (currentUser.isAdmin) {
        updateData.adminReplied = true;
      }
      
      if (!currentUser.isAdmin) {
        updateData.userViewed = true;
      }
      
      // Check if the request document exists before updating
      const docSnap = await getDoc(requestRef);
      if (docSnap.exists()) {
        await updateDoc(requestRef, updateData);
      } else {
        console.log('Support request document does not exist, creating it');
        // Create the document if it doesn't exist
        await setDoc(requestRef, {
          ...updateData,
          createdAt: serverTimestamp(),
          userId: currentUser.uid,
          userType: currentUser.isAdmin ? 'admin' : (currentUser.isDoctor ? 'doctor' : 'patient'),
          topic: 'Support Chat',
          ticketNumber: requestId.substring(0, 6)
        });
      }
      
      // Clear input
      setInputText('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleImageCancel = () => {
    setSelectedImage(null);
  };

  const viewFullSizeImage = (imageUrl) => {
    setFullSizeImage(imageUrl);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      {/* Modern floating header */}
      <View style={[styles.floatingHeader, { backgroundColor: colors.card, shadowColor: colors.shadow }]}> 
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text variant="heading" weight="bold" style={[styles.headerTitle, { color: colors.primary }]}>{language === 'ur' ? urduText.chat : (requestDetails?.subject || 'Chat')}</Text>
          {requestDetails?.subject && (
            <Text variant="caption" style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {requestDetails.subject}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          {requestDetails?.status && (
            <View style={[
              styles.statusBadge, 
              { backgroundColor: requestDetails.status === 'resolved' ? colors.success : colors.primary }
            ]}>
              <Text style={styles.statusText}>
                {language === 'ur'
                  ? (requestDetails.status === 'resolved' ? urduText.status_resolved : urduText.status_active)
                  : requestDetails.status.charAt(0).toUpperCase() + requestDetails.status.slice(1)}
              </Text>
            </View>
          )}
        </View>
      </View>
      {/* Content */}
      <View style={{ flex: 1, paddingTop: 90 }}>
        {loading ? (
          <Card variant="elevated" elevation={2} style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{language === 'ur' ? urduText.loading : 'Loading messages...'}</Text>
          </Card>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={({ item }) => {
                const isCurrentUser = item.userId === currentUser?.uid;
                return (
                  <View style={[styles.messageContainer, isCurrentUser ? styles.userMessage : styles.otherMessage]}>
                    <View style={[
                      styles.messageBubble, 
                      isCurrentUser ? [styles.userBubble, { backgroundColor: colors.primary }] : [styles.otherBubble, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.inputBorder }]
                    ]}>
                      {item.text ? (
                        <Text style={[styles.messageText, { color: isCurrentUser ? colors.buttonText : colors.text }]}>{item.text}</Text>
                      ) : null}
                      {item.imageURL && (
                        <TouchableOpacity onPress={() => viewFullSizeImage(item.imageURL)} style={styles.imageContainer}>
                          <Image source={{ uri: item.imageURL }} style={styles.messageImage} />
                        </TouchableOpacity>
                      )}
                      <Text style={[styles.messageTime, { color: isCurrentUser ? colors.buttonText + '99' : colors.textLight }]}> {item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} </Text>
                    </View>
                  </View>
                );
              }}
              keyExtractor={item => item.id}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesListContent}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
            {/* Input Area */}
            <Card variant="elevated" elevation={2} style={styles.inputCard}>
              {requestDetails?.status === 'resolved' && !currentUser?.isAdmin ? (
                <View style={{ alignItems: 'center', padding: 12 }}>
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 4 }}>{language === 'ur' ? urduText.resolved : 'Resolved chat message'}</Text>
                </View>
              ) : selectedImage ? (
                <View style={styles.selectedImageContainer}>
                  <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                  <TouchableOpacity style={styles.cancelImageButton} onPress={handleImageCancel}>
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.uploadButton, { backgroundColor: colors.primary }]}
                    onPress={async () => {
                      setUploading(true);
                      try {
                        const imageUrl = await uploadImageToCloudinary(selectedImage);
                        await handleImageUploaded(imageUrl);
                        setSelectedImage(null);
                      } catch (error) {
                        console.error('Error uploading image:', error);
                        alert('Failed to upload image. Please try again.');
                      }
                      setUploading(false);
                    }}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[styles.uploadButtonText, { color: colors.buttonText }]}>{language === 'ur' ? urduText.send_image : 'Send Image'}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.messageInputRow}>
                  <ChatImagePicker onImageSelected={handleImageSelected} disabled={requestDetails?.status === 'resolved' && !currentUser?.isAdmin} />
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
                    placeholder={language === 'ur' ? urduText.input_placeholder : 'Type a message...'}
                    placeholderTextColor={colors.placeholder}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    editable={!(requestDetails?.status === 'resolved' && !currentUser?.isAdmin)}
                  />
                  <TouchableOpacity 
                    style={[styles.sendButton, { backgroundColor: colors.primary }]}
                    onPress={sendMessage}
                    disabled={!inputText.trim() || uploading || (requestDetails?.status === 'resolved' && !currentUser?.isAdmin)}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="send" size={20} color={colors.buttonText} />
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          </KeyboardAvoidingView>
        )}
      </View>
      {/* Full Size Image Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background + 'e6' }]}> 
          <TouchableOpacity 
            style={styles.closeModalButton}
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close-circle" size={36} color={colors.buttonText} />
          </TouchableOpacity>
          {fullSizeImage && (
            <Image 
              source={{ uri: fullSizeImage }} 
              style={styles.fullSizeImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callButton: {
    marginRight: 8,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  inputCard: {
    borderRadius: 16,
    margin: 8,
    padding: 8,
    elevation: 2,
    shadowOpacity: 0.10,
    shadowRadius: 6,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesListContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 4,
    marginBottom: 2,
    elevation: 1,
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  otherBubble: {
    alignSelf: 'flex-start',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  imageContainer: {
    marginTop: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 8,
    fontSize: 16,
    borderWidth: 1,
  },
  sendButton: {
    borderRadius: 20,
    padding: 10,
    marginLeft: 4,
  },
  selectedImageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  selectedImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  cancelImageButton: {
    marginRight: 8,
  },
  uploadButton: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  uploadButtonText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
  },
  fullSizeImage: {
    width: '90%',
    height: '70%',
  },
});

export default ChatScreen;
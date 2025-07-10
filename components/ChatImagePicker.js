import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToCloudinary } from '../utils/cloudinaryUtils';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Button, Card } from '../components';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../context/LanguageContext';

/**
 * A component for selecting and uploading images in chat
 * @param {Object} props - Component props
 * @param {Function} props.onImageSelected - Callback when image is selected (receives local URI)
 * @param {Function} props.onImageUploaded - Callback when image is uploaded to Cloudinary (receives URL)
 * @param {Function} props.onCancel - Callback when image selection is cancelled
 */
const ChatImagePicker = ({ onImageSelected, onImageUploaded, onCancel }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const { language } = useLanguage();

  const urduText = {
    add_image: 'تصویر شامل کریں',
    cancel: 'منسوخ کریں',
    upload: 'اپ لوڈ کریں',
    uploading: 'اپ لوڈ ہو رہا ہے...',
    failed_select: 'تصویر منتخب کرنے میں ناکامی',
    failed_upload: 'تصویر اپ لوڈ کرنے میں ناکامی',
    permission_needed: 'تصویر اپ لوڈ کرنے کے لیے اجازت درکار ہے',
  };

  // Provide haptic feedback on interactions
  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    try {
      // Reset states
      setError(null);
      triggerHaptic();
      
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        setError('We need camera roll permissions to upload images');
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        onImageSelected && onImageSelected(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setError('Failed to select image');
    }
  };

  // Upload image to Cloudinary
  const uploadImage = async () => {
    if (!selectedImage) return;
    
    try {
      setUploading(true);
      setError(null);
      triggerHaptic();
      
      // Upload to Cloudinary
      const imageUrl = await uploadImageToCloudinary(selectedImage, 'support_chat');
      
      // Call callback with the uploaded image URL
      onImageUploaded && onImageUploaded(imageUrl);
      
      // Reset states
      setSelectedImage(null);
      setUploading(false);
    } catch (error) {
      console.error('Error uploading image to Cloudinary:', error);
      setError('Failed to upload image');
      setUploading(false);
    }
  };

  // Cancel image selection
  const cancelSelection = () => {
    triggerHaptic();
    setSelectedImage(null);
    setError(null);
    onCancel && onCancel();
  };

  return (
    <View style={styles.container}>
      {!selectedImage ? (
        <Button
          variant="outline"
          size="small"
          icon="image-outline"
          iconPosition="left"
          onPress={pickImage}
          style={styles.pickButton}
        >
          {language === 'ur' ? urduText.add_image : 'Add Image'}
        </Button>
      ) : (
        <Card 
          variant="elevated" 
          elevation={2}
          style={styles.previewContainer}
        >
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
          
          <LinearGradient
            colors={[colors.primary + '10', colors.primary + '20']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionButtons}
          >
            <Button 
              variant="outline" 
              size="small"
              icon="close"
              onPress={cancelSelection}
              disabled={uploading}
              style={styles.actionButton}
            >
              {language === 'ur' ? urduText.cancel : 'Cancel'}
            </Button>
            
            <Button 
              variant="primary" 
              size="small"
              icon="cloud-upload-outline"
              isLoading={uploading}
              disabled={uploading}
              onPress={uploadImage}
              style={styles.actionButton}
            >
              {uploading ? (language === 'ur' ? urduText.uploading : 'Uploading...') : (language === 'ur' ? urduText.upload : 'Upload')}
            </Button>
          </LinearGradient>
          
          {error && <Text variant="caption" color={colors.error} center style={styles.errorText}>{language === 'ur' ? (error === 'We need camera roll permissions to upload images' ? urduText.permission_needed : error === 'Failed to select image' ? urduText.failed_select : error === 'Failed to upload image' ? urduText.failed_upload : error) : error}</Text>}
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  pickButton: {
    alignSelf: 'flex-start',
  },
  previewContainer: {
    overflow: 'hidden',
    marginVertical: 8,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  errorText: {
    padding: 8,
  },
});

export default ChatImagePicker;
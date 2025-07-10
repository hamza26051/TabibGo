import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';

const SignupScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { signup } = useAuth();
  const { language } = useLanguage();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const urduText = {
    app_title: 'میوکَس موبائل ایپ',
    loading: 'لوڈ ہو رہا ہے...',
    create_account: 'اکاؤنٹ بنائیں',
    username: 'یوزر نیم',
    choose_username: 'یوزر نیم منتخب کریں',
    email: 'ای میل',
    enter_email: 'ای میل درج کریں',
    password: 'پاس ورڈ',
    create_password: 'پاس ورڈ بنائیں',
    confirm_password: 'پاس ورڈ کی تصدیق کریں',
    confirm_password_placeholder: 'پاس ورڈ دوبارہ درج کریں',
    signup_button: 'سائن اپ',
    already_have_account: 'پہلے سے اکاؤنٹ ہے؟',
    login: 'لاگ ان',
    username_required: 'یوزر نیم ضروری ہے',
    username_min: 'یوزر نیم کم از کم 3 حروف کا ہونا چاہیے',
    email_required: 'ای میل ضروری ہے',
    invalid_email: 'غلط ای میل ایڈریس',
    password_required: 'پاس ورڈ ضروری ہے',
    password_min: 'پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے',
    confirm_password_required: 'پاس ورڈ کی تصدیق ضروری ہے',
    passwords_no_match: 'پاس ورڈ مماثل نہیں ہیں',
    account_created: 'اکاؤنٹ کامیابی سے بن گیا!',
    signup_failed: 'اکاؤنٹ بنانے میں ناکامی',
    email_in_use: 'ای میل پہلے سے استعمال ہو رہی ہے',
    weak_password: 'پاس ورڈ بہت کمزور ہے',
    signup_error: 'سائن اپ میں خرابی',
    ok: 'ٹھیک ہے',
  };

  const handleSignup = async () => {
    // Reset errors
    setUsernameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    
    // Validate inputs
    let isValid = true;
    
    if (!username.trim()) {
      setUsernameError(language === 'ur' ? urduText.username_required : 'Username is required');
      isValid = false;
    } else if (username.length < 3) {
      setUsernameError(language === 'ur' ? urduText.username_min : 'Username must be at least 3 characters long');
      isValid = false;
    }
    
    if (!email.trim()) {
      setEmailError(language === 'ur' ? urduText.email_required : 'Email is required');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError(language === 'ur' ? urduText.invalid_email : 'Invalid email address');
      isValid = false;
    }
    
    if (!password.trim()) {
      setPasswordError(language === 'ur' ? urduText.password_required : 'Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError(language === 'ur' ? urduText.password_min : 'Password must be at least 6 characters long');
      isValid = false;
    }
    
    if (!confirmPassword.trim()) {
      setConfirmPasswordError(language === 'ur' ? urduText.confirm_password_required : 'Confirm password is required');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError(language === 'ur' ? urduText.passwords_no_match : 'Passwords do not match');
      isValid = false;
    }
    
    if (isValid) {
      setIsLoading(true);
      try {
        // Use the signup function from AuthContext
        await signup(email, password, username);
        setIsLoading(false);
        Alert.alert(
          language === 'ur' ? urduText.account_created : 'Success',
          language === 'ur' ? urduText.account_created : 'Account created successfully!',
          [
            { text: language === 'ur' ? urduText.ok : 'OK', onPress: () => navigation.navigate('Login') }
          ]
        );
      } catch (error) {
        setIsLoading(false);
        let errorMessage = language === 'ur' ? urduText.signup_failed : 'Account creation failed';
        
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = language === 'ur' ? urduText.email_in_use : 'Email address is already in use';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = language === 'ur' ? urduText.invalid_email : 'Invalid email address';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = language === 'ur' ? urduText.weak_password : 'Password is too weak';
        }
        
        Alert.alert(language === 'ur' ? urduText.signup_error : 'Signup Error', errorMessage);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: colors.text }]}>{language === 'ur' ? urduText.app_title : 'MUCUS Mobile App'}</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>{language === 'ur' ? urduText.loading : 'Loading...'}</Text>
          
          <View style={styles.formContainer}>
            <Text style={[styles.formTitle, { color: colors.primary }]}>{language === 'ur' ? urduText.create_account : 'Create Account'}</Text>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>{language === 'ur' ? urduText.username : 'Username'}</Text>
              <TextInput
                style={[
                  styles.input,
                  usernameError ? styles.inputError : null,
                  { color: colors.text }
                ]}
                placeholder={language === 'ur' ? urduText.choose_username : 'Choose a username'}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  if (usernameError) setUsernameError('');
                }}
              />
              {usernameError ? <Text style={[styles.errorText, { color: colors.error }]}>{usernameError}</Text> : null}
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>{language === 'ur' ? urduText.email : 'Email'}</Text>
              <TextInput
                style={[
                  styles.input,
                  emailError ? styles.inputError : null,
                  { color: colors.text }
                ]}
                placeholder={language === 'ur' ? urduText.enter_email : 'Enter email'}
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError('');
                }}
              />
              {emailError ? <Text style={[styles.errorText, { color: colors.error }]}>{emailError}</Text> : null}
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>{language === 'ur' ? urduText.password : 'Password'}</Text>
              <TextInput
                style={[
                  styles.input,
                  passwordError ? styles.inputError : null,
                  { color: colors.text }
                ]}
                placeholder={language === 'ur' ? urduText.create_password : 'Create password'}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                }}
              />
              {passwordError ? <Text style={[styles.errorText, { color: colors.error }]}>{passwordError}</Text> : null}
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>{language === 'ur' ? urduText.confirm_password : 'Confirm Password'}</Text>
              <TextInput
                style={[
                  styles.input,
                  confirmPasswordError ? styles.inputError : null,
                  { color: colors.text }
                ]}
                placeholder={language === 'ur' ? urduText.confirm_password_placeholder : 'Confirm password'}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmPasswordError) setConfirmPasswordError('');
                }}
              />
              {confirmPasswordError ? <Text style={[styles.errorText, { color: colors.error }]}>{confirmPasswordError}</Text> : null}
            </View>
            
            <TouchableOpacity 
              style={styles.signupButton} 
              onPress={handleSignup}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={[styles.signupButtonText, { color: colors.buttonText }]}>{language === 'ur' ? urduText.signup_button : 'Sign Up'}</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: colors.subtext }]}>{language === 'ur' ? urduText.already_have_account : 'Already have an account?'}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[styles.loginLink, { color: colors.primary }]}>{language === 'ur' ? urduText.login : 'Login'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
      <StatusBar style="auto" />
    </KeyboardAvoidingView>
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
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 30,
    },
    content: {
      width: '85%',
      alignItems: 'center',
    },
    logo: {
      width: 100,
      height: 100,
      marginBottom: 15,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    subtitle: {
      fontSize: 14,
      marginBottom: 30,
    },
    formContainer: {
      backgroundColor: colors.card,
      borderRadius: 15,
      padding: 20,
      width: '100%',
      shadowColor: colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    formTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
    },
    inputContainer: {
      marginBottom: 15,
    },
    label: {
      fontSize: 14,
      marginBottom: 5,
      fontWeight: '500',
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
    },
    inputError: {
      borderColor: colors.error,
    },
    errorText: {
      fontSize: 12,
      marginTop: 5,
    },
    signupButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 15,
      alignItems: 'center',
      marginTop: 10,
    },
    signupButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    loginContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 20,
    },
    loginText: {
      fontSize: 14,
    },
    loginLink: {
      fontSize: 14,
      fontWeight: 'bold',
    },
  });
};

export default SignupScreen;
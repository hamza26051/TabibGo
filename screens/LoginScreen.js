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

const createStyles = (colors) => {
  return StyleSheet.create({
    container: {
      flex: 1,
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
      borderRadius: 15,
      padding: 20,
      width: '100%',
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
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
    },
    inputError: {
      borderColor: '#ff3b30',
    },
    errorText: {
      color: '#ff3b30',
      fontSize: 12,
      marginTop: 5,
    },
    loginButton: {
      borderRadius: 8,
      padding: 15,
      alignItems: 'center',
      marginTop: 10,
    },
    loginButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    signupContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 20,
    },
    signupText: {
      fontSize: 14,
    },
    signupLink: {
      fontSize: 14,
      fontWeight: 'bold',
    },
  });
};

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors);

  const urduText = {
    app_title: 'میوکَس موبائل ایپ',
    loading: 'لوڈ ہو رہا ہے...',
    login: 'لاگ ان',
    email: 'ای میل',
    enter_email: 'ای میل درج کریں',
    password: 'پاس ورڈ',
    enter_password: 'پاس ورڈ درج کریں',
    login_button: 'لاگ ان',
    dont_have_account: 'اکاؤنٹ نہیں ہے؟',
    signup: 'سائن اپ',
    email_required: 'ای میل ضروری ہے',
    invalid_email: 'غلط ای میل ایڈریس',
    password_required: 'پاس ورڈ ضروری ہے',
    password_min: 'پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے',
    login_failed: 'لاگ ان ناکام۔ دوبارہ کوشش کریں۔',
    no_account: 'اس ای میل کے ساتھ کوئی اکاؤنٹ نہیں ملا۔ براہ کرم سائن اپ کریں۔',
    wrong_password: 'غلط پاس ورڈ۔ دوبارہ کوشش کریں۔',
    login_error: 'لاگ ان میں خرابی',
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    // Reset errors
    setEmailError('');
    setPasswordError('');
    
    // Validate inputs
    let isValid = true;
    
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
      setPasswordError(language === 'ur' ? urduText.password_min : 'Password must be at least 6 characters');
      isValid = false;
    }
    
    if (isValid) {
      setIsLoading(true);
      try {
        // Use the login function from AuthContext
        await login(email, password);
        setIsLoading(false);
        navigation.navigate('Home');
      } catch (error) {
        setIsLoading(false);
        let errorMessage = language === 'ur' ? urduText.login_failed : 'Login failed. Please try again.';
        
        if (error.code === 'auth/user-not-found') {
          errorMessage = language === 'ur' ? urduText.no_account : 'No account found with this email. Please sign up.';
        } else if (error.code === 'auth/wrong-password') {
          errorMessage = language === 'ur' ? urduText.wrong_password : 'Incorrect password. Please try again.';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = language === 'ur' ? urduText.invalid_email : 'Invalid email address.';
        }
        
        Alert.alert(language === 'ur' ? urduText.login_error : 'Login Error', errorMessage);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: colors.text }]}>{language === 'ur' ? urduText.app_title : 'MUCUS Mobile App'}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{language === 'ur' ? urduText.loading : 'Loading...'}</Text>
          
          <View style={[styles.formContainer, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
            <Text style={[styles.formTitle, { color: colors.primary }]}>{language === 'ur' ? urduText.login : 'Login'}</Text>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>{language === 'ur' ? urduText.email : 'Email'}</Text>
              <TextInput
                style={[styles.input, emailError ? styles.inputError : null, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                placeholder={language === 'ur' ? urduText.enter_email : 'Enter email'}
                placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError('');
                }}
              />
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>{language === 'ur' ? urduText.password : 'Password'}</Text>
              <TextInput
                style={[styles.input, passwordError ? styles.inputError : null, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                placeholder={language === 'ur' ? urduText.enter_password : 'Enter password'}
                placeholderTextColor={colors.placeholder}
                secureTextEntry
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                }}
              />
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>
            
            <TouchableOpacity 
              style={[styles.loginButton, { backgroundColor: colors.primary }]} 
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>{language === 'ur' ? urduText.login_button : 'Login'}</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.signupContainer}>
              <Text style={[styles.signupText, { color: colors.textSecondary }]}>{language === 'ur' ? urduText.dont_have_account : "Don't have an account? "}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={[styles.signupLink, { color: colors.primary }]}>{language === 'ur' ? urduText.signup : 'Sign Up'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create the language context
const LanguageContext = createContext();

// Available languages
export const languages = {
  // Top languages (displayed first)
  top: [
    { code: 'en', name: 'English' },
    { code: 'ur', name: 'Urdu' }
  ],
  // Other languages (displayed after top languages)
  others: []
};

// Default language
const DEFAULT_LANGUAGE = 'en';

// Language provider component
export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);

  // Load saved language preference from storage on component mount
  useEffect(() => {
    const loadLanguagePreference = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('language');
        if (savedLanguage) {
          setLanguage(savedLanguage);
        }
      } catch (error) {
        console.error('Failed to load language preference:', error);
      }
    };

    loadLanguagePreference();
  }, []);

  // Save language preference when it changes
  const setLanguagePreference = async (newLanguage) => {
    try {
      await AsyncStorage.setItem('language', newLanguage);
      setLanguage(newLanguage);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  };

  // Get language name by code
  const getLanguageName = (code) => {
    const allLanguages = [...languages.top, ...languages.others];
    const language = allLanguages.find(lang => lang.code === code);
    return language ? language.name : code;
  };

  return (
    <LanguageContext.Provider 
      value={{
        language,
        setLanguage: setLanguagePreference,
        getLanguageName,
        availableLanguages: languages,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

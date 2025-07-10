import en from './en';
import ur from './ur';

const translations = { en, ur };

export function t(key, lang = 'en') {
  return translations[lang] && translations[lang][key] ? translations[lang][key] : key;
} 
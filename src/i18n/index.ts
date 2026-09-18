/**
 * i18n setup — supports English + Indian local languages.
 * Language is read from org config. Defaults to English.
 * To add a new language: create {code}.json, add to LANGUAGES, import below.
 */

import en from './en.json';
import hi from './hi.json';
import ta from './ta.json';

export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
];

const translations: Record<string, Record<string, Record<string, string>>> = { en, hi, ta };

/**
 * Simple translation function. Usage: t('nav.dashboard', 'en')
 * Falls back to English if key not found in target language.
 */
export function t(key: string, lang: string = 'en'): string {
  const [section, field] = key.split('.');
  if (!section || !field) return key;
  const dict = translations[lang] || translations.en;
  return dict?.[section]?.[field] || translations.en?.[section]?.[field] || key;
}

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee' },
  { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
];

export const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Colombo', 'Asia/Kathmandu',
  'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai',
  'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Australia/Sydney', 'Pacific/Auckland',
];

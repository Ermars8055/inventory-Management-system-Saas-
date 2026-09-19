/**
 * i18n constants — Languages, Currencies, Timezones.
 * Translation is handled by LibreTranslate via useTranslation() hook.
 * No static translation files needed anymore.
 */

export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
];

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

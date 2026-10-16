/**
 * Country Calling Codes and Phone Number Specifications
 * Enforces exact digit lengths, emoji flags, and standard format examples.
 */

export interface CountryPhoneSpec {
  name: string;
  code: string;       // ISO 3166-1 alpha-2
  dialCode: string;   // e.g. "+91"
  flag: string;       // Emoji flag
  digits: number;     // Standard national number digit length
  placeholder: string;
}

export const COUNTRIES: CountryPhoneSpec[] = [
  { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳', digits: 10, placeholder: '98765 43210' },
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸', digits: 10, placeholder: '555 019 2834' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '🇦🇪', digits: 9, placeholder: '50 123 4567' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧', digits: 10, placeholder: '7911 123456' },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: '🇸🇦', digits: 9, placeholder: '50 123 4567' },
  { name: 'Singapore', code: 'SG', dialCode: '+65', flag: '🇸🇬', digits: 8, placeholder: '8123 4567' },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺', digits: 9, placeholder: '412 345 678' },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦', digits: 10, placeholder: '416 555 0192' },
  { name: 'Qatar', code: 'QA', dialCode: '+974', flag: '🇶🇦', digits: 8, placeholder: '3312 3456' },
  { name: 'Kuwait', code: 'KW', dialCode: '+965', flag: '🇰🇼', digits: 8, placeholder: '9123 4567' },
  { name: 'Oman', code: 'OM', dialCode: '+968', flag: '🇴🇲', digits: 8, placeholder: '9123 4567' },
  { name: 'Bahrain', code: 'BH', dialCode: '+973', flag: '🇧🇭', digits: 8, placeholder: '3612 3456' },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪', digits: 10, placeholder: '151 12345678' },
  { name: 'Malaysia', code: 'MY', dialCode: '+60', flag: '🇲🇾', digits: 10, placeholder: '12 345 6789' },
  { name: 'Philippines', code: 'PH', dialCode: '+63', flag: '🇵🇭', digits: 10, placeholder: '917 123 4567' },
  { name: 'South Africa', code: 'ZA', dialCode: '+27', flag: '🇿🇦', digits: 9, placeholder: '82 123 4567' },
  { name: 'New Zealand', code: 'NZ', dialCode: '+64', flag: '🇳🇿', digits: 9, placeholder: '21 123 4567' },
  { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷', digits: 9, placeholder: '6 12 34 56 78' },
  { name: 'Japan', code: 'JP', dialCode: '+81', flag: '🇯🇵', digits: 10, placeholder: '90 1234 5678' },
  { name: 'Kenya', code: 'KE', dialCode: '+254', flag: '🇰🇪', digits: 9, placeholder: '712 345678' },
  { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬', digits: 10, placeholder: '802 123 4567' },
  { name: 'Pakistan', code: 'PK', dialCode: '+92', flag: '🇵🇰', digits: 10, placeholder: '300 1234567' },
  { name: 'Bangladesh', code: 'BD', dialCode: '+880', flag: '🇧🇩', digits: 10, placeholder: '1712 345678' },
  { name: 'Nepal', code: 'NP', dialCode: '+977', flag: '🇳🇵', digits: 10, placeholder: '9841 234567' },
  { name: 'Sri Lanka', code: 'LK', dialCode: '+94', flag: '🇱🇰', digits: 9, placeholder: '71 234 5678' },
  { name: 'Ireland', code: 'IE', dialCode: '+353', flag: '🇮🇪', digits: 9, placeholder: '85 123 4567' },
  { name: 'Italy', code: 'IT', dialCode: '+39', flag: '🇮🇹', digits: 10, placeholder: '312 345 6789' },
  { name: 'Spain', code: 'ES', dialCode: '+34', flag: '🇪🇸', digits: 9, placeholder: '612 34 56 78' },
  { name: 'Netherlands', code: 'NL', dialCode: '+31', flag: '🇳🇱', digits: 9, placeholder: '6 12345678' },
  { name: 'Switzerland', code: 'CH', dialCode: '+41', flag: '🇨🇭', digits: 9, placeholder: '79 123 45 67' },
  { name: 'Sweden', code: 'SE', dialCode: '+46', flag: '🇸🇪', digits: 9, placeholder: '70 123 45 67' },
  { name: 'Norway', code: 'NO', dialCode: '+47', flag: '🇳🇴', digits: 8, placeholder: '412 34 567' },
  { name: 'Denmark', code: 'DK', dialCode: '+45', flag: '🇩🇰', digits: 8, placeholder: '20 12 34 56' },
  { name: 'Other / International', code: 'XX', dialCode: '+', flag: '🌐', digits: 15, placeholder: 'International Number' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // India (+91)

/**
 * Parses an arbitrary phone string into matching CountryPhoneSpec and national number.
 * Supports strings like:
 *   "+91 9876543210" -> { country: India, number: "9876543210" }
 *   "+971501234567"  -> { country: UAE, number: "501234567" }
 *   "9876543210"     -> { country: fallback (India), number: "9876543210" }
 */
export function parsePhoneNumber(
  rawPhone: string = '',
  defaultCountryCode: string = 'IN'
): { country: CountryPhoneSpec; nationalNumber: string } {
  const fallback = COUNTRIES.find(c => c.code === defaultCountryCode) || DEFAULT_COUNTRY;
  if (!rawPhone || !rawPhone.trim()) {
    return { country: fallback, nationalNumber: '' };
  }

  const cleaned = rawPhone.trim();

  if (cleaned.startsWith('+')) {
    // Sort countries by dial code length descending to match longest prefix first (e.g. +971 before +9)
    const sorted = [...COUNTRIES].filter(c => c.dialCode !== '+').sort((a, b) => b.dialCode.length - a.dialCode.length);
    for (const c of sorted) {
      if (cleaned.startsWith(c.dialCode)) {
        const remaining = cleaned.slice(c.dialCode.length).replace(/\D/g, '');
        return { country: c, nationalNumber: remaining.slice(0, c.digits) };
      }
    }
  }

  // No leading plus: extract only digits
  const digitsOnly = cleaned.replace(/\D/g, '');
  return { country: fallback, nationalNumber: digitsOnly.slice(0, fallback.digits) };
}

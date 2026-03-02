import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Normalize a phone number to E.164 format
 */
export function normalizePhone(phone: string, defaultCountry?: string): string | null {
  try {
    const parsed = parsePhoneNumber(phone, defaultCountry as any);
    if (!parsed || !parsed.isValid()) {
      return null;
    }
    return parsed.format('E.164');
  } catch {
    return null;
  }
}

/**
 * Detect country code from E.164 phone number
 */
export function detectCountryFromPhone(phone: string): string | null {
  try {
    const parsed = parsePhoneNumber(phone);
    if (!parsed) {
      return null;
    }
    return parsed.country || null;
  } catch {
    return null;
  }
}

/**
 * Validate if a phone number is valid
 */
export function isValidPhone(phone: string, country?: string): boolean {
  return isValidPhoneNumber(phone, country as any);
}

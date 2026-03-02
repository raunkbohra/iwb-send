import { detectCountryFromPhone } from '@iwb/shared';

/**
 * Resolve country code from phone number
 */
export class CountryResolver {
  resolve(phone: string): string {
    const country = detectCountryFromPhone(phone);
    return country || '*'; // Wildcard for unknown countries
  }
}

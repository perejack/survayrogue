/**
 * Meta Pixel (Facebook Pixel) helper utilities
 * Pixel ID: 1038307639199107
 *
 * The base pixel script is loaded in index.html and fires a PageView on every
 * page load.  Use the functions below to fire conversion events from React code.
 *
 * Advanced Matching: when a user is logged in we re-initialise the pixel with
 * their hashed profile data so Meta can attribute more conversions accurately.
 * Meta hashes the data on its own servers — we just pass the raw strings.
 */

// Extend the global Window type so TypeScript doesn't complain about `fbq`
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const PIXEL_ID = '1038307639199107';

/** Fire any standard or custom Meta Pixel event */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    if (params) {
      window.fbq('track', eventName, params);
    } else {
      window.fbq('track', eventName);
    }
  }
}

/**
 * Advanced Matching — call this once the user's profile is known (login / sign-up).
 * Re-initialises the pixel with hashed customer data so Meta can match this
 * visitor to a Meta account even across devices and browsers.
 *
 * Fields sent (all hashed by Meta before storage):
 *   em  – email address       (highest match weight)
 *   ph  – phone number        (very high for KE — WhatsApp / Facebook phone)
 *   fn  – first name
 *   ln  – last name
 *   external_id – your Supabase user ID (ties events to one person)
 *
 * @param email    - User's email address
 * @param phone    - User's phone number (e.g. "+254700000000")
 * @param fullName - User's full name (will be split into fn / ln)
 * @param userId   - Supabase user UUID used as external_id
 */
export function initAdvancedMatching(
  email: string,
  phone: string,
  fullName: string,
  userId: string
): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;

  const nameParts = fullName.trim().split(' ');
  const fn = nameParts[0]?.toLowerCase() ?? '';
  const ln = nameParts.slice(1).join(' ').toLowerCase() || fn; // fallback to fn if single name

  // Normalise phone: strip spaces/dashes, ensure it starts with country code digits
  const ph = phone.replace(/[\s\-()]/g, '').replace(/^\+/, '');

  window.fbq('init', PIXEL_ID, {
    em: email.toLowerCase().trim(),
    ph,
    fn,
    ln,
    external_id: userId,
  });
}

/**
 * Event 1 – Registration complete
 * Fire this immediately after a new user account is successfully created.
 * Meta uses this as the primary optimisation signal to find new registrations.
 */
export function trackCompleteRegistration(): void {
  trackEvent('CompleteRegistration');
}

/**
 * Event 2 – Premium purchase / upgrade
 * Fire this after a successful M-Pesa payment confirmation.
 * Always include `value` (amount in KES) and `currency` so Meta can
 * calculate ROAS (Return On Ad Spend) inside Ads Manager.
 *
 * @param value    - Payment amount in KES (e.g. 500)
 * @param currency - ISO currency code, always "KES" for this app
 */
export function trackPurchase(value: number, currency = 'KES'): void {
  trackEvent('Purchase', { value, currency });
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

/** Your active Google Ads Measurement ID */
export const GOOGLE_ADS_ID = "AW-18438672320";

/** Your active Google Tag Manager Container ID */
export const GTM_CONTAINER_ID = "GTM-PWFFKVCV";

/**
 * Exact Google Ads Conversion Send To:
 * Conversion name: Submit lead form GREYSON
 * Conversion ID: 18438672320
 * Conversion label: HeJUCKm0ifMcEMCfn9hE
 */
export const GOOGLE_ADS_CONVERSION_SEND_TO = "AW-18438672320/HeJUCKm0ifMcEMCfn9hE";

interface ConversionParams {
  /** Unique checkout requestId / reference ID — prevents duplicate counting. */
  transactionId?: string;
  /** The actual KES amount paid (e.g. 150, 199, 299). Enables value-based bidding. */
  value?: number;
  /** Currency code — always "KES" for Kenyan Shillings. */
  currency?: string;
  /** Description or category of the survey purchase */
  itemName?: string;
}

/**
 * Fire GTM dataLayer events, direct Google Ads gtag conversion, and Meta Pixel once per confirmed payment.
 * Called immediately when HashBack confirms payment completion.
 */
export function trackPurchaseConversion({
  transactionId,
  value,
  currency = "KES",
  itemName = "Survey Payment",
}: ConversionParams = {}) {
  if (typeof window === "undefined") return;

  // De-duplicate: one conversion per transactionId per session
  const safeTxId = transactionId || `TX_${Date.now()}`;
  const storageKey = `survey_ads_conv_${safeTxId}`;

  try {
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, new Date().toISOString());
  } catch {
    // ignore storage failures — still fire the tag
  }

  // Robust numeric conversion for value — ensures it's never 0 or NaN if a fee is expected
  const numericValue =
    typeof value === "number" && !isNaN(value) && value > 0
      ? value
      : Number(value) > 0
        ? Number(value)
        : 150;

  console.log(
    "[Conversion Tracking] firing conversion for transaction:",
    safeTxId,
    "amount:",
    numericValue,
    currency
  );

  window.dataLayer = window.dataLayer || [];

  // 1. GTM Custom Lead / Payment Events
  window.dataLayer.push({
    event: "lead_form_submitted",
    conversion_type: "payment_success",
    transaction_id: safeTxId,
    value: numericValue,
    conversion_value: numericValue,
    price: numericValue,
    amount: numericValue,
    currency: currency,
    item_name: itemName,
  });

  window.dataLayer.push({
    event: "payment_success",
    transaction_id: safeTxId,
    value: numericValue,
    conversion_value: numericValue,
    price: numericValue,
    amount: numericValue,
    currency: currency,
  });

  // 2. Standard GA4 / GTM Ecommerce Purchase Event
  window.dataLayer.push({
    event: "purchase",
    ecommerce: {
      transaction_id: safeTxId,
      value: numericValue,
      currency: currency,
      items: [
        {
          item_id: safeTxId,
          item_name: itemName,
          price: numericValue,
          quantity: 1,
        },
      ],
    },
  });

  // 3. Direct Google Ads gtag Conversion
  try {
    if (typeof window.gtag !== "function") {
      window.gtag = function () {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer.push(arguments);
      };
    }
    window.gtag("event", "conversion", {
      send_to: GOOGLE_ADS_CONVERSION_SEND_TO,
      value: numericValue,
      currency: currency,
      transaction_id: safeTxId,
    });
  } catch (gtagErr) {
    console.warn("[Conversion Tracking] gtag call warning:", gtagErr);
  }

  // 4. Meta Pixel Purchase + Lead (if fbq is loaded)
  try {
    if (typeof window.fbq === "function") {
      window.fbq("track", "Purchase", {
        value: numericValue,
        currency: currency,
      });
      window.fbq("track", "Lead", {
        value: numericValue,
        currency: currency,
      });
    }
  } catch (fbErr) {
    console.warn("[Conversion Tracking] fbq warning:", fbErr);
  }
}

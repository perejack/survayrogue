// HashBack Direct STK Push M-Pesa Integration Service
import { toast } from 'sonner';
import { supabase } from './supabase';
import { trackPurchaseConversion } from './gtag';

// STK push + status checks go through our Vercel serverless functions
// (see api/hashback/initiate.ts and api/hashback/status.ts).
const HASHBACK_API_BASE_URL = '/api/hashback';

type HashbackInitiateResponse = {
  success: boolean;
  checkoutId?: string;
  checkoutRequestId?: string;
  reference?: string;
  message?: string;
};

type HashbackStatusResponse = {
  success: boolean;
  status: 'paid' | 'failed' | 'pending' | 'error';
  state?: string;
  rawStatus?: string;
  resultDesc?: string;
  receiptNumber?: string | null;
  message?: string;
};

export class MpesaService {
  static formatPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '254' + cleaned.substring(1);
    if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith('254')) cleaned = '254' + cleaned;
    return cleaned;
  }

  static isValidPhone(phone: string): boolean {
    if (!phone) return false;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0') && cleaned.length === 10) return true;
    if (cleaned.startsWith('254') && cleaned.length === 12) return true;
    if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) return true;
    return false;
  }

  // Initiate STK Push via HashBack Direct API
  static async initiateSTKPush(
    phoneNumber: string,
    amount: number,
    accountReference: string,
    transactionDesc: string,
    userId: string,
    categoryId: string = 'unlock'
  ): Promise<{ success: boolean; checkoutRequestId?: string; error?: string }> {
    try {
      if (!this.isValidPhone(phoneNumber)) {
        return { success: false, error: 'Please enter a valid Kenyan M-Pesa phone number (e.g. 07XX XXX XXX)' };
      }

      const formattedPhone = this.formatPhone(phoneNumber);
      // Local reference we use to track the payment row before we get a checkoutId
      const reference = `SK${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

      // Map payment types correctly for database constraint: 'activation' | 'unlock' | 'upgrade' | 'withdrawal'
      const typeMapping: Record<string, 'activation' | 'unlock' | 'upgrade' | 'withdrawal'> = {
        activation: 'activation',
        upgrade: 'upgrade',
        promo: 'upgrade',
        unlock: 'unlock',
        withdrawal: 'withdrawal',
      };
      const paymentType = typeMapping[categoryId] || 'unlock';

      // Step 1: Insert payment record FIRST
      const { error: dbError } = await supabase.from('mpesa_payments').insert({
        user_id: userId,
        phone_number: formattedPhone,
        amount: Math.round(amount),
        checkout_request_id: reference,
        status: 'pending',
        type: paymentType,
        reference_id: reference,
      });

      if (dbError) {
        console.error('Error inserting payment record:', dbError);
      }

      // Step 2: Call HashBack Direct STK via our serverless function
      const response = await fetch(`${HASHBACK_API_BASE_URL}/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formattedPhone,
          amount: Math.round(Number(amount)),
          description: transactionDesc || 'SurveyKe payment',
          reference,
          referencePrefix: 'SURVEYKE',
        }),
      });

      const data: HashbackInitiateResponse | null = await response.json().catch(() => null);

      if (!response.ok || !data || data.success === false) {
        // Mark payment as failed
        await supabase.from('mpesa_payments').update({
          status: 'failed',
        }).eq('reference_id', reference);

        console.error('HashBack payment initiation failed:', data);
        return {
          success: false,
          error: data?.message || 'Failed to initiate payment',
        };
      }

      // Step 3: Update row with the real checkoutId (this is what we poll)
      const checkoutId = data.checkoutId ?? data.checkoutRequestId;
      if (!checkoutId) {
        await supabase
          .from('mpesa_payments')
          .update({ status: 'failed' })
          .eq('reference_id', reference);
        return { success: false, error: 'Payment initiated but missing checkoutId' };
      }

      await supabase
        .from('mpesa_payments')
        .update({ checkout_request_id: checkoutId, status: 'processing' })
        .eq('reference_id', reference);

      toast.success('STK Push sent! Check your phone and enter PIN.');

      return {
        success: true,
        checkoutRequestId: checkoutId,
      };
    } catch (error: any) {
      console.error('HashBack STK Push Error:', error);
      return { success: false, error: error.message || 'Failed to initiate payment' };
    }
  }

  static async checkTransactionStatus(checkoutRequestId: string): Promise<HashbackStatusResponse> {
    try {
      const response = await fetch(`${HASHBACK_API_BASE_URL}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutId: checkoutRequestId }),
      });

      const data: HashbackStatusResponse | null = await response.json().catch(() => null);

      if (!response.ok || !data) {
        // Network hiccup — return a soft pending so polling continues
        return { success: false, status: 'pending' };
      }

      if (data.status === 'error') {
        // API soft error — keep polling
        return { success: false, status: 'pending' };
      }

      return data;
    } catch {
      // Any exception → keep polling silently
      return { success: false, status: 'pending' };
    }
  }

  static async getPaymentStatus(checkoutRequestId: string): Promise<'completed' | 'failed' | 'pending'> {
    const data = await this.checkTransactionStatus(checkoutRequestId);

    const status = String(data.status ?? data.state ?? '').toLowerCase();
    const rawStatus = String(data.rawStatus ?? '').toLowerCase();
    const resultDesc = String(data.resultDesc ?? '').toLowerCase();

    // ── Success ──────────────────────────────────────────────────────────────
    if (
      status === 'paid' ||
      status === 'success' ||
      status === 'completed' ||
      rawStatus === 'completed' ||
      rawStatus === 'success' ||
      rawStatus === 'paid' ||
      resultDesc.includes('success') ||
      resultDesc.includes('processed successfully')
    ) {
      return 'completed';
    }

    // ── Conclusive failure ───────────────────────────────────────────────────
    if (
      status === 'failed' ||
      rawStatus === 'failed' ||
      rawStatus === 'cancelled' ||
      rawStatus === 'canceled' ||
      resultDesc.includes('cancel') ||
      resultDesc.includes('insufficient') ||
      resultDesc.includes('wrong pin') ||
      resultDesc.includes('invalid pin') ||
      resultDesc.includes('user cannot be reached') ||
      resultDesc.includes('ds timeout') ||
      resultDesc.includes('timed out') ||
      resultDesc.includes('timeout')
    ) {
      return 'failed';
    }

    return 'pending';
  }

  // Poll payment status via HashBack /transactionstatus
  static async pollPaymentStatus(
    checkoutRequestId: string,
    onComplete: () => void,
    onFailed: () => void,
    maxAttempts: number = 24, // 24 × 5s = 2 minutes
    amount?: number
  ) {
    let attempts = 0;

    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        try {
          await supabase.from('mpesa_payments').update({ status: 'failed' }).eq('checkout_request_id', checkoutRequestId);
        } catch {
          // ignore
        }
        onFailed();
        return;
      }
      attempts++;

      try {
        const status = await this.getPaymentStatus(checkoutRequestId);
        console.log('Payment status:', status);

        if (status === 'completed') {
          await supabase.from('mpesa_payments').update({ status: 'completed' }).eq('checkout_request_id', checkoutRequestId);

          // Retrieve amount for conversion tracking
          let paidAmount = amount;
          if (!paidAmount) {
            try {
              const { data: payRow } = await supabase
                .from('mpesa_payments')
                .select('amount')
                .eq('checkout_request_id', checkoutRequestId)
                .maybeSingle();
              if (payRow?.amount) paidAmount = Number(payRow.amount);
            } catch {
              // ignore
            }
          }

          // Fire GTM, Google Ads conversion, and Meta Pixel
          trackPurchaseConversion({
            transactionId: checkoutRequestId,
            value: paidAmount || 150,
            currency: 'KES',
            itemName: 'Survey Payment',
          });

          onComplete();
          return;
        }

        if (status === 'failed') {
          await supabase.from('mpesa_payments').update({ status: 'failed' }).eq('checkout_request_id', checkoutRequestId);
          onFailed();
          return;
        }

        // Pending/processing - continue polling
        setTimeout(checkStatus, 5000);
      } catch (error) {
        console.error('Poll error:', error);
        setTimeout(checkStatus, 5000);
      }
    };

    setTimeout(checkStatus, 5000); // first check after 5s
  }
}

// Category definitions (unlock prices)
export const SURVEY_CATEGORIES = [
  { 
    id: 'lifestyle', 
    name: 'Lifestyle & Consumer', 
    description: 'Complete free surveys and earn up to KSH 1,500', 
    unlock_price: 0, 
    earning_cap: 1500, 
    surveys_available: 50, 
    reward_per_survey: 150, 
    gradient: 'from-emerald-400 to-teal-600', 
    textColor: 'text-emerald-600',
    is_free: true 
  },
  { 
    id: 'tech', 
    name: 'Technology & Digital', 
    description: 'Unlock surveys earning up to KSH 1,500 more', 
    unlock_price: 125, 
    earning_cap: 1500, 
    surveys_available: 50, 
    reward_per_survey: 150, 
    gradient: 'from-blue-400 to-indigo-600', 
    textColor: 'text-blue-600', 
    is_free: false 
  },
  { 
    id: 'health', 
    name: 'Health & Wellness', 
    description: 'Unlock surveys earning up to KSH 2,000 more', 
    unlock_price: 200, 
    earning_cap: 2000, 
    surveys_available: 50, 
    reward_per_survey: 200, 
    gradient: 'from-rose-400 to-pink-600', 
    textColor: 'text-rose-600',
    is_free: false 
  },
  { 
    id: 'finance', 
    name: 'Finance & Business', 
    description: 'Unlock surveys earning up to KSH 2,500 more', 
    unlock_price: 250, 
    earning_cap: 2500, 
    surveys_available: 50, 
    reward_per_survey: 250, 
    gradient: 'from-amber-400 to-orange-600', 
    textColor: 'text-amber-600',
    is_free: false 
  },
];

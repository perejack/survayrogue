// PayHero M-Pesa Integration Service
import { toast } from 'sonner';
import { supabase } from './supabase';

// STK push + status checks go through our Vercel serverless functions
// (see api/payhero/initiate.ts and api/payhero/status.ts).
const PAYHERO_API_BASE_URL = '/api/payhero';

type PayheroInitiateResponse = {
  success: boolean;
  checkoutId?: string;
  checkoutRequestId?: string;
  reference?: string;
  message?: string;
};

type PayheroStatusResponse = {
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

  // Initiate STK Push via PayHero
  static async initiateSTKPush(
    phoneNumber: string,
    amount: number,
    accountReference: string,
    transactionDesc: string,
    userId: string,
    categoryId: string
  ): Promise<{ success: boolean; checkoutRequestId?: string; error?: string }> {
    try {
      const formattedPhone = this.formatPhone(phoneNumber);
      // Local reference we use to track the payment row before we get a checkoutId
      const reference = `SK${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

      // Step 1: Insert payment record FIRST
      // Use checkoutRequestId as reference_id (unique per payment, not category ID)
      const { error: dbError } = await supabase.from('mpesa_payments').insert({
        user_id: userId,
        phone_number: formattedPhone,
        amount: Math.round(amount),
        checkout_request_id: reference,
        status: 'pending',
        type: 'unlock',
        reference_id: reference,
      });

      if (dbError) {
        console.error('Error inserting payment record:', dbError);
      }

      // Step 2: Call PayHero via our serverless function
      const response = await fetch(`${PAYHERO_API_BASE_URL}/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formattedPhone,
          phoneNumber: formattedPhone,
          amount: Math.round(Number(amount)),
          description: transactionDesc || 'SurveyKe payment',
          reference,
          referencePrefix: 'SURVEYKE',
        }),
      });

      const data: PayheroInitiateResponse | null = await response.json().catch(() => null);

      if (!response.ok || !data || data.success === false) {
        // Mark payment as failed
        await supabase.from('mpesa_payments').update({
          status: 'failed',
        }).eq('reference_id', reference);

        console.error('PayHero payment initiation failed:', data);
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
      console.error('PayHero STK Push Error:', error);
      return { success: false, error: error.message || 'Failed to initiate payment' };
    }
  }

  static async checkTransactionStatus(checkoutRequestId: string): Promise<PayheroStatusResponse> {
    const response = await fetch(`${PAYHERO_API_BASE_URL}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkoutId: checkoutRequestId }),
    });

    const data: PayheroStatusResponse | null = await response.json().catch(() => null);

    if (!response.ok || !data || data.status === 'error') {
      throw new Error(data?.message || `Status check failed: ${response.status}`);
    }

    return data;
  }

  static async getPaymentStatus(checkoutRequestId: string): Promise<'completed' | 'failed' | 'pending'> {
    const data = await this.checkTransactionStatus(checkoutRequestId);

    const status = String(data.status ?? data.state ?? '').toLowerCase();
    const rawStatus = String(data.rawStatus ?? '').toLowerCase();

    if (
      status === 'paid' ||
      status === 'success' ||
      rawStatus === 'completed' ||
      rawStatus === 'success' ||
      rawStatus === 'paid'
    ) {
      return 'completed';
    }

    if (
      status === 'failed' ||
      rawStatus === 'failed' ||
      rawStatus === 'cancelled' ||
      rawStatus === 'canceled'
    ) {
      return 'failed';
    }

    return 'pending';
  }

  // Poll payment status via PayHero transaction-status
  static async pollPaymentStatus(
    checkoutRequestId: string,
    onComplete: () => void,
    onFailed: () => void,
    maxAttempts: number = 30
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

    setTimeout(checkStatus, 5000);
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
    unlock_price: 10, 
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

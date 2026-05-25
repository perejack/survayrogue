import { useState } from 'react';
import { X, Shield, Smartphone, Loader2, CheckCircle2, Sparkles, AlertCircle, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MpesaService } from '@/lib/mpesa';

interface AccountActivationModalProps {
  open: boolean;
  onClose: () => void;
  onActivated: () => void;
}

const ACTIVATION_FEE = 100;

export default function AccountActivationModal({ open, onClose, onActivated }: AccountActivationModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<'info' | 'phone' | 'processing' | 'success'>('info');
  const [phone, setPhone] = useState(profile?.phone || '+254');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!open) return null;

  const handleStartActivation = () => {
    setStep('phone');
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsProcessing(true);
    setStep('processing');

    try {
      // Initiate STK push (Hashback/Hashpay)
      const result = await MpesaService.initiateSTKPush(
        phone,
        ACTIVATION_FEE,
        `ACT-${Date.now()}`,
        'Account Activation Fee',
        user.id,
        'activation'
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to initiate payment');
      }

      // Poll for payment status
      MpesaService.pollPaymentStatus(
        result.checkoutRequestId!,
        async () => {
          // Payment successful - activate account
          console.log('Activation payment successful');
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ is_active: true })
            .eq('id', user.id);

          if (updateError) {
            console.error('Error activating account:', updateError);
            toast.error('Payment successful but activation failed. Contact support.');
            setStep('phone');
            setIsProcessing(false);
            return;
          }

          await supabase.from('transactions').insert({
            user_id: user.id,
            type: 'upgrade',
            description: 'Account Activation Fee',
            amount: -ACTIVATION_FEE,
            status: 'completed',
          });

          await refreshProfile();
          
          setStep('success');
          toast.success('Account activated successfully!');
          
          setTimeout(() => {
            onActivated();
            setStep('info');
          }, 2000);
        },
        () => {
          // Payment failed
          console.log('Activation payment failed');
          toast.error('Payment failed or cancelled. Please try again.');
          setStep('phone');
          setIsProcessing(false);
        },
        30 // 30 attempts = ~2.5 minutes
      );
    } catch (error: any) {
      console.error('Activation error:', error);
      toast.error(error.message || 'Activation failed. Please try again.');
      setStep('phone');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/70 backdrop-blur-sm">
      <div className="bg-card rounded-3xl w-full max-w-md shadow-2xl border border-border overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-6 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg">Account Inactive</h3>
                <p className="text-white/80 text-xs">Activate to enable withdrawals</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {step === 'info' && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center mx-auto">
                <Zap className="w-10 h-10 text-amber-500" />
              </div>
              
              <div>
                <h4 className="font-heading font-bold text-xl mb-2">
                  Activate Your Account
                </h4>
                <p className="text-sm text-muted-foreground">
                  Your account needs to be activated before you can withdraw earnings. 
                  This is a one-time fee for instant M-Pesa withdrawals.
                </p>
              </div>

              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Activation Fee</span>
                  <span className="font-heading font-bold text-2xl text-amber-600">KSH {ACTIVATION_FEE}</span>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Instant M-Pesa withdrawals
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    No withdrawal limits
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Priority support
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    One-time payment only
                  </li>
                </ul>
              </div>

              <button
                onClick={handleStartActivation}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-lg shadow-orange-500/25 hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Activate Now - KSH {ACTIVATION_FEE}
              </button>
              
              <button
                onClick={onClose}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Maybe Later
              </button>
            </div>
          )}

          {step === 'phone' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className={`w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg`}>
                  <Smartphone className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-heading font-bold text-lg mb-1">M-Pesa Payment</h4>
                <p className="text-xs text-muted-foreground">
                  Pay <span className="font-bold text-amber-600">KSH {ACTIVATION_FEE}</span> to activate your account
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  M-Pesa Phone Number
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254 7XX XXX XXX"
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-secondary border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  You'll receive an STK push notification on this number
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('info')}
                  className="flex-1 py-3.5 rounded-xl border-2 border-border text-sm font-semibold hover:bg-secondary transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isProcessing || phone.length < 10}
                  className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-purple-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      Send STK Push
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 to-purple-500 animate-ping opacity-20" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-purple-100 dark:from-emerald-900/30 dark:to-purple-900/30 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                </div>
              </div>
              
              <h4 className="font-heading font-bold text-lg mb-2">Processing Payment</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Please check your phone and enter your M-Pesa PIN to complete the activation.
              </p>
              
              <div className="flex items-center justify-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/40">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              
              <h4 className="font-heading font-bold text-xl mb-2 text-emerald-600">
                Account Activated!
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Your account is now active. You can now withdraw your earnings instantly to M-Pesa!
              </p>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                <Zap className="w-4 h-4" />
                Instant withdrawals enabled
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

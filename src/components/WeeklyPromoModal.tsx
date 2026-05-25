import { useState, useEffect } from "react";
import { X, Sparkles, Zap, Crown, Flame, CheckCircle2, Smartphone, Clock, TrendingUp, Gift } from "lucide-react";
import { MpesaService } from "@/lib/mpesa";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onActivated: () => void;
}

const PROMO_PRICE = 250;

const WeeklyPromoModal = ({ open, onClose, onActivated }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState<"offer" | "stk" | "processing" | "success" | "failed">("offer");
  const [phone, setPhone] = useState("+254");
  const [seconds, setSeconds] = useState(15 * 60); // 15 min FOMO countdown
  const [seatsLeft, setSeatsLeft] = useState(17);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("offer");
      return;
    }
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // gentle seat-decay for FOMO
    const t = setInterval(() => {
      setSeatsLeft((n) => (n > 3 ? n - 1 : n));
    }, 12000);
    return () => clearInterval(t);
  }, [open]);

  if (!open) return null;

  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");

  const submitStk = async () => {
    if (!phone || phone.replace(/\D/g, "").length < 9) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (!user) {
      toast.error("Please login first");
      return;
    }

    setStep("processing");

    try {
      // Initiate STK push (Hashback/Hashpay)
      const result = await MpesaService.initiateSTKPush(
        phone,
        PROMO_PRICE,
        `PROMO-${Date.now()}`,
        "Weekly Promo - 7 Days Premium",
        user.id,
        "promo"
      );

      if (!result.success || !result.checkoutRequestId) {
        throw new Error(result.error || "Failed to initiate payment");
      }

      setCheckoutRequestId(result.checkoutRequestId);

      // Poll for payment status
      MpesaService.pollPaymentStatus(
        result.checkoutRequestId,
        async () => {
          // Payment successful - activate promo
          console.log("Promo payment successful");

          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              promo_active: true,
              promo_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq("id", user.id);

          if (updateError) {
            console.error("Error activating promo:", updateError);
            toast.error("Payment successful but promo activation failed. Contact support.");
            setStep("failed");
            return;
          }

          await supabase.from("transactions").insert({
            user_id: user.id,
            type: "upgrade",
            description: "Weekly Promo - 7 Days Premium",
            amount: -PROMO_PRICE,
            status: "completed",
          });

          setStep("success");
          toast.success("Weekly promo activated successfully!");

          setTimeout(() => {
            onActivated();
          }, 1600);
        },
        () => {
          // Payment failed
          console.log("Promo payment failed");
          toast.error("Payment failed or cancelled. Please try again.");
          setStep("failed");
        },
        30 // 30 attempts = ~2.5 minutes
      );
    } catch (error: any) {
      console.error("Promo payment error:", error);
      toast.error(error.message || "Payment failed. Please try again.");
      setStep("failed");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-foreground/70 backdrop-blur-md fade-in">
      <div
        className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl slide-up max-h-[92vh] overflow-y-auto"
        style={{
          background: "linear-gradient(160deg, #1a1f5c 0%, #4a1d6b 50%, #b8124a 100%)",
        }}
      >
        {/* Decorative orbs */}
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-amber-400/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-16 w-56 h-56 rounded-full bg-pink-500/30 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 w-40 h-40 rounded-full bg-purple-400/20 blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/25 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {step === "offer" && (
          <div className="relative p-6 pt-7">
            {/* Top FOMO bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-lg shadow-orange-500/40">
                <Flame className="w-3.5 h-3.5 text-white" />
                <span className="text-[10px] font-extrabold text-white tracking-wider uppercase">Limited Offer</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm">
                <Clock className="w-3 h-3 text-white" />
                <span className="text-[11px] font-bold text-white tabular-nums">{mins}:{secs}</span>
              </div>
            </div>

            {/* Hero */}
            <div className="text-center mb-5">
              <div className="relative inline-flex">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-400 to-pink-500 blur-xl opacity-70" />
                <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-300 via-orange-400 to-pink-500 flex items-center justify-center shadow-2xl">
                  <Gift className="w-10 h-10 text-white" />
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span className="text-[10px] font-bold text-white tracking-widest uppercase">Weekly Promo · One-Time</span>
              </div>
              <h2 className="font-heading text-3xl font-extrabold text-white mt-3 leading-tight">
                7 Days of <span className="bg-gradient-to-r from-amber-300 to-pink-300 bg-clip-text text-transparent">Premium Earning</span>
              </h2>
              <p className="text-sm text-white/80 mt-2">
                Pay <span className="font-extrabold text-amber-300">KSH 250 once</span> · earn up to{" "}
                <span className="font-extrabold text-emerald-300">KSH 6,000</span> this week
              </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="rounded-2xl p-3 bg-white/10 backdrop-blur-sm border border-white/15">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">Daily Tasks</span>
                </div>
                <div className="font-heading text-xl font-extrabold text-white">5 Free</div>
                <div className="text-[10px] text-white/70">KSH 150 each · for 7 days</div>
              </div>
              <div className="rounded-2xl p-3 bg-white/10 backdrop-blur-sm border border-white/15">
                <div className="flex items-center gap-1.5 mb-1">
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">Premium Tasks</span>
                </div>
                <div className="font-heading text-xl font-extrabold text-white">3 Bonus</div>
                <div className="text-[10px] text-white/70">KSH 250 each · unlocked</div>
              </div>
            </div>

            {/* Earning highlight */}
            <div className="rounded-2xl p-4 mb-4 border border-amber-300/30" style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(236,72,153,0.15))" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-amber-200 uppercase tracking-wider">Potential Earnings</div>
                  <div className="font-heading text-3xl font-extrabold bg-gradient-to-r from-amber-300 to-emerald-300 bg-clip-text text-transparent">
                    KSH 6,000
                  </div>
                </div>
                <div className="text-right">
                  <TrendingUp className="w-5 h-5 text-emerald-300 ml-auto" />
                  <div className="text-[10px] text-white/80 mt-0.5">24× ROI</div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                <span className="text-[10px] text-white/85">No need to unlock more categories — pay less, earn more</span>
              </div>
            </div>

            {/* Perks */}
            <div className="space-y-1.5 mb-5">
              {[
                "5 free daily tasks @ KSH 150 for 7 days",
                "3 exclusive premium tasks @ KSH 250",
                "Skip all category unlock fees",
                "One-time payment · no subscription",
              ].map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-400/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                  </div>
                  <span className="text-xs text-white/90">{p}</span>
                </div>
              ))}
            </div>

            {/* Scarcity */}
            <div className="flex items-center justify-center gap-1.5 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-rose-200">
                Only <span className="font-extrabold text-white">{seatsLeft} slots</span> left at this price
              </span>
            </div>

            {/* CTA */}
            <button
              onClick={() => setStep("stk")}
              className="w-full py-4 rounded-2xl font-extrabold text-base text-white shadow-2xl shadow-pink-500/40 hover:scale-[1.02] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #ec4899 100%)" }}
            >
              <Sparkles className="w-5 h-5" />
              Claim Promo · KSH 250
            </button>
            <button onClick={onClose} className="w-full mt-2 py-2.5 text-xs font-medium text-white/60 hover:text-white/90 transition">
              Maybe later
            </button>
          </div>
        )}

        {step === "stk" && (
          <div className="relative p-6 pt-7">
            <div className="text-center mb-5">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/40">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-heading text-xl font-extrabold text-white mb-1">Activate Weekly Promo</h3>
              <p className="text-xs text-white/75">
                Pay <span className="font-bold text-amber-300">KSH 250</span> via M-Pesa STK Push
              </p>
            </div>

            <div className="mb-4">
              <label className="text-[11px] font-bold text-white/80 mb-1.5 block uppercase tracking-wider">M-Pesa Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254 7XX XXX XXX"
                className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/40 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-300/50"
              />
            </div>

            <button
              onClick={submitStk}
              className="w-full py-3.5 rounded-2xl font-extrabold text-sm text-white shadow-xl flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #ec4899 100%)" }}
            >
              <Smartphone className="w-4 h-4" />
              Send STK Push · KSH 250
            </button>
            <p className="text-[10px] text-white/60 text-center mt-3">You'll receive an M-Pesa prompt on your phone</p>
            <button onClick={() => setStep("offer")} className="w-full mt-2 py-2 text-xs font-medium text-white/60 hover:text-white/90">
              ← Back
            </button>
          </div>
        )}

        {step === "processing" && (
          <div className="relative p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 pulse-glow">
              <Smartphone className="w-10 h-10 text-emerald-300 animate-pulse" />
            </div>
            <h3 className="font-heading text-lg font-extrabold text-white mb-2">Check your phone 📱</h3>
            <p className="text-sm text-white/80 mb-4">Enter your M-Pesa PIN to activate the weekly promo of <span className="font-bold text-amber-300">KSH 250</span></p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-300 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-amber-300 animate-bounce" style={{ animationDelay: "0.1s" }} />
              <div className="w-2 h-2 rounded-full bg-amber-300 animate-bounce" style={{ animationDelay: "0.2s" }} />
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="relative p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/50">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h3 className="font-heading text-xl font-extrabold text-white mb-2">Promo Activated! 🎉</h3>
            <p className="text-sm text-white/85">Your 7-day premium boost is live. Start earning up to <span className="font-bold text-amber-300">KSH 6,000</span>!</p>
          </div>
        )}

        {step === "failed" && (
          <div className="relative p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-4">
              <X className="w-10 h-10 text-rose-300" />
            </div>
            <h3 className="font-heading text-lg font-extrabold text-white mb-2">Payment Failed</h3>
            <p className="text-sm text-white/80 mb-4">The payment was cancelled or failed. Please try again.</p>
            <button
              onClick={() => setStep("stk")}
              className="w-full py-3 rounded-2xl font-bold text-sm text-white"
              style={{ background: "linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #ec4899 100%)" }}
            >
              Try Again
            </button>
            <button onClick={() => setStep("offer")} className="w-full mt-2 py-2 text-xs font-medium text-white/60 hover:text-white/90">
              ← Back to Offer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyPromoModal;

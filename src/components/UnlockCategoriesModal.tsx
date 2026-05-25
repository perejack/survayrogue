import { useState } from "react";
import { Lock, Unlock, X, Smartphone, CheckCircle2, Loader2 } from "lucide-react";
import catTech from "@/assets/category-tech.jpg";
import catHealth from "@/assets/category-health.jpg";
import catFinance from "@/assets/category-finance.jpg";
import { MpesaService } from "@/lib/mpesa";
import { toast } from "sonner";

const categoryImages: Record<string, string> = {
  tech: catTech,
  health: catHealth,
  finance: catFinance,
};

const categories = [
  { id: "tech", name: "Technology & Digital", unlockFee: 180, reward: 150, surveys: 10, gradient: "from-blue-400 to-indigo-600", textColor: "text-blue-600" },
  { id: "health", name: "Health & Wellness", unlockFee: 200, reward: 200, surveys: 10, gradient: "from-rose-400 to-pink-600", textColor: "text-rose-600" },
  { id: "finance", name: "Finance & Business", unlockFee: 250, reward: 250, surveys: 10, gradient: "from-amber-400 to-orange-600", textColor: "text-amber-600" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  unlockedCategories: string[];
  onUnlock: (catId: string, fee: number) => void;
  userId?: string;
  userPhone?: string;
}

const UnlockCategoriesModal = ({ open, onClose, unlockedCategories, onUnlock, userId, userPhone }: Props) => {
  const [stkCat, setStkCat] = useState<typeof categories[0] | null>(null);
  const [phone, setPhone] = useState(userPhone || "+254");
  const [stkStep, setStkStep] = useState<"form" | "processing" | "success" | "failed">("form");
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);

  if (!open) return null;

  const startStk = (cat: typeof categories[0]) => {
    setStkCat(cat);
    setStkStep("form");
  };

  const submitStk = async () => {
    if (!phone || phone.replace(/\D/g, "").length < 9) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (!userId || !stkCat) {
      toast.error("User not authenticated");
      return;
    }

    setIsProcessing(true);
    setStkStep("processing");

    // Initiate STK push (Hashback/Hashpay)
    const result = await MpesaService.initiateSTKPush(
      phone,
      stkCat.unlockFee!,
      `UNLOCK_${stkCat.id.toUpperCase()}`,
      `Unlock ${stkCat.name} category`,
      userId,
      stkCat.id
    );

    if (!result.success || !result.checkoutRequestId) {
      setStkStep("failed");
      setIsProcessing(false);
      return;
    }

    setCheckoutRequestId(result.checkoutRequestId);

    // Start polling for payment status
    MpesaService.pollPaymentStatus(
      result.checkoutRequestId,
      () => {
        // Success callback
        setStkStep("success");
        setIsProcessing(false);
        setTimeout(() => {
          if (stkCat) {
            onUnlock(stkCat.id, stkCat.unlockFee!);
          }
          setStkCat(null);
          setStkStep("form");
          setCheckoutRequestId(null);
        }, 2000);
      },
      () => {
        // Failure callback
        setStkStep("failed");
        setIsProcessing(false);
      },
      30 // max attempts
    );
  };

  const handleRetry = () => {
    setStkStep("form");
    setIsProcessing(false);
    setCheckoutRequestId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/60 backdrop-blur-sm fade-in">
      <div className="bg-card rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl border border-border slide-up max-h-[90vh] overflow-y-auto">
        {!stkCat ? (
          <>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-lg font-bold bg-gradient-to-r from-emerald-500 to-purple-600 bg-clip-text text-transparent">
                Unlock Survey Categories
              </h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-5">
              Unlock premium categories with <span className="font-bold text-emerald-600">M-Pesa STK push</span> to access higher-paying surveys 💰
            </p>

            <div className="space-y-3">
              {categories.map((cat) => {
                const isUnlocked = unlockedCategories.includes(cat.id);
                return (
                  <div key={cat.id} className={`relative overflow-hidden rounded-2xl border-2 transition-all ${isUnlocked ? "border-emerald-400/40 bg-emerald-50/40 dark:bg-emerald-950/10" : "border-border bg-card hover:border-primary/40"}`}>
                    <div className="flex items-center gap-3 p-4">
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-border">
                        <img src={categoryImages[cat.id]} alt={cat.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-heading font-bold text-sm bg-gradient-to-r ${cat.gradient} bg-clip-text text-transparent`}>
                          {cat.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          <span className="font-bold text-foreground">{cat.surveys} Surveys</span> • <span className={`font-bold ${cat.textColor}`}>KSH {cat.reward}</span> each
                        </div>
                        <div className="text-[11px] font-bold mt-0.5">
                          <span className="text-muted-foreground">Potential: </span>
                          <span className={`bg-gradient-to-r ${cat.gradient} bg-clip-text text-transparent`}>
                            KSH {(cat.surveys * cat.reward).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {isUnlocked ? (
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-500/15">
                          <Unlock className="w-3 h-3 text-emerald-600" />
                          <span className="text-[10px] font-bold text-emerald-600">Open</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => startStk(cat)}
                          className={`flex items-center gap-1 px-3 py-2 rounded-full bg-gradient-to-r ${cat.gradient} text-white shadow-md hover:scale-105 transition-all`}
                        >
                          <Lock className="w-3 h-3" />
                          <span className="text-[11px] font-bold">KSH {cat.unlockFee}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              
            </div>
          </>
        ) : (
          <>
            {/* STK Push flow */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setStkCat(null)} className="text-xs font-semibold text-muted-foreground">← Back</button>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            {stkStep === "form" && (
              <div className="text-center">
                <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br ${stkCat.gradient} shadow-lg`}>
                  <Smartphone className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-heading text-lg font-bold mb-1">Unlock {stkCat.name}</h3>
                <p className="text-xs text-muted-foreground mb-1">
                  Pay <span className={`font-bold ${stkCat.textColor}`}>KSH {stkCat.unlockFee}</span> via M-Pesa to unlock
                </p>
                <p className="text-[11px] text-muted-foreground mb-5">
                  Earn up to <span className="font-bold text-emerald-600">KSH {(stkCat.surveys * stkCat.reward).toLocaleString()}</span>
                </p>

                <div className="text-left mb-4">
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">M-Pesa Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254 7XX XXX XXX"
                    className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <button
                  onClick={submitStk}
                  className={`w-full py-3.5 rounded-xl bg-gradient-to-r ${stkCat.gradient} text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2`}
                >
                  <Smartphone className="w-4 h-4" />
                  Send STK Push • KSH {stkCat.unlockFee}
                </button>
                <p className="text-[10px] text-muted-foreground mt-3">You'll receive an M-Pesa prompt on your phone</p>
              </div>
            )}

            {stkStep === "processing" && (
              <div className="text-center py-6">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 pulse-glow">
                  <Smartphone className="w-10 h-10 text-emerald-600 animate-pulse" />
                </div>
                <h3 className="font-heading text-lg font-bold mb-2">Check your phone 📱</h3>
                <p className="text-sm text-muted-foreground mb-2">STK Push sent to {phone}</p>
                <p className="text-sm text-muted-foreground mb-4">Enter your M-Pesa PIN to complete the unlock payment of <span className="font-bold text-emerald-600">KSH {stkCat.unlockFee}</span></p>
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                  <span className="text-sm text-muted-foreground">Waiting for payment confirmation...</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-4">This may take up to 2 minutes</p>
              </div>
            )}

            {stkStep === "failed" && (
              <div className="text-center py-6">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <X className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="font-heading text-lg font-bold mb-2 text-red-600">Payment Failed</h3>
                <p className="text-sm text-muted-foreground mb-4">The payment was cancelled or failed. Please try again.</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleRetry}
                    className="flex-1 py-3 rounded-xl bg-secondary text-secondary-foreground font-bold text-sm"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => { setStkCat(null); setStkStep("form"); }}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-purple-600 text-white font-bold text-sm"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {stkStep === "success" && (
              <div className="text-center py-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/40">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h3 className="font-heading text-lg font-bold mb-2">Category Unlocked! 🎉</h3>
                <p className="text-sm text-muted-foreground">{stkCat.name} is now open. Start earning!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UnlockCategoriesModal;

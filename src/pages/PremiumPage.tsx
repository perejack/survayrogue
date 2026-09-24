import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Check, Sparkles, Zap, Shield, Home, LayoutGrid, Wallet, User, Loader2, Smartphone, X, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { MpesaService } from "@/lib/mpesa";
import { trackPurchase } from "@/lib/metaPixel";

interface PremiumPackage {
  id: string;
  name: string;
  price: number;
  features: string[];
  daily_surveys: number;
  reward_multiplier: number;
  color: string;
  is_popular: boolean;
}

const DEFAULT_PACKAGES: PremiumPackage[] = [
  {
    id: "basic",
    name: "Basic Premium",
    price: 350,
    features: [
      "Instant M-Pesa Withdrawals",
      "20 Daily Surveys",
      "Priority Support",
      "Early Access to High-Paying Surveys",
      "1.2x Reward Multiplier",
    ],
    daily_surveys: 20,
    reward_multiplier: 1.2,
    color: "primary",
    is_popular: false,
  },
  {
    id: "standard",
    name: "Standard Premium",
    price: 500,
    features: [
      "Instant M-Pesa Withdrawals (No 5-day wait)",
      "35 Daily Surveys",
      "VIP Support",
      "Exclusive Survey Categories",
      "1.5x Reward Multiplier",
      "Weekly Bonus Tasks",
    ],
    daily_surveys: 35,
    reward_multiplier: 1.5,
    color: "accent",
    is_popular: true,
  },
  {
    id: "elite",
    name: "Elite Premium",
    price: 650,
    features: [
      "Instant Unlimited M-Pesa Withdrawals",
      "Unlimited Daily Surveys",
      "24/7 Dedicated VIP Support",
      "All Premium Categories Unlocked",
      "2.0x Double Reward Multiplier",
      "Daily Bonus Surveys",
    ],
    daily_surveys: 999,
    reward_multiplier: 2.0,
    color: "primary",
    is_popular: false,
  },
];

const PremiumPage = () => {
  const navigate = useNavigate();
  const { profile, user, refreshProfile } = useAuth();
  const [packages, setPackages] = useState<PremiumPackage[]>(DEFAULT_PACKAGES);
  const [selectedPkg, setSelectedPkg] = useState<PremiumPackage | null>(null);
  const [paymentStep, setPaymentStep] = useState<"phone" | "processing" | "success" | "failed">("phone");
  const [phone, setPhone] = useState(profile?.phone || "+254");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile?.phone && profile.phone.length >= 10) {
      setPhone(profile.phone);
    }
  }, [profile?.phone]);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("premium_packages")
        .select("*")
        .order("price");

      if (data && data.length > 0) {
        // Ensure features have Instant M-Pesa Withdrawals highlighted
        const enriched = data.map((pkg: PremiumPackage) => ({
          ...pkg,
          features: pkg.features.some((f) => f.toLowerCase().includes("instant"))
            ? pkg.features
            : ["Instant M-Pesa Withdrawals", ...pkg.features],
        }));
        setPackages(enriched);
      } else {
        setPackages(DEFAULT_PACKAGES);
      }
    } catch (error) {
      console.error("Error loading packages:", error);
      setPackages(DEFAULT_PACKAGES);
    } finally {
      setIsLoading(false);
    }
  };

  const openUpgradeModal = (pkg: PremiumPackage) => {
    setSelectedPkg(pkg);
    setPaymentStep("phone");
  };

  const handleSendSTK = async () => {
    if (!user) {
      toast.error("Please log in to upgrade your account");
      navigate("/auth");
      return;
    }

    if (!selectedPkg) return;

    if (!phone || phone.replace(/\D/g, "").length < 9) {
      toast.error("Please enter a valid M-Pesa phone number (e.g. 0712345678)");
      return;
    }

    setIsProcessing(true);
    setPaymentStep("processing");

    try {
      // Initiate STK push via HashBack / PayHero
      const result = await MpesaService.initiateSTKPush(
        phone,
        selectedPkg.price,
        `UPG-${Date.now()}`,
        `Upgrade to ${selectedPkg.name}`,
        user.id,
        "upgrade"
      );

      if (!result.success || !result.checkoutRequestId) {
        throw new Error(result.error || "Failed to initiate M-Pesa STK Push");
      }

      // Poll payment status just like the other modals
      MpesaService.pollPaymentStatus(
        result.checkoutRequestId,
        async () => {
          // Payment successful - upgrade account
          console.log("Upgrade payment successful");

          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              is_premium: true,
              premium_tier: selectedPkg.name,
              is_active: true,
            })
            .eq("id", user.id);

          if (updateError) {
            console.error("Error upgrading profile:", updateError);
            toast.error("Payment received, but error activating tier. Contact support.");
            setPaymentStep("failed");
            setIsProcessing(false);
            return;
          }

          // Record transaction
          await supabase.from("transactions").insert({
            user_id: user.id,
            type: "upgrade",
            description: `Upgraded to ${selectedPkg.name}`,
            amount: -selectedPkg.price,
            status: "completed",
          });

          await refreshProfile();
          trackPurchase(selectedPkg.price);

          setPaymentStep("success");
          setIsProcessing(false);
          toast.success(`Successfully upgraded to ${selectedPkg.name}! Instant withdrawals unlocked.`);

          setTimeout(() => {
            setSelectedPkg(null);
            navigate("/wallet");
          }, 2400);
        },
        () => {
          // Payment failed or timed out
          console.log("Upgrade payment failed or timed out");
          toast.error("Payment failed or cancelled. Please try again.");
          setPaymentStep("failed");
          setIsProcessing(false);
        },
        30,
        selectedPkg.price
      );
    } catch (error: any) {
      console.error("Upgrade error:", error);
      toast.error(error.message || "Failed to initiate payment. Please try again.");
      setPaymentStep("failed");
      setIsProcessing(false);
    }
  };

  const icons = [Zap, Crown, Shield];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Loading premium packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-hero px-4 pt-6 pb-12 rounded-b-3xl text-center relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-card/20 flex items-center justify-center hover:bg-card/30 transition-colors">
            <ArrowLeft className="w-4 h-4 text-card" />
          </button>
          <h1 className="font-heading font-bold text-card">Account Upgrade</h1>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-amber-400/20 backdrop-blur-md border border-amber-300/30 flex items-center justify-center mx-auto mb-3 shadow-lg">
          <Crown className="w-8 h-8 text-amber-300 animate-pulse" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Instant M-Pesa Withdrawals Unlocked</span>
        </div>

        <h2 className="font-heading text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">
          Upgrade for Instant Withdrawals
        </h2>
        <p className="text-white/80 text-xs sm:text-sm max-w-sm mx-auto">
          Skip the 5-day verification period. Enjoy immediate withdrawals, higher rewards, and unlimited surveys!
        </p>
      </div>

      {/* Packages Grid */}
      <div className="px-4 -mt-6 space-y-4 max-w-lg mx-auto">
        {packages.map((pkg, idx) => {
          const Icon = icons[idx % icons.length];
          const isPopular = pkg.is_popular;
          const isCurrent = profile?.is_premium && profile?.premium_tier === pkg.name;

          return (
            <div
              key={pkg.id}
              className={`relative bg-card rounded-2xl p-5 border-2 transition-all slide-up shadow-sm hover:shadow-md ${
                isPopular
                  ? "border-amber-500 shadow-amber-500/10 dark:shadow-amber-500/5 ring-1 ring-amber-500/30"
                  : "border-border hover:border-primary/40"
              }`}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Sparkles className="w-3 h-3" /> Most Popular
                </div>
              )}

              <div className="flex items-start gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isPopular ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20" : "bg-primary/10 text-primary"
                }`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-bold text-base text-foreground">{pkg.name}</h3>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                        Active Plan
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-heading text-2xl font-black text-foreground">KSH {pkg.price}</span>
                    <span className="text-xs text-muted-foreground font-medium">/ month</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-5">
                {pkg.features.map((f: string) => {
                  const isInstantFeature = f.toLowerCase().includes("instant");
                  return (
                    <div key={f} className="flex items-start gap-2">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isInstantFeature ? "text-amber-500 font-bold" : "text-emerald-500"}`} />
                      <span className={`text-xs ${isInstantFeature ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                        {f}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => openUpgradeModal(pkg)}
                disabled={isCurrent}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md ${
                  isCurrent
                    ? "bg-secondary text-muted-foreground cursor-not-allowed border border-border"
                    : isPopular
                    ? "bg-gradient-to-r from-amber-500 via-orange-500 to-purple-600 text-white shadow-orange-500/25 hover:opacity-95 hover:scale-[1.01]"
                    : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/25 hover:opacity-95 hover:scale-[1.01]"
                }`}
              >
                {isCurrent ? (
                  "Current Plan ✓"
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    <span>Upgrade to {pkg.name} — KSH {pkg.price}</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Interactive Payment Modal */}
      {selectedPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/75 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card rounded-3xl w-full max-w-md shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            
            {/* Modal Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Crown className="w-6 h-6 text-amber-200" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-lg leading-tight">
                      Upgrade to {selectedPkg.name}
                    </h3>
                    <p className="text-white/80 text-xs font-medium">
                      KSH {selectedPkg.price} • Instant M-Pesa Withdrawal
                    </p>
                  </div>
                </div>
                {!isProcessing && (
                  <button
                    onClick={() => setSelectedPkg(null)}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              
              {/* Step 1: Phone Input */}
              {paymentStep === "phone" && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <div className="w-14 h-14 rounded-2xl mx-auto mb-2 flex items-center justify-center bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <Smartphone className="w-7 h-7" />
                    </div>
                    <h4 className="font-heading font-bold text-base">Enter M-Pesa Phone Number</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      You will receive an STK Push prompt to enter your M-Pesa PIN
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                      M-Pesa Phone Number
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="07XX XXX XXX or 254..."
                        className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-secondary border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Supported: Safaricom M-Pesa (e.g. 0712345678, 0112345678, 254712345678)
                    </p>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-secondary/70 rounded-xl p-3 border border-border text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Selected Plan:</span>
                      <span className="font-bold text-foreground">{selectedPkg.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">KSH {selectedPkg.price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Withdrawals:</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">Instant (No 5-day hold)</span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPkg(null)}
                      className="flex-1 py-3.5 rounded-xl border border-border text-sm font-semibold hover:bg-secondary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSendSTK}
                      disabled={phone.replace(/\D/g, "").length < 9}
                      className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Smartphone className="w-4 h-4" />
                      Pay KSH {selectedPkg.price}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Processing */}
              {paymentStep === "processing" && (
                <div className="text-center py-6 space-y-4">
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border-2 border-amber-500/40">
                      <Smartphone className="w-10 h-10 text-amber-500 animate-bounce" />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-heading font-bold text-lg mb-1">STK Push Sent!</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">
                      Please check your phone (<strong>{phone}</strong>) and enter your M-Pesa PIN to complete the upgrade.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-amber-500 pt-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-bounce" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "0.15s" }} />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "0.3s" }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Waiting for M-Pesa confirmation...</p>
                </div>
              )}

              {/* Step 3: Success */}
              {paymentStep === "success" && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 animate-in zoom-in duration-300">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </div>

                  <div>
                    <h4 className="font-heading font-bold text-xl text-emerald-600 dark:text-emerald-400 mb-1">
                      Upgrade Successful! 🎉
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Your account is now upgraded to <strong className="text-foreground">{selectedPkg.name}</strong>.
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    <Sparkles className="w-4 h-4" />
                    <span>Instant Withdrawals Now Active!</span>
                  </div>
                </div>
              )}

              {/* Step 4: Failed */}
              {paymentStep === "failed" && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center mx-auto text-destructive">
                    <AlertCircle className="w-8 h-8" />
                  </div>

                  <div>
                    <h4 className="font-heading font-bold text-lg mb-1">Payment Failed or Cancelled</h4>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      We did not receive confirmation for the M-Pesa payment. Please verify your phone number and PIN, then try again.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setSelectedPkg(null)}
                      className="flex-1 py-3 rounded-xl border border-border text-xs font-semibold hover:bg-secondary transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => setPaymentStep("phone")}
                      className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-md shadow-orange-500/20 hover:opacity-90 transition-all"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 glass-strong border-t border-border z-40">
        <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
          <Link to="/dashboard" className="flex flex-col items-center gap-0.5 py-1 px-3 text-muted-foreground hover:text-foreground">
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link to="/dashboard" className="flex flex-col items-center gap-0.5 py-1 px-3 text-muted-foreground hover:text-foreground">
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] font-medium">Categories</span>
          </Link>
          <Link to="/wallet" className="flex flex-col items-center gap-0.5 py-1 px-3 text-muted-foreground hover:text-foreground">
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] font-medium">Wallet</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center gap-0.5 py-1 px-3 text-muted-foreground hover:text-foreground">
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default PremiumPage;

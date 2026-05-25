import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Check, Sparkles, Zap, Shield, Home, LayoutGrid, Wallet, User, Loader2, Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { MpesaService } from "@/lib/mpesa";

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

const PremiumPage = () => {
  const navigate = useNavigate();
  const { profile, user, refreshProfile } = useAuth();
  const [packages, setPackages] = useState<PremiumPackage[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('premium_packages')
        .select('*')
        .order('price');
      
      if (data) {
        setPackages(data);
      }
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (pkgId: string) => {
    if (!user) return;
    
    const pkg = packages.find(p => p.id === pkgId);
    if (!pkg) return;

    setIsProcessing(true);
    
    try {
      // Initiate STK push (Hashback/Hashpay)
      const result = await MpesaService.initiateSTKPush(
        profile?.phone || '',
        pkg.price,
        `UPG-${Date.now()}`,
        `Upgrade to ${pkg.name}`,
        user.id,
        'upgrade'
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to initiate payment');
      }

      // Poll for payment status
      MpesaService.pollPaymentStatus(
        result.checkoutRequestId!,
        async () => {
          // Payment successful - upgrade account
          console.log('Upgrade payment successful');
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              is_premium: true, 
              premium_tier: pkg.name,
              is_active: true 
            })
            .eq('id', user.id);

          if (updateError) {
            console.error('Error upgrading account:', updateError);
            toast.error('Payment successful but upgrade failed. Contact support.');
            setIsProcessing(false);
            return;
          }

          await supabase.from('transactions').insert({
            user_id: user.id,
            type: 'upgrade',
            description: `Upgraded to ${pkg.name}`,
            amount: -pkg.price,
            status: 'completed',
          });

          await refreshProfile();
          
          setShowSuccess(true);
          toast.success(`Successfully upgraded to ${pkg.name}!`);
          setTimeout(() => setShowSuccess(false), 3000);
          setIsProcessing(false);
        },
        () => {
          // Payment failed
          console.log('Upgrade payment failed');
          toast.error('Payment failed or cancelled. Please try again.');
          setIsProcessing(false);
        },
        30 // 30 attempts = ~2.5 minutes
      );
    } catch (error: any) {
      console.error('Upgrade error:', error);
      toast.error(error.message || 'Upgrade failed. Please try again.');
      setIsProcessing(false);
    }
  };

  const icons = [Zap, Crown, Shield];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-hero px-4 pt-6 pb-12 rounded-b-3xl text-center">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/dashboard")} className="w-9 h-9 rounded-full bg-card/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-card" />
          </button>
          <h1 className="font-heading font-bold text-card">Premium Plans</h1>
        </div>
        <div className="w-16 h-16 rounded-full gradient-accent flex items-center justify-center mx-auto mb-4">
          <Crown className="w-8 h-8 text-accent-foreground" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-card mb-2">Unlock Your Full Earning Potential</h2>
        <p className="text-card/60 text-sm">Get higher paying surveys, daily tasks, and exclusive features.</p>
      </div>

      {/* Packages */}
      <div className="px-4 -mt-6 space-y-4">
        {packages.map((pkg, idx) => {
          const Icon = icons[idx % icons.length];
          const isPopular = pkg.is_popular;
          return (
            <div
              key={pkg.id}
              className={`relative bg-card rounded-2xl p-5 border-2 transition-all slide-up ${
                isPopular ? "border-accent shadow-lg shadow-accent/10" : "border-border"
              }`}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-accent text-accent-foreground text-[10px] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Most Popular
                </div>
              )}

              <div className="flex items-start gap-3 mb-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isPopular ? "gradient-accent" : "bg-primary/10"}`}>
                  <Icon className={`w-5 h-5 ${isPopular ? "text-accent-foreground" : "text-primary"}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading font-bold">{pkg.name}</h3>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-heading text-2xl font-bold">KSH {pkg.price}</span>
                    <span className="text-xs text-muted-foreground">/month</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-5">
                {pkg.features.map((f: string) => (
                  <div key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleUpgrade(pkg.id)}
                disabled={isProcessing || (profile?.is_premium && profile?.premium_tier === pkg.name)}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  isPopular
                    ? "gradient-accent text-accent-foreground shadow-lg shadow-accent/20"
                    : "gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
                } hover:opacity-90 disabled:opacity-50`}
              >
                {isProcessing && selectedPkg === pkg.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : profile?.is_premium && profile?.premium_tier === pkg.name ? (
                  "Current Plan ✓"
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    Pay with M-Pesa
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 left-4 right-4 z-50 slide-up">
          <div className="bg-primary text-primary-foreground rounded-2xl p-4 shadow-xl flex items-center gap-3">
            <Crown className="w-5 h-5" />
            <span className="font-semibold text-sm">Premium activated successfully! 🎉</span>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 glass-strong border-t border-border z-50">
        <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
          <Link to="/dashboard" className="flex flex-col items-center gap-0.5 py-1 px-3 text-muted-foreground">
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link to="/dashboard" className="flex flex-col items-center gap-0.5 py-1 px-3 text-muted-foreground">
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] font-medium">Categories</span>
          </Link>
          <Link to="/wallet" className="flex flex-col items-center gap-0.5 py-1 px-3 text-muted-foreground">
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] font-medium">Wallet</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center gap-0.5 py-1 px-3 text-muted-foreground">
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default PremiumPage;

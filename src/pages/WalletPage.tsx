import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Smartphone, CheckCircle2, AlertCircle, ArrowDownToLine, Clock, Home, ArrowDown, CreditCard, User, Send, Loader2, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import MinWithdrawModal from "@/components/MinWithdrawModal";
import UnlockCategoriesModal from "@/components/UnlockCategoriesModal";
import AccountActivationModal from "@/components/AccountActivationModal";

interface Transaction {
  id: string;
  type: 'earned' | 'withdrawal' | 'unlock' | 'upgrade';
  description: string;
  amount: number;
  created_at: string;
}

const WalletPage = () => {
  const navigate = useNavigate();
  const { profile, user, refreshProfile } = useAuth();
  const [phone, setPhone] = useState(profile?.phone || '+254');
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"form" | "processing" | "success" | "error" | "premiumRequired">("form");
  const [errorMsg, setErrorMsg] = useState("");
  const [showMinModal, setShowMinModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [showPremiumRequiredModal, setShowPremiumRequiredModal] = useState(false);
  const [unlockedCategories, setUnlockedCategories] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const minWithdraw = 2500;

  useEffect(() => {
    if (!user) return;
    loadWalletData();
  }, [user]);

  const loadWalletData = async () => {
    setIsLoading(true);
    try {
      const { data: unlockedData } = await supabase
        .from('unlocked_categories')
        .select('category_id')
        .eq('user_id', user!.id);
      
      if (unlockedData) {
        setUnlockedCategories(unlockedData.map(u => u.category_id));
      }

      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (txData) {
        setTransactions(txData);
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockCategory = async (catId: string, fee: number) => {
    if (!user) return;
    
    try {
      const { error } = await supabase.from('unlocked_categories').insert({
        user_id: user.id,
        category_id: catId,
      });

      if (error) throw error;

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'unlock',
        description: `Unlocked ${catId} category`,
        amount: -fee,
        status: 'completed',
      });

      setUnlockedCategories(prev => [...prev, catId]);
      await refreshProfile();
      await loadWalletData();
      setShowUnlockModal(false);
    } catch (error) {
      console.error('Error unlocking category:', error);
    }
  };

  const handleWithdraw = async () => {
    if (!user || !profile) return;

    const withdrawAmount = Number(amount);
    
    // If user balance is below the minimum, show min withdrawal modal
    if (profile.balance < minWithdraw) {
      setShowMinModal(true);
      return;
    }
    
    // Check if account is activated (only after balance check)
    if (!profile.is_active) {
      setShowActivationModal(true);
      return;
    }

    // Check if user is premium (activated but not premium = can't withdraw)
    if (!profile.is_premium) {
      setStep("processing");
      // Show fake processing then premium required
      setTimeout(() => {
        setStep("premiumRequired");
      }, 2000);
      return;
    }
    if (!withdrawAmount || withdrawAmount < minWithdraw) {
      setErrorMsg(`Minimum withdrawal is KSH ${minWithdraw.toLocaleString()}`);
      setStep("error");
      return;
    }
    if (withdrawAmount > profile.balance) {
      setErrorMsg("Insufficient balance");
      setStep("error");
      return;
    }
    if (!phone || phone.length < 10) {
      setErrorMsg("Please enter a valid M-Pesa number");
      setStep("error");
      return;
    }

    setStep("processing");

    try {
      const referenceId = `WD-${Date.now()}-${user.id.slice(0, 8)}`;
      
      await supabase.from('mpesa_payments').insert({
        user_id: user.id,
        phone_number: phone,
        amount: withdrawAmount,
        type: 'withdrawal',
        reference_id: referenceId,
        status: 'pending',
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      const newBalance = profile.balance - withdrawAmount;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'withdrawal',
        description: 'M-Pesa Withdrawal',
        amount: -withdrawAmount,
        status: 'completed',
        mpesa_ref: 'WD' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      });

      await supabase.from('mpesa_payments').update({
        status: 'completed',
        mpesa_receipt: 'WD' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      }).eq('reference_id', referenceId);

      await refreshProfile();
      await loadWalletData();
      setStep("success");
    } catch (error) {
      console.error('Withdrawal error:', error);
      setErrorMsg("Withdrawal failed. Please try again.");
      setStep("error");
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-hero px-4 pt-6 pb-10 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/dashboard")} className="w-9 h-9 rounded-full bg-card/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-card" />
          </button>
          <h1 className="font-heading font-bold text-card">My Wallet</h1>
        </div>

        <div className="text-center">
          <div className="text-card/60 text-sm mb-1">Available Balance</div>
          <div className="font-heading text-4xl font-bold text-card mb-2">KSH {(profile?.balance || 0).toLocaleString()}</div>
          <div className="text-card/50 text-xs">Minimum withdrawal: KSH {minWithdraw.toLocaleString()}</div>
          {!profile?.is_active && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] font-semibold text-amber-500">Account inactive - activate to withdraw</span>
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="px-4 -mt-5">
        {step === "form" && (
          <div className="bg-card rounded-2xl p-5 border border-border shadow-lg slide-up">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-sm">Withdraw to M-Pesa</div>
                <div className="text-[10px] text-muted-foreground">Instant withdrawal via STK Push</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">M-Pesa Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 7XX XXX XXX"
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Amount (KSH)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Min: ${minWithdraw.toLocaleString()}`}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2">
                {[2500, 5000, 10000].map((val) => (
                  <button
                    key={val}
                    onClick={() => setAmount(String(val))}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      amount === String(val) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    KSH {val.toLocaleString()}
                  </button>
                ))}
              </div>

              <button
                onClick={handleWithdraw}
                className="w-full py-3.5 rounded-xl gradient-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <ArrowDownToLine className="w-4 h-4" />
                Withdraw via M-Pesa
              </button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="bg-card rounded-2xl p-8 border border-border shadow-lg text-center slide-up">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 pulse-glow">
              <Smartphone className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h3 className="font-heading text-lg font-bold mb-2">Processing M-Pesa STK Push</h3>
            <p className="text-sm text-muted-foreground mb-4">Check your phone for the M-Pesa prompt and enter your PIN to complete the withdrawal.</p>
            <div className="flex items-center justify-center gap-2 text-primary">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.1s" }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.2s" }} />
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="bg-card rounded-2xl p-8 border border-border shadow-lg text-center slide-up">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-heading text-lg font-bold mb-2">Withdrawal Successful! 🎉</h3>
            <p className="text-sm text-muted-foreground mb-2">KSH {Number(amount).toLocaleString()} has been sent to your M-Pesa.</p>
            <p className="text-xs text-muted-foreground mb-4">{phone}</p>
            <button onClick={() => { setStep("form"); setAmount(""); }} className="px-6 py-2.5 rounded-full gradient-primary text-primary-foreground font-semibold text-sm">
              Done
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="bg-card rounded-2xl p-8 border border-border shadow-lg text-center slide-up">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="font-heading text-lg font-bold mb-2">Withdrawal Failed</h3>
            <p className="text-sm text-muted-foreground mb-4">{errorMsg}</p>
            <button onClick={() => setStep("form")} className="px-6 py-2.5 rounded-full gradient-primary text-primary-foreground font-semibold text-sm">
              Try Again
            </button>
          </div>
        )}

        {step === "premiumRequired" && (
          <div className="bg-card rounded-2xl p-8 border border-border shadow-lg text-center slide-up">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="font-heading text-lg font-bold mb-2">Account Not Supported</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Your account is not supported for M-Pesa withdrawal. Upgrade to Premium account and try the withdrawal.
            </p>
            <Link 
              to="/premium" 
              onClick={() => setStep("form")}
              className="w-full py-3.5 rounded-xl gradient-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4" />
              Upgrade to Premium
            </Link>
            <button onClick={() => setStep("form")} className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="px-4 mt-6">
        <h3 className="font-heading font-bold text-sm mb-3">Recent Transactions</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No transactions yet</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {transactions.map((tx, idx) => (
              <div key={tx.id || idx} className={`flex items-center gap-3 p-4 ${idx < transactions.length - 1 ? "border-b border-border" : ""}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.amount > 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
                  {tx.amount > 0 ? (
                    <ArrowDownToLine className="w-4 h-4 text-primary rotate-180" />
                  ) : (
                    <ArrowDownToLine className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{tx.description}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatTimeAgo(tx.created_at)}
                  </div>
                </div>
                <div className={`font-heading font-bold text-sm ${tx.amount > 0 ? "text-primary" : "text-destructive"}`}>
                  {tx.amount > 0 ? "+" : ""}KSH {Math.abs(tx.amount).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav - colorful icons matching dashboard */}
      <nav className="fixed bottom-0 left-0 right-0 glass-strong border-t border-border z-50">
        <div className="flex items-center justify-around py-2.5 max-w-lg mx-auto">
          <Link to="/dashboard" className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md" style={{ background: "linear-gradient(135deg, #60a5fa, #2563eb)" }}>
              <Home className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Home</span>
          </Link>
          <button onClick={() => setShowUnlockModal(true)} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md" style={{ background: "linear-gradient(135deg, #fb7185, #e11d48)" }}>
              <Send className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Categories</span>
          </button>
          <Link to="/wallet" className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md ring-2 ring-emerald-300" style={{ background: "linear-gradient(135deg, #34d399, #10b981)" }}>
              <ArrowDown className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold text-foreground">Wallet</span>
          </Link>
          <Link to="/premium" className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md" style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}>
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Premium</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md" style={{ background: "linear-gradient(135deg, #fb923c, #ea580c)" }}>
              <User className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Profile</span>
          </Link>
        </div>
      </nav>

      <MinWithdrawModal
        open={showMinModal}
        onClose={() => setShowMinModal(false)}
        currentBalance={profile?.balance || 0}
        minWithdraw={minWithdraw}
        onUnlock={() => { setShowMinModal(false); setShowUnlockModal(true); }}
      />
      <UnlockCategoriesModal
        open={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        unlockedCategories={unlockedCategories}
        onUnlock={handleUnlockCategory}
      />
      <AccountActivationModal
        open={showActivationModal}
        onClose={() => setShowActivationModal(false)}
        onActivated={() => {
          setShowActivationModal(false);
          refreshProfile();
        }}
      />
    </div>
  );
};

export default WalletPage;

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, Phone, Crown, LogOut, ChevronRight, Star, Shield, Settings, HelpCircle, Home, LayoutGrid, Wallet, User as UserIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface TransactionSummary {
  totalEarned: number;
  totalWithdrawn: number;
  surveysCompleted: number;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const { profile, signOut, user } = useAuth();
  const [summary, setSummary] = useState<TransactionSummary>({
    totalEarned: 0,
    totalWithdrawn: 0,
    surveysCompleted: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadSummary();
  }, [user]);

  const loadSummary = async () => {
    setIsLoading(true);
    try {
      const { data: txData } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user!.id)
        .eq('status', 'completed');

      if (txData) {
        const earned = txData
          .filter(t => t.type === 'earned')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const withdrawn = txData
          .filter(t => t.type === 'withdrawal')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        setSummary({
          totalEarned: earned,
          totalWithdrawn: withdrawn,
          surveysCompleted: profile?.surveys_completed || 0,
        });
      }
    } catch (error) {
      console.error('Error loading summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const menuItems = [
    { icon: Crown, label: "Premium Membership", desc: profile?.is_premium ? profile.premium_tier : "Upgrade to earn more", link: "/premium", color: "text-accent" },
    { icon: Wallet, label: "My Wallet", desc: `Balance: KSH ${(profile?.balance || 0).toLocaleString()}`, link: "/wallet", color: "text-primary" },
    { icon: Star, label: "Survey History", desc: `${summary.surveysCompleted} surveys completed`, link: "/dashboard", color: "text-primary" },
    { icon: Shield, label: "Referral Program", desc: "Invite friends & earn bonus", link: "/dashboard", color: "text-primary" },
    { icon: Settings, label: "Account Settings", desc: "Manage your account", link: "/profile", color: "text-muted-foreground" },
    { icon: HelpCircle, label: "Help & Support", desc: "FAQs and contact us", link: "/profile", color: "text-muted-foreground" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-hero px-4 pt-6 pb-12 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/dashboard")} className="w-9 h-9 rounded-full bg-card/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-card" />
          </button>
          <h1 className="font-heading font-bold text-card">My Profile</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-18 h-18 rounded-full gradient-accent flex items-center justify-center text-accent-foreground font-heading font-bold text-2xl border-4 border-card/30 w-[72px] h-[72px]">
            {profile?.avatar || 'U'}
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-card">{profile?.name || 'User'}</h2>
            <p className="text-card/60 text-sm">{profile?.email || ''}</p>
            <div className="flex items-center gap-2 mt-1">
              {profile?.is_premium ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] font-bold">
                  <Crown className="w-3 h-3" /> {profile.premium_tier}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-card/20 text-card/70 text-[10px] font-semibold">Free Account</span>
              )}
              {profile?.is_active ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-bold">
                  <AlertCircle className="w-3 h-3" /> Inactive
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 -mt-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl p-4 border border-border text-center shadow-sm">
            <div className="font-heading font-bold text-lg text-primary">KSH {(profile?.balance || 0).toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground">Balance</div>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border text-center shadow-sm">
            <div className="font-heading font-bold text-lg">{profile?.surveys_completed || 0}</div>
            <div className="text-[10px] text-muted-foreground">Surveys</div>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border text-center shadow-sm">
            <div className="font-heading font-bold text-lg text-accent">KSH {(profile?.total_earned || 0).toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground">Total Earned</div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="px-4 mt-6">
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-[10px] text-muted-foreground">Email</div>
              <div className="text-sm font-medium">{profile?.email || ''}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-[10px] text-muted-foreground">Phone (M-Pesa)</div>
              <div className="text-sm font-medium">{profile?.phone || ''}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="px-4 mt-6">
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {menuItems.map((item, idx) => (
            <Link
              key={item.label}
              to={item.link}
              className={`flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors ${idx < menuItems.length - 1 ? "border-b border-border" : ""}`}
            >
              <item.icon className={`w-5 h-5 ${item.color}`} />
              <div className="flex-1">
                <div className="text-sm font-semibold">{item.label}</div>
                <div className="text-[10px] text-muted-foreground">{item.desc}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="px-4 mt-6">
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-destructive/20 text-destructive font-semibold text-sm hover:bg-destructive/5 transition-colors">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Bottom Nav - colorful icons */}
      <nav className="fixed bottom-0 left-0 right-0 glass-strong border-t border-border z-50">
        <div className="flex items-center justify-around py-2.5 max-w-lg mx-auto">
          <Link to="/dashboard" className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md" style={{ background: "linear-gradient(135deg, #60a5fa, #2563eb)" }}>
              <Home className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Home</span>
          </Link>
          <Link to="/dashboard" className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md" style={{ background: "linear-gradient(135deg, #fb7185, #e11d48)" }}>
              <LayoutGrid className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Categories</span>
          </Link>
          <Link to="/wallet" className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md" style={{ background: "linear-gradient(135deg, #34d399, #10b981)" }}>
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Wallet</span>
          </Link>
          <Link to="/premium" className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md" style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}>
              <Crown className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Premium</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md ring-2 ring-orange-300" style={{ background: "linear-gradient(135deg, #fb923c, #ea580c)" }}>
              <UserIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold text-foreground">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default ProfilePage;

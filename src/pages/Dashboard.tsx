import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, LayoutGrid, User, Wallet, Crown, ChevronRight, TrendingUp, Clock, Star, Lock, Unlock, ArrowDown, ArrowUp, Globe, CreditCard, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import SurveyLimitModal from "@/components/SurveyLimitModal";
import UnlockCategoriesModal from "@/components/UnlockCategoriesModal";
import OutOfTasksModal from "@/components/OutOfTasksModal";
import lifestyleImg from "@/assets/category-lifestyle.jpg";
import techImg from "@/assets/category-tech.jpg";
import healthImg from "@/assets/category-health.jpg";
import financeImg from "@/assets/category-finance.jpg";

const categoryImages: Record<string, string> = {
  lifestyle: lifestyleImg,
  tech: techImg,
  health: healthImg,
  finance: financeImg,
};

interface Category {
  id: string;
  name: string;
  description: string;
  reward: number;
  unlock_fee: number | null;
  is_free: boolean;
  image_url: string;
  gradient: string;
  text_color: string;
  surveys_count: number;
}

interface Survey {
  id: string;
  question: string;
  options: string[];
  reward: number;
  category: string;
  is_active: boolean;
  order_index: number;
}


const Dashboard = () => {
  const navigate = useNavigate();
  const { profile, user, refreshProfile, isLoading: authLoading, isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [unlockedCategories, setUnlockedCategories] = useState<string[]>([]);
  const [completedSurveys, setCompletedSurveys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalDismissed, setLimitModalDismissed] = useState(() => 
    sessionStorage.getItem('limit_modal_dismissed') === '1'
  );
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showOutOfTasks, setShowOutOfTasks] = useState(false);

  // Load data when auth is ready and user is authenticated
  useEffect(() => {
    if (authLoading) return; // Wait for auth to initialize
    
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }
    
    if (!dataLoaded) {
      loadDashboardData();
    }
  }, [authLoading, isAuthenticated, user, dataLoaded]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    console.log('Starting loadDashboardData...');
    
    // Safety timeout: ensure loading stops after 8 seconds max
    const safetyTimeout = setTimeout(() => {
      console.log('Dashboard safety timeout: forcing loading false');
      setIsLoading(false);
      setDataLoaded(true);
    }, 8000);
    
    try {
      // Refresh profile to ensure we have latest user data
      console.log('Refreshing profile...');
      await refreshProfile();
      console.log('Profile refreshed');
      
      console.log('Fetching categories...');
      const categoriesPromise = supabase
        .from('categories')
        .select('*')
        .order('is_free', { ascending: false })
        .order('id');
      const { data: categoriesData, error: catError } = await Promise.race([
        categoriesPromise,
        new Promise((_, r) => setTimeout(() => r({ error: { message: 'Timeout' } }), 5000))
      ]) as any;
      
      if (catError) {
        console.error('Categories error:', catError);
      } else {
        console.log('Categories loaded:', categoriesData?.length || 0);
        setCategories(categoriesData || []);
      }

      console.log('Fetching surveys...');
      const surveysPromise = supabase
        .from('surveys')
        .select('*')
        .eq('is_active', true)
        .order('order_index');
      const { data: surveysData, error: survError } = await Promise.race([
        surveysPromise,
        new Promise((_, r) => setTimeout(() => r({ error: { message: 'Timeout' } }), 5000))
      ]) as any;
      
      if (survError) {
        console.error('Surveys error:', survError);
      } else {
        console.log('Surveys loaded:', surveysData?.length || 0);
        setSurveys(surveysData || []);
      }

      console.log('Fetching unlocked categories for user:', user?.id);
      const unlockedPromise = supabase
        .from('unlocked_categories')
        .select('category_id')
        .eq('user_id', user!.id);
      const { data: unlockedData, error: unlockError } = await Promise.race([
        unlockedPromise,
        new Promise((_, r) => setTimeout(() => r({ error: { message: 'Timeout' } }), 5000))
      ]) as any;
      
      if (unlockError) {
        console.error('Unlocked categories error:', unlockError);
      } else {
        console.log('Unlocked categories loaded:', unlockedData?.length || 0);
        setUnlockedCategories((unlockedData || []).map(u => u.category_id));
      }

      console.log('Fetching completed surveys...');
      const completedPromise = supabase
        .from('user_surveys')
        .select('survey_id')
        .eq('user_id', user!.id)
        .eq('completed', true);
      const { data: completedData, error: compError } = await Promise.race([
        completedPromise,
        new Promise((_, r) => setTimeout(() => r({ error: { message: 'Timeout' } }), 5000))
      ]) as any;
      
      if (compError) {
        console.error('Completed surveys error:', compError);
      } else {
        console.log('Completed surveys loaded:', completedData?.length || 0);
        setCompletedSurveys((completedData || []).map(c => c.survey_id));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      clearTimeout(safetyTimeout);
      setIsLoading(false);
      setDataLoaded(true);
      console.log('Dashboard data loading complete');
    }
  };

  const ranOutOfTasks = categories.length > 0 && categories.every((cat) => {
    const catSurveys = surveys.filter(s => s.category === cat.id);
    const done = completedSurveys.filter(id => catSurveys.some(s => s.id === id)).length;
    return catSurveys.length > 0 && done >= catSurveys.length;
  });

  useEffect(() => {
    if (!ranOutOfTasks) return;
    setShowOutOfTasks(true);
  }, [ranOutOfTasks]);

  const lifestyleSurveys = surveys.filter(s => s.category === 'lifestyle');
  const lifestyleDoneCount = completedSurveys.filter(id =>
    lifestyleSurveys.some(s => s.id === id)
  ).length;
  const lifestyleTasksDone = Math.floor(lifestyleDoneCount / 5);

  // Auto-show limit modal when free user reaches 10 tasks on dashboard
  useEffect(() => {
    if (!profile?.is_premium && lifestyleTasksDone >= 10 && !isLoading && !limitModalDismissed) {
      setShowLimitModal(true);
    }
  }, [profile?.is_premium, lifestyleTasksDone, isLoading, limitModalDismissed]);

  const handleCloseLimitModal = () => {
    setShowLimitModal(false);
    setLimitModalDismissed(true);
    sessionStorage.setItem('limit_modal_dismissed', '1');
  };

  const handleCategoryClick = (catId: string, isFree: boolean) => {
    if (!isFree && !unlockedCategories.includes(catId)) {
      setShowUnlockModal(true);
      return;
    }
    if (!profile?.is_premium && catId === "lifestyle" && lifestyleTasksDone >= 10) {
      setShowLimitModal(true);
      return;
    }
    navigate(`/survey/${catId}`);
  };

  const handleUnlock = async (catId: string, fee: number) => {
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
      setShowUnlockModal(false);
    } catch (error) {
      console.error('Error unlocking category:', error);
    }
  };

  const totalBalance = profile?.balance || 0;
  const surveysToday = Math.min(profile?.surveys_completed || 0, 10);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header strip */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg shadow-primary/30">
              {profile?.avatar || 'U'}
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Welcome back 👋</div>
              <div className="font-semibold text-sm">{profile?.name || 'User'}</div>
            </div>
          </div>
          <Link to="/premium" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-md">
            <Crown className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-bold text-white">{profile?.is_premium ? profile.premium_tier : "Upgrade"}</span>
          </Link>
        </div>

        {/* Balance Card - Deep cosmic gradient */}
        <div className="relative overflow-hidden rounded-3xl p-5 shadow-2xl"
          style={{
            background: "linear-gradient(135deg, #1a1f5c 0%, #2d2f7a 40%, #4a3a8a 100%)",
          }}
        >
          {/* Decorative blurred circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-pink-500/20 blur-3xl" />

          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-[11px] font-semibold tracking-widest uppercase">Account Balance</span>
              <button className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[11px] font-bold shadow-md">
                <Globe className="w-3 h-3" />
                Convert
              </button>
            </div>
            <div className="font-heading text-4xl font-extrabold text-white mb-2 tracking-tight">
              KSH {totalBalance.toLocaleString()}
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm mb-4">
              <TrendingUp className="w-3 h-3 text-emerald-300" />
              <span className="text-[11px] text-white/80 font-medium">+5.2% this month</span>
            </div>

            {/* Action buttons - green / purple */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Link
                to="/wallet"
                className="flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-bold text-sm shadow-lg shadow-emerald-500/30 hover:scale-[1.02] transition-transform"
                style={{ background: "linear-gradient(135deg, #34d399 0%, #10b981 100%)" }}
              >
                <ArrowUp className="w-4 h-4" /> Top Up
              </Link>
              <Link
                to="/wallet"
                className="flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-bold text-sm shadow-lg shadow-purple-500/30 hover:scale-[1.02] transition-transform"
                style={{ background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)" }}
              >
                <ArrowDown className="w-4 h-4" /> Withdraw
              </Link>
            </div>

            {/* Stat tiles - gradient color cards */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl p-3 shadow-md" style={{ background: "linear-gradient(135deg, #34d399, #059669)" }}>
                <div className="text-white/80 text-[9px] font-bold tracking-wider uppercase">Earned</div>
                <div className="font-heading font-extrabold text-white text-sm leading-tight mt-0.5">KSh {(profile?.total_earned || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-2xl p-3 shadow-md" style={{ background: "linear-gradient(135deg, #60a5fa, #2563eb)" }}>
                <div className="text-white/80 text-[9px] font-bold tracking-wider uppercase">Surveys</div>
                <div className="font-heading font-extrabold text-white text-sm leading-tight mt-0.5">{profile?.surveys_completed || 0}</div>
              </div>
              <div className="rounded-2xl p-3 shadow-md" style={{ background: "linear-gradient(135deg, #fb7185, #e11d48)" }}>
                <div className="text-white/80 text-[9px] font-bold tracking-wider uppercase">Today</div>
                <div className="font-heading font-extrabold text-white text-sm leading-tight mt-0.5">{surveysToday}/10</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - colorful */}
      <div className="px-4">
        <div className="grid grid-cols-3 gap-3">
          <Link to="/wallet" className="bg-card rounded-2xl p-4 border border-border text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="w-10 h-10 mx-auto mb-1.5 rounded-full flex items-center justify-center text-white shadow-md" style={{ background: "linear-gradient(135deg, #34d399, #10b981)" }}>
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold">Withdraw</span>
          </Link>
          <Link to="/premium" className="bg-card rounded-2xl p-4 border border-border text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="w-10 h-10 mx-auto mb-1.5 rounded-full flex items-center justify-center text-white shadow-md" style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)" }}>
              <Crown className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold">Upgrade</span>
          </Link>
          <Link to="/profile" className="bg-card rounded-2xl p-4 border border-border text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="w-10 h-10 mx-auto mb-1.5 rounded-full flex items-center justify-center text-white shadow-md" style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}>
              <User className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold">Profile</span>
          </Link>
        </div>
      </div>

      {/* Daily Progress */}
      <div className="px-4 mt-6">
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Daily Progress</span>
            </div>
            <span className="text-xs text-muted-foreground">{surveysToday}/10 Free Surveys</span>
          </div>
          <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(surveysToday / 10) * 100}%`, background: "linear-gradient(90deg, #34d399, #7c3aed)" }} />
          </div>
          {!profile?.is_premium && surveysToday >= 8 && (
            <p className="text-xs text-accent mt-2 font-medium">⚡ Almost at limit! Upgrade to Premium for unlimited surveys.</p>
          )}
        </div>
      </div>

      {/* Survey Categories */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-lg">Survey Categories</h2>
          <span className="text-xs text-primary font-semibold">See All →</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => {
            const isUnlocked = cat.is_free || unlockedCategories.includes(cat.id);
            const catSurveys = surveys.filter(s => s.category === cat.id);
            const surveysDone = completedSurveys.filter(id => catSurveys.some(s => s.id === id)).length;
            const totalSurveys = catSurveys.length || cat.surveys_count;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id, cat.is_free)}
                className="group relative overflow-hidden rounded-2xl h-44 text-left shadow-md hover:shadow-lg transition-all"
              >
                <img src={categoryImages[cat.id]} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute top-3 left-3">
                  {isUnlocked ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow">
                      <Unlock className="w-2.5 h-2.5" /> {cat.is_free ? "Free" : "Open"}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold shadow">
                      <Lock className="w-2.5 h-2.5" /> KSH {cat.unlock_fee}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="text-[10px] text-emerald-300 font-semibold mb-0.5">{surveysDone}/{totalSurveys} Done</div>
                  <div className="font-heading font-bold text-white text-xs mb-0.5">{cat.name}</div>
                  <div className="text-[10px] text-white/70">KSH {cat.reward}+ / survey</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Available Surveys */}
      <div className="px-4 mt-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-lg">Available Surveys</h2>
        </div>
        {surveys.filter(s => s.category === 'lifestyle').slice(0, 4).map((survey) => {
          const isDone = completedSurveys.includes(survey.id);
          return (
            <button
              key={survey.id}
              onClick={() => handleCategoryClick("lifestyle", true)}
              disabled={isDone}
              className={`w-full flex items-center gap-3 p-3 mb-2 bg-card rounded-xl border border-border hover:border-primary/30 transition-all ${isDone ? "opacity-60" : "hover:shadow-md"}`}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ background: isDone ? "linear-gradient(135deg, #94a3b8, #64748b)" : "linear-gradient(135deg, #34d399, #10b981)" }}>
                <Star className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium line-clamp-1">{survey.question}</div>
                <div className="text-[10px] text-muted-foreground">{isDone ? "Completed ✓" : "Lifestyle & Consumer"}</div>
              </div>
              <div className="text-right">
                <div className="font-heading font-bold text-sm text-primary">KSH {survey.reward}</div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Nav - colorful icons */}
      <nav className="fixed bottom-0 left-0 right-0 glass-strong border-t border-border z-50">
        <div className="flex items-center justify-around py-2.5 max-w-lg mx-auto">
          <Link to="/dashboard" className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md" style={{ background: "linear-gradient(135deg, #60a5fa, #2563eb)" }}>
              <Home className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold text-foreground">Home</span>
          </Link>
          <button onClick={() => setShowUnlockModal(true)} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md" style={{ background: "linear-gradient(135deg, #fb7185, #e11d48)" }}>
              <Send className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Categories</span>
          </button>
          <Link to="/wallet" className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md" style={{ background: "linear-gradient(135deg, #34d399, #10b981)" }}>
              <ArrowDown className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Wallet</span>
          </Link>
          <Link to="/premium" className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md" style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}>
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Upgrade</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md" style={{ background: "linear-gradient(135deg, #fb923c, #ea580c)" }}>
              <User className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Profile</span>
          </Link>
        </div>
      </nav>

      <SurveyLimitModal open={showLimitModal} onClose={handleCloseLimitModal} onUnlock={() => { setShowLimitModal(false); setShowUnlockModal(true); }} />
      <UnlockCategoriesModal 
        open={showUnlockModal} 
        onClose={() => setShowUnlockModal(false)} 
        unlockedCategories={unlockedCategories} 
        onUnlock={handleUnlock}
        userId={user?.id}
        userPhone={profile?.phone}
      />
      <OutOfTasksModal
        open={showOutOfTasks}
        onClose={() => setShowOutOfTasks(false)}
        onUnlock={() => { setShowOutOfTasks(false); setShowUnlockModal(true); }}
      />
    </div>
  );
};

export default Dashboard;

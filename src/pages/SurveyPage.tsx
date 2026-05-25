import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Trophy, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Survey {
  id: string;
  question: string;
  options: string[];
  reward: number;
  category: string;
  order_index: number;
}

interface Category {
  id: string;
  name: string;
  reward: number;
}

const QUESTIONS_PER_TASK = 5;
const TASKS_PER_CATEGORY = 10;

const SurveyPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const cat = categoryId || "lifestyle";
  
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [earnedThisSession, setEarnedThisSession] = useState(0);
  const [showTaskComplete, setShowTaskComplete] = useState(false);
  const [showAllComplete, setShowAllComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadSurveyData();
  }, [user, cat]);

  const loadSurveyData = async () => {
    setIsLoading(true);
    try {
      const { data: categoryData } = await supabase
        .from('categories')
        .select('*')
        .eq('id', cat)
        .single();
      
      if (categoryData) {
        setCategory(categoryData);
      }

      const { data: surveysData } = await supabase
        .from('surveys')
        .select('*')
        .eq('category', cat)
        .eq('is_active', true)
        .order('order_index');
      
      if (surveysData) {
        setSurveys(surveysData);
      }

      const { data: completedData } = await supabase
        .from('user_surveys')
        .select('survey_id')
        .eq('user_id', user!.id)
        .eq('category_id', cat)
        .eq('completed', true);
      
      if (completedData) {
        const completed = completedData.map(c => c.survey_id);
        setCompletedIds(completed);
        
        const firstPendingIdx = surveysData?.findIndex(s => !completed.includes(s.id)) || 0;
        setCurrentIdx(firstPendingIdx === -1 ? (surveysData?.length || 0) : firstPendingIdx);
        
        if (completed.length >= (surveysData?.length || 0)) {
          setShowAllComplete(true);
        }
      }
    } catch (error) {
      console.error('Error loading survey data:', error);
      toast.error('Failed to load survey');
    } finally {
      setIsLoading(false);
    }
  };

  const currentSurvey = surveys[currentIdx];
  const totalQuestions = surveys.length;
  const completedInCategory = completedIds.length;
  const tasksDone = Math.floor(completedInCategory / QUESTIONS_PER_TASK);
  const questionInTask = (completedInCategory % QUESTIONS_PER_TASK) + 1;
  const currentTaskNumber = tasksDone + 1;
  const rewardPerTask = category?.reward || 150;

  useEffect(() => {
    if (completedInCategory >= totalQuestions && totalQuestions > 0) {
      setShowAllComplete(true);
    }
  }, [completedInCategory, totalQuestions]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (showAllComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center slide-up">
          <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6 pulse-glow">
            <Trophy className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="font-heading text-2xl font-bold mb-2">Category Complete! 🎉</h2>
          <p className="text-muted-foreground mb-2">You've completed all {TASKS_PER_CATEGORY} surveys in this category.</p>
          <div className="font-heading text-3xl font-bold text-primary mb-6">+ KSH {earnedThisSession.toLocaleString()}</div>
          <button onClick={() => navigate("/dashboard")} className="px-8 py-3 rounded-full gradient-primary text-primary-foreground font-bold hover:opacity-90 transition-all">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (showTaskComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center slide-up">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/40">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="font-heading text-2xl font-bold mb-2">Survey {tasksDone} Complete! 🎉</h2>
          <p className="text-muted-foreground mb-2">You've earned</p>
          <div className="font-heading text-4xl font-extrabold bg-gradient-to-r from-emerald-500 to-purple-600 bg-clip-text text-transparent mb-6">
            + KSH {rewardPerTask}
          </div>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <button
              onClick={() => setShowTaskComplete(false)}
              className="px-8 py-3 rounded-full gradient-primary text-primary-foreground font-bold hover:opacity-90 transition-all"
            >
              Continue to Survey {currentTaskNumber}
            </button>
            <button onClick={() => navigate("/dashboard")} className="px-8 py-3 rounded-full bg-secondary text-foreground font-semibold">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentSurvey) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="font-heading text-xl font-bold mb-2">No surveys available</h2>
          <button onClick={() => navigate("/dashboard")} className="mt-4 px-6 py-2.5 rounded-full gradient-primary text-primary-foreground font-semibold">Back</button>
        </div>
      </div>
    );
  }

  const handleSelect = async (idx: number) => {
    if (answered || !user || !currentSurvey) return;
    setSelectedOption(idx);
    setAnswered(true);

    try {
      const { error: insertError } = await supabase.from('user_surveys').insert({
        user_id: user.id,
        survey_id: currentSurvey.id,
        category_id: cat,
        completed: true,
        earned: 0,
      });

      if (insertError) {
        if (insertError.code !== '23505') throw insertError;
      }

      const newCompleted = [...completedIds, currentSurvey.id];
      setCompletedIds(newCompleted);

      const newCompletedInCategory = newCompleted.length;
      const isTaskBoundary = newCompletedInCategory % QUESTIONS_PER_TASK === 0;

      if (isTaskBoundary && profile) {
        const newBalance = profile.balance + rewardPerTask;
        const newTotalEarned = profile.total_earned + rewardPerTask;
        const newSurveysCompleted = profile.surveys_completed + 1;

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            balance: newBalance,
            total_earned: newTotalEarned,
            surveys_completed: newSurveysCompleted,
          })
          .eq('id', user.id);

        if (updateError) throw updateError;

        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'earned',
          description: `Completed ${category?.name || cat} task`,
          amount: rewardPerTask,
          status: 'completed',
        });

        await refreshProfile();
        setEarnedThisSession(prev => prev + rewardPerTask);
        toast.success(`Earned KSH ${rewardPerTask}!`);
      }

      setTimeout(() => {
        if (newCompletedInCategory >= totalQuestions) {
          setShowAllComplete(true);
          return;
        }
        if (isTaskBoundary) {
          setShowTaskComplete(true);
        }
        setCurrentIdx(prev => prev + 1);
        setSelectedOption(null);
        setAnswered(false);
      }, 900);
    } catch (error) {
      console.error('Error saving answer:', error);
      toast.error('Failed to save answer');
    }
  };

  const taskProgress = (questionInTask / QUESTIONS_PER_TASK) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-hero px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/dashboard")} className="w-9 h-9 rounded-full bg-card/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-card" />
          </button>
          <div className="flex-1">
            <h1 className="font-heading font-bold text-card text-sm capitalize">{cat} Survey {currentTaskNumber}/{TASKS_PER_CATEGORY}</h1>
            <p className="text-card/60 text-xs">Question {questionInTask} of {QUESTIONS_PER_TASK} • Reward: KSH {rewardPerTask} on completion</p>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30">
            <span className="text-xs font-bold text-primary">KSH {rewardPerTask}</span>
          </div>
        </div>
        <div className="w-full h-2 bg-card/20 rounded-full overflow-hidden">
          <div className="h-full bg-card rounded-full transition-all duration-500" style={{ width: `${taskProgress}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="px-4 -mt-4">
        <div className="bg-card rounded-2xl p-6 border border-border shadow-lg slide-up">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">Q{questionInTask}/{QUESTIONS_PER_TASK}</span>
            <span className="text-[10px] text-muted-foreground capitalize">Survey {currentTaskNumber} of {TASKS_PER_CATEGORY}</span>
          </div>
          <h2 className="font-heading text-lg font-bold leading-snug mb-6">{currentSurvey.question}</h2>

          <div className="space-y-3">
            {currentSurvey.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={answered}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 text-left
                  ${selectedOption === idx
                    ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                    : "border-border hover:border-primary/30 bg-secondary/30"
                  }
                  ${answered && selectedOption !== idx ? "opacity-50" : ""}
                `}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${selectedOption === idx ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {answered && selectedOption === idx ? <CheckCircle2 className="w-4 h-4" /> : String.fromCharCode(65 + idx)}
                </div>
                <span className="font-medium text-sm flex-1">{opt}</span>
              </button>
            ))}
          </div>

          {answered && (
            <div className="mt-6 text-center slide-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-primary">Answer recorded</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {questionInTask === QUESTIONS_PER_TASK ? `Crediting KSH ${rewardPerTask}...` : "Loading next question..."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Session Earnings */}
      <div className="px-4 mt-4">
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Session Earnings</span>
            <span className="font-heading font-bold text-primary">KSH {earnedThisSession.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyPage;

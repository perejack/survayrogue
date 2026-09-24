import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Clock, Crown, ShieldCheck, Sparkles, Zap, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";

interface NewlyActivatedWithdrawModalProps {
  open: boolean;
  onClose: () => void;
  activationDate?: string;
}

export default function NewlyActivatedWithdrawModal({
  open,
  onClose,
  activationDate,
}: NewlyActivatedWithdrawModalProps) {
  const navigate = useNavigate();
  const [daysRemaining, setDaysRemaining] = useState(5);
  const [hoursRemaining, setHoursRemaining] = useState(0);
  const [minutesRemaining, setMinutesRemaining] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) return;

    const calculateTime = () => {
      const actTime = activationDate ? new Date(activationDate).getTime() : Date.now();
      const unlockTime = actTime + 5 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const totalMs = 5 * 24 * 60 * 60 * 1000;
      const elapsedMs = Math.max(0, now - actTime);
      const remainingMs = Math.max(0, unlockTime - now);

      const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((remainingMs % (1000 * 60)) / 1000);

      setDaysRemaining(days);
      setHoursRemaining(hours);
      setMinutesRemaining(mins);
      setSecondsRemaining(secs);
      setProgress(Math.min(100, Math.max(8, (elapsedMs / totalMs) * 100)));
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [open, activationDate]);

  if (!open) return null;

  const handleUpgrade = () => {
    onClose();
    navigate("/premium");
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-foreground/75 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-6 duration-300">
        
        {/* Glow Effects */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-purple-600/25 rounded-full blur-3xl pointer-events-none" />

        <div className="relative bg-card rounded-3xl shadow-2xl border border-border overflow-hidden">
          
          {/* Header Gradient */}
          <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-600 to-purple-700 p-6 pb-8 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" />
            
            <div className="relative flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20">
                <ShieldCheck className="w-4 h-4 text-amber-200" />
                <span className="text-[11px] font-bold tracking-wide uppercase">Security Notice</span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="relative text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border-2 border-white/30 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <Clock className="w-9 h-9 text-amber-100 animate-pulse" />
              </div>
              <h3 className="font-heading text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                Account Recently Activated
              </h3>
              <p className="text-white/90 text-xs sm:text-sm font-medium mt-1">
                Newly activated accounts withdrawal is after 5 days
              </p>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-4">
            
            {/* Prominent Notice Banner */}
            <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-foreground space-y-1">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    Security Verification In Progress
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Newly activated accounts require a <strong className="text-foreground">5-day security hold</strong> before standard M-Pesa withdrawals unlock. 
                    Try again in <strong>{daysRemaining > 0 ? `${daysRemaining} days` : "5 days"}</strong> for standard withdrawal, or <strong>upgrade your account for instant withdrawal!</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive 5-Day Countdown Tracker */}
            <div className="bg-secondary/60 rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Countdown to Standard Withdrawal
                </span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  {daysRemaining}d {hoursRemaining}h {minutesRemaining}m {secondsRemaining}s
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-3 bg-secondary rounded-full overflow-hidden mb-3 border border-border/50">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-purple-600 transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Day Markers */}
              <div className="flex justify-between items-center px-1">
                {[
                  { day: "Day 1", label: "Activated" },
                  { day: "Day 2", label: "Review" },
                  { day: "Day 3", label: "Verify" },
                  { day: "Day 4", label: "Finalize" },
                  { day: "Day 5", label: "Ready" }
                ].map((item, idx) => {
                  const isDone = (5 - daysRemaining) > idx;
                  const isCurrent = (5 - daysRemaining) === idx;
                  return (
                    <div key={item.day} className="flex flex-col items-center">
                      <div 
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 transition-all ${
                          isDone 
                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30" 
                            : isCurrent
                            ? "bg-amber-500 text-white ring-4 ring-amber-500/20 animate-pulse"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <span className="text-[9px] font-semibold text-muted-foreground">{item.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Instant Withdrawal vs Wait Comparison */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-secondary/50 border border-border/60">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Standard Plan</span>
                </div>
                <div className="font-bold text-foreground">5-Day Waiting</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Free, unlocks after 5 days</p>
              </div>

              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 mb-1 font-semibold">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Premium Upgrade</span>
                </div>
                <div className="font-bold text-foreground">Instant Withdrawal</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Zero waiting, direct M-Pesa</p>
              </div>
            </div>

            {/* Primary Upgrade CTA Button */}
            <button
              onClick={handleUpgrade}
              className="w-full py-4 px-5 rounded-2xl relative overflow-hidden group font-bold text-sm text-white shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
              style={{ background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #9333ea 100%)" }}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center justify-center gap-2.5">
                <Crown className="w-5 h-5 text-amber-200 animate-bounce" />
                <span className="text-base font-black tracking-wide">
                  Upgrade Account for Instant Withdrawal
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Secondary Action */}
            <button
              onClick={onClose}
              className="w-full py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium text-center"
            >
              Try Again in 5 Days (Wait for Free Unlock)
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}

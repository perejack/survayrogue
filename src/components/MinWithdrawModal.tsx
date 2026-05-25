import { X, AlertCircle, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  currentBalance: number;
  minWithdraw: number;
  onUnlock: () => void;
}

const categories = [
  { name: "Technology & Digital", reward: 150, surveys: 10, fee: 180, gradient: "from-blue-400 to-indigo-600", textColor: "text-blue-600" },
  { name: "Health & Wellness", reward: 200, surveys: 10, fee: 200, gradient: "from-rose-400 to-pink-600", textColor: "text-rose-600" },
  { name: "Finance & Business", reward: 250, surveys: 10, fee: 250, gradient: "from-amber-400 to-orange-600", textColor: "text-amber-600" },
];

const MinWithdrawModal = ({ open, onClose, currentBalance, minWithdraw, onUnlock }: Props) => {
  if (!open) return null;
  const needed = Math.max(0, minWithdraw - currentBalance);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-foreground/60 backdrop-blur-sm fade-in">
      <div className="bg-card rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl border border-border slide-up max-h-[90vh] overflow-y-auto relative">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center z-10">
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h3 className="font-heading text-xl font-bold mb-2">Minimum withdrawal is {minWithdraw.toLocaleString()}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Continue tasking, earn more to withdraw! You need{" "}
            <span className="font-bold text-emerald-600">
              KSH {needed.toLocaleString()} more
            </span>
          </p>
        </div>

        <div className="border-t border-border pt-4 mb-4">
          <h4 className="font-heading font-bold text-sm mb-3 text-center">
            Unlock more categories to earn faster
          </h4>
          <div className="space-y-2.5">
            {categories.map((cat) => (
              <div key={cat.name} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                <div className="flex-1 min-w-0">
                  <div className={`font-heading font-bold text-sm bg-gradient-to-r ${cat.gradient} bg-clip-text text-transparent`}>
                    {cat.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{cat.surveys} Surveys</span> • <span className={`font-bold ${cat.textColor}`}>KSH {cat.reward}</span> each
                  </div>
                  <div className="text-[11px] font-bold">
                    <span className="text-muted-foreground">Potential: </span>
                    <span className={`bg-gradient-to-r ${cat.gradient} bg-clip-text text-transparent`}>
                      KSH {(cat.surveys * cat.reward).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${cat.gradient} text-white text-[11px] font-bold shadow-md`}>
                  KSH {cat.fee}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onUnlock}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-purple-600 text-white font-bold text-sm shadow-lg shadow-purple-500/25 hover:opacity-90 transition-all mb-2"
        >
          <Sparkles className="w-4 h-4" />
          Unlock More Tasks
        </button>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          Close
        </button>
      </div>
    </div>
  );
};

export default MinWithdrawModal;

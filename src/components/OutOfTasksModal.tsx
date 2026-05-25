import { X, AlertCircle, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onUnlock: () => void;
}

const OutOfTasksModal = ({ open, onClose, onUnlock }: Props) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-foreground/60 backdrop-blur-sm fade-in">
      <div className="bg-card rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl border border-border slide-up relative">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-500/30">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h3 className="font-heading text-xl font-extrabold mb-2">You've run out of tasks 🎯</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Unlock more categories to{" "}
            <span className="font-bold bg-gradient-to-r from-emerald-500 to-purple-600 bg-clip-text text-transparent">
              continue earning
            </span>{" "}
            higher rewards.
          </p>
          <button
            onClick={onUnlock}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-purple-600 text-white font-bold text-sm shadow-lg shadow-purple-500/25 hover:opacity-90 transition-all mb-2"
          >
            <Sparkles className="w-4 h-4" />
            Unlock More Tasks
          </button>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OutOfTasksModal;

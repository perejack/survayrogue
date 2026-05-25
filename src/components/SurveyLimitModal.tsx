import { Lock, Sparkles, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onUnlock: () => void;
}

const SurveyLimitModal = ({ open, onClose, onUnlock }: Props) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/60 backdrop-blur-sm fade-in">
      <div className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-border slide-up">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>

        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-accent" />
          </div>
          <h3 className="font-heading text-xl font-bold mb-2">Free Survey Limit Reached</h3>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            You have reached your <strong>10 free survey limit</strong>. Unlock more survey categories to continue earning!
          </p>

          <button
            onClick={onUnlock}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl gradient-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 hover:opacity-90 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Unlock More Surveys
          </button>
        </div>
      </div>
    </div>
  );
};

export default SurveyLimitModal;

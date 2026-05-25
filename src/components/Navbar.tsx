import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, BarChart3 } from "lucide-react";

const Navbar = ({ isApp = false }: { isApp?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="glass-strong sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-heading text-xl font-bold">
            Survey<span className="text-primary">Ke</span>
          </span>
        </Link>

        {!isApp && (
          <>
            <div className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
              <a href="#categories" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Categories</a>
              <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
              <Link to="/dashboard" className="text-sm font-semibold text-foreground hover:text-primary transition-colors">Sign In</Link>
              <Link to="/dashboard" className="px-6 py-2.5 rounded-full gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/25">
                Start Earning →
              </Link>
            </div>

            <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors">
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {isOpen && (
              <div className="absolute top-full left-0 right-0 glass-strong border-t border-border p-4 flex flex-col gap-3 md:hidden slide-up">
                <a href="#how-it-works" className="py-2 text-sm font-medium text-muted-foreground" onClick={() => setIsOpen(false)}>How It Works</a>
                <a href="#categories" className="py-2 text-sm font-medium text-muted-foreground" onClick={() => setIsOpen(false)}>Categories</a>
                <a href="#testimonials" className="py-2 text-sm font-medium text-muted-foreground" onClick={() => setIsOpen(false)}>Testimonials</a>
                <Link to="/dashboard" className="py-2 text-sm font-semibold text-foreground" onClick={() => setIsOpen(false)}>Sign In</Link>
                <Link to="/dashboard" className="mt-2 px-6 py-2.5 rounded-full gradient-primary text-primary-foreground font-semibold text-sm text-center" onClick={() => setIsOpen(false)}>
                  Start Earning →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, Users, Star, Shield, CheckCircle2 } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import catLifestyle from "@/assets/category-lifestyle.jpg";
import catTech from "@/assets/category-tech.jpg";
import catHealth from "@/assets/category-health.jpg";
import catFinance from "@/assets/category-finance.jpg";
import Navbar from "@/components/Navbar";

const stats = [
  { icon: TrendingUp, label: "Survey Categories", value: "4+" },
  { icon: Users, label: "Community", value: "Growing" },
  { icon: Star, label: "Topics Covered", value: "Daily" },
  { icon: Shield, label: "Reward Method", value: "M-Pesa" },
];

const steps = [
  { step: "01", title: "Create a Free Account", desc: "Sign up in seconds — no card required to get started." },
  { step: "02", title: "Pick a Category", desc: "Choose survey topics that match your interests and experience." },
  { step: "03", title: "Share Your Opinion", desc: "Answer short, structured questions designed by researchers." },
  { step: "04", title: "Redeem to M-Pesa", desc: "Eligible rewards can be redeemed to M-Pesa once you reach the payout threshold." },
];

const categories = [
  { name: "Lifestyle & Consumer", desc: "Everyday consumer choices and lifestyle preferences in Kenya.", image: catLifestyle, badge: "Open" },
  { name: "Technology & Digital", desc: "Mobile, internet, apps and digital habits.", image: catTech, badge: "Specialised" },
  { name: "Health & Wellness", desc: "Healthcare access, mental wellness and fitness.", image: catHealth, badge: "Specialised" },
  { name: "Finance & Business", desc: "Personal finance, savings, investment and banking.", image: catFinance, badge: "Specialised" },
];

const faqs = [
  { q: "How does SurveyKe work?", a: "Create a free account, pick categories that interest you, and answer short opinion surveys. Some specialised categories may require a one-time access fee that is shown upfront." },
  { q: "How do I get my rewards?", a: "Eligible rewards are sent to your registered M-Pesa number once you reach the minimum payout threshold and complete standard verification." },
  { q: "Can I really earn money?", a: "Reward eligibility depends on survey availability, your profile match, and completion quality. SurveyKe does not guarantee a fixed income and is not a substitute for employment." },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="Kenyan community sharing opinions through online research" className="w-full h-full object-cover" width={1920} height={1080} />
          <div className="absolute inset-0 bg-foreground/70" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/60 to-transparent" />
        </div>
        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold text-primary">A Kenyan Market Research Community</span>
            </div>
            <h1 className="font-heading text-4xl md:text-6xl font-bold text-card mb-6 leading-tight">
              Share Your Opinion.{" "}
              <span className="text-gradient">Shape What Kenya Buys.</span>
            </h1>
            <p className="text-lg text-card/80 mb-8 max-w-xl">
              SurveyKe connects Kenyans with researchers and brands who want to understand local consumers. Take short opinion surveys on topics you care about and redeem eligible rewards to{" "}
              <span className="text-primary font-semibold">M-Pesa</span>.
            </p>
            <nav aria-label="Primary actions" className="flex flex-wrap gap-4">
              <Link to="/auth" className="group relative px-8 py-3.5 rounded-2xl gradient-primary text-primary-foreground font-bold text-base hover:scale-105 transition-all duration-300 shadow-2xl shadow-primary/40 flex items-center gap-2 overflow-hidden">
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative">Start Earning</span>
                <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/auth" className="group px-8 py-3.5 rounded-2xl bg-card/5 backdrop-blur-xl border border-card/30 text-card font-semibold text-base hover:bg-card/15 hover:border-primary/50 transition-all duration-300">
                Sign In
              </Link>
            </nav>
            <p className="text-xs text-card/50 mt-4 max-w-lg">
              Reward eligibility depends on survey availability and qualification. SurveyKe is not employment and does not guarantee a fixed income.
            </p>
          </div>

          {/* Stats */}
          <ul className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 list-none">
            {stats.map((s, i) => (
              <li
                key={s.label}
                className="group relative rounded-2xl p-5 text-center bg-gradient-to-br from-card/10 to-card/[0.02] backdrop-blur-xl border border-card/20 hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl gradient-primary mx-auto mb-3 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                    <s.icon className="w-5 h-5 text-primary-foreground" aria-hidden="true" />
                  </div>
                  <div className="font-heading font-bold text-2xl text-card mb-0.5">{s.value}</div>
                  <div className="text-[11px] uppercase tracking-wider text-card/60 font-medium">{s.label}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </header>

      <main>
      {/* How it works */}
      <section id="how-it-works" className="py-20 bg-background" aria-labelledby="how-heading">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">How It Works</span>
            <h2 id="how-heading" className="font-heading text-3xl md:text-4xl font-bold mb-3">Four Simple Steps</h2>
            <p className="text-muted-foreground max-w-md mx-auto">A clear, transparent process from sign-up to reward redemption.</p>
          </div>
          <ol className="grid md:grid-cols-4 gap-6 list-none">
            {steps.map((s) => (
              <li key={s.step} className="group bg-card rounded-2xl p-6 border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                <div className="text-5xl font-heading font-bold text-primary/15 group-hover:text-primary/30 transition-colors mb-4">{s.step}</div>
                <h3 className="font-heading font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="py-20 bg-secondary/50" aria-labelledby="cat-heading">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">Survey Categories</span>
            <h2 id="cat-heading" className="font-heading text-3xl md:text-4xl font-bold mb-3">Topics You Can Contribute To</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Choose categories that match your interests. Specialised categories may require a one-time access fee, shown clearly inside the app.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {categories.map((c) => (
              <article key={c.name} className="group relative overflow-hidden rounded-2xl h-64 shadow-lg hover:shadow-xl transition-all duration-300">
                <img src={c.image} alt={`${c.name} survey category illustration`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" width={800} height={600} />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/40 to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.badge === "Open" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
                    {c.badge}
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="font-heading font-bold text-lg text-card mb-1">{c.name}</h3>
                  <p className="text-xs text-card/70">{c.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Why SurveyKe */}
      <section id="why" className="py-20 bg-background" aria-labelledby="why-heading">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">Why SurveyKe</span>
            <h2 id="why-heading" className="font-heading text-3xl md:text-4xl font-bold mb-3">
              Built for <span className="text-gradient">Kenyan Voices</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">A transparent platform that values your time, your privacy, and your opinion.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: "Transparent Fees", desc: "Any access fees for specialised categories are clearly shown before you commit." },
              { icon: CheckCircle2, title: "M-Pesa Redemption", desc: "Eligible rewards are redeemed to your registered M-Pesa number after verification." },
              { icon: Star, title: "Local Topics", desc: "Surveys are designed around real Kenyan products, services and lifestyle." },
            ].map((f) => (
              <div key={f.title} className="bg-card rounded-2xl p-6 border border-border">
                <f.icon className="w-8 h-8 text-primary mb-4" aria-hidden="true" />
                <h3 className="font-heading font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-secondary/50" aria-labelledby="faq-heading">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">FAQ</span>
            <h2 id="faq-heading" className="font-heading text-3xl md:text-4xl font-bold mb-3">Common Questions</h2>
          </div>
          <dl className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="bg-card rounded-2xl p-6 border border-border">
                <dt className="font-heading font-bold text-base mb-2">{f.q}</dt>
                <dd className="text-sm text-muted-foreground leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 gradient-hero" aria-labelledby="cta-heading">
        <div className="container mx-auto px-4 text-center">
          <h2 id="cta-heading" className="font-heading text-3xl md:text-5xl font-bold text-card mb-4">Ready to Share Your Opinion?</h2>
          <p className="text-card/70 text-lg mb-8 max-w-lg mx-auto">
            Create a free SurveyKe account and start contributing to research that shapes Kenyan products and services.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/auth" className="group px-10 py-4 rounded-full bg-card text-foreground font-bold text-base hover:bg-card/90 transition-all shadow-xl flex items-center gap-2">
              Create Free Account <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/auth" className="px-10 py-4 rounded-full border-2 border-card/30 text-card font-semibold text-base hover:bg-card/10 transition-all">
              Sign In
            </Link>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="py-10 bg-foreground">
        <div className="container mx-auto px-4 text-center space-y-3">
          <p className="text-card/60 text-sm">© {new Date().getFullYear()} SurveyKe. A Kenyan market research community.</p>
          <p className="text-card/40 text-xs max-w-2xl mx-auto">
            SurveyKe is an opinion research platform. Reward eligibility depends on survey availability and qualification. The platform is not employment and does not guarantee a fixed income. M-Pesa is a trademark of Safaricom PLC and is referenced for redemption purposes only.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

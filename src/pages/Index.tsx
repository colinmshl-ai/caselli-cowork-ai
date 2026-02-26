import { Link } from "react-router-dom";

const features = [
  {
    title: "Deal Intelligence",
    description: "Tracks every deadline and flags risks before they become problems.",
  },
  {
    title: "Content Engine",
    description: "Listing descriptions, social posts, and emails written in your voice.",
  },
  {
    title: "Smart Communications",
    description: "Follow-ups and check-ins that sound like you wrote them.",
  },
];

const plans = [
  {
    name: "Solo Agent",
    price: "$149",
    description: "For individual agents. Full AI coworker access, deal tracking, content generation.",
  },
  {
    name: "Top Producer",
    price: "$299",
    description: "Everything in Solo plus unlimited deals, background automations, priority support.",
  },
  {
    name: "Team",
    price: "$499",
    description: "For teams up to 5. Shared deals, team activity feed, custom workflows.",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link to="/" className="text-base font-semibold text-foreground tracking-tight">
            Caselli
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Login
            </Link>
            <Link
              to="/signup"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-40 pb-20 md:pt-48 md:pb-28 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl md:leading-tight">
          Your AI Real Estate Coworker
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
          Caselli handles your follow-ups, content, deals, and client communications — so you can focus on closing.
        </p>
        <Link
          to="/signup"
          className="mt-8 inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Get Started
        </Link>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-4xl px-6 py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-3 md:gap-10">
          {features.map((f) => (
            <div key={f.title}>
              <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-4xl px-6 py-16 md:py-24">
        <div className="grid gap-14 md:grid-cols-3 md:gap-10">
          {plans.map((p) => (
            <div key={p.name}>
              <h3 className="text-base font-semibold text-foreground">{p.name}</h3>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {p.price}<span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
              <Link
                to="/signup"
                className="mt-4 inline-block text-sm font-medium text-primary hover:opacity-70 transition-opacity"
              >
                Start Free Trial →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 text-center">
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <span>About</span>
          <span>·</span>
          <span>Privacy</span>
          <span>·</span>
          <span>Terms</span>
          <span>·</span>
          <span>Contact</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;

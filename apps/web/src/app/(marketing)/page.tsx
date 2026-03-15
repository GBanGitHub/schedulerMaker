import Link from "next/link";
import { Blocks, LayoutTemplate, CalendarClock, Sparkles, Calendar, GripVertical, Link2 } from "lucide-react";

const steps = [
  {
    num: "01",
    label: "Create Blocks",
    desc: "Define reusable activity chunks — Gym 1h, Study 2h, Deep Work 90m.",
    icon: Blocks,
  },
  {
    num: "02",
    label: "Build Templates",
    desc: "Arrange blocks into day structures you can reuse and remix.",
    icon: LayoutTemplate,
  },
  {
    num: "03",
    label: "Add Givens",
    desc: "Mark immovable commitments — shifts, classes, appointments.",
    icon: CalendarClock,
  },
  {
    num: "04",
    label: "Generate",
    desc: "The engine fills your remaining time around givens automatically.",
    icon: Sparkles,
  },
];

const features = [
  {
    label: "Smart Scheduling Engine",
    desc: "Greedy slot-fill on 15-minute intervals respects your constraints.",
    icon: Sparkles,
  },
  {
    label: "Google Calendar Sync",
    desc: "Optionally link Google to import events and publish schedules.",
    icon: Calendar,
  },
  {
    label: "Drag & Drop Calendar",
    desc: "Place givens on dates visually, rearrange with a click.",
    icon: GripVertical,
  },
  {
    label: "iCal Import",
    desc: "Paste any .ics feed URL to pull in external commitments.",
    icon: Link2,
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Scan lines */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: "linear-gradient(to bottom, var(--color-primary) 1px, transparent 1px)",
          backgroundSize: "100% 32px",
        }}
      />

      {/* ── Nav ── */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="font-display text-3xl tracking-wider text-primary text-glow">
            SHIFT
          </span>
          <span className="font-mono text-[9px] text-subtle uppercase tracking-[0.35em] hidden sm:inline">
            Schedule Maker
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="font-mono text-xs text-foreground bg-primary/10 hover:bg-primary/20 border border-primary/30 px-4 py-2 rounded-lg transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 text-center px-6 pt-20 pb-24 max-w-3xl mx-auto anim-fade-up">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, rgba(45,106,79,0.08) 0%, transparent 70%)",
          }}
        />
        <h1
          className="font-display text-[6rem] sm:text-[8rem] leading-none tracking-widest text-primary"
          style={{
            textShadow: "0 0 40px rgba(45,106,79,0.4), 0 0 80px rgba(45,106,79,0.15)",
          }}
        >
          SHIFT
        </h1>
        <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.5em] mt-2 mb-8">
          Precision Schedule Maker
        </p>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-10">
          Build your day from reusable blocks. Mark your givens. Let the engine
          fill the gaps — automatically.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-primary text-background font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            Get Started
            <span className="font-mono text-xs">→</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-lg border border-border-strong text-foreground font-medium text-sm hover:bg-card-high transition-colors"
          >
            Log In
          </Link>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="relative z-10 px-6 pb-20 max-w-4xl mx-auto">
        <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.4em] text-center mb-8 anim-fade-up delay-1">
          How It Works
        </p>
        <div
          className="grid sm:grid-cols-2 lg:grid-cols-4 border border-border rounded-xl overflow-hidden anim-fade-up delay-2"
          style={{ gap: "1px", backgroundColor: "var(--color-border)" }}
        >
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="bg-card p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-subtle">{step.num}</span>
                  <Icon className="h-4 w-4 text-primary opacity-60" />
                </div>
                <p className="text-sm font-medium text-foreground">{step.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 px-6 pb-20 max-w-4xl mx-auto">
        <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.4em] text-center mb-8 anim-fade-up delay-1">
          Features
        </p>
        <div className="grid sm:grid-cols-2 gap-4 anim-fade-up delay-2">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.label}
                className="border border-border rounded-xl p-5 bg-card hover:bg-card-high transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">{f.label}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="relative z-10 text-center px-6 pb-20">
        <div className="border-t border-border max-w-md mx-auto pt-12">
          <p className="text-sm text-muted-foreground mb-5">
            Ready to take control of your schedule?
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-primary text-background font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            Create Your Account
            <span className="font-mono text-xs">→</span>
          </Link>
          <p className="font-mono text-[10px] text-subtle mt-8 tracking-widest uppercase">
            Shift · {new Date().getFullYear()}
          </p>
        </div>
      </section>
    </div>
  );
}

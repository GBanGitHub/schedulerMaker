import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@schedule-maker/database";
import { Blocks, LayoutTemplate, CalendarClock, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [blockCount, templateCount, givenCount, scheduleCount] = await Promise.all([
    prisma.block.count({ where: { userId: user.id } }),
    prisma.template.count({ where: { userId: user.id } }),
    prisma.given.count({ where: { userId: user.id } }),
    prisma.schedule.count({ where: { userId: user.id } }),
  ]);

  const stats = [
    { label: "Blocks",    count: blockCount,    href: "/blocks",    icon: Blocks,          accent: "text-primary" },
    { label: "Templates", count: templateCount, href: "/templates", icon: LayoutTemplate,   accent: "text-success" },
    { label: "Givens",    count: givenCount,    href: "/givens",    icon: CalendarClock,   accent: "text-warning" },
    { label: "Schedules", count: scheduleCount, href: "/calendar",  icon: Calendar,        accent: "text-destructive" },
  ];

  const steps = [
    {
      href: "/blocks",
      label: "Create Blocks",
      desc: "Define reusable activity chunks — Gym 1h, Study 2h, Deep Work 90m",
    },
    {
      href: "/templates",
      label: "Build Templates",
      desc: "Arrange blocks into day structures you can reuse and remix",
    },
    {
      href: "/givens",
      label: "Add Givens",
      desc: "Create reusable shift pieces — Day Shift, Night Shift, Church",
    },
    {
      href: "/calendar",
      label: "Place & Generate",
      desc: "Drag givens onto dates, then generate a schedule around them",
    },
  ];

  return (
    <div className="max-w-3xl">

      {/* Header */}
      <div className="mb-10 anim-fade-up">
        <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.4em] mb-3">
          Control Panel
        </p>
        <h1 className="font-display text-5xl text-foreground tracking-widest">
          DASHBOARD
        </h1>
      </div>

      {/* Stats — tiled row with gap-px trick for seamless grid lines */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 border border-border rounded-xl overflow-hidden mb-8 anim-fade-up delay-1"
        style={{ gap: "1px", backgroundColor: "var(--color-border)" }}
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-card hover:bg-card-high transition-colors duration-150 p-5 group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[9px] text-subtle uppercase tracking-[0.35em]">
                  {stat.label}
                </span>
                <Icon
                  className={`h-3.5 w-3.5 ${stat.accent} opacity-50 group-hover:opacity-100 transition-opacity`}
                />
              </div>
              <div className={`font-mono text-4xl font-medium ${stat.accent} tabular`}>
                {String(stat.count).padStart(2, "0")}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quickstart guide */}
      <div className="border border-border rounded-xl overflow-hidden anim-fade-up delay-2">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <p className="font-mono text-[9px] text-subtle uppercase tracking-[0.4em]">
            Getting Started
          </p>
          <div className="w-2 h-2 rounded-full bg-success opacity-60" />
        </div>

        <div>
          {steps.map((step, i) => (
            <Link
              key={i}
              href={step.href}
              className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0 hover:bg-card-high transition-colors duration-150 group"
            >
              <span className="font-mono text-xs text-subtle w-6 flex-shrink-0 tabular">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {step.desc}
                </p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-subtle group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Blocks,
  LayoutTemplate,
  CalendarClock,
  Calendar,
  BarChart2,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/",           label: "Dashboard", icon: LayoutDashboard },
  { href: "/blocks",     label: "Blocks",    icon: Blocks },
  { href: "/templates",  label: "Templates", icon: LayoutTemplate },
  { href: "/givens",     label: "Givens",    icon: CalendarClock },
  { href: "/calendar",   label: "Calendar",  icon: Calendar },
  { href: "/analytics",  label: "Analytics", icon: BarChart2 },
  { href: "/settings",   label: "Settings",  icon: Settings },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="group/nav w-[52px] hover:w-[200px] border-r border-border bg-card h-screen sticky top-0 flex flex-col flex-shrink-0 transition-[width] duration-200 ease-in-out overflow-hidden z-40">

      {/* Brand */}
      <div className="px-3.5 py-5 border-b border-border flex items-center gap-3 flex-shrink-0">
        <div
          className="font-display text-[1.6rem] leading-none tracking-wider text-primary text-glow select-none flex-shrink-0 w-[26px] text-center"
        >
          S
        </div>
        <div className="overflow-hidden opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150 whitespace-nowrap">
          <div className="font-display text-[1.35rem] leading-none tracking-wider text-primary text-glow select-none">
            SHIFT
          </div>
          <p className="font-mono text-[8px] text-subtle uppercase tracking-[0.35em] mt-0.5">
            Schedule Maker
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 border-l-2 whitespace-nowrap",
                isActive
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:bg-card-high hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-subtle hover:text-muted-foreground"
                )}
              />
              <span className="tracking-wide opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150 overflow-hidden">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="px-3 py-1 flex-shrink-0">
        <div className="border-t border-border" />
      </div>

      {/* User + Sign Out */}
      <div className="px-2 pb-4 space-y-1 flex-shrink-0">
        {session?.user && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg overflow-hidden">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt=""
                className="w-6 h-6 rounded-full ring-1 ring-border flex-shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-card-high border border-border flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0 opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150 whitespace-nowrap overflow-hidden">
              <p className="text-xs font-medium text-foreground truncate leading-none">
                {session.user.name}
              </p>
              <p className="font-mono text-[10px] text-subtle truncate mt-0.5">
                {session.user.email}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
          title="Sign out"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-subtle hover:text-muted-foreground hover:bg-card-high transition-all duration-150 border-l-2 border-transparent whitespace-nowrap"
        >
          <LogOut className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="tracking-wide opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150 overflow-hidden">
            Sign out
          </span>
        </button>
      </div>
    </aside>
  );
}

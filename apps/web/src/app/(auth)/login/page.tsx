"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center overflow-hidden">

      {/* Horizontal scan lines — atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(to bottom, #38BDF8 1px, transparent 1px)",
          backgroundSize: "100% 32px",
        }}
      />

      {/* Radial glow behind brand */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(56,189,248,0.07) 0%, transparent 70%)",
        }}
      />

      {/* Corner marks — technical frame */}
      {[
        "top-6 left-6 border-t border-l",
        "top-6 right-6 border-t border-r",
        "bottom-6 left-6 border-b border-l",
        "bottom-6 right-6 border-b border-r",
      ].map((classes, i) => (
        <div
          key={i}
          className={`absolute w-8 h-8 border-border-strong opacity-40 ${classes}`}
        />
      ))}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-6">

        {/* Brand mark */}
        <div className="text-center mb-12 anim-fade-up">
          <h1
            className="font-display text-[7rem] leading-none tracking-widest text-primary"
            style={{
              textShadow:
                "0 0 40px rgba(56,189,248,0.45), 0 0 80px rgba(56,189,248,0.2), 0 0 120px rgba(56,189,248,0.08)",
            }}
          >
            SHIFT
          </h1>
          <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.5em] mt-1">
            Precision Schedule Maker
          </p>
        </div>

        {/* Login card */}
        <div className="w-full anim-fade-up delay-2">
          <div className="border border-border bg-card rounded-xl overflow-hidden">

            {/* Card header strip */}
            <div className="px-6 py-4 border-b border-border">
              <p className="font-mono text-[9px] text-subtle uppercase tracking-[0.4em]">
                Authentication Required
              </p>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sign in with your Google account to access your shifts and schedules.
              </p>

              <button
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="w-full flex items-center justify-center gap-3 h-11 px-5 rounded-lg bg-card-high border border-border-strong text-foreground text-sm font-medium hover:bg-card-hover hover:border-primary/40 hover:text-primary transition-all duration-200 group"
              >
                {/* Google icon */}
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
                <span className="ml-auto text-subtle group-hover:text-primary transition-colors font-mono text-xs">
                  →
                </span>
              </button>

              <p className="font-mono text-[10px] text-subtle text-center leading-relaxed">
                Google Calendar access is requested for schedule sync
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="font-mono text-[10px] text-subtle mt-10 tracking-widest uppercase anim-fade-up delay-4">
          Shift · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

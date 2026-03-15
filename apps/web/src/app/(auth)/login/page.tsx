"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    callbackError === "CredentialsSignin" ? "Invalid email or password" : ""
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/home",
        redirect: true,
      });

      if (result?.error) {
        setError("Invalid email or password");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center overflow-hidden">
      {/* Scan lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(to bottom, var(--color-primary) 1px, transparent 1px)",
          backgroundSize: "100% 32px",
        }}
      />

      {/* Radial glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(45,106,79,0.07) 0%, transparent 70%)",
        }}
      />

      {/* Corner marks */}
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

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-6">
        {/* Brand */}
        <div className="text-center mb-12 anim-fade-up">
          <Link href="/">
            <h1
              className="font-display text-[7rem] leading-none tracking-widest text-primary"
              style={{
                textShadow: "0 0 40px rgba(45,106,79,0.4), 0 0 80px rgba(45,106,79,0.15)",
              }}
            >
              SHIFT
            </h1>
          </Link>
          <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.5em] mt-1">
            Precision Schedule Maker
          </p>
        </div>

        {/* Login card */}
        <div className="w-full anim-fade-up delay-2">
          <div className="border border-border bg-card rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <p className="font-mono text-[9px] text-subtle uppercase tracking-[0.4em]">
                Authentication Required
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block font-mono text-[10px] text-subtle uppercase tracking-[0.3em] mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-lg bg-card-high border border-border-strong text-foreground text-sm placeholder:text-subtle focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block font-mono text-[10px] text-subtle uppercase tracking-[0.3em] mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-lg bg-card-high border border-border-strong text-foreground text-sm placeholder:text-subtle focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
                  placeholder="Your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-primary text-background font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>

              <p className="text-sm text-muted-foreground text-center">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </form>
          </div>
        </div>

        <p className="font-mono text-[10px] text-subtle mt-10 tracking-widest uppercase anim-fade-up delay-4">
          Shift · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

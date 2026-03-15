"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Registration failed");
        return;
      }

      // Auto-login after successful registration
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/home",
        redirect: true,
      });

      if (result?.error) {
        setError("Account created but login failed. Please log in manually.");
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
        <div className="text-center mb-10 anim-fade-up">
          <Link href="/">
            <h1
              className="font-display text-[5rem] leading-none tracking-widest text-primary"
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

        {/* Signup card */}
        <div className="w-full anim-fade-up delay-2">
          <div className="border border-border bg-card rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <p className="font-mono text-[9px] text-subtle uppercase tracking-[0.4em]">
                Create Account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="name" className="block font-mono text-[10px] text-subtle uppercase tracking-[0.3em] mb-1.5">
                  Name <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-card-high border border-border-strong text-foreground text-sm placeholder:text-subtle focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
                  placeholder="Your name"
                />
              </div>

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
                  minLength={8}
                  className="w-full h-10 px-3 rounded-lg bg-card-high border border-border-strong text-foreground text-sm placeholder:text-subtle focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
                  placeholder="Min 8 characters"
                />
              </div>

              <div>
                <label htmlFor="confirm" className="block font-mono text-[10px] text-subtle uppercase tracking-[0.3em] mb-1.5">
                  Confirm Password
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  className="w-full h-10 px-3 rounded-lg bg-card-high border border-border-strong text-foreground text-sm placeholder:text-subtle focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
                  placeholder="Re-enter password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-primary text-background font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Creating account…" : "Sign Up"}
              </button>

              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Log in
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

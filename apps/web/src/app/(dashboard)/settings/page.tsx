"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserSettings {
  timezone: string;
  dayStartTime: string;
  dayEndTime: string;
  defaultBreakMins: number;
  hasGoogleCalendar?: boolean;
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const googleStatus = searchParams.get("google");

  const [settings, setSettings] = useState<UserSettings>({
    timezone: "America/New_York",
    dayStartTime: "07:00",
    dayEndTime: "22:00",
    defaultBreakMins: 15,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setSettings(data);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timezone: settings.timezone,
          dayStartTime: settings.dayStartTime,
          dayEndTime: settings.dayEndTime,
          defaultBreakMins: settings.defaultBreakMins,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings((s) => ({ ...s, ...data }));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnectGoogle() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/google/disconnect", { method: "POST" });
      if (res.ok) {
        setSettings((s) => ({ ...s, hasGoogleCalendar: false }));
      }
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.4em] mb-2">Preferences</p>
        <h1 className="font-display text-4xl text-foreground tracking-widest">SETTINGS</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your scheduling window and defaults.
        </p>
      </div>

      {/* Google status flash */}
      {googleStatus === "connected" && (
        <div className="mb-6 text-sm text-success bg-success/10 border border-success/20 rounded-lg px-4 py-3 max-w-lg">
          Google Calendar connected successfully.
        </div>
      )}
      {googleStatus === "error" && (
        <div className="mb-6 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 max-w-lg">
          Failed to connect Google Calendar. Please try again.
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-lg">
        <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">

          {/* Day window */}
          <div className="px-5 py-5">
            <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.3em] mb-4">Day Window</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dayStart">Start Time</Label>
                <Input
                  id="dayStart"
                  type="time"
                  value={settings.dayStartTime}
                  onChange={(e) => setSettings((s) => ({ ...s, dayStartTime: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="dayEnd">End Time</Label>
                <Input
                  id="dayEnd"
                  type="time"
                  value={settings.dayEndTime}
                  onChange={(e) => setSettings((s) => ({ ...s, dayEndTime: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>

          {/* Break duration */}
          <div className="px-5 py-5">
            <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.3em] mb-4">Break Duration</p>
            <div className="flex items-center gap-3">
              <Input
                id="breakMins"
                type="number"
                min={0}
                max={120}
                value={settings.defaultBreakMins}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, defaultBreakMins: Number(e.target.value) }))
                }
                className="w-28"
                required
              />
              <span className="text-sm text-muted-foreground">minutes between blocks</span>
            </div>
          </div>

          {/* Timezone */}
          <div className="px-5 py-5">
            <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.3em] mb-4">Timezone</p>
            <Input
              id="timezone"
              value={settings.timezone}
              onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))}
              placeholder="e.g. America/New_York"
              required
            />
          </div>

        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save Settings"}
          </Button>
          {saved && (
            <span className="font-mono text-xs text-success">Saved.</span>
          )}
        </div>
      </form>

      {/* Google Calendar */}
      <div className="max-w-lg mt-10">
        <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.4em] mb-4">Google Calendar</p>
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-5">
            {settings.hasGoogleCalendar ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-sm text-foreground font-medium">Connected</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnectGoogle}
                  disabled={disconnecting}
                >
                  {disconnecting ? "Disconnecting…" : "Disconnect"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground font-medium">Not connected</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Link Google to import events and sync schedules.
                  </p>
                </div>
                <a
                  href="/api/google/connect"
                  className="inline-flex items-center h-9 px-4 rounded-lg border border-border-strong text-foreground text-sm font-medium hover:bg-card-high transition-colors"
                >
                  Connect
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

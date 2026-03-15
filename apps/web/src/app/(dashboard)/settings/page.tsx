"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserSettings {
  timezone: string;
  dayStartTime: string;
  dayEndTime: string;
  defaultBreakMins: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    timezone: "America/New_York",
    dayStartTime: "07:00",
    dayEndTime: "22:00",
    defaultBreakMins: 15,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
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
    </div>
  );
}

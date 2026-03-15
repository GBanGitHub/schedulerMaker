"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, GripVertical, CalendarRange } from "lucide-react";

interface Given {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
  recurrence: string | null;
  googleEventId: string | null;
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const PRESET_COLORS = [
  "#10B981", "#3B82F6", "#6366F1", "#EF4444",
  "#F59E0B", "#EC4899", "#8B5CF6", "#14B8A6",
];

const WEEKDAYS = [
  { label: "Mon", rrule: "MO" },
  { label: "Tue", rrule: "TU" },
  { label: "Wed", rrule: "WE" },
  { label: "Thu", rrule: "TH" },
  { label: "Fri", rrule: "FR" },
  { label: "Sat", rrule: "SA" },
  { label: "Sun", rrule: "SU" },
];

function parseWeekdaysFromRrule(recurrence: string | null): Set<string> {
  if (!recurrence) return new Set();
  const match = recurrence.match(/BYDAY=([^;]+)/);
  if (!match) return new Set();
  return new Set(match[1].split(","));
}

function buildRrule(days: Set<string>): string | null {
  if (days.size === 0) return null;
  return `FREQ=WEEKLY;BYDAY=${Array.from(days).join(",")}`;
}

export default function GivensPage() {
  const [givens, setGivens] = useState<Given[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Given | null>(null);

  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [color, setColor] = useState("#10B981");
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());

  // Expand dialog state
  const [expandGiven, setExpandGiven] = useState<Given | null>(null);
  const [expandStart, setExpandStart] = useState("");
  const [expandEnd, setExpandEnd] = useState("");
  const [expandResult, setExpandResult] = useState<{ created: number; skipped: number } | null>(null);
  const [expanding, setExpanding] = useState(false);

  const fetchGivens = useCallback(async () => {
    const res = await fetch("/api/givens");
    if (res.ok) setGivens(await res.json());
  }, []);

  useEffect(() => { fetchGivens(); }, [fetchGivens]);

  function openCreate() {
    setEditing(null);
    setName(""); setStartTime("09:00"); setEndTime("17:00"); setColor("#10B981");
    setRepeatEnabled(false); setSelectedDays(new Set());
    setDialogOpen(true);
  }

  function openEdit(given: Given) {
    setEditing(given);
    setName(given.name); setStartTime(given.startTime);
    setEndTime(given.endTime); setColor(given.color);
    const days = parseWeekdaysFromRrule(given.recurrence);
    setRepeatEnabled(days.size > 0);
    setSelectedDays(days);
    setDialogOpen(true);
  }

  function toggleDay(rruleDay: string) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(rruleDay)) next.delete(rruleDay);
      else next.add(rruleDay);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const recurrence = repeatEnabled ? buildRrule(selectedDays) : null;
    const payload = { name, startTime, endTime, color, recurrence };

    if (editing) {
      await fetch(`/api/givens/${editing.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/givens", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setDialogOpen(false);
    fetchGivens();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this given? All date placements will be removed.")) return;
    await fetch(`/api/givens/${id}`, { method: "DELETE" });
    fetchGivens();
  }

  function openExpand(given: Given) {
    const today = new Date();
    const twoWeeks = new Date(today);
    twoWeeks.setDate(twoWeeks.getDate() + 13);
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    setExpandGiven(given);
    setExpandStart(fmt(today));
    setExpandEnd(fmt(twoWeeks));
    setExpandResult(null);
    setExpanding(false);
  }

  async function handleExpand(e: React.FormEvent) {
    e.preventDefault();
    if (!expandGiven) return;
    setExpanding(true);
    try {
      const res = await fetch(`/api/givens/${expandGiven.id}/expand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: expandStart, endDate: expandEnd }),
      });
      if (res.ok) {
        setExpandResult(await res.json());
        fetchGivens();
      }
    } finally {
      setExpanding(false);
    }
  }

  function duration(start: string, end: string) {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.4em] mb-2">Lego Pieces</p>
          <h1 className="font-display text-4xl text-foreground tracking-widest">GIVENS</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reusable time blocks you drag onto any day in the calendar.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New Given
        </Button>
      </div>

      {/* Givens list */}
      <div className="border border-border rounded-xl overflow-hidden">
        {givens.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">No givens yet. Create pieces like &quot;Day Shift&quot; or &quot;Church&quot;.</p>
          </div>
        ) : (
          givens.map((given, i) => (
            <div
              key={given.id}
              className={`flex items-center gap-4 px-5 py-4 hover:bg-card-high transition-colors ${
                i !== givens.length - 1 ? "border-b border-border" : ""
              }`}
            >
              {/* Color swatch */}
              <div
                className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-border"
                style={{ backgroundColor: given.color }}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{given.name}</p>
                <p className="font-mono text-xs text-muted-foreground mt-0.5">
                  {formatTime(given.startTime)} → {formatTime(given.endTime)}
                  <span className="text-subtle ml-2">({duration(given.startTime, given.endTime)})</span>
                  {given.recurrence && (
                    <span className="ml-2 text-primary opacity-70">↻ recurring</span>
                  )}
                </p>
              </div>

              {/* Drag hint */}
              <GripVertical className="h-4 w-4 text-subtle flex-shrink-0" />

              {/* Actions */}
              <div className="flex gap-0.5">
                {given.recurrence && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Apply to date range"
                    onClick={() => openExpand(given)}
                  >
                    <CalendarRange className="h-3.5 w-3.5 text-primary" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(given)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(given.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Given" : "New Given"}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="gname">Name</Label>
              <Input id="gname" value={name} onChange={(e) => setName(e.target.value)} required
                placeholder="e.g. Day Shift" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gstart">Start Time</Label>
                <Input id="gstart" type="time" value={startTime}
                  onChange={(e) => setStartTime(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="gend">End Time</Label>
                <Input id="gend" type="time" value={endTime}
                  onChange={(e) => setEndTime(e.target.value)} required />
              </div>
            </div>

            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${
                      color === c
                        ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-110"
                        : "opacity-60 hover:opacity-100 hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Repeat toggle */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setRepeatEnabled((v) => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    repeatEnabled ? "bg-primary" : "bg-card-high"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      repeatEnabled ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <Label className="cursor-pointer" onClick={() => setRepeatEnabled((v) => !v)}>
                  Repeat weekly
                </Label>
              </div>
              {repeatEnabled && (
                <div className="flex gap-1.5 mt-2">
                  {WEEKDAYS.map((day) => (
                    <button
                      key={day.rrule}
                      type="button"
                      onClick={() => toggleDay(day.rrule)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-mono font-medium border transition-all ${
                        selectedDays.has(day.rrule)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-border-strong"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expand to date range dialog */}
      <Dialog open={!!expandGiven} onOpenChange={(open) => { if (!open) setExpandGiven(null); }}>
        <DialogHeader>
          <DialogTitle>Apply Recurrence — {expandGiven?.name}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleExpand} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create date placements for each matching weekday in the selected range.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expStart">From</Label>
                <Input id="expStart" type="date" value={expandStart}
                  onChange={(e) => setExpandStart(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="expEnd">To</Label>
                <Input id="expEnd" type="date" value={expandEnd}
                  onChange={(e) => setExpandEnd(e.target.value)} required />
              </div>
            </div>

            {expandResult && (
              <div className="rounded-lg border border-border px-4 py-3 font-mono text-sm">
                <span className="text-success">{expandResult.created} created</span>
                {expandResult.skipped > 0 && (
                  <span className="text-subtle ml-3">{expandResult.skipped} skipped (already existed)</span>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExpandGiven(null)}>Close</Button>
              <Button type="submit" disabled={expanding}>
                {expanding ? "Applying…" : "Apply"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

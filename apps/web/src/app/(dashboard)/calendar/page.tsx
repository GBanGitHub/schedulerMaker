"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter,
} from "@/components/ui/dialog";
import {
  X, GripVertical, AlertTriangle, Clock,
  ChevronLeft, ChevronRight, ChevronDown, Upload, Trash2, Undo2,
  Download, RefreshCw, WifiOff, CalendarPlus, Link2,
} from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { formatDuration } from "@/lib/utils";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Given {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
}

interface DateGiven {
  id: string;
  givenId: string;
  startTime: string;
  endTime: string;
  given: Given;
}

interface ScheduleBlock {
  id: string;
  name: string;
  color: string;
  startTime: string;
  endTime: string;
  googleEventId: string | null;
}

interface Schedule {
  id: string;
  date: string;
  syncedToGoogle: boolean;
  googleCalendarId: string | null;
  blocks: ScheduleBlock[];
}

interface CalendarOption {
  id: string;
  summary: string;
  primary: boolean;
}

interface Template {
  id: string;
  name: string;
  templateBlocks: { customDuration: number | null; block: { duration: number } }[];
}

interface TimelineItem {
  id: string;
  name: string;
  color: string;
  startTime: string;
  endTime: string;
  type: "dateGiven" | "scheduleBlock";
  dateGivenId?: string;
  isContinuation?: boolean;
  isOvernight?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 64;
const TIMELINE_START = 6;
const TIMELINE_END = 23;
const HOURS = Array.from({ length: TIMELINE_END - TIMELINE_START }, (_, i) => i + TIMELINE_START);

function timeToMins(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minsToTime(mins: number) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function fmt(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getTopHeight(start: string, end: string): { top: number; height: number; isOvernight: boolean } | null {
  const startMins = timeToMins(start);
  const endMins   = timeToMins(end);
  const tlStart   = TIMELINE_START * 60;
  const tlEnd     = TIMELINE_END   * 60;
  const isOvernight = endMins < startMins;
  const effectiveEnd = isOvernight ? tlEnd : endMins;
  const visStart = Math.max(startMins, tlStart);
  const visEnd   = Math.min(effectiveEnd, tlEnd);
  if (visEnd <= visStart) return null;
  const top    = ((visStart / 60) - TIMELINE_START) * HOUR_HEIGHT;
  const height = ((visEnd - visStart) / 60) * HOUR_HEIGHT;
  return { top, height: Math.max(height, 24), isOvernight };
}

function findConflicts(ns: string, ne: string, items: TimelineItem[], excludeId?: string) {
  const nsm = timeToMins(ns), nem = timeToMins(ne);
  return items.filter((it) => {
    if (excludeId && it.id === excludeId) return false;
    const esm = timeToMins(it.startTime), eem = timeToMins(it.endTime);
    return nsm < eem && nem > esm;
  });
}

function findFreeSlot(dur: number, items: TimelineItem[], preferMins: number) {
  const sorted = items
    .map((i) => ({ s: timeToMins(i.startTime), e: timeToMins(i.endTime) }))
    .sort((a, b) => a.s - b.s);
  const ranges = [
    { from: preferMins, to: TIMELINE_END * 60 },
    { from: TIMELINE_START * 60, to: preferMins },
  ];
  for (const range of ranges) {
    let cur = range.from;
    for (const slot of sorted) {
      if (slot.s >= range.to) break;
      if (slot.e <= cur) continue;
      if (slot.s - cur >= dur) return minsToTime(cur);
      cur = Math.max(cur, slot.e);
    }
    if (range.to - cur >= dur) return minsToTime(cur);
  }
  return null;
}

// ─── Draggable given card ─────────────────────────────────────────────────────

function DraggableGiven({ given }: { given: Given }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `given-${given.id}`,
    data: { given },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all cursor-grab active:cursor-grabbing select-none ${
        isDragging
          ? "opacity-30 border-border"
          : "border-border hover:border-border-strong hover:bg-card-high"
      }`}
    >
      <GripVertical className="h-4 w-4 text-subtle flex-shrink-0" />
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: given.color }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{given.name}</p>
        <p className="font-mono text-xs text-subtle mt-0.5">
          {fmt(given.startTime)} – {fmt(given.endTime)}
        </p>
      </div>
    </div>
  );
}

// ─── Draggable template card ──────────────────────────────────────────────────

function DraggableTemplate({ template }: { template: Template }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `template-${template.id}`,
    data: { template, type: "template" },
  });
  const totalMins = template.templateBlocks.reduce(
    (s, tb) => s + (tb.customDuration ?? tb.block.duration),
    0
  );
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all cursor-grab active:cursor-grabbing select-none ${
        isDragging
          ? "opacity-30 border-border"
          : "border-border hover:border-border-strong hover:bg-card-high"
      }`}
    >
      <GripVertical className="h-4 w-4 text-subtle flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{template.name}</p>
        <p className="font-mono text-xs text-subtle mt-0.5">
          {template.templateBlocks.length} blocks · {formatDuration(totalMins)}
        </p>
      </div>
    </div>
  );
}

// ─── Droppable timeline ───────────────────────────────────────────────────────

function DroppableTimeline({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "timeline" });
  return (
    <div
      ref={setNodeRef}
      className={`relative transition-colors duration-150 ${isOver ? "bg-primary/3" : ""}`}
    >
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  // Extra days selected for batch placement (always includes selectedDate)
  const [batchDays, setBatchDays] = useState<Set<string>>(new Set());

  const [givens, setGivens] = useState<Given[]>([]);
  const [dateGivens, setDateGivens] = useState<DateGiven[]>([]);
  const [prevDateGivens, setPrevDateGivens] = useState<DateGiven[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [undoStack, setUndoStack] = useState<Array<() => Promise<void>>>([]);

  // Publish modal
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [gcalendars, setGcalendars] = useState<CalendarOption[]>([]);
  const [gcalendarsLoading, setGcalendarsLoading] = useState(false);
  const [publishCalendarId, setPublishCalendarId] = useState("primary");
  const [publishMode, setPublishMode] = useState<"RESPECT_EXISTING" | "OVERWRITE">("RESPECT_EXISTING");
  const [publishedCalendarName, setPublishedCalendarName] = useState<string | null>(null);

  // Import modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importCalendarId, setImportCalendarId] = useState("primary");
  const [importTimeMin, setImportTimeMin] = useState("");
  const [importTimeMax, setImportTimeMax] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // Import dropdown
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const importMenuRef = useRef<HTMLDivElement>(null);

  // iCal import modal
  const [icalModalOpen, setIcalModalOpen] = useState(false);
  const [icalUrl, setIcalUrl] = useState("");
  const [icalDateFrom, setIcalDateFrom] = useState("");
  const [icalDateTo, setIcalDateTo] = useState("");
  const [icalImporting, setIcalImporting] = useState(false);
  const [icalResult, setIcalResult] = useState<string | null>(null);

  // Token expired banner
  const [tokenExpired, setTokenExpired] = useState(false);

  // Generate week modal
  const [generateWeekOpen, setGenerateWeekOpen] = useState(false);
  const [genWeekTemplateId, setGenWeekTemplateId] = useState("");
  const [genWeekSyncMode, setGenWeekSyncMode] = useState<"RESPECT_EXISTING" | "OVERWRITE">("RESPECT_EXISTING");
  const [genWeekResult, setGenWeekResult] = useState<string | null>(null);
  const [generatingWeek, setGeneratingWeek] = useState(false);

  const [activeDragGiven, setActiveDragGiven] = useState<Given | null>(null);
  const [activeDragTemplate, setActiveDragTemplate] = useState<Template | null>(null);
  const [conflict, setConflict] = useState<{
    given: Given;
    startTime: string;
    endTime: string;
    recommendedTime: string | null;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchAll = useCallback(async () => {
    const prevDate = format(addDays(new Date(selectedDate + "T12:00:00"), -1), "yyyy-MM-dd");
    const [givenRes, dgRes, prevDgRes, scheduleRes, templateRes] = await Promise.all([
      fetch("/api/givens"),
      fetch(`/api/date-givens?date=${selectedDate}`),
      fetch(`/api/date-givens?date=${prevDate}`),
      fetch(`/api/schedules?date=${selectedDate}`),
      fetch("/api/templates"),
    ]);
    if (givenRes.ok)    setGivens(await givenRes.json());
    if (dgRes.ok)       setDateGivens(await dgRes.json());
    if (prevDgRes.ok)   setPrevDateGivens(await prevDgRes.json());
    if (scheduleRes.ok) {
      const schedules: Schedule[] = await scheduleRes.json();
      setSchedule(schedules[0] ?? null);
    }
    if (templateRes.ok) setTemplates(await templateRes.json());
  }, [selectedDate]);

  const fetchAllRef = useRef(fetchAll);
  useEffect(() => { fetchAllRef.current = fetchAll; }, [fetchAll]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!importMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (importMenuRef.current && !importMenuRef.current.contains(e.target as Node)) {
        setImportMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [importMenuOpen]);

  // Build unified timeline items for the viewed day
  const timelineItems: TimelineItem[] = [
    ...(schedule?.blocks.map((b) => ({
      id: `sb-${b.id}`,
      name: b.name,
      color: b.color,
      startTime: format(new Date(b.startTime), "HH:mm"),
      endTime: format(new Date(b.endTime), "HH:mm"),
      type: "scheduleBlock" as const,
    })) ?? []),
    ...dateGivens.map((dg) => ({
      id: `dg-${dg.id}`,
      name: dg.given.name,
      color: dg.given.color,
      startTime: dg.startTime,
      endTime: dg.endTime,
      type: "dateGiven" as const,
      dateGivenId: dg.id,
      isOvernight: timeToMins(dg.endTime) < timeToMins(dg.startTime),
    })),
    ...prevDateGivens
      .filter((dg) => timeToMins(dg.endTime) < timeToMins(dg.startTime))
      .map((dg) => ({
        id: `cont-${dg.id}`,
        name: dg.given.name,
        color: dg.given.color,
        startTime: "00:00",
        endTime: dg.endTime,
        type: "dateGiven" as const,
        isContinuation: true,
        isOvernight: false,
      })),
  ];

  // Week strip — Mon through Sun of the week containing selectedDate
  const weekStart = startOfWeek(new Date(selectedDate + "T12:00:00"), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return format(d, "yyyy-MM-dd");
  });

  function toggleBatchDay(date: string) {
    if (date === selectedDate) return; // can't deselect the viewed day
    setBatchDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  function navigateDate(offset: number) {
    const next = format(addDays(new Date(selectedDate + "T12:00:00"), offset), "yyyy-MM-dd");
    setSelectedDate(next);
    setBatchDays(new Set());
    setUndoStack([]);
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.given) setActiveDragGiven(data.given as Given);
    if (data?.type === "template") setActiveDragTemplate(data.template as Template);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragGiven(null);
    setActiveDragTemplate(null);
    const { over, active } = event;
    if (!over || over.id !== "timeline") return;

    const data = active.data.current;

    if (data?.type === "template") {
      const template = data.template as Template;
      const res = await fetch("/api/schedules/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, templateId: template.id, syncMode: "RESPECT_EXISTING" }),
      });
      if (res.ok) {
        const { schedule: newSchedule } = await res.json() as { schedule: Schedule };
        setUndoStack((s) => [...s, async () => {
          await fetch(`/api/schedules/${newSchedule.id}`, { method: "DELETE" });
          fetchAllRef.current();
        }]);
        fetchAll();
      }
      return;
    }

    const given = data?.given as Given;
    if (!given) return;

    const conflicts = findConflicts(given.startTime, given.endTime, timelineItems);
    if (conflicts.length > 0) {
      const dur = timeToMins(given.endTime) - timeToMins(given.startTime);
      const rec = findFreeSlot(dur, timelineItems, timeToMins(given.startTime));
      setConflict({ given, startTime: given.startTime, endTime: given.endTime, recommendedTime: rec });
      return;
    }
    await placeGiven(given.id, given.startTime, given.endTime);
  }

  async function fetchGCalendars() {
    setGcalendarsLoading(true);
    try {
      const res = await fetch("/api/google-calendar/calendars");
      if (res.status === 401) { setTokenExpired(true); return; }
      if (res.ok) {
        const data = await res.json();
        setGcalendars(data.calendars ?? []);
        const primary = data.calendars?.find((c: CalendarOption) => c.primary);
        if (primary) setPublishCalendarId(primary.id);
        setImportCalendarId(data.calendars?.[0]?.id ?? "primary");
      }
    } finally {
      setGcalendarsLoading(false);
    }
  }

  function openPublishModal() {
    setPublishMode("RESPECT_EXISTING");
    setPublishModalOpen(true);
    fetchGCalendars();
  }

  async function handlePublishSubmit() {
    if (!schedule) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/schedules/${schedule.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarId: publishCalendarId, mode: publishMode }),
      });
      if (res.status === 401) { setTokenExpired(true); setPublishModalOpen(false); return; }
      if (res.ok) {
        const calName = gcalendars.find((c) => c.id === publishCalendarId)?.summary ?? null;
        setPublishedCalendarName(calName);
        setPublishModalOpen(false);
        fetchAll();
      }
    } finally {
      setPublishing(false);
    }
  }

  function openImportModal() {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    setImportTimeMin(format(weekStart, "yyyy-MM-dd"));
    setImportTimeMax(format(addDays(weekStart, 6), "yyyy-MM-dd"));
    setImportResult(null);
    setImportModalOpen(true);
    fetchGCalendars();
  }

  async function handleImportSubmit() {
    setImporting(true);
    try {
      const res = await fetch("/api/google-calendar/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId: importCalendarId,
          timeMin: importTimeMin + "T00:00:00.000Z",
          timeMax: importTimeMax + "T23:59:59.999Z",
        }),
      });
      if (res.status === 401) { setTokenExpired(true); setImportModalOpen(false); return; }
      if (res.ok) {
        const data = await res.json();
        setImportResult(`Imported ${data.imported} event${data.imported === 1 ? "" : "s"} as Givens`);
        fetchAll();
      }
    } finally {
      setImporting(false);
    }
  }

  function openIcalModal() {
    const ws = startOfWeek(new Date(), { weekStartsOn: 1 });
    setIcalDateFrom(format(ws, "yyyy-MM-dd"));
    setIcalDateTo(format(addDays(ws, 6), "yyyy-MM-dd"));
    setIcalResult(null);
    setIcalModalOpen(true);
  }

  async function handleIcalImport() {
    if (!icalUrl) return;
    setIcalImporting(true);
    try {
      const res = await fetch("/api/import/ical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: icalUrl, dateFrom: icalDateFrom, dateTo: icalDateTo }),
      });
      if (res.ok) {
        const data = await res.json();
        setIcalResult(`Imported ${data.imported} shift${data.imported === 1 ? "" : "s"} as Givens`);
        fetchAll();
      } else {
        const data = await res.json().catch(() => ({}));
        setIcalResult(`Error: ${data.error ?? "Import failed"}`);
      }
    } finally {
      setIcalImporting(false);
    }
  }

  function handleIcalExport() {
    const monthStart = format(new Date(selectedDate + "T12:00:00"), "yyyy-MM-01");
    const lastDay = new Date(new Date(selectedDate + "T12:00:00").getFullYear(), new Date(selectedDate + "T12:00:00").getMonth() + 1, 0);
    const monthEnd = format(lastDay, "yyyy-MM-dd");
    window.location.href = `/api/schedules/export/ical?start=${monthStart}&end=${monthEnd}`;
  }

  async function clearSchedule() {
    if (!schedule) return;
    await fetch(`/api/schedules/${schedule.id}`, { method: "DELETE" });
    setUndoStack([]);
    fetchAll();
  }

  async function placeGiven(givenId: string, startTime: string, endTime: string) {
    const allDays = [selectedDate, ...Array.from(batchDays)];
    const results = await Promise.all(
      allDays.map((date) =>
        fetch("/api/date-givens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ givenId, date, startTime, endTime }),
        }).then((r) => r.ok ? r.json() : null)
      )
    );
    const createdIds: string[] = results.filter(Boolean).map((r: { id: string }) => r.id);
    setUndoStack((s) => [...s, async () => {
      await Promise.all(createdIds.map((id) => fetch(`/api/date-givens/${id}`, { method: "DELETE" })));
      fetchAllRef.current();
    }]);
    fetchAll();
  }

  async function removeDateGiven(dateGivenId: string) {
    const dg = dateGivens.find((d) => d.id === dateGivenId);
    await fetch(`/api/date-givens/${dateGivenId}`, { method: "DELETE" });
    if (dg) {
      const snap = { givenId: dg.givenId, date: selectedDate, startTime: dg.startTime, endTime: dg.endTime };
      setUndoStack((s) => [...s, async () => {
        await fetch("/api/date-givens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(snap),
        });
        fetchAllRef.current();
      }]);
    }
    fetchAll();
  }

  async function handleUndo() {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    await last();
  }

  async function handleGenerateWeek() {
    if (!genWeekTemplateId) return;
    setGeneratingWeek(true);
    setGenWeekResult(null);
    try {
      const res = await fetch("/api/schedules/generate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: weekDays[0],
          endDate: weekDays[6],
          templateId: genWeekTemplateId,
          syncMode: genWeekSyncMode,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const skippedMsg = data.failed > 0 ? ` (${data.failed} failed)` : "";
        setGenWeekResult(`Generated ${data.succeeded}/${data.total} days${skippedMsg}`);
        fetchAll();
      }
    } finally {
      setGeneratingWeek(false);
    }
  }

  const formattedDate = format(new Date(selectedDate + "T12:00:00"), "EEEE, MMMM d, yyyy");
  const today = format(new Date(), "yyyy-MM-dd");
  const allSelectedDays = new Set([selectedDate, ...batchDays]);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.4em] mb-2">
              Schedule
            </p>
            <h1 className="font-display text-4xl text-foreground tracking-widest">CALENDAR</h1>
          </div>
          <div className="flex items-center gap-2">
            {undoStack.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleUndo}>
                <Undo2 className="h-4 w-4 mr-2" />
                Undo
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => { setGenWeekResult(null); setGenerateWeekOpen(true); }}>
              <CalendarPlus className="h-4 w-4 mr-2" />
              Generate Week
            </Button>

            {/* Import dropdown */}
            <div className="relative" ref={importMenuRef}>
              <Button variant="ghost" size="sm" onClick={() => setImportMenuOpen((v) => !v)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Import
                <ChevronDown className="h-3 w-3 ml-1.5 opacity-50" />
              </Button>
              {importMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-border bg-card shadow-lg shadow-black/20 z-50 overflow-hidden">
                  <button
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-card-high transition-colors text-left"
                    onClick={() => { setImportMenuOpen(false); openImportModal(); }}
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-subtle flex-shrink-0" />
                    From Google Calendar
                  </button>
                  <button
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-card-high transition-colors text-left"
                    onClick={() => { setImportMenuOpen(false); openIcalModal(); }}
                  >
                    <Link2 className="h-3.5 w-3.5 text-subtle flex-shrink-0" />
                    From iCal URL
                  </button>
                </div>
              )}
            </div>

            <Button variant="ghost" size="icon" onClick={handleIcalExport} title="Add to Apple Calendar">
              <Download className="h-4 w-4" />
            </Button>

            {schedule?.syncedToGoogle && (
              <Badge variant="success">
                Synced{publishedCalendarName ? ` · ${publishedCalendarName}` : " to Google"}
              </Badge>
            )}
            {schedule && !schedule.syncedToGoogle && (
              <Button variant="outline" onClick={openPublishModal} disabled={publishing}>
                <Upload className="h-4 w-4 mr-2" />
                Publish to Google
              </Button>
            )}
          </div>
        </div>

        {/* Token expired banner */}
        {tokenExpired && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg border border-destructive/30 bg-destructive/5">
            <WifiOff className="h-4 w-4 text-destructive flex-shrink-0" />
            <span className="text-sm text-foreground flex-1">
              Google Calendar disconnected — your session token has expired.
            </span>
            <a
              href="/api/auth/signin?callbackUrl=/calendar"
              className="text-sm font-medium text-primary hover:underline whitespace-nowrap"
            >
              Reconnect
            </a>
            <button onClick={() => setTokenExpired(false)} className="text-subtle hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Date navigation */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); setBatchDays(new Set()); }}
            className="w-auto"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSelectedDate(today); setBatchDays(new Set()); }}
            className="text-xs"
          >
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <p className="font-mono text-sm text-muted-foreground">{formattedDate}</p>
        </div>

        {/* Week strip — click to view, shift-click or checkbox to batch-select */}
        <div className="flex gap-1.5 mb-6">
          {weekDays.map((date) => {
            const d = new Date(date + "T12:00:00");
            const isViewed = date === selectedDate;
            const isBatch = batchDays.has(date);
            const isSelected = isViewed || isBatch;
            const isToday = date === today;
            return (
              <button
                key={date}
                onClick={() => {
                  if (isViewed) return;
                  // Clicking a non-viewed day: navigate + preserve batch minus that day
                  setSelectedDate(date);
                  setBatchDays((prev) => {
                    const next = new Set(prev);
                    next.delete(date);
                    return next;
                  });
                }}
                className={`flex-1 flex flex-col items-center py-2.5 px-1 rounded-lg border text-center transition-all ${
                  isViewed
                    ? "border-primary bg-primary/10 text-primary"
                    : isBatch
                    ? "border-primary/40 bg-primary/5 text-primary/80"
                    : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
                }`}
              >
                <span className="font-mono text-[9px] uppercase tracking-widest">
                  {format(d, "EEE")}
                </span>
                <span className={`text-sm font-medium mt-0.5 ${isToday && !isSelected ? "text-primary" : ""}`}>
                  {format(d, "d")}
                </span>
              </button>
            );
          })}
        </div>

        {/* Batch hint */}
        {batchDays.size > 0 && (
          <div className="mb-4 flex items-center gap-3 px-4 py-2.5 rounded-lg border border-primary/20 bg-primary/5">
            <span className="font-mono text-xs text-primary">
              Dropping will place on {batchDays.size + 1} days
            </span>
            <div className="flex gap-1 flex-wrap">
              {Array.from(batchDays).map((d) => (
                <span key={d} className="font-mono text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {format(new Date(d + "T12:00:00"), "EEE d")}
                </span>
              ))}
            </div>
            <button
              onClick={() => setBatchDays(new Set())}
              className="ml-auto text-subtle hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Conflict banner */}
        {conflict && (
          <div className="mb-4 rounded-xl border border-warning/30 bg-warning/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-foreground font-medium">
                  <span className="text-warning">&quot;{conflict.given.name}&quot;</span>{" "}
                  ({fmt(conflict.startTime)} – {fmt(conflict.endTime)}) overlaps an existing item.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      placeGiven(conflict.given.id, conflict.startTime, conflict.endTime);
                      setConflict(null);
                    }}
                  >
                    Keep Both
                  </Button>
                  {conflict.recommendedTime && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const dur = timeToMins(conflict.endTime) - timeToMins(conflict.startTime);
                        const newEnd = minsToTime(timeToMins(conflict.recommendedTime!) + dur);
                        placeGiven(conflict.given.id, conflict.recommendedTime!, newEnd);
                        setConflict(null);
                      }}
                    >
                      <Clock className="h-3.5 w-3.5 mr-1.5" />
                      Use {fmt(conflict.recommendedTime)} instead
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setConflict(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main layout */}
        <div className="flex gap-5">

          {/* Timeline */}
          <div className="flex-1 border border-border rounded-xl overflow-hidden">
            <DroppableTimeline>
              {/* Hour rows */}
              {HOURS.map((hour) => (
                <div key={hour} className="flex border-b border-border h-16 last:border-b-0">
                  <div className="w-16 flex-shrink-0 flex items-start justify-end pr-3 pt-2 border-r border-border">
                    <span className="font-mono text-[10px] text-subtle">
                      {hour === 0 ? "12A" : hour < 12 ? `${hour}A` : hour === 12 ? "12P" : `${hour - 12}P`}
                    </span>
                  </div>
                  <div className="flex-1 relative" />
                </div>
              ))}

              {/* Timeline items */}
              {timelineItems.map((item) => {
                const geo = getTopHeight(item.startTime, item.endTime);
                if (!geo) return null;
                const { top, height, isOvernight } = geo;
                const isScheduleBlock = item.type === "scheduleBlock";
                return (
                  <div
                    key={item.id}
                    className="absolute left-16 right-2 rounded-lg px-2.5 py-1.5 text-white text-xs font-medium overflow-hidden"
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      backgroundColor: item.color,
                      opacity: isScheduleBlock ? 0.8 : 1,
                      boxShadow: `0 0 12px ${item.color}30`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate">
                        {item.isContinuation ? "↩ " : ""}{item.name}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="font-mono text-[10px] opacity-80">
                          {item.isContinuation
                            ? `→ ${fmt(item.endTime)}`
                            : `${fmt(item.startTime)}–${fmt(item.endTime)}`}
                        </span>
                        {item.dateGivenId && !item.isContinuation && (
                          <button
                            onClick={() => removeDateGiven(item.dateGivenId!)}
                            className="p-0.5 rounded hover:bg-white/20 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    {height > 36 && (
                      <p className="font-mono text-[10px] opacity-60 mt-0.5">
                        {item.isContinuation
                          ? "← from yesterday"
                          : isOvernight
                          ? "continues tomorrow →"
                          : isScheduleBlock
                          ? "Scheduled"
                          : "Given"}
                      </p>
                    )}
                  </div>
                );
              })}
            </DroppableTimeline>
          </div>

          {/* Sidebar */}
          <div className="w-80 flex-shrink-0 space-y-3">

            {/* Givens palette */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3.5 border-b border-border">
                <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.4em]">Givens</p>
                <p className="text-base text-muted-foreground mt-0.5">Drag onto timeline</p>
              </div>
              <div className="p-3 space-y-2">
                {givens.length === 0 ? (
                  <p className="text-xs text-subtle text-center py-4">
                    No givens. Create some on the Givens page.
                  </p>
                ) : (
                  givens.map((g) => <DraggableGiven key={g.id} given={g} />)
                )}
              </div>
            </div>

            {/* Templates palette */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3.5 border-b border-border">
                <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.4em]">Templates</p>
                <p className="text-base text-muted-foreground mt-0.5">Drag to auto-schedule blocks</p>
              </div>
              <div className="p-3 space-y-2">
                {templates.length === 0 ? (
                  <p className="text-xs text-subtle text-center py-4">
                    No templates. Create some on the Templates page.
                  </p>
                ) : (
                  templates.map((t) => <DraggableTemplate key={t.id} template={t} />)
                )}
              </div>
            </div>

            {/* Placed today */}
            {dateGivens.length > 0 && (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="font-mono text-[9px] text-subtle uppercase tracking-[0.4em]">
                    Placed Today
                  </p>
                </div>
                <div className="p-3 space-y-2">
                  {dateGivens.map((dg) => (
                    <div key={dg.id} className="flex items-center gap-2 text-xs">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: dg.given.color }}
                      />
                      <span className="text-foreground flex-1 truncate">{dg.given.name}</span>
                      <span className="font-mono text-subtle whitespace-nowrap">
                        {fmt(dg.startTime)}–{fmt(dg.endTime)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clear schedule */}
            {schedule && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-subtle hover:text-destructive"
                onClick={clearSchedule}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Clear schedule
              </Button>
            )}
          </div>
        </div>

        {timelineItems.length === 0 && (
          <div className="text-center py-8 text-muted-foreground -mt-2">
            <p className="text-sm">Drop a given from the sidebar onto the timeline.</p>
          </div>
        )}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeDragGiven && (
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-lg border border-border-strong bg-card shadow-xl shadow-black/40">
            <div
              className="w-3.5 h-3.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: activeDragGiven.color }}
            />
            <div>
              <p className="text-lg font-medium text-foreground">{activeDragGiven.name}</p>
              <p className="font-mono text-base text-subtle mt-0.5">
                {fmt(activeDragGiven.startTime)} – {fmt(activeDragGiven.endTime)}
              </p>
            </div>
          </div>
        )}
        {activeDragTemplate && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border-strong bg-card shadow-xl shadow-black/40">
            <GripVertical className="h-4 w-4 text-subtle flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{activeDragTemplate.name}</p>
              <p className="font-mono text-xs text-subtle mt-0.5">
                {activeDragTemplate.templateBlocks.length} blocks
              </p>
            </div>
          </div>
        )}
      </DragOverlay>

      {/* Publish to Google modal */}
      <Dialog open={publishModalOpen} onOpenChange={setPublishModalOpen}>
        <DialogHeader>
          <DialogTitle>Publish to Google Calendar</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            {gcalendarsLoading ? (
              <p className="text-sm text-muted-foreground">Loading calendars…</p>
            ) : gcalendars.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-mono text-subtle uppercase tracking-widest">Calendar</p>
                {gcalendars.map((cal) => (
                  <label
                    key={cal.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-card-high cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name="publishCal"
                      value={cal.id}
                      checked={publishCalendarId === cal.id}
                      onChange={() => setPublishCalendarId(cal.id)}
                      className="accent-primary"
                    />
                    <span className="text-sm text-foreground flex-1">{cal.summary}</span>
                    {cal.primary && (
                      <span className="text-[10px] font-mono text-subtle bg-card px-1.5 py-0.5 rounded border border-border">
                        primary
                      </span>
                    )}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No calendars found — will publish to primary.</p>
            )}

            <div className="space-y-2">
              <p className="text-xs font-mono text-subtle uppercase tracking-widest">Mode</p>
              <div className="grid grid-cols-2 gap-2">
                <label className={`flex flex-col gap-1 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${publishMode === "RESPECT_EXISTING" ? "border-primary bg-primary/5" : "border-border hover:bg-card-high"}`}>
                  <input
                    type="radio"
                    name="publishMode"
                    value="RESPECT_EXISTING"
                    checked={publishMode === "RESPECT_EXISTING"}
                    onChange={() => setPublishMode("RESPECT_EXISTING")}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-foreground">Add Only</span>
                  <span className="text-xs text-muted-foreground">Skip slots with existing events</span>
                </label>
                <label className={`flex flex-col gap-1 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${publishMode === "OVERWRITE" ? "border-primary bg-primary/5" : "border-border hover:bg-card-high"}`}>
                  <input
                    type="radio"
                    name="publishMode"
                    value="OVERWRITE"
                    checked={publishMode === "OVERWRITE"}
                    onChange={() => setPublishMode("OVERWRITE")}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-foreground">Overwrite</span>
                  <span className="text-xs text-muted-foreground">Delete previous app events, re-push</span>
                </label>
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setPublishModalOpen(false)}>Cancel</Button>
          <Button onClick={handlePublishSubmit} disabled={publishing || gcalendarsLoading}>
            <Upload className="h-4 w-4 mr-2" />
            {publishing ? "Publishing…" : "Publish"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Generate Week modal */}
      <Dialog open={generateWeekOpen} onOpenChange={(open) => { setGenerateWeekOpen(open); if (!open) setGenWeekResult(null); }}>
        <DialogHeader>
          <DialogTitle>Generate Week</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate schedules for <span className="font-mono text-foreground">{weekDays[0]}</span> → <span className="font-mono text-foreground">{weekDays[6]}</span> using the selected template.
            </p>

            <div className="space-y-2">
              <p className="text-xs font-mono text-subtle uppercase tracking-widest">Template</p>
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No templates found. Create one first.</p>
              ) : (
                templates.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-card-high cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name="genWeekTemplate"
                      value={t.id}
                      checked={genWeekTemplateId === t.id}
                      onChange={() => setGenWeekTemplateId(t.id)}
                      className="accent-primary"
                    />
                    <span className="text-sm text-foreground flex-1">{t.name}</span>
                  </label>
                ))
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-mono text-subtle uppercase tracking-widest">Mode</p>
              {(["RESPECT_EXISTING", "OVERWRITE"] as const).map((mode) => (
                <label
                  key={mode}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-card-high cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="genWeekMode"
                    value={mode}
                    checked={genWeekSyncMode === mode}
                    onChange={() => setGenWeekSyncMode(mode)}
                    className="accent-primary"
                  />
                  <span className="text-sm text-foreground">{mode === "RESPECT_EXISTING" ? "Respect existing events" : "Overwrite existing"}</span>
                </label>
              ))}
            </div>

            {genWeekResult && (
              <p className="font-mono text-sm text-primary">{genWeekResult}</p>
            )}
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setGenerateWeekOpen(false)}>
            {genWeekResult ? "Close" : "Cancel"}
          </Button>
          {!genWeekResult && (
            <Button
              onClick={handleGenerateWeek}
              disabled={generatingWeek || !genWeekTemplateId}
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              {generatingWeek ? "Generating…" : "Generate"}
            </Button>
          )}
        </DialogFooter>
      </Dialog>

      {/* Import from Google modal */}
      <Dialog open={importModalOpen} onOpenChange={(open) => { setImportModalOpen(open); if (!open) setImportResult(null); }}>
        <DialogHeader>
          <DialogTitle>Import from Google Calendar</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            {gcalendarsLoading ? (
              <p className="text-sm text-muted-foreground">Loading calendars…</p>
            ) : gcalendars.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-mono text-subtle uppercase tracking-widest">Calendar</p>
                {gcalendars.map((cal) => (
                  <label
                    key={cal.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-card-high cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name="importCal"
                      value={cal.id}
                      checked={importCalendarId === cal.id}
                      onChange={() => setImportCalendarId(cal.id)}
                      className="accent-primary"
                    />
                    <span className="text-sm text-foreground flex-1">{cal.summary}</span>
                    {cal.primary && (
                      <span className="text-[10px] font-mono text-subtle bg-card px-1.5 py-0.5 rounded border border-border">
                        primary
                      </span>
                    )}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No calendars found.</p>
            )}

            <div className="space-y-2">
              <p className="text-xs font-mono text-subtle uppercase tracking-widest">Date Range</p>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={importTimeMin}
                  onChange={(e) => setImportTimeMin(e.target.value)}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={importTimeMax}
                  onChange={(e) => setImportTimeMax(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {importResult && (
              <p className="text-sm text-primary font-medium">{importResult}</p>
            )}
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setImportModalOpen(false); setImportResult(null); }}>
            {importResult ? "Close" : "Cancel"}
          </Button>
          {!importResult && (
            <Button onClick={handleImportSubmit} disabled={importing || gcalendarsLoading || !importTimeMin || !importTimeMax}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {importing ? "Importing…" : "Import"}
            </Button>
          )}
        </DialogFooter>
      </Dialog>
      {/* Import from iCal URL modal */}
      <Dialog open={icalModalOpen} onOpenChange={(open) => { setIcalModalOpen(open); if (!open) setIcalResult(null); }}>
        <DialogHeader>
          <DialogTitle>Import from iCal URL</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste your UKG, Outlook, or Apple Calendar subscription URL below.
            </p>

            <div className="space-y-2">
              <p className="text-xs font-mono text-subtle uppercase tracking-widest">iCal / .ics URL</p>
              <Input
                type="url"
                placeholder="https://..."
                value={icalUrl}
                onChange={(e) => setIcalUrl(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-mono text-subtle uppercase tracking-widest">Date Range</p>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={icalDateFrom}
                  onChange={(e) => setIcalDateFrom(e.target.value)}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={icalDateTo}
                  onChange={(e) => setIcalDateTo(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {icalResult && (
              <p className={`text-sm font-medium ${icalResult.startsWith("Error") ? "text-destructive" : "text-primary"}`}>
                {icalResult}
              </p>
            )}
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setIcalModalOpen(false); setIcalResult(null); }}>
            {icalResult ? "Close" : "Cancel"}
          </Button>
          {!icalResult && (
            <Button onClick={handleIcalImport} disabled={icalImporting || !icalUrl || !icalDateFrom || !icalDateTo}>
              <Link2 className="h-4 w-4 mr-2" />
              {icalImporting ? "Importing…" : "Import"}
            </Button>
          )}
        </DialogFooter>
      </Dialog>
    </DndContext>
  );
}

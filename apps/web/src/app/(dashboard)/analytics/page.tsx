"use client";

import { useEffect, useState, useCallback } from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface CategoryData {
  category: string;
  minutes: number;
  blockCount: number;
  color: string;
}

interface AnalyticsData {
  categories: CategoryData[];
  totalMinutes: number;
  totalDays: number;
}

function fmtHours(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function AnalyticsPage() {
  const today = new Date();
  const [startDate, setStartDate] = useState(
    format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(
    format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd")
  );
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?startDate=${startDate}&endDate=${endDate}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const topCategory = data?.categories[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.4em] mb-2">Insights</p>
          <h1 className="font-display text-4xl text-foreground tracking-widest">ANALYTICS</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Time spent breakdown across your scheduled blocks.
          </p>
        </div>
      </div>

      {/* Date range picker */}
      <div className="flex items-end gap-4 mb-8">
        <div>
          <Label htmlFor="aStart">From</Label>
          <Input
            id="aStart"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <div>
          <Label htmlFor="aEnd">To</Label>
          <Input
            id="aEnd"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          {loading ? "Loading…" : "Apply"}
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border border-border rounded-xl px-5 py-4">
          <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.3em] mb-2">Total Scheduled</p>
          <p className="font-display text-3xl text-foreground">
            {data ? fmtHours(data.totalMinutes) : "—"}
          </p>
        </div>
        <div className="border border-border rounded-xl px-5 py-4">
          <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.3em] mb-2">Days with Schedules</p>
          <p className="font-display text-3xl text-foreground">
            {data ? data.totalDays : "—"}
          </p>
        </div>
        <div className="border border-border rounded-xl px-5 py-4">
          <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.3em] mb-2">Top Category</p>
          <div className="flex items-center gap-2 mt-1">
            {topCategory && (
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: topCategory.color }}
              />
            )}
            <p className="font-display text-xl text-foreground truncate">
              {topCategory ? topCategory.category : "—"}
            </p>
          </div>
        </div>
      </div>

      {!data || data.categories.length === 0 ? (
        <div className="border border-border rounded-xl py-16 text-center text-muted-foreground">
          <p className="text-sm">No schedule data for this range.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          {/* Bar chart section */}
          <div className="px-5 py-5 border-b border-border">
            <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.3em] mb-4">Breakdown by Category</p>
            <div className="space-y-3">
              {data.categories.map((cat) => {
                const pct = data.totalMinutes > 0
                  ? Math.round((cat.minutes / data.totalMinutes) * 100)
                  : 0;
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm text-foreground">{cat.category}</span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {fmtHours(cat.minutes)} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 bg-card-high rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 font-mono text-[10px] text-subtle uppercase tracking-[0.3em]">Category</th>
                <th className="text-right px-5 py-3 font-mono text-[10px] text-subtle uppercase tracking-[0.3em]">Hours</th>
                <th className="text-right px-5 py-3 font-mono text-[10px] text-subtle uppercase tracking-[0.3em]">Blocks</th>
                <th className="text-right px-5 py-3 font-mono text-[10px] text-subtle uppercase tracking-[0.3em]">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map((cat, i) => {
                const pct = data.totalMinutes > 0
                  ? ((cat.minutes / data.totalMinutes) * 100).toFixed(1)
                  : "0.0";
                return (
                  <tr
                    key={cat.category}
                    className={i !== data.categories.length - 1 ? "border-b border-border" : ""}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm text-foreground">{cat.category}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm text-muted-foreground">
                      {fmtHours(cat.minutes)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm text-muted-foreground">
                      {cat.blockCount}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm text-muted-foreground">
                      {pct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

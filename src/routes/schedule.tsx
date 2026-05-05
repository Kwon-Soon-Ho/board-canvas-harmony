import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Header } from "@/components/control/Header";
import {
  ScheduleFilters,
  DEFAULT_FILTERS,
  type ScheduleFilters as Filters,
} from "@/components/schedule/ScheduleFilters";
import { EventChip, type CalendarEvent } from "@/components/schedule/EventChip";
import { RiskBanner } from "@/components/schedule/RiskBanner";
import { DayDetailPanel } from "@/components/schedule/DayDetailPanel";
import { AddLeaveModal } from "@/components/schedule/AddLeaveModal";
import { MOCK_PROJECTS, ALL_MEMBERS, type Project } from "@/lib/mockProjects";
import {
  buildMonthGrid,
  dayKey,
  dDay,
  KR_HOLIDAYS,
  type Leave,
  buildSeedLeaves,
  MEMBER_DEPT,
} from "@/lib/mockSchedule";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/schedule")({
  component: SchedulePage,
  ssr: false,
});

const STORAGE_KEY = "design-projects-store";
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function SchedulePage() {
  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [addLeaveOpen, setAddLeaveOpen] = useState(false);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [refreshTick, setRefreshTick] = useState(0);

  // Load projects from same localStorage as the main board
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Project[];
        if (Array.isArray(parsed) && parsed.length > 0) setProjects(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Load leaves from Lovable Cloud + auto-seed if empty
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("leaves")
        .select("*")
        .order("leave_date", { ascending: true });
      if (error) {
        console.warn("[schedule] leaves load failed:", error.message);
        return;
      }
      if (cancelled) return;

      if (!data || data.length === 0) {
        // Seed once
        const seeds = buildSeedLeaves();
        await supabase.from("leaves").insert(seeds);
        const { data: data2 } = await supabase
          .from("leaves")
          .select("*")
          .order("leave_date", { ascending: true });
        if (!cancelled && data2) setLeaves(data2 as Leave[]);
      } else {
        setLeaves(data as Leave[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  // Build all events for the current month grid
  const grid = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const gridStart = grid[0];
  const gridEnd = grid[grid.length - 1];

  const allEvents = useMemo<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = [];

    // Holidays
    KR_HOLIDAYS.forEach((h) => {
      const d = new Date(h.date);
      if (d >= gridStart && d <= gridEnd) {
        events.push({
          id: `h-${h.date}`,
          kind: "holiday",
          date: h.date,
          title: h.name,
        });
      }
    });

    // Project deadlines
    projects.forEach((p) => {
      if (!p.deadline || !/^\d{4}-\d{2}-\d{2}$/.test(p.deadline)) return;
      const d = new Date(p.deadline);
      if (d < gridStart || d > gridEnd) return;
      events.push({
        id: `d-${p.id}`,
        kind: "deadline",
        date: p.deadline,
        title: p.title,
        department: p.department,
        projectId: p.id,
        pm: p.pm,
        status: p.status,
        dDay: dDay(p.deadline),
      });
    });

    // Leaves
    leaves.forEach((l) => {
      const d = new Date(l.leave_date);
      if (d < gridStart || d > gridEnd) return;
      events.push({
        id: `l-${l.id}`,
        kind: "leave",
        date: l.leave_date,
        title: `${l.member_name} ${l.leave_type}`,
        department: (MEMBER_DEPT[l.member_name] ?? l.department) as any,
        member: l.member_name,
        leaveType: l.leave_type,
      });
    });

    return events;
  }, [projects, leaves, gridStart, gridEnd]);

  // Apply filters
  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return allEvents.filter((e) => {
      if (!filters.types.has(e.kind)) return false;
      if (e.department && !filters.depts.has(e.department) && e.kind !== "holiday")
        return false;
      if (filters.members.size > 0) {
        if (e.kind === "leave" && !filters.members.has(e.member ?? "")) return false;
        if (e.kind === "deadline" && !filters.members.has(e.pm ?? "")) return false;
      }
      if (filters.onlyUrgent && e.kind === "deadline") {
        const dd = e.dDay ?? 999;
        if (!(dd < 0 || dd <= 7)) return false;
        if (e.status === "완료") return false;
      } else if (filters.onlyUrgent && e.kind !== "deadline") {
        return false;
      }
      if (q) {
        const hay =
          (e.title + " " + (e.pm ?? "") + " " + (e.member ?? "")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allEvents, filters]);

  // Group by day
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filtered.forEach((e) => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    });
    // Sort: holiday → deadline → milestone → leave
    const order = { holiday: 0, deadline: 1, milestone: 2, leave: 3 };
    map.forEach((arr) =>
      arr.sort((a, b) => order[a.kind] - order[b.kind] || a.title.localeCompare(b.title)),
    );
    return map;
  }, [filtered]);

  const monthLabel = `${anchor.getFullYear()}년 ${anchor.getMonth() + 1}월`;
  const today = new Date();
  const todayKey = dayKey(today);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#080808]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}
            className="p-1.5 rounded-md hover:bg-white/10 text-gray-300"
            aria-label="이전 달"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-semibold text-foreground min-w-[120px] text-center">
            {monthLabel}
          </h1>
          <button
            onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}
            className="p-1.5 rounded-md hover:bg-white/10 text-gray-300"
            aria-label="다음 달"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAnchor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="ml-2 px-3 py-1.5 rounded-md text-xs bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300"
          >
            오늘
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedDay(todayKey);
              setAddLeaveOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-[#0d3b2f] to-[#147058] text-white text-xs font-medium hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            연차 등록
          </button>
        </div>
      </div>

      {/* Risk banner */}
      <RiskBanner events={filtered} />

      <div className="flex flex-1 overflow-hidden">
        <ScheduleFilters
          filters={filters}
          onChange={setFilters}
          allMembers={ALL_MEMBERS}
        />

        <main className="flex-1 overflow-auto bg-[#050505]">
          {/* Weekday header */}
          <div className="grid grid-cols-7 border-b border-white/10 bg-[#080808] sticky top-0 z-10">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={`px-3 py-2 text-[11px] uppercase tracking-wider text-center ${
                  i === 0 ? "text-red-400" : i === 6 ? "text-blue-300" : "text-gray-500"
                }`}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-7 grid-rows-6 h-[calc(100vh-220px)] min-h-[600px]">
            {grid.map((d) => {
              const k = dayKey(d);
              const inMonth = d.getMonth() === anchor.getMonth();
              const isToday = k === todayKey;
              const isSelected = selectedDay === k;
              const dow = d.getDay();
              const dayEvents = byDay.get(k) ?? [];
              const visible = dayEvents.slice(0, 3);
              const overflow = dayEvents.length - visible.length;

              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSelectedDay(k)}
                  className={`flex flex-col items-stretch text-left border-r border-b border-white/[0.06] p-1.5 overflow-hidden transition-colors ${
                    inMonth ? "bg-[#0a0a0a]" : "bg-[#060606]"
                  } ${isSelected ? "ring-1 ring-inset ring-teal-500/60 bg-teal-950/20" : "hover:bg-white/[0.03]"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[11px] font-medium ${
                        !inMonth
                          ? "text-gray-700"
                          : isToday
                            ? "inline-flex items-center justify-center h-5 w-5 rounded-full bg-teal-500 text-black"
                            : dow === 0
                              ? "text-red-400"
                              : dow === 6
                                ? "text-blue-300"
                                : "text-gray-300"
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </div>

                  <div className="space-y-0.5 flex-1 overflow-hidden">
                    {visible.map((e) => (
                      <EventChip key={e.id} event={e} compact />
                    ))}
                    {overflow > 0 && (
                      <p className="text-[10px] text-gray-500 px-1">+{overflow}건 더보기</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </main>

        {selectedDay && (
          <DayDetailPanel
            date={selectedDay}
            events={byDay.get(selectedDay) ?? []}
            onClose={() => setSelectedDay(null)}
            onAddLeave={() => setAddLeaveOpen(true)}
          />
        )}
      </div>

      {addLeaveOpen && (
        <AddLeaveModal
          defaultDate={selectedDay ?? todayKey}
          onClose={() => setAddLeaveOpen(false)}
          onCreated={() => {
            setAddLeaveOpen(false);
            setRefreshTick((t) => t + 1);
          }}
        />
      )}
    </div>
  );
}

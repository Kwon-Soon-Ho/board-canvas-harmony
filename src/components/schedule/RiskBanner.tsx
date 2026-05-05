import { useMemo, useState } from "react";
import { AlertTriangle, Clock, Users, CalendarOff, Layers, ChevronRight, X, Search } from "lucide-react";
import type { CalendarEvent } from "./EventChip";
import { openProjectWindow } from "@/lib/sync";

export type RiskCategory = "지연" | "임박" | "PM 부재" | "PM 다중마감" | "동시 연차";

export interface RiskItem {
  id: string;
  category: RiskCategory;
  tone: "red" | "orange" | "amber" | "blue";
  title: string;
  detail: string;
  date?: string;
  projectId?: string;
  severity: number; // for sort
  icon: React.ReactNode;
}

export function buildRiskItems(events: CalendarEvent[]): RiskItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7 = new Date(today);
  in7.setDate(in7.getDate() + 7);

  const upcoming = events.filter((e) => {
    const d = new Date(e.date);
    d.setHours(0, 0, 0, 0);
    return d >= today && d <= in7;
  });

  const overdue = events.filter(
    (e) => e.kind === "deadline" && e.status !== "완료" && (e.dDay ?? 0) < 0,
  );
  const urgent = upcoming.filter(
    (e) => e.kind === "deadline" && e.status !== "완료" && (e.dDay ?? 99) <= 3,
  );

  const leaveByMember = new Map<string, CalendarEvent[]>();
  upcoming.filter((e) => e.kind === "leave").forEach((e) => {
    if (!leaveByMember.has(e.member!)) leaveByMember.set(e.member!, []);
    leaveByMember.get(e.member!)!.push(e);
  });

  const pmCount = new Map<string, CalendarEvent[]>();
  upcoming
    .filter((e) => e.kind === "deadline" && e.status !== "완료" && e.pm)
    .forEach((e) => {
      if (!pmCount.has(e.pm!)) pmCount.set(e.pm!, []);
      pmCount.get(e.pm!)!.push(e);
    });
  const pmConflicts = Array.from(pmCount.entries()).filter(([, arr]) => arr.length >= 2);

  const pmOnLeave = upcoming.filter(
    (e) =>
      e.kind === "deadline" &&
      e.status !== "완료" &&
      e.pm &&
      leaveByMember.has(e.pm),
  );

  const leaveGroups = new Map<string, CalendarEvent[]>();
  upcoming.filter((e) => e.kind === "leave").forEach((e) => {
    const k = `${e.date}|${e.department ?? "?"}`;
    if (!leaveGroups.has(k)) leaveGroups.set(k, []);
    leaveGroups.get(k)!.push(e);
  });
  const heavyLeave = Array.from(leaveGroups.entries()).filter(([, arr]) => arr.length >= 2);

  const items: RiskItem[] = [];

  overdue.forEach((e) => {
    items.push({
      id: `od-${e.id}`,
      category: "지연",
      tone: "red",
      title: "지연된 마감",
      detail: `${e.title} · ${e.pm ?? "-"} · D+${Math.abs(e.dDay ?? 0)}`,
      date: e.date,
      projectId: e.projectId,
      severity: 100 + Math.abs(e.dDay ?? 0),
      icon: <AlertTriangle className="h-4 w-4" />,
    });
  });

  pmOnLeave.forEach((e) => {
    const leaves = leaveByMember.get(e.pm!)!;
    items.push({
      id: `pol-${e.id}`,
      category: "PM 부재",
      tone: "red",
      title: "PM 부재 + 마감",
      detail: `${e.title} · ${e.pm} 휴가 ${leaves[0].date.slice(5)}`,
      date: e.date,
      projectId: e.projectId,
      severity: 90,
      icon: <CalendarOff className="h-4 w-4" />,
    });
  });

  urgent.forEach((e) => {
    items.push({
      id: `ur-${e.id}`,
      category: "임박",
      tone: "orange",
      title: "마감 임박",
      detail: `${e.title} · ${e.pm ?? "-"} · D-${e.dDay}`,
      date: e.date,
      projectId: e.projectId,
      severity: 70 - (e.dDay ?? 0),
      icon: <Clock className="h-4 w-4" />,
    });
  });

  pmConflicts.forEach(([pm, arr]) => {
    items.push({
      id: `pc-${pm}`,
      category: "PM 다중마감",
      tone: "amber",
      title: "PM 동시 다중 마감",
      detail: `${pm} · ${arr.length}건 · ${arr.map((a) => a.title).slice(0, 2).join(", ")}…`,
      projectId: arr[0]?.projectId,
      severity: 50 + arr.length,
      icon: <Layers className="h-4 w-4" />,
    });
  });

  heavyLeave.forEach(([key, arr]) => {
    const [date, dept] = key.split("|");
    items.push({
      id: `hl-${key}`,
      category: "동시 연차",
      tone: "blue",
      title: "동시 연차",
      detail: `${date.slice(5)} · ${dept}팀 ${arr.length}명 (${arr.map((a) => a.member).join(", ")})`,
      date,
      severity: 30 + arr.length,
      icon: <Users className="h-4 w-4" />,
    });
  });

  items.sort((a, b) => b.severity - a.severity);
  return items;
}

interface Props {
  events: CalendarEvent[];
}

export function RiskBanner({ events }: Props) {
  const items = useMemo(() => buildRiskItems(events), [events]);
  const [expanded, setExpanded] = useState(false); // for 5–9 mode
  const [sheetOpen, setSheetOpen] = useState(false); // for 10+ mode

  if (items.length === 0) {
    return (
      <div className="px-6 py-3 border-b border-white/10 bg-emerald-500/5 text-[13px] text-emerald-300 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
        이번 주 위험 요소 없음 — 모든 마감과 일정이 안정적입니다.
      </div>
    );
  }

  // ── 10+ : Compact header mode + side sheet
  if (items.length >= 10) {
    const counts = items.reduce<Record<string, number>>((acc, it) => {
      acc[it.category] = (acc[it.category] ?? 0) + 1;
      return acc;
    }, {});
    return (
      <>
        <div className="border-b border-white/10 bg-gradient-to-r from-red-950/40 via-amber-950/30 to-transparent px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-[13px] font-semibold text-amber-200">
                위험 알림 {items.length}건
              </span>
            </div>
            <span className="text-gray-500">·</span>
            <div className="flex items-center gap-3 text-[12px] flex-wrap">
              {Object.entries(counts).map(([cat, n]) => (
                <span key={cat} className={categoryToneText(cat as RiskCategory)}>
                  {cat} <strong>{n}</strong>
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] bg-white/5 border border-white/10 hover:bg-white/10 text-foreground"
          >
            전체 펼치기 <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {sheetOpen && <RiskSheet items={items} onClose={() => setSheetOpen(false)} />}
      </>
    );
  }

  // ── 1–9 : Card grid (with show-all toggle for 5+)
  const visible = !expanded && items.length > 4 ? items.slice(0, 4) : items;
  return (
    <div className="border-b border-white/10 bg-gradient-to-r from-red-950/40 via-amber-950/30 to-transparent px-6 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h3 className="text-[13px] font-semibold text-amber-200 uppercase tracking-wider">
            이번 주 위험 알림 · {items.length}건
          </h3>
        </div>
        {items.length > 4 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[12px] text-gray-300 hover:text-foreground"
          >
            {expanded ? "접기" : `전체 보기 (${items.length})`}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {visible.map((it) => (
          <RiskCard key={it.id} item={it} />
        ))}
      </div>
    </div>
  );
}

function categoryToneText(cat: RiskCategory): string {
  const m: Record<RiskCategory, string> = {
    "지연": "text-red-300",
    "PM 부재": "text-red-300",
    "임박": "text-orange-300",
    "PM 다중마감": "text-amber-300",
    "동시 연차": "text-blue-300",
  };
  return m[cat];
}

function RiskCard({ item }: { item: RiskItem }) {
  const tone = {
    red: "bg-red-500/10 border-red-500/30 text-red-200 hover:bg-red-500/20",
    orange: "bg-orange-500/10 border-orange-500/30 text-orange-200 hover:bg-orange-500/20",
    amber: "bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20",
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-200 hover:bg-blue-500/20",
  }[item.tone];

  const clickable = !!item.projectId;
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => item.projectId && openProjectWindow(item.projectId)}
      className={`flex items-start gap-2 rounded-md border px-2.5 py-2 text-left transition-colors ${tone} ${
        clickable ? "cursor-pointer" : "cursor-default opacity-95"
      }`}
    >
      <div className="mt-0.5 shrink-0">{item.icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold leading-tight">{item.title}</p>
        <p className="text-[12px] opacity-80 truncate">{item.detail}</p>
      </div>
      {clickable && <ChevronRight className="h-3 w-3 mt-1 shrink-0 opacity-60" />}
    </button>
  );
}

// ─── Side Sheet (10+) ─────────────────────────────────────────────────
const TABS: ("전체" | RiskCategory)[] = ["전체", "지연", "PM 부재", "임박", "PM 다중마감", "동시 연차"];

function RiskSheet({ items, onClose }: { items: RiskItem[]; onClose: () => void }) {
  const [tab, setTab] = useState<"전체" | RiskCategory>("전체");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const m: Record<string, number> = { 전체: items.length };
    items.forEach((it) => (m[it.category] = (m[it.category] ?? 0) + 1));
    return m;
  }, [items]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return items.filter(
      (it) =>
        (tab === "전체" || it.category === tab) &&
        (!ql || (it.title + " " + it.detail).toLowerCase().includes(ql)),
    );
  }, [items, tab, q]);

  return (
    <div className="fixed inset-0 z-[55] flex" onClick={onClose}>
      <div className="flex-1 bg-black/50 backdrop-blur-[1px]" />
      <aside
        onClick={(e) => e.stopPropagation()}
        className="w-[460px] max-w-[92vw] h-full bg-[#0a0a0a] border-l border-white/10 flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <p className="text-[12px] uppercase tracking-wider text-gray-500">RISK CENTER</p>
            <h2 className="text-[17px] font-semibold text-foreground mt-0.5">
              이번 주 위험 알림 {items.length}건
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/10 text-gray-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pt-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="검색"
              className="w-full pl-8 pr-3 py-2 text-[13px] bg-white/5 border border-white/10 rounded-md text-foreground placeholder:text-gray-500 focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        <div className="px-5 mt-3 flex flex-wrap gap-1.5">
          {TABS.map((t) => {
            const active = tab === t;
            const c = counts[t] ?? 0;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-2.5 py-1 rounded-md text-[12px] border ${
                  active
                    ? "bg-teal-700 border-teal-500 text-white"
                    : "bg-white/5 border-white/10 text-gray-300 hover:text-foreground"
                }`}
              >
                {t} <span className="opacity-70">{c}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-[13px] text-gray-500 text-center py-12">결과 없음</p>
          ) : (
            filtered.map((it) => <RiskCard key={it.id} item={it} />)
          )}
        </div>
      </aside>
    </div>
  );
}

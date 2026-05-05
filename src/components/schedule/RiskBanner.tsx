import { AlertTriangle, Clock, Users, CalendarOff, Layers } from "lucide-react";
import type { CalendarEvent } from "./EventChip";
import type { Department } from "@/lib/mockProjects";
import { dDay } from "@/lib/mockSchedule";

interface RiskItem {
  icon: React.ReactNode;
  tone: "red" | "orange" | "amber" | "blue";
  title: string;
  detail: string;
}

interface Props {
  events: CalendarEvent[];
}

export function RiskBanner({ events }: Props) {
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

  // Same-day leaves grouped by date+dept
  const leaveGroups = new Map<string, CalendarEvent[]>();
  upcoming
    .filter((e) => e.kind === "leave")
    .forEach((e) => {
      const k = `${e.date}|${e.department ?? "?"}`;
      if (!leaveGroups.has(k)) leaveGroups.set(k, []);
      leaveGroups.get(k)!.push(e);
    });
  const heavyLeave = Array.from(leaveGroups.entries()).filter(([, arr]) => arr.length >= 2);

  // Conflicts: same PM has 2+ deadlines in same week
  const pmCount = new Map<string, CalendarEvent[]>();
  upcoming
    .filter((e) => e.kind === "deadline" && e.status !== "완료" && e.pm)
    .forEach((e) => {
      if (!pmCount.has(e.pm!)) pmCount.set(e.pm!, []);
      pmCount.get(e.pm!)!.push(e);
    });
  const pmConflicts = Array.from(pmCount.entries()).filter(([, arr]) => arr.length >= 2);

  // PM-on-leave conflict: deadline within 7d AND PM has leave in same window
  const leaveByMember = new Map<string, CalendarEvent[]>();
  upcoming
    .filter((e) => e.kind === "leave")
    .forEach((e) => {
      if (!leaveByMember.has(e.member!)) leaveByMember.set(e.member!, []);
      leaveByMember.get(e.member!)!.push(e);
    });
  const pmOnLeave = upcoming.filter(
    (e) =>
      e.kind === "deadline" &&
      e.status !== "완료" &&
      e.pm &&
      leaveByMember.has(e.pm),
  );

  const items: RiskItem[] = [];

  overdue.slice(0, 4).forEach((e) => {
    items.push({
      icon: <AlertTriangle className="h-4 w-4" />,
      tone: "red",
      title: "지연된 마감",
      detail: `${e.title} · ${e.pm ?? "-"} · D+${Math.abs(e.dDay ?? 0)}`,
    });
  });

  urgent.slice(0, 4).forEach((e) => {
    items.push({
      icon: <Clock className="h-4 w-4" />,
      tone: "orange",
      title: "마감 임박",
      detail: `${e.title} · ${e.pm ?? "-"} · D-${e.dDay}`,
    });
  });

  pmOnLeave.slice(0, 3).forEach((e) => {
    const leaves = leaveByMember.get(e.pm!)!;
    items.push({
      icon: <CalendarOff className="h-4 w-4" />,
      tone: "red",
      title: "PM 부재 + 마감",
      detail: `${e.title} · ${e.pm} 휴가 ${leaves[0].date.slice(5)}`,
    });
  });

  pmConflicts.slice(0, 3).forEach(([pm, arr]) => {
    items.push({
      icon: <Layers className="h-4 w-4" />,
      tone: "amber",
      title: "PM 동시 다중 마감",
      detail: `${pm} · ${arr.length}건 · ${arr.map((a) => a.title).slice(0, 2).join(", ")}…`,
    });
  });

  heavyLeave.slice(0, 3).forEach(([key, arr]) => {
    const [date, dept] = key.split("|");
    items.push({
      icon: <Users className="h-4 w-4" />,
      tone: "blue",
      title: "동시 연차",
      detail: `${date.slice(5)} · ${dept}팀 ${arr.length}명 (${arr.map((a) => a.member).join(", ")})`,
    });
  });

  if (items.length === 0) {
    return (
      <div className="px-6 py-3 border-b border-white/10 bg-emerald-500/5 text-[12px] text-emerald-300 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
        이번 주 위험 요소 없음 — 모든 마감과 일정이 안정적입니다.
      </div>
    );
  }

  return (
    <div className="border-b border-white/10 bg-gradient-to-r from-red-950/40 via-amber-950/30 to-transparent px-6 py-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <h3 className="text-xs font-semibold text-amber-200 uppercase tracking-wider">
          이번 주 위험 알림 · {items.length}건
        </h3>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {items.slice(0, 12).map((it, i) => (
          <RiskCard key={i} item={it} />
        ))}
      </div>
    </div>
  );
}

function RiskCard({ item }: { item: RiskItem }) {
  const tone = {
    red: "bg-red-500/10 border-red-500/30 text-red-200",
    orange: "bg-orange-500/10 border-orange-500/30 text-orange-200",
    amber: "bg-amber-500/10 border-amber-500/30 text-amber-200",
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-200",
  }[item.tone];

  return (
    <div className={`flex items-start gap-2 rounded-md border px-2.5 py-2 ${tone}`}>
      <div className="mt-0.5 shrink-0">{item.icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold leading-tight">{item.title}</p>
        <p className="text-[11px] opacity-80 truncate">{item.detail}</p>
      </div>
    </div>
  );
}


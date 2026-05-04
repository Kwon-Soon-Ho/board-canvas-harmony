import { useMemo, useState } from "react";
import type { Project } from "@/lib/mockProjects";
import { ALL_MEMBERS } from "@/lib/mockProjects";
import { Users, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  projects: Project[];
  assignee: string | null;
  setAssignee: (name: string | null) => void;
}

type MemberStat = {
  name: string;
  rank: string;
  active: number; // # of "진행" projects involved in
  total: number; // # of all non-완료 projects involved
  pmCount: number;
  urgent: number; // # of urgent (D-7) "진행" projects
};

function dDayDiff(deadline: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function TeamWorkloadBar({ projects, assignee, setAssignee }: Props) {
  const [expanded, setExpanded] = useState(false);

  const stats = useMemo<MemberStat[]>(() => {
    const map = new Map<string, MemberStat>();
    for (const m of ALL_MEMBERS) {
      map.set(m.name, { name: m.name, rank: m.rank, active: 0, total: 0, pmCount: 0, urgent: 0 });
    }
    for (const p of projects) {
      const involved = new Set<string>([p.pm, ...p.members]);
      const isInProgress = p.status === "진행";
      const isOpen = p.status !== "완료";
      const diff = dDayDiff(p.deadline);
      const isUrgent = isInProgress && diff !== null && diff <= 7 && p.progress < 100;
      for (const name of involved) {
        const s = map.get(name);
        if (!s) continue;
        if (isInProgress) s.active += 1;
        if (isOpen) s.total += 1;
        if (p.pm === name && isOpen) s.pmCount += 1;
        if (isUrgent) s.urgent += 1;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.active - a.active || b.total - a.total);
  }, [projects]);

  const max = Math.max(1, ...stats.map((s) => s.active));
  const visible = expanded ? stats : stats.slice(0, 8);

  // Workload tone: green (light) → amber → red based on active count
  const toneFor = (active: number) => {
    const ratio = active / max;
    if (ratio >= 0.75) return { bar: "bg-red-400/70", text: "text-red-200", ring: "ring-red-400/40" };
    if (ratio >= 0.45) return { bar: "bg-amber-400/70", text: "text-amber-200", ring: "ring-amber-400/40" };
    if (ratio > 0) return { bar: "bg-emerald-400/60", text: "text-emerald-200", ring: "ring-emerald-400/30" };
    return { bar: "bg-white/15", text: "text-white/40", ring: "ring-white/10" };
  };

  return (
    <section
      aria-label="팀 워크로드"
      className="border-b border-white/10 bg-[#0A0A0A]"
    >
      <div className="mx-auto max-w-[1920px] px-10 py-3">
        <div className="flex items-center gap-3">
          <div className="flex shrink-0 items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-white/40" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
              담당자
            </span>
          </div>

          {/* Legend */}
          <div className="flex shrink-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-[10px] text-white/50">
            <span className="font-semibold uppercase tracking-wider text-white/35">범례</span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-3 rounded-full bg-emerald-400/60" />
              여유
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-3 rounded-full bg-amber-400/70" />
              보통
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-3 rounded-full bg-red-400/70" />
              과부하
            </span>
            <span className="text-white/30">|</span>
            <span className="font-mono">숫자</span>= 진행 중인 프로젝트 수
            <span className="text-white/30">|</span>
            <span className="inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500/25 px-1 font-mono text-[9px] font-bold text-red-200 ring-1 ring-red-500/40">
              !N
            </span>
            = D-7 이내 긴급 건수
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            {assignee && (
              <button
                type="button"
                onClick={() => setAssignee(null)}
                className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2 py-1 text-[11px] font-bold text-white"
              >
                전체 보기
              </button>
            )}
            {visible.map((s) => {
              const active = assignee === s.name;
              const tone = toneFor(s.active);
              const isDisabled = s.total === 0;
              return (
                <button
                  key={s.name}
                  type="button"
                  disabled={isDisabled}
                  aria-pressed={active}
                  onClick={() => setAssignee(active ? null : s.name)}
                  title={`${s.name} (${s.rank}) · 진행 ${s.active} / 미완료 ${s.total}${
                    s.pmCount ? ` · PM ${s.pmCount}` : ""
                  }${s.urgent ? ` · 긴급 ${s.urgent}` : ""}`}
                  className={`group inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold transition ${
                    active
                      ? "border-white/40 bg-white/15 text-white"
                      : isDisabled
                      ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-white/25"
                      : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25 hover:text-white"
                  }`}
                >
                  <span className={`relative flex h-1.5 w-6 overflow-hidden rounded-full bg-white/10 ring-1 ${tone.ring}`}>
                    <span
                      className={`h-full ${tone.bar} transition-all`}
                      style={{ width: `${(s.active / max) * 100}%` }}
                    />
                  </span>
                  <span>{s.name}</span>
                  <span className={`font-mono tabular-nums ${active ? "text-white" : tone.text}`}>
                    {s.active}
                  </span>
                  {s.urgent > 0 && (
                    <span className="ml-0.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500/25 px-1 font-mono text-[9px] font-bold text-red-200 ring-1 ring-red-500/40">
                      !{s.urgent}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {stats.length > 8 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-semibold text-white/60 hover:text-white"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" /> 접기
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" /> 전체 {stats.length}명
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

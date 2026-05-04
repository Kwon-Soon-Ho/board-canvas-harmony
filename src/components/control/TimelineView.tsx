import { useMemo, useState } from "react";
import type { Project } from "@/lib/mockProjects";
import { DEPT_COLOR } from "@/lib/mockProjects";
import { AlertCircle } from "lucide-react";

interface Props {
  projects: Project[];
  onOpen: (id: string) => void;
}

const STATUS_COLOR_VAR: Record<string, string> = {
  진행: "var(--status-active)",
  상시: "var(--status-ongoing)",
  대기: "var(--status-pending)",
  완료: "var(--status-done)",
};

const WEEK_OPTIONS = [2, 4, 6, 8, 10, 12] as const;
type WeekOption = (typeof WEEK_OPTIONS)[number];

function parseDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function TimelineView({ projects, onOpen }: Props) {
  const [weeks, setWeeks] = useState<WeekOption>(8);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Build a window of N weeks starting from this week's start (Mon)
  const { rangeStart, rangeEnd, totalMs, ticks } = useMemo(() => {
    const start = new Date(today);
    // Start from beginning of current week (Mon)
    const day = (start.getDay() + 6) % 7; // 0 = Mon
    start.setDate(start.getDate() - day);
    const end = new Date(start);
    end.setDate(end.getDate() + weeks * 7);
    const totalMs = end.getTime() - start.getTime();

    // Tick every 1 or 2 weeks depending on span
    const tickStepWeeks = weeks <= 6 ? 1 : 2;
    const ticks: { date: Date; label: string }[] = [];
    for (let w = 0; w <= weeks; w += tickStepWeeks) {
      const t = new Date(start);
      t.setDate(t.getDate() + w * 7);
      ticks.push({
        date: t,
        label: `${t.getMonth() + 1}/${t.getDate()}`,
      });
    }
    return { rangeStart: start, rangeEnd: end, totalMs, ticks };
  }, [today, weeks]);

  // Sort by deadline asc; show only dated, within window
  const items = useMemo(() => {
    return projects
      .map((p) => ({ p, d: parseDate(p.deadline) }))
      .filter((x): x is { p: Project; d: Date } => !!x.d)
      .filter(({ d }) => d >= rangeStart && d <= rangeEnd)
      .sort((a, b) => a.d.getTime() - b.d.getTime());
  }, [projects, rangeStart, rangeEnd]);

  const ongoing = useMemo(() => projects.filter((p) => !parseDate(p.deadline)), [projects]);

  const todayLeftPct =
    today >= rangeStart && today <= rangeEnd
      ? ((today.getTime() - rangeStart.getTime()) / totalMs) * 100
      : null;

  return (
    <section aria-label="타임라인" className="pb-24">
      {/* Range filter */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
          기간
        </span>
        <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 backdrop-blur-md">
          {WEEK_OPTIONS.map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={weeks === w}
              onClick={() => setWeeks(w)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                weeks === w ? "bg-white/20 text-white" : "text-white/50 hover:text-white"
              }`}
            >
              {w}주
            </button>
          ))}
        </div>
        <span className="text-[11px] font-mono text-white/40">
          {`${rangeStart.getFullYear()}.${String(rangeStart.getMonth() + 1).padStart(2, "0")}.${String(rangeStart.getDate()).padStart(2, "0")}`}
          {" → "}
          {(() => {
            const e = new Date(rangeEnd);
            e.setDate(e.getDate() - 1);
            return `${e.getFullYear()}.${String(e.getMonth() + 1).padStart(2, "0")}.${String(e.getDate()).padStart(2, "0")}`;
          })()}
        </span>
      </div>

      {/* Tick header */}
      <div className="mb-3 grid border-b border-white/10" style={{ gridTemplateColumns: `220px 1fr` }}>
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
          프로젝트
        </div>
        <div className="relative h-8">
          {ticks.map((t, i) => {
            const left = ((t.date.getTime() - rangeStart.getTime()) / totalMs) * 100;
            return (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-white/10 pl-1 text-[10px] font-bold tabular-nums text-white/50"
                style={{ left: `${left}%` }}
              >
                {t.label}
              </div>
            );
          })}
          {todayLeftPct !== null && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 w-px bg-red-400/70"
              style={{ left: `${todayLeftPct}%` }}
              aria-label="오늘"
            >
              <span className="absolute -top-1 -left-3 rounded bg-red-500/90 px-1 text-[9px] font-bold text-white">
                TODAY
              </span>
            </div>
          )}
        </div>
      </div>

      {items.length === 0 && ongoing.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-white/10 text-[13px] text-white/40">
          이 기간에 표시할 프로젝트가 없습니다.
        </div>
      ) : (
        <div className="flex flex-col">
          {items.map(({ p, d }) => {
            const barStart = d < today ? d : today;
            const startClamp = barStart < rangeStart ? rangeStart : barStart > rangeEnd ? rangeEnd : barStart;
            const endClamp = d < rangeStart ? rangeStart : d > rangeEnd ? rangeEnd : d;
            const leftPct = ((startClamp.getTime() - rangeStart.getTime()) / totalMs) * 100;
            const widthPct = Math.max(
              0.6,
              ((endClamp.getTime() - startClamp.getTime()) / totalMs) * 100
            );
            const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
            const isInProgress = p.status === "진행";
            const isUrgent = isInProgress && diffDays <= 7 && p.progress < 100;
            const colorVar = STATUS_COLOR_VAR[p.status] ?? "var(--status-active)";
            const openIssues = p.issues.filter((i) => !i.resolved).length;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpen(p.id)}
                className="grid items-center border-b border-white/5 py-2 text-left transition hover:bg-white/[0.03]"
                style={{ gridTemplateColumns: `220px 1fr` }}
              >
                <div className="flex min-w-0 items-center gap-2 px-3">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: DEPT_COLOR[p.department],
                      boxShadow: `0 0 6px ${DEPT_COLOR[p.department]}`,
                    }}
                  />
                  <span className="truncate text-[12px] font-bold text-white">{p.title}</span>
                  {openIssues > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-red-500/15 px-1 py-0.5 font-mono text-[10px] font-bold text-red-300">
                      <AlertCircle className="h-2.5 w-2.5" />
                      {openIssues}
                    </span>
                  )}
                </div>

                <div className="relative h-7">
                  <div
                    className={`absolute top-1 h-5 rounded-md border ${
                      isUrgent ? "border-red-500/60" : "border-white/15"
                    } overflow-hidden`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      background: `color-mix(in srgb, ${colorVar} 18%, transparent)`,
                    }}
                    title={`${p.title} · ${p.deadline} · ${p.progress}%`}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${p.progress}%`,
                        background: isUrgent ? "var(--status-active)" : colorVar,
                        opacity: 0.85,
                      }}
                    />
                    <span className="absolute inset-0 flex items-center justify-between px-1.5 font-mono text-[10px] font-bold text-white/90">
                      <span>{p.progress}%</span>
                      <span className={isUrgent ? "text-red-200" : "text-white/70"}>
                        {diffDays === 0 ? "D-day" : diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`}
                      </span>
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {ongoing.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            상시 · 마감 미정
          </div>
          <div className="flex flex-wrap gap-2">
            {ongoing.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpen(p.id)}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[12px] text-white/80 hover:border-white/30 hover:text-white"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: DEPT_COLOR[p.department],
                    boxShadow: `0 0 6px ${DEPT_COLOR[p.department]}`,
                  }}
                />
                {p.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

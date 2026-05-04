import { useMemo } from "react";
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

function parseDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function TimelineView({ projects, onOpen }: Props) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Build a 6-month window starting from this month
  const months = useMemo(() => {
    const arr: { y: number; m: number; label: string; start: Date; end: Date }[] = [];
    const base = new Date(today.getFullYear(), today.getMonth(), 1);
    for (let i = 0; i < 6; i++) {
      const start = new Date(base.getFullYear(), base.getMonth() + i, 1);
      const end = new Date(base.getFullYear(), base.getMonth() + i + 1, 1);
      arr.push({
        y: start.getFullYear(),
        m: start.getMonth(),
        label: `${start.getFullYear()}.${String(start.getMonth() + 1).padStart(2, "0")}`,
        start,
        end,
      });
    }
    return arr;
  }, [today]);

  const rangeStart = months[0].start;
  const rangeEnd = months[months.length - 1].end;
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();

  // Sort by deadline asc; show only dated, non-완료
  const items = useMemo(() => {
    return projects
      .map((p) => ({ p, d: parseDate(p.deadline) }))
      .filter((x): x is { p: Project; d: Date } => !!x.d)
      .sort((a, b) => a.d.getTime() - b.d.getTime());
  }, [projects]);

  const ongoing = useMemo(() => projects.filter((p) => !parseDate(p.deadline)), [projects]);

  const todayLeftPct =
    today >= rangeStart && today <= rangeEnd
      ? ((today.getTime() - rangeStart.getTime()) / totalMs) * 100
      : null;

  return (
    <section aria-label="타임라인" className="pb-24">
      {/* Month header */}
      <div className="mb-3 grid border-b border-white/10" style={{ gridTemplateColumns: `220px 1fr` }}>
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
          프로젝트
        </div>
        <div className="relative grid" style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }}>
          {months.map((m) => (
            <div
              key={m.label}
              className="border-l border-white/10 px-2 py-2 text-[11px] font-bold tabular-nums text-white/60"
            >
              {m.label}
            </div>
          ))}
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
          타임라인에 표시할 프로젝트가 없습니다.
        </div>
      ) : (
        <div className="flex flex-col">
          {items.map(({ p, d }) => {
            // Bar from today (or rangeStart if past) to deadline
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

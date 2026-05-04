import { useMemo } from "react";
import type { Project, Status } from "@/lib/mockProjects";
import { AlertTriangle, Clock3, BarChart3 } from "lucide-react";

const STATUS_COLOR_VAR: Record<Status, string> = {
  진행: "var(--status-active)",
  상시: "var(--status-ongoing)",
  대기: "var(--status-pending)",
  완료: "var(--status-done)",
};

interface Props {
  /** All projects (unfiltered) — KPIs always reflect the whole picture */
  projects: Project[];
  /** Quick filter: only deadline ≤ 7 days */
  urgentOnly: boolean;
  setUrgentOnly: (v: boolean) => void;
  /** Quick filter: only projects with active issues */
  issuesOnly: boolean;
  setIssuesOnly: (v: boolean) => void;
  /** Click a status chip to toggle that status filter */
  statuses: Set<Status>;
  toggleStatus: (s: Status) => void;
}

function daysUntil(deadline: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function KpiBar({
  projects,
  urgentOnly,
  setUrgentOnly,
  issuesOnly,
  setIssuesOnly,
  statuses,
  toggleStatus,
}: Props) {
  const stats = useMemo(() => {
    const statusCount: Record<Status, number> = { 진행: 0, 상시: 0, 대기: 0, 완료: 0 };
    let urgent = 0;
    let issues = 0;
    let progressSum = 0;
    let progressCount = 0;
    for (const p of projects) {
      statusCount[p.status] = (statusCount[p.status] ?? 0) + 1;
      const d = daysUntil(p.deadline);
      if (d !== null && d <= 7 && p.progress < 100) urgent += 1;
      const open = p.issues.filter((i) => !i.resolved).length;
      if (open > 0) issues += 1;
      if (p.status !== "완료") {
        progressSum += p.progress;
        progressCount += 1;
      }
    }
    const avg = progressCount > 0 ? Math.round(progressSum / progressCount) : 0;
    return { statusCount, urgent, issues, avg };
  }, [projects]);

  const STATUSES: Status[] = ["진행", "상시", "대기", "완료"];

  return (
    <section
      aria-label="대시보드 요약"
      className="border-b border-white/10 bg-[#080808]"
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 px-10 py-3">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-white/35">
          오늘의 상황
        </span>

        {/* Status chips — toggle as filters */}
        {STATUSES.map((s) => {
          const active = statuses.has(s);
          const colorVar = STATUS_COLOR_VAR[s];
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => toggleStatus(s)}
              className={`group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition ${
                active
                  ? "border-white/25 bg-white/10 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white"
              }`}
              title={`${s} 상태로 필터`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: colorVar, boxShadow: `0 0 6px ${colorVar}` }}
              />
              <span>{s}</span>
              <span
                className={`font-mono tabular-nums ${
                  active ? "text-white" : "text-white/80"
                }`}
              >
                {stats.statusCount[s]}
              </span>
            </button>
          );
        })}

        <div className="mx-2 h-5 w-px bg-white/10" />

        {/* Urgent quick toggle */}
        <button
          type="button"
          aria-pressed={urgentOnly}
          onClick={() => setUrgentOnly(!urgentOnly)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition ${
            urgentOnly
              ? "border-amber-400/50 bg-amber-400/15 text-amber-200"
              : "border-white/10 bg-white/[0.03] text-white/60 hover:border-amber-400/40 hover:text-amber-200"
          }`}
          title="마감 7일 이내 미완료 프로젝트만 보기"
        >
          <Clock3 className="h-3.5 w-3.5" />
          <span>마감임박</span>
          <span className="font-mono tabular-nums">{stats.urgent}</span>
        </button>

        {/* Issues quick toggle */}
        <button
          type="button"
          aria-pressed={issuesOnly}
          onClick={() => setIssuesOnly(!issuesOnly)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition ${
            issuesOnly
              ? "border-red-500/50 bg-red-500/15 text-red-300"
              : "border-white/10 bg-white/[0.03] text-white/60 hover:border-red-500/40 hover:text-red-300"
          }`}
          title="미해결 이슈가 있는 프로젝트만 보기"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>이슈</span>
          <span className="font-mono tabular-nums">{stats.issues}</span>
        </button>

        <div className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[12px] font-semibold text-white/70">
          <BarChart3 className="h-3.5 w-3.5 text-white/50" />
          <span className="text-white/50">평균 진행률</span>
          <span className="font-mono tabular-nums text-white">{stats.avg}%</span>
        </div>
      </div>
    </section>
  );
}

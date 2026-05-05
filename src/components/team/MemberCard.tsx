import { Briefcase, CalendarOff, Crown, AlertCircle } from "lucide-react";
import { type MemberStats, deptColorFor } from "@/lib/teamStats";
import { dDay } from "@/lib/mockSchedule";

interface Props {
  stats: MemberStats;
  onClick: () => void;
  selected?: boolean;
}

export function MemberCard({ stats, onClick, selected }: Props) {
  const color = deptColorFor(stats.department);
  const next = [...stats.activeProjects]
    .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.deadline))
    .sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
  const dd = next ? dDay(next.deadline) : null;
  const ddTone =
    dd === null ? "" : dd < 0 ? "text-red-400" : dd <= 7 ? "text-amber-300" : "text-gray-400";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-lg border bg-[#0a0a0a] p-4 transition-colors hover:border-white/30 ${
        selected ? "border-teal-500/60 ring-1 ring-teal-500/40" : "border-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-semibold text-black shrink-0"
            style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}55` }}
          >
            {stats.name.slice(-2)}
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-foreground truncate flex items-center gap-1">
              {stats.name}
              {stats.pmProjects.length > 0 && (
                <Crown className="h-3.5 w-3.5 text-amber-300" aria-label="PM" />
              )}
            </p>
            <p className="text-[12px] text-gray-400">
              {stats.department} · {stats.rank}
            </p>
          </div>
        </div>
        {stats.onLeaveToday && (
          <span className="px-1.5 py-0.5 rounded text-[11px] bg-blue-500/15 text-blue-300 border border-blue-500/30">
            휴가중
          </span>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[12px] text-gray-400 mb-1">
          <span>가동률</span>
          <span className={`font-semibold ${stats.workloadColor}`}>{stats.workload}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full ${
              stats.workload >= 91
                ? "bg-red-500"
                : stats.workload >= 61
                  ? "bg-amber-400"
                  : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(100, stats.workload)}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[12px] text-gray-400">
        <span className="inline-flex items-center gap-1">
          <Briefcase className="h-3.5 w-3.5" />
          진행 {stats.activeProjects.length}
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarOff className="h-3.5 w-3.5" />
          연차 {stats.leavesThisMonth.length}
        </span>
        {stats.openIssues.length > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-300">
            <AlertCircle className="h-3.5 w-3.5" />
            이슈 {stats.openIssues.length}
          </span>
        )}
      </div>

      {next && (
        <div className="mt-3 pt-3 border-t border-white/5 text-[12px]">
          <span className="text-gray-500">다음 마감 · </span>
          <span className="text-gray-300 truncate">{next.title}</span>
          <span className={`ml-1 font-medium ${ddTone}`}>
            {dd !== null && (dd < 0 ? `D+${Math.abs(dd)}` : `D-${dd}`)}
          </span>
        </div>
      )}
    </button>
  );
}

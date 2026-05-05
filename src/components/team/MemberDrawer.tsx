import { X, Crown, ExternalLink, Plus } from "lucide-react";
import { type MemberStats, deptColorFor } from "@/lib/teamStats";
import { dDay } from "@/lib/mockSchedule";
import { openProjectWindow } from "@/lib/sync";
import { useNavigate } from "@tanstack/react-router";

interface Props {
  stats: MemberStats;
  onClose: () => void;
  onAddLeave: () => void;
  onLeaveDeleted: () => void;
  onDeleteLeave: (id: string) => void;
}

export function MemberDrawer({ stats, onClose, onAddLeave, onDeleteLeave }: Props) {
  const color = deptColorFor(stats.department);
  const navigate = useNavigate();

  return (
    <aside className="w-[380px] shrink-0 border-l border-white/10 bg-[#0a0a0a] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="h-10 w-10 rounded-full flex items-center justify-center text-[14px] font-semibold text-black"
            style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}55` }}
          >
            {stats.name.slice(-2)}
          </span>
          <div className="min-w-0">
            <p className="text-[16px] font-semibold text-foreground flex items-center gap-1.5">
              {stats.name}
              {stats.pmProjects.length > 0 && (
                <Crown className="h-4 w-4 text-amber-300" aria-label="PM" />
              )}
            </p>
            <p className="text-[12px] text-gray-400">
              {stats.department} · {stats.rank}
              {stats.onLeaveToday && (
                <span className="ml-2 text-blue-300">· 오늘 휴가</span>
              )}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-foreground" aria-label="닫기">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {/* Workload */}
        <section>
          <p className="text-[12px] uppercase tracking-wider text-gray-500 mb-2">워크로드</p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className={`text-[28px] font-bold ${stats.workloadColor}`}>{stats.workload}%</span>
            <span className="text-[12px] text-gray-500">
              진행 {stats.activeProjects.length} · 대기 {stats.pendingProjects.length} · 완료{" "}
              {stats.doneProjects.length}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
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
        </section>

        {/* Active projects */}
        <section>
          <p className="text-[12px] uppercase tracking-wider text-gray-500 mb-2">
            진행 중 프로젝트
          </p>
          {stats.activeProjects.length === 0 ? (
            <p className="text-[13px] text-gray-500">진행 중인 프로젝트가 없습니다.</p>
          ) : (
            <div className="space-y-1.5">
              {stats.activeProjects.map((p) => {
                const dd = /^\d{4}-\d{2}-\d{2}$/.test(p.deadline) ? dDay(p.deadline) : null;
                const tone =
                  dd === null
                    ? "text-gray-500"
                    : dd < 0
                      ? "text-red-400"
                      : dd <= 7
                        ? "text-amber-300"
                        : "text-gray-400";
                return (
                  <button
                    key={p.id}
                    onClick={() => openProjectWindow(p.id)}
                    className="w-full flex items-center justify-between text-left px-3 py-2 rounded-md bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-foreground truncate flex items-center gap-1.5">
                        {p.pm === stats.name && (
                          <Crown className="h-3 w-3 text-amber-300 shrink-0" />
                        )}
                        {p.title}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {p.department} · {p.status} · {p.progress}%
                      </p>
                    </div>
                    <span className={`text-[12px] font-medium ${tone} ml-2`}>
                      {dd !== null && (dd < 0 ? `D+${Math.abs(dd)}` : `D-${dd}`)}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-gray-600 group-hover:text-gray-300 ml-2" />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Open issues */}
        {stats.openIssues.length > 0 && (
          <section>
            <p className="text-[12px] uppercase tracking-wider text-gray-500 mb-2">
              미해결 이슈 ({stats.openIssues.length})
            </p>
            <div className="space-y-1">
              {stats.openIssues.slice(0, 6).map((i) => (
                <button
                  key={i.issueId}
                  onClick={() => openProjectWindow(i.project.id)}
                  className="w-full text-left px-3 py-2 rounded-md bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10"
                >
                  <p className="text-[13px] text-amber-200 truncate">{i.title}</p>
                  <p className="text-[11px] text-gray-500">{i.project.title}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Leaves this month */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] uppercase tracking-wider text-gray-500">
              이번 달 연차 ({stats.leavesThisMonth.length})
            </p>
            <button
              onClick={onAddLeave}
              className="inline-flex items-center gap-1 text-[12px] text-teal-300 hover:text-teal-200"
            >
              <Plus className="h-3 w-3" /> 추가
            </button>
          </div>
          {stats.leavesThisMonth.length === 0 ? (
            <p className="text-[13px] text-gray-500">이번 달 등록된 연차가 없습니다.</p>
          ) : (
            <div className="space-y-1">
              {stats.leavesThisMonth.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between px-3 py-2 rounded-md bg-blue-500/5 border border-blue-500/20"
                >
                  <div>
                    <p className="text-[13px] text-blue-200">
                      {l.leave_date} · {l.leave_type}
                      {l.leave_type === "시차" && l.start_time && (
                        <span className="text-blue-300/70 ml-1">
                          ({l.start_time}~{l.end_time})
                        </span>
                      )}
                    </p>
                    {l.reason && <p className="text-[11px] text-gray-500">{l.reason}</p>}
                  </div>
                  <button
                    onClick={() => onDeleteLeave(l.id)}
                    className="text-gray-500 hover:text-red-400 text-[12px]"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="border-t border-white/10 p-4">
        <button
          onClick={() =>
            navigate({ to: "/schedule", search: { member: stats.name } as any })
          }
          className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-[13px] text-gray-200"
        >
          일정 관리에서 보기 →
        </button>
      </div>
    </aside>
  );
}

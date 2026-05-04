import { useMemo } from "react";
import type { Project } from "@/lib/mockProjects";
import {
  AlertOctagon,
  CalendarClock,
  CheckCircle2,
  Sparkles,
  Activity,
} from "lucide-react";

type FeedItem = {
  id: string;
  kind: "urgent" | "issue" | "completed" | "new";
  projectId: string;
  projectTitle: string;
  text: string;
  meta?: string;
  /** Sort key — higher = more important / more recent */
  sortKey: number;
};

interface Props {
  projects: Project[];
  onOpen: (id: string) => void;
}

function dDayDiff(deadline?: string): number | null {
  if (!deadline || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function ddayLabel(diff: number) {
  if (diff === 0) return "D-day";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

export function ActivityFeed({ projects, onOpen }: Props) {
  const items = useMemo<FeedItem[]>(() => {
    const out: FeedItem[] = [];

    for (const p of projects) {
      const isInProgress = p.status === "진행";
      const diff = dDayDiff(p.deadline);

      // Urgent / overdue (only "진행" status, matches card highlight rule)
      if (isInProgress && diff !== null && p.progress < 100 && diff <= 7) {
        out.push({
          id: `urgent-${p.id}`,
          kind: diff < 0 ? "urgent" : "urgent",
          projectId: p.id,
          projectTitle: p.title,
          text: diff < 0 ? "마감 초과" : `마감 ${ddayLabel(diff)}`,
          meta: `${p.progress}% · ${p.pm}`,
          // overdue most urgent: very high; nearer = higher
          sortKey: 10000 - diff * 10,
        });
      }

      // Open issues
      const openIssues = p.issues.filter((i) => !i.resolved);
      if (openIssues.length > 0) {
        out.push({
          id: `issue-${p.id}`,
          kind: "issue",
          projectId: p.id,
          projectTitle: p.title,
          text: `미해결 이슈 ${openIssues.length}건`,
          meta: openIssues[0].title,
          sortKey: 5000 + openIssues.length * 100,
        });
      }

      // Recently completed tasks (assume mock projects can include 완료 status)
      const completedTasks = p.tasks.filter((t) => t.status === "완료");
      if (completedTasks.length > 0) {
        const latest = completedTasks[completedTasks.length - 1];
        out.push({
          id: `done-${p.id}-${latest.id}`,
          kind: "completed",
          projectId: p.id,
          projectTitle: p.title,
          text: `${latest.title} 완료`,
          meta: latest.assignee,
          // older / less important than urgents/issues
          sortKey: 1000 + (parseInt(latest.endDate.replace(/-/g, ""), 10) % 10000),
        });
      }
    }

    // Recently added projects (highest id = newest in this mock model)
    const sortedById = [...projects].sort((a, b) => b.id.localeCompare(a.id));
    sortedById.slice(0, 3).forEach((p, idx) => {
      out.push({
        id: `new-${p.id}`,
        kind: "new",
        projectId: p.id,
        projectTitle: p.title,
        text: "프로젝트 추가됨",
        meta: `${p.department} · ${p.pm}`,
        sortKey: 800 - idx,
      });
    });

    return out.sort((a, b) => b.sortKey - a.sortKey).slice(0, 18);
  }, [projects]);

  const counts = useMemo(() => {
    return {
      urgent: items.filter((i) => i.kind === "urgent").length,
      issue: items.filter((i) => i.kind === "issue").length,
      completed: items.filter((i) => i.kind === "completed").length,
      new: items.filter((i) => i.kind === "new").length,
    };
  }, [items]);

  return (
    <aside
      aria-label="활동 피드"
      className="sticky top-6 hidden xl:flex flex-col w-[300px] shrink-0 max-h-[calc(100vh-3rem)] rounded-2xl border border-white/10 bg-white/[0.025] backdrop-blur-md overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-white/60" />
          <h2 className="text-[13px] font-black uppercase tracking-widest text-white/80">
            활동 피드
          </h2>
        </div>
        <span className="font-mono text-[11px] font-bold text-white/40 tabular-nums">
          {items.length}
        </span>
      </div>

      {/* Quick summary chips — labeled so the meaning is obvious */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5 text-[11px] font-bold">
        <span
          className="inline-flex items-center gap-1 text-red-300/90"
          title="마감 임박 + 미해결 이슈 건수"
        >
          <AlertOctagon className="w-3 h-3" />
          <span className="text-white/45 font-semibold">긴급</span>
          <span className="tabular-nums">{counts.urgent + counts.issue}</span>
        </span>
        <span className="text-white/15">·</span>
        <span
          className="inline-flex items-center gap-1 text-emerald-300/80"
          title="최근 완료된 업무 수"
        >
          <CheckCircle2 className="w-3 h-3" />
          <span className="text-white/45 font-semibold">완료</span>
          <span className="tabular-nums">{counts.completed}</span>
        </span>
        <span className="text-white/15">·</span>
        <span
          className="inline-flex items-center gap-1 text-white/60"
          title="최근 추가된 프로젝트 수"
        >
          <Sparkles className="w-3 h-3" />
          <span className="text-white/45 font-semibold">신규</span>
          <span className="tabular-nums">{counts.new}</span>
        </span>
      </div>

      {/* Feed list */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex h-40 items-center justify-center px-5 text-center text-[12px] text-white/40">
            아직 표시할 활동이 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onOpen(item.projectId)}
                  className="group flex w-full items-start gap-3 px-5 py-3 text-left transition hover:bg-white/[0.04] focus:outline-none focus-visible:bg-white/[0.06]"
                >
                  <FeedIcon kind={item.kind} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-bold text-white/85 group-hover:text-white">
                      {item.projectTitle}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] font-medium text-white/50">
                      {item.text}
                      {item.meta && (
                        <span className="text-white/30"> · {item.meta}</span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function FeedIcon({ kind }: { kind: FeedItem["kind"] }) {
  if (kind === "urgent")
    return (
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-500/15 ring-1 ring-red-500/30">
        <CalendarClock className="h-3.5 w-3.5 text-red-300" />
      </span>
    );
  if (kind === "issue")
    return (
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-500/15 ring-1 ring-red-500/30">
        <AlertOctagon className="h-3.5 w-3.5 text-red-300" />
      </span>
    );
  if (kind === "completed")
    return (
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 ring-1 ring-emerald-500/30">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
      </span>
    );
  return (
    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/15">
      <Sparkles className="h-3.5 w-3.5 text-white/70" />
    </span>
  );
}

import { useMemo, useState } from "react";
import type { Project, Status } from "@/lib/mockProjects";
import { DEPT_COLOR } from "@/lib/mockProjects";
import { Trash2, Calendar, AlertCircle, GripVertical } from "lucide-react";

const STATUS_ORDER: Status[] = ["진행", "상시", "대기", "완료"];
const STATUS_COLOR_VAR: Record<Status, string> = {
  진행: "var(--status-active)",
  상시: "var(--status-ongoing)",
  대기: "var(--status-pending)",
  완료: "var(--status-done)",
};

interface Props {
  projects: Project[];
  onOpen: (id: string) => void;
  onDelete?: (id: string) => void;
  onStatusChange: (id: string, next: Status) => void;
}

function ddayLabel(deadline?: string): { label: string; urgent: boolean } | null {
  if (!deadline || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const label = diff === 0 ? "D-day" : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
  return { label, urgent: diff <= 7 };
}

export function KanbanBoard({ projects, onOpen, onDelete, onStatusChange }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<Status | null>(null);

  const columns = useMemo(() => {
    const map: Record<Status, Project[]> = { 진행: [], 상시: [], 대기: [], 완료: [] };
    for (const p of projects) map[p.status].push(p);
    return map;
  }, [projects]);

  const handleDrop = (s: Status) => {
    if (draggingId) {
      const p = projects.find((x) => x.id === draggingId);
      if (p && p.status !== s) onStatusChange(draggingId, s);
    }
    setDraggingId(null);
    setOverCol(null);
  };

  return (
    <section aria-label="칸반 보드" className="grid grid-cols-1 gap-4 pb-24 md:grid-cols-2 xl:grid-cols-4">
      {STATUS_ORDER.map((s) => {
        const colorVar = STATUS_COLOR_VAR[s];
        const items = columns[s];
        const isOver = overCol === s;
        return (
          <div
            key={s}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(s);
            }}
            onDragLeave={() => setOverCol((cur) => (cur === s ? null : cur))}
            onDrop={() => handleDrop(s)}
            className={`flex min-h-[400px] flex-col rounded-xl border bg-white/[0.02] transition ${
              isOver ? "border-white/40 bg-white/[0.06]" : "border-white/10"
            }`}
          >
            <header
              className="flex items-center justify-between border-b border-white/10 px-3 py-3"
              style={{
                background: `linear-gradient(to bottom, color-mix(in srgb, ${colorVar} 12%, transparent), transparent)`,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: colorVar, boxShadow: `0 0 8px ${colorVar}` }}
                />
                <span className="text-[15px] font-bold text-white">{s}</span>
                <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[12px] font-bold tabular-nums text-white/75">
                  {items.length}
                </span>
              </div>
            </header>

            <div className="flex flex-1 flex-col gap-2 p-2">
              {items.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-[12px] text-white/25">
                  비어 있음
                </div>
              ) : (
                items.map((p) => {
                  const isPending = p.status === "대기";
                  const dd = isPending ? null : ddayLabel(p.deadline);
                  const isInProgress = p.status === "진행";
                  const urgentRing =
                    isInProgress && dd?.urgent && p.progress < 100
                      ? "ring-1 ring-amber-400/70 shadow-[0_0_18px_rgba(251,191,36,0.25)]"
                      : "";
                  const openIssues = p.issues.filter((i) => !i.resolved).length;
                  return (
                    <article
                      key={p.id}
                      draggable
                      onDragStart={() => setDraggingId(p.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setOverCol(null);
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onOpen(p.id)}
                      className={`group cursor-pointer rounded-lg border border-white/10 bg-[#141414] p-3 transition hover:border-white/30 hover:bg-[#1a1a1a] ${urgentRing} ${
                        draggingId === p.id ? "opacity-40" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-white/30 group-hover:text-white/60" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{
                                backgroundColor: DEPT_COLOR[p.department],
                                boxShadow: `0 0 6px ${DEPT_COLOR[p.department]}`,
                              }}
                            />
                            <span className="truncate text-[12px] font-semibold uppercase tracking-wider text-white/55">
                              {p.department}
                            </span>
                          </div>
                          <h3 className="mt-1.5 line-clamp-2 text-[15px] font-bold leading-snug text-white">
                            {p.title}
                          </h3>

                          <div className="mt-2.5 flex items-center gap-2 text-[13px] text-white/65">
                            {dd && (
                              <span
                                className={`inline-flex items-center gap-1 font-mono font-bold tabular-nums ${
                                  isInProgress && dd.urgent && p.progress < 100
                                    ? "text-amber-300"
                                    : "text-white/70"
                                }`}
                              >
                                <Calendar className="h-3.5 w-3.5" />
                                {dd.label}
                              </span>
                            )}
                            {openIssues > 0 && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-red-500/15 px-1.5 py-0.5 font-mono text-[12px] font-bold text-red-300">
                                <AlertCircle className="h-3.5 w-3.5" />
                                {openIssues}
                              </span>
                            )}
                            <span className="ml-auto font-mono tabular-nums text-white/55">
                              {p.progress}%
                            </span>
                          </div>

                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${p.progress}%`,
                                background:
                                  isInProgress && dd?.urgent && p.progress < 100
                                    ? "oklch(0.82 0.17 85)"
                                    : colorVar,
                              }}
                            />
                          </div>

                          <div className="mt-2.5 flex items-center justify-between text-[13px] text-white/65">
                            <span className="truncate">PM · {p.pm}</span>
                            {onDelete && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(p.id);
                                }}
                                aria-label="프로젝트 삭제"
                                className="rounded p-1 text-white/30 opacity-0 transition hover:bg-white/10 hover:text-red-300 group-hover:opacity-100"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

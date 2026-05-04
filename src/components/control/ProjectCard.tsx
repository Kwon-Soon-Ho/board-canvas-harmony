import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "@/lib/mockProjects";
import { getOptimizedUrl } from "@/lib/mockProjects";
import { DeptTag } from "./DeptTag";
import { StatusTag } from "./StatusTag";

import { Trash2, Calendar } from "lucide-react";

interface Props {
  project: Project;
  onOpen: (id: string) => void;
  onDelete?: () => void;
  quarterRange?: { year: number; quarter: 1 | 2 | 3 | 4 } | null;
}

function ddayLabel(deadline?: string): string {
  if (!deadline) return "일정 미정";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return deadline;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "D-day";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

export function ProjectCard({ project, onOpen, onDelete, quarterRange }: Props) {
  const [hover, setHover] = useState(false);
  const [hasHovered, setHasHovered] = useState(false);
  const [idx, setIdx] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const timer = useRef<number | null>(null);

  const seq = useMemo(() => {
    const order = project.thumbnail?.sequence ?? project.images.map((_, i) => i);
    return order.map((i) => project.images[i]).filter(Boolean);
  }, [project]);

  useEffect(() => {
    if (hover) setHasHovered(true);
  }, [hover]);

  useEffect(() => {
    if (!hover || seq.length < 2) return;
    timer.current = window.setInterval(() => {
      setIdx((i) => (i + 1) % seq.length);
    }, 2000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [hover, seq.length]);

  useEffect(() => {
    if (!hover) {
      setIdx(0);
      setShowTooltip(false);
    }
  }, [hover]);

  const visibleMembers = project.members.slice(0, 2);
  const restCount = project.members.length - visibleMembers.length;
  const dday = ddayLabel(project.deadline);
  const progress = project.progress;

  // D-day numeric value for risk gating
  const ddayDiff = (() => {
    if (!project.deadline || !/^\d{4}-\d{2}-\d{2}$/.test(project.deadline)) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(project.deadline);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / 86400000);
  })();
  const isInProgress = project.status === "진행";
  const isUrgent = isInProgress && ddayDiff !== null && ddayDiff >= 0 && ddayDiff <= 7 && progress < 100;
  const isOverdue = isInProgress && ddayDiff !== null && ddayDiff < 0 && progress < 100;
  const isCompleted = progress >= 100;
  const showDday = !!project.deadline && project.deadline !== "상시" && !isCompleted;

  // Active issues count
  const activeIssues = project.issues.filter((i) => !i.resolved).length;

  // Quarter overflow detection — does project span beyond the selected quarter?
  const overflow = useMemo(() => {
    if (!quarterRange) return null;
    const { year, quarter } = quarterRange;
    const qStart = new Date(year, (quarter - 1) * 3, 1);
    const qEnd = new Date(year, quarter * 3, 0);
    qStart.setHours(0, 0, 0, 0);
    qEnd.setHours(23, 59, 59, 999);
    const sStr = project.startDate;
    const eStr = project.deadline;
    if (!eStr || eStr === "상시") return null;
    const s = sStr && /^\d{4}-\d{2}-\d{2}$/.test(sStr) ? new Date(sStr) : null;
    const e = /^\d{4}-\d{2}-\d{2}$/.test(eStr) ? new Date(eStr) : null;
    const carried = !!(s && s < qStart); // 시작이 분기 이전 → 이월
    const extends_ = !!(e && e > qEnd); // 마감이 분기 이후 → 연장
    if (!carried && !extends_) return null;
    return { carried, extends_ };
  }, [quarterRange, project.startDate, project.deadline]);

  // Progress-based color tier (used for both D-day badge and progress bar)
  // Urgent/Overdue use unified AMBER (yellow) — matches the "마감임박" filter color.
  const tier = (() => {
    if (!project.deadline || project.deadline === "상시") return "neutral" as const;
    if (progress >= 100) return "done" as const;
    if (isUrgent || isOverdue) return "urgent" as const;
    return "neutral" as const;
  })();

  const tierBadgeClass = {
    done: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    urgent: "bg-amber-400/15 text-amber-300 ring-amber-400/40",
    neutral: "bg-slate-500/10 text-slate-300 ring-slate-500/20",
  }[tier];

  const tierBarClass = {
    done: "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]",
    urgent: "bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]",
    neutral: "bg-slate-400 shadow-[0_0_15px_rgba(148,163,184,0.4)]",
  }[tier];

  // Always-on slim bar color (subtle version)
  const tierBarSubtleClass = {
    done: "bg-emerald-400/80",
    urgent: "bg-amber-400/90",
    neutral: "bg-slate-400/60",
  }[tier];

  // Urgency ring on the entire card — unified amber/yellow
  const urgencyRingClass = (isOverdue || isUrgent)
    ? "ring-2 ring-amber-400/70 shadow-[0_0_0_1px_rgba(251,191,36,0.45),0_0_32px_rgba(251,191,36,0.55),0_0_60px_rgba(251,191,36,0.3)]"
    : "";

  const handleKeyOpen = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(project.id);
    }
  };

  return (
    <article className="relative aspect-[16/10]">
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`project-card group absolute left-0 top-0 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0F0F0F] text-left transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${urgencyRingClass} ${
          hover
            ? "z-50 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] scale-[1.25]"
            : "z-0 shadow-none scale-100"
        }`}
        style={{
          transformOrigin: "center top",
        }}
      >
        <button
          onClick={() => onOpen(project.id)}
          onKeyDown={handleKeyOpen}
          aria-label={`${project.title} 프로젝트 열기${activeIssues > 0 ? `, 미해결 이슈 ${activeIssues}건` : ""}`}
          className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-t-xl"
        >
          <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-neutral-900">
            {seq.map((img, i) => {
              const src = typeof img === 'string' ? img : img.url;
              if (i > 0 && !hasHovered) return null;
              return (
                <div
                  key={src + i}
                  className="absolute inset-0 transition-opacity duration-800 ease-in-out"
                  style={{ opacity: i === idx ? 1 : 0 }}
                >
                  <div
                    aria-hidden
                    className="absolute inset-0 scale-110 bg-cover bg-center opacity-40 blur-3xl"
                    style={{ backgroundImage: `url(${getOptimizedUrl(src, 'thumb')})` }}
                  />
                  <img
                    src={getOptimizedUrl(src, 'thumb')}
                    alt=""
                    loading={i === 0 ? "eager" : "lazy"}
                    className="relative z-[1] h-full w-full object-cover"
                  />
                </div>
              );
            })}
            
            <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none" />
            
            <div className="absolute left-3 top-3 z-[3] flex items-center gap-2 pointer-events-none">
              <DeptTag dept={project.department} />
              <StatusTag status={project.status} />
              {overflow && (
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 ring-1 ring-violet-400/60 backdrop-blur-md text-[10px] font-black text-violet-200 shadow-[0_0_10px_rgba(167,139,250,0.35)]"
                  title={[
                    overflow.carried ? `이전 분기에서 이월 (시작: ${project.startDate})` : null,
                    overflow.extends_ ? `다음 분기로 연장 (마감: ${project.deadline})` : null,
                  ].filter(Boolean).join(" · ")}
                >
                  {overflow.carried && <span>← 이월</span>}
                  {overflow.carried && overflow.extends_ && <span className="text-violet-400/60">·</span>}
                  {overflow.extends_ && <span>연장 →</span>}
                </span>
              )}
            </div>

            {/* Always-on issue badge — high contrast for any background */}
            {activeIssues > 0 && (
              <div
                className="absolute right-3 top-3 z-[3] flex items-center gap-1 rounded-full bg-black/75 px-2 py-0.5 ring-1 ring-red-500/70 shadow-[0_2px_8px_rgba(0,0,0,0.5)] backdrop-blur-md pointer-events-none"
                title={`미해결 이슈 ${activeIssues}건`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,1)]" />
                <span className="font-mono text-[11px] font-bold text-red-300 tabular-nums">
                  {activeIssues}
                </span>
              </div>
            )}

            {/* Always-on urgency D-day badge — unified amber, high contrast */}
            {showDday && (isUrgent || isOverdue) && (
              <div
                className={`absolute right-3 z-[3] inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-black bg-black/75 text-amber-200 ring-1 ring-amber-400/70 shadow-[0_2px_10px_rgba(0,0,0,0.5),0_0_14px_rgba(251,191,36,0.45)] backdrop-blur-md pointer-events-none ${
                  activeIssues > 0 ? "top-10" : "top-3"
                }`}
                title={`마감 ${dday}`}
              >
                {dday}
              </div>
            )}
          </div>

          <div className={`relative bg-[#0F0F0F] px-4 py-3 ${hover ? '' : 'rounded-b-xl'}`}>
            <h3 className="truncate text-base font-bold tracking-tight text-white/90">
              {project.title}
            </h3>

            {/* Always-on slim progress bar at the bottom of the title block */}
            <div
              className="absolute bottom-0 left-0 h-[2px] w-full bg-white/[0.04]"
              aria-hidden
            >
              <div
                className={`h-full transition-all duration-700 ease-out ${tierBarSubtleClass}`}
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
          </div>
        </button>

        <div 
          className="grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] rounded-b-xl"
          style={{ 
            gridTemplateRows: hover ? "1fr" : "0fr",
            opacity: hover ? 1 : 0 
          }}
        >
          <div className="overflow-hidden rounded-b-xl">
            <div className="space-y-4 px-4 pb-5 pt-2 border-t border-white/[0.05]">
              {/* Info Hierarchy: PM and Members */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">PM</span>
                  <span className="text-sm font-semibold text-white/80">{project.pm}</span>
                </div>
                <div 
                  className="relative cursor-default text-[12px] text-white/40 font-medium"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  <span className="hover:text-white transition-colors duration-300">
                    {visibleMembers.join(", ")}
                    {restCount > 0 && <span className="ml-1 text-white/20 font-bold">외 {restCount}명</span>}
                  </span>
                </div>
              </div>

              {/* Progress Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/40 font-bold uppercase tracking-widest">진행률</span>
                  <span className="font-black text-white/90 tracking-tighter">{progress}%</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${tierBarClass}`}
                    style={{ width: hover ? `${progress}%` : "0%" }}
                  />
                </div>
              </div>

              {/* Deadline & D-Day */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-black ring-1 ring-inset ${tierBadgeClass}`}>
                    {dday}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[12px] font-bold text-white/75">
                    {project.deadline && project.deadline !== "상시" && <Calendar className="h-3 w-3 text-white/50" />}
                    {project.deadline || "일정 미정"}
                  </span>
                </div>
                {onDelete && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
                    className="p-1.5 rounded-md hover:bg-rose-500/20 hover:text-rose-400 text-white/30 transition-colors pointer-events-auto"
                    title="프로젝트 삭제"
                    aria-label={`${project.title} 프로젝트 삭제`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card Box Tooltip - Rendered outside overflow-hidden */}
        {restCount > 0 && (
          <div 
            className={`pointer-events-none absolute bottom-[110px] right-4 z-[60] w-[160px] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
              showTooltip ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
            }`}
          >
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0A0A0A]/95 p-3.5 shadow-2xl backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent" />
              <div className="relative z-[1]">
                <div className="mb-2.5 flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">담당자</span>
                  <span className="text-[10px] font-bold text-white/20">{project.members.length}</span>
                </div>
                <div className="space-y-1.5">
                  {project.members.map((m) => (
                    <div key={m} className="flex items-center gap-2.5 transition-transform duration-300 hover:translate-x-0.5">
                      <div className="h-1 w-1 rounded-full bg-white/30" />
                      <span className="text-[12px] font-medium text-white/80 tracking-tight">{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Tooltip Arrow */}
            <div className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 border-b border-r border-white/10 bg-[#0A0A0A]/95" />
          </div>
        )}
      </div>
    </article>
  );
}

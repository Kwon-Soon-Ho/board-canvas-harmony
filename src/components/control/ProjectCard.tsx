import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "@/lib/mockProjects";
import { getOptimizedUrl } from "@/lib/mockProjects";
import { DeptTag } from "./DeptTag";
import { StatusTag } from "./StatusTag";

import { Trash2 } from "lucide-react";

interface Props {
  project: Project;
  onOpen: (id: string) => void;
  onDelete?: () => void;
}

function ddayLabel(deadline: string): string {
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

export function ProjectCard({ project, onOpen, onDelete }: Props) {
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

  // Progress-based color tier (used for both D-day badge and progress bar)
  const tier = (() => {
    if (project.deadline === "상시") return "neutral" as const;
    if (progress >= 100) return "done" as const;
    if (progress >= 70) return "good" as const;
    if (progress >= 40) return "warn" as const;
    return "bad" as const;
  })();

  const tierBadgeClass = {
    done: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    good: "bg-white/10 text-white ring-white/20",
    warn: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
    bad: "bg-red-500/10 text-red-500 ring-red-500/20",
    neutral: "bg-slate-500/10 text-slate-300 ring-slate-500/20",
  }[tier];

  const tierBarClass = {
    done: "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]",
    good: "bg-white shadow-[0_0_15px_rgba(255,255,255,0.4)]",
    warn: "bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]",
    bad: "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]",
    neutral: "bg-slate-400 shadow-[0_0_15px_rgba(148,163,184,0.4)]",
  }[tier];

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
        className={`project-card group absolute left-0 top-0 w-full rounded-xl border border-white/10 bg-[#0F0F0F] text-left transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
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
          aria-label={`${project.title} 프로젝트 열기`}
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
            </div>
          </div>

          <div className={`bg-[#0F0F0F] px-4 py-3 ${hover ? '' : 'rounded-b-xl'}`}>
            <h3 className="truncate text-base font-bold tracking-tight text-white/90">
              {project.title}
            </h3>
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
                  <span className="text-white/40 font-bold uppercase tracking-widest">Efficiency</span>
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
                  <span className="text-[11px] text-white/40 font-medium">{project.deadline}</span>
                </div>
                {onDelete && (
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
                    className="p-1.5 rounded-md hover:bg-rose-500/20 hover:text-rose-400 text-white/30 transition-colors pointer-events-auto"
                    title="프로젝트 삭제"
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
    </div>
  );
}

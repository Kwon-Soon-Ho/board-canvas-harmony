import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "@/lib/mockProjects";
import { DeptTag } from "./DeptTag";
import { StatusTag } from "./StatusTag";

interface Props {
  project: Project;
  onOpen: (id: string) => void;
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

export function ProjectCard({ project, onOpen }: Props) {
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

  return (
    <div className="relative aspect-[16/10]">
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
          className="block w-full text-left focus:outline-none"
        >
          <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-neutral-900">
            {seq.map((src, i) => {
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
                    style={{ backgroundImage: `url(${src})` }}
                  />
                  <img
                    src={src}
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
                    className="h-full rounded-full bg-white transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                    style={{ width: hover ? `${progress}%` : "0%" }}
                  />
                </div>
              </div>

              {/* Deadline & D-Day */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded bg-red-500/10 px-1.5 py-0.5 text-[11px] font-black text-red-500 ring-1 ring-inset ring-red-500/20">
                    {dday}
                  </span>
                  <span className="text-[11px] text-white/40 font-medium">{project.deadline}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Box Tooltip - Rendered outside overflow-hidden */}
        {restCount > 0 && (
          <div 
            className={`pointer-events-none absolute bottom-[110px] right-4 z-[60] w-[200px] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
              showTooltip ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
            }`}
          >
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#121212]/95 p-5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-3xl">
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent" />
              <div className="relative z-[1]">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[11px] font-black text-white/30 uppercase tracking-[0.25em]">Project Team</span>
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold text-white/60">
                    {project.members.length}
                  </div>
                </div>
                <div className="space-y-2.5">
                  {project.members.map((m) => (
                    <div key={m} className="flex items-center gap-3 transition-transform duration-300 hover:translate-x-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-white/20 shadow-[0_0_8px_rgba(255,255,255,0.1)]" />
                      <span className="text-[13px] font-semibold text-white/90 tracking-tight">{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Tooltip Arrow */}
            <div className="absolute -bottom-2 right-6 h-4 w-4 rotate-45 border-b border-r border-white/10 bg-[#121212]/95" />
          </div>
        )}
      </div>
    </div>
  );
}

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
    if (!hover) setIdx(0);
  }, [hover]);

  const visibleMembers = project.members.slice(0, 2);
  const rest = project.members.length - visibleMembers.length;
  const dday = ddayLabel(project.deadline);
  const progress = project.progress;

  return (
    <div className="relative aspect-[16/10]">
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`project-card group absolute left-0 top-0 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0F0F0F] text-left transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
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
          className="block w-full text-left"
        >
          <div className="relative aspect-video w-full overflow-hidden bg-neutral-900">
            {seq.map((src, i) => {
              // Lazy loading sub-images: only render if hasHovered is true
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
            
            <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
            
            <div className="absolute left-3 top-3 z-[3] flex items-center gap-2">
              <DeptTag dept={project.department} />
              <StatusTag status={project.status} />
            </div>
          </div>

          <div className="bg-[#0F0F0F] px-4 py-3">
            <h3 className="truncate text-base font-bold tracking-tight text-white/90">
              {project.title}
            </h3>
          </div>
        </button>

        <div 
          className="grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{ 
            gridTemplateRows: hover ? "1fr" : "0fr",
            opacity: hover ? 1 : 0 
          }}
        >
          <div className="overflow-hidden">
            <div className="space-y-4 px-4 pb-5 pt-2 border-t border-white/[0.05]">
              {/* Info Hierarchy: PM and Members */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">PM</span>
                  <span className="text-sm font-semibold text-white/80">{project.pm}</span>
                </div>
                <div className="text-[12px] text-white/40 font-medium">
                  {visibleMembers.join(", ")}
                  {rest > 0 && <span className="ml-1">+{rest}</span>}
                </div>
              </div>

              {/* Progress Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/40 font-bold uppercase tracking-tighter">Progress</span>
                  <span className="font-black text-white/90">{progress}%</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-1000 ease-out"
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
      </div>
    </div>
  );
}

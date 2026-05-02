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
  const [idx, setIdx] = useState(0);
  const timer = useRef<number | null>(null);

  const seq = useMemo(() => {
    const order = project.thumbnail?.sequence ?? project.images.map((_, i) => i);
    return order.map((i) => project.images[i]).filter(Boolean);
  }, [project]);

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
  const progress = (project as any).progress ?? Math.min(100, Math.max(10, project.title.length * 5 + 20));

  return (
    <div className="relative aspect-[16/11]">
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`project-card group absolute left-0 top-0 w-full overflow-hidden rounded-xl border border-white/15 bg-[#0A0A0A] text-left transition-all duration-300 ${
          hover
            ? "z-50 shadow-[0_30px_60px_rgba(0,0,0,0.8)]"
            : "z-0 shadow-none"
        }`}
        style={{
          transform: hover ? "scale(1.3)" : "scale(1)",
          transformOrigin: "center top",
        }}
      >
        <button
          onClick={() => onOpen(project.id)}
          className="block w-full text-left"
        >
          <div className="relative aspect-video w-full overflow-hidden bg-black">
            {seq.map((src, i) => (
              <div
                key={src + i}
                className="absolute inset-0 transition-opacity duration-700 ease-out"
                style={{ opacity: i === idx ? 1 : 0 }}
              >
                <div
                  aria-hidden
                  className="absolute inset-0 scale-110 bg-cover bg-center opacity-60 blur-2xl"
                  style={{ backgroundImage: `url(${src})` }}
                />
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  className="relative z-[1] h-full w-full object-contain"
                />
              </div>
            ))}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[2]"
              style={{
                background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.8) 100%)",
              }}
            />
            <div className="absolute left-3 top-3 z-[3] flex items-center gap-2">
              <DeptTag dept={project.department} />
              <StatusTag status={project.status} />
            </div>
          </div>

          <div className="bg-[#0A0A0A] px-5 py-4">
            <h3 className="truncate text-[19px] font-semibold leading-tight text-foreground">
              {project.title}
            </h3>
          </div>
        </button>

        <div 
          className="grid transition-[grid-template-rows] duration-300 ease-out"
          style={{ gridTemplateRows: hover ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="space-y-4 px-5 pb-5 pt-1 border-t border-white/[0.08]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[13px] font-medium text-foreground">
                    <span className="text-[10px] text-gray-500 font-bold">PM</span>
                    {project.pm}
                  </span>
                </div>
                <div className="text-[12px] text-gray-400" title={project.members.join(", ")}>
                  {visibleMembers.join(", ")}
                  {rest > 0 && (
                    <span className="ml-1 cursor-help underline decoration-white/20 underline-offset-2">
                      +{rest}명
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-gray-500 font-medium">진행률</span>
                  <span className="font-bold text-foreground">{progress}%</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-foreground transition-all duration-700 ease-out"
                    style={{ width: hover ? `${progress}%` : "0%" }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="flex items-center gap-1.5 rounded-md bg-red-950/30 px-2 py-1 text-[12px] font-bold text-red-500 ring-1 ring-inset ring-red-500/20">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {dday}
                </span>
                <span className="text-[13px] text-gray-400 font-medium">{project.deadline}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "@/lib/mockProjects";
import { DeptTag } from "./DeptTag";
import { StatusTag } from "./StatusTag";

interface Props {
  project: Project;
  onOpen: (id: string) => void;
}

/** Compute D-day label from YYYY-MM-DD; "상시" passes through. */
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

  // Sequence-aware images (hook into thumbnail config for future custom ordering)
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

  return (
    // Outer wrapper holds the grid slot at original size.
    // Inner card is absolute → scaling it does NOT push neighbors.
    <div className="relative aspect-[16/11]">
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`project-card group absolute inset-0 overflow-visible rounded-xl border border-white/10 bg-[#0A0A0A] text-left backdrop-blur-md transition-all duration-300 ${
          hover
            ? "z-50 border-white/25 shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
            : "z-0"
        }`}
        style={{
          transform: hover ? "scale(1.3)" : "scale(1)",
          transformOrigin: "center top",
        }}
      >
        {/* Clickable thumbnail area */}
        <button
          onClick={() => onOpen(project.id)}
          className="block w-full text-left"
        >
          {/* 16:9 visual area — object-contain per spec, blurred fill behind */}
          <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-black">
            {seq.map((src, i) => (
              <div
                key={src + i}
                className="absolute inset-0 transition-opacity duration-700 ease-out"
                style={{ opacity: i === idx ? 1 : 0 }}
              >
                {/* blurred backdrop fills the frame for non-16:9 sources */}
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

            {/* gradient veil for legibility */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[2]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.85) 100%)",
              }}
            />

            {/* top-left tags */}
            <div className="absolute left-3 top-3 z-[3] flex items-center gap-2 rounded-lg bg-black/60 px-2 py-1.5 backdrop-blur-md">
              <DeptTag dept={project.department} />
              <StatusTag status={project.status} />
            </div>
          </div>

          {/* default content: title only */}
          <div className="bg-[#0A0A0A] px-5 py-4">
            <h3 className="truncate text-[20px] font-semibold leading-tight text-foreground">
              {project.title}
            </h3>
          </div>
        </button>

        {/* hover-revealed: positioned ABSOLUTELY below the card, overlapping cards below */}
        {hover && (
          <div
            className="absolute left-0 right-0 z-50 rounded-b-xl border border-t-0 border-white/15 bg-[#0A0A0A]"
            style={{
              top: "100%",
              boxShadow: "0 20px 50px rgba(0,0,0,0.9)",
            }}
          >
            <div className="space-y-2 px-5 py-4">
              {/* PM — bold, +2pt larger than members, subtle white-transparent border */}
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/[0.06] px-2.5 py-1 text-[18px] font-bold text-foreground"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {project.pm}
                </span>
                <span className="text-[13px] uppercase tracking-wider text-gray-300">
                  PM
                </span>
              </div>

              {/* Members — up to 2, then "+n명" */}
              <div className="text-[16px] text-gray-300">
                {visibleMembers.join(", ")}
                {rest > 0 ? ` +${rest}명` : ""}
              </div>

              {/* Deadline — highest priority, bright red, (D-day) format */}
              <div
                className="text-[18px] font-bold"
                style={{ color: "#FF3B30" }}
              >
                마감 · {project.deadline}
                {project.deadline !== "상시" && (
                  <span className="ml-2">({dday})</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

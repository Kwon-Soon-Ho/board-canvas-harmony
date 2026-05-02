import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { getSyncChannel } from "@/lib/sync";
import { MOCK_PROJECTS, type Project } from "@/lib/mockProjects";
import { StatusTag } from "@/components/control/StatusTag";
import { DeptTag } from "@/components/control/DeptTag";

const searchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/detail")({
  validateSearch: (s) => searchSchema.parse(s),
  component: DetailWindow,
});

function DetailWindow() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(() =>
    id ? MOCK_PROJECTS.find((p) => p.id === id) ?? null : null,
  );

  // Force Window B to fullscreen maximize on mount
  useEffect(() => {
    try {
      window.moveTo(0, 0);
      window.resizeTo(screen.availWidth, screen.availHeight);
    } catch {
      /* popup security restrictions — silent fallback */
    }
  }, []);

  useEffect(() => {
    const ch = getSyncChannel();
    if (!ch) return;
    ch.onmessage = (e) => {
      const msg = e.data;
      if (msg?.type === "OPEN_PROJECT" && msg.project) {
        setProject(msg.project as Project);
      }
    };
    // Ask Window A to (re)broadcast in case we missed the initial message
    ch.postMessage({ type: "REQUEST_PROJECT" });
    return () => ch.close();
  }, []);

  const goBack = () => {
    if (window.opener) {
      window.close();
    } else {
      navigate({ to: "/" });
    }
  };

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <p className="text-[18px] text-muted-foreground">프로젝트를 불러오는 중…</p>
          <button
            onClick={goBack}
            className="mt-6 rounded-md border border-hairline px-5 py-2.5 text-[16px] hover:bg-white/[0.06]"
          >
            제어부로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-hairline bg-background/90 px-10 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="text-[18px] font-semibold">상세 뷰 · Window B</span>
          <span className="text-[14px] text-muted-foreground">{project.id.toUpperCase()}</span>
        </div>
        <button
          onClick={goBack}
          className="rounded-md border border-hairline bg-surface px-5 py-2.5 text-[16px] text-foreground transition-colors hover:bg-white/[0.08]"
        >
          ← 제어부로 돌아가기
        </button>
      </header>

      {/* Content */}
      <main className="mx-auto grid max-w-[1800px] grid-cols-1 gap-10 px-10 py-10 lg:grid-cols-[60fr_40fr]">
        {/* Viewer (60%) */}
        <section className="space-y-6">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-hairline bg-black">
            <div
              aria-hidden
              className="absolute inset-0 scale-110 bg-cover bg-center opacity-60 blur-2xl"
              style={{ backgroundImage: `url(${project.image})` }}
            />
            <img
              src={project.image}
              alt={project.title}
              className="relative z-[1] h-full w-full object-contain"
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StatusTag status={project.status} />
              <DeptTag dept={project.department} />
            </div>
            <h1 className="text-[32px] font-semibold leading-tight">{project.title}</h1>
            <div className="h-[3px] w-full bg-white/10">
              <div
                className="h-full bg-foreground"
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <p className="text-[16px] text-muted-foreground">진행률 {project.progress}%</p>
          </div>
        </section>

        {/* Log / Meta (40%) */}
        <aside className="space-y-6">
          <div className="rounded-lg border border-hairline bg-surface p-6">
            <p className="text-[14px] text-muted-foreground">PM</p>
            <p className="mt-1 text-[24px] font-bold">{project.pm}</p>
          </div>
          <div className="rounded-lg border border-hairline bg-surface p-6">
            <p className="text-[14px] text-muted-foreground">멤버</p>
            <p className="mt-2 text-[16px] leading-relaxed">{project.members.join(", ")}</p>
          </div>
          <div className="rounded-lg border border-hairline bg-surface p-6">
            <p className="text-[14px] text-muted-foreground">마감일</p>
            <p className="mt-1 text-[20px] font-bold" style={{ color: "#FF0000" }}>
              {project.deadline}
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}

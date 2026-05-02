import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef, useMemo } from "react";
import { z } from "zod";
import { getSyncChannel } from "@/lib/sync";
import { MOCK_PROJECTS, type Project, type Task, type Issue } from "@/lib/mockProjects";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Maximize2, Minimize2, ArrowLeft, Circle, CheckCircle2, AlertCircle } from "lucide-react";
import * as Accordion from "@radix-ui/react-accordion";

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

  const [activeTaskId, setActiveTaskId] = useState<string | undefined>(undefined);
  const [isFocusMode, setIsFocusMode] = useState(false);

  useEffect(() => {
    try {
      window.moveTo(0, 0);
      window.resizeTo(screen.availWidth, screen.availHeight);
    } catch {}
  }, []);

  useEffect(() => {
    const ch = getSyncChannel();
    if (!ch) return;
    ch.onmessage = (e) => {
      const msg = e.data;
      if (msg?.type === "OPEN_PROJECT" && msg.project) {
        setProject(msg.project as Project);
        setActiveTaskId(undefined);
      }
    };
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
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p>프로젝트를 불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0a0a0a] text-white overflow-hidden font-sans selection:bg-white/20">
      {/* Top Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#0a0a0a] px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={goBack}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-widest uppercase text-white/50">{project.department}</span>
            <span className="text-white/20">/</span>
            <span className="text-base font-semibold">{project.title}</span>
          </div>
        </div>
        <button
          onClick={() => setIsFocusMode(!isFocusMode)}
          className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10 transition-colors"
        >
          {isFocusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {isFocusMode ? "Exit Focus Mode" : "Focus Timeline"}
        </button>
      </header>

      {/* Main Resizable Layout */}
      <main className="flex-1 overflow-hidden">
        <PanelGroup direction="vertical">
          {/* Top Area */}
          {!isFocusMode && (
            <>
              <Panel defaultSize={60} minSize={30}>
                <PanelGroup direction="horizontal">
                  {/* Left Canvas */}
                  <Panel defaultSize={70} minSize={30}>
                    <ImageSlideshow images={project.images} />
                  </Panel>
                  
                  <ResizeHandleVertical />
                  
                  {/* Right Tracker */}
                  <Panel defaultSize={30} minSize={20} className="bg-[#121212]">
                    <PanelGroup direction="vertical">
                      {/* Task List */}
                      <Panel defaultSize={70} minSize={30}>
                        <TaskList 
                          tasks={project.tasks} 
                          activeId={activeTaskId} 
                          setActiveId={setActiveTaskId} 
                        />
                      </Panel>
                      
                      <ResizeHandleHorizontal />
                      
                      {/* Issue List */}
                      <Panel defaultSize={30} minSize={20}>
                        <IssueList issues={project.issues} />
                      </Panel>
                    </PanelGroup>
                  </Panel>
                </PanelGroup>
              </Panel>
              <ResizeHandleHorizontal />
            </>
          )}

          {/* Bottom Area (Gantt) */}
          <Panel defaultSize={isFocusMode ? 100 : 40} minSize={20}>
            <GanttChart 
              tasks={project.tasks} 
              activeId={activeTaskId} 
              setActiveId={setActiveTaskId} 
            />
          </Panel>
        </PanelGroup>
      </main>
    </div>
  );
}

// Sub-components

function ResizeHandleVertical() {
  return (
    <PanelResizeHandle className="w-1.5 bg-[#0a0a0a] hover:bg-white/20 transition-colors cursor-col-resize relative group">
      <div className="absolute inset-y-1/2 -translate-y-1/2 flex flex-col gap-0.5 items-center justify-center w-full opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-0.5 h-1 bg-white/50 rounded-full" />
        <div className="w-0.5 h-1 bg-white/50 rounded-full" />
        <div className="w-0.5 h-1 bg-white/50 rounded-full" />
      </div>
    </PanelResizeHandle>
  );
}

function ResizeHandleHorizontal() {
  return (
    <PanelResizeHandle className="h-1.5 bg-[#0a0a0a] hover:bg-white/20 transition-colors cursor-row-resize relative group">
      <div className="absolute inset-x-1/2 -translate-x-1/2 flex gap-0.5 items-center justify-center h-full opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="h-0.5 w-1 bg-white/50 rounded-full" />
        <div className="h-0.5 w-1 bg-white/50 rounded-full" />
        <div className="h-0.5 w-1 bg-white/50 rounded-full" />
      </div>
    </PanelResizeHandle>
  );
}

function ImageSlideshow({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setIdx((i) => (i + 1) % images.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [images.length]);

  if (images.length === 0) return <div className="h-full w-full bg-black" />;

  return (
    <div className="relative h-full w-full overflow-hidden bg-black group cursor-crosshair">
      {images.map((src, i) => (
        <img
          key={src + i}
          src={src}
          alt=""
          onClick={() => setZoom(!zoom)}
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ease-out 
            ${i === idx ? "opacity-100" : "opacity-0"} 
            ${zoom && i === idx ? "scale-[1.3] cursor-zoom-out" : "scale-100"}
          `}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2 z-10">
        {images.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === idx ? "w-8 bg-white" : "w-2 bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function TaskList({ tasks, activeId, setActiveId }: { tasks: Task[], activeId?: string, setActiveId: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeId && containerRef.current) {
      const el = containerRef.current.querySelector(`[data-task-id="${activeId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeId]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/5 p-4 shrink-0 bg-[#121212]/80 backdrop-blur-md">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">Task Tracker</h3>
        <span className="text-xs font-medium text-white/40">{tasks.length} tasks</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2" ref={containerRef}>
        <Accordion.Root type="single" value={activeId || ""} onValueChange={setActiveId} collapsible>
          {tasks.map((t) => (
            <Accordion.Item
              key={t.id}
              value={t.id}
              data-task-id={t.id}
              className={`rounded-lg border transition-colors overflow-hidden ${
                activeId === t.id ? "border-white/30 bg-white/[0.03]" : "border-white/5 bg-black/20 hover:border-white/15"
              }`}
            >
              <Accordion.Header>
                <Accordion.Trigger className="flex w-full items-center justify-between p-4 focus:outline-none focus-visible:ring-2 ring-white/20">
                  <div className="flex items-center gap-3">
                    {t.progress === 100 ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Circle className="h-4 w-4 text-white/20" />
                    )}
                    <span className="text-sm font-semibold tracking-tight text-white/90 text-left">{t.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10 hidden sm:block">
                      <div className="h-full bg-white/80 transition-all" style={{ width: `${t.progress}%` }} />
                    </div>
                    <span className="text-xs font-mono text-white/50 w-8 text-right">{t.progress}%</span>
                  </div>
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden text-sm data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
                <div className="p-4 pt-0 border-t border-white/5 bg-white/[0.01]">
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Assignee</p>
                      <p className="text-white/80 font-medium">{t.assignee}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Period</p>
                      <p className="text-white/80 font-medium text-xs mt-0.5">{t.startDate} ~ {t.endDate.slice(5)}</p>
                    </div>
                  </div>
                </div>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </div>
  );
}

function IssueList({ issues }: { issues: Issue[] }) {
  const sorted = useMemo(() => [...issues].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()), [issues]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col bg-[#0F0F0F]">
      <div className="flex items-center gap-2 border-b border-white/5 p-4 shrink-0">
        <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-rose-500/80">Issues</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sorted.map((iss) => (
          <div key={iss.id} className="rounded-lg border border-white/5 bg-[#141414] p-3 transition-colors hover:border-white/10">
            <div
              className="flex cursor-pointer items-center justify-between"
              onClick={() => !iss.resolved && setExpandedId(iss.id === expandedId ? null : iss.id)}
            >
              <span className={`text-sm font-medium transition-colors ${iss.resolved ? "text-white/30 line-through" : "text-white/90"}`}>
                {iss.title}
              </span>
              <span className="text-[10px] text-white/40 font-mono">{iss.startDate.slice(5)}</span>
            </div>
            {iss.resolved && iss.memo && (
              <div className="mt-3 rounded bg-white/5 p-2.5 text-xs text-white/60">
                <p>{iss.memo}</p>
                <p className="mt-1 text-[9px] text-white/30">{new Date(iss.timestamp!).toLocaleString()}</p>
              </div>
            )}
            {!iss.resolved && expandedId === iss.id && (
              <div className="mt-4 space-y-2">
                <textarea
                  className="w-full resize-none rounded border border-white/10 bg-black/50 p-2.5 text-xs text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none"
                  placeholder="Resolution memo..."
                  rows={2}
                />
                <div className="flex justify-end">
                  <button className="rounded bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/30">
                    Resolve Issue
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-white/30">No active issues.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function GanttChart({ tasks, activeId, setActiveId }: { tasks: Task[], activeId?: string, setActiveId: (id: string) => void }) {
  const [viewWeeks, setViewWeeks] = useState<4 | 8 | 12>(4);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (containerRef.current?.offsetLeft || 0));
    setScrollLeft(containerRef.current?.scrollLeft || 0);
  };
  const onMouseLeave = () => setIsDragging(false);
  const onMouseUp = () => setIsDragging(false);
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const minDate = useMemo(() => new Date(Math.min(...tasks.map((t) => new Date(t.startDate).getTime()))), [tasks]);
  
  if (isNaN(minDate.getTime())) return <div className="flex h-full items-center justify-center text-white/30">No tasks available</div>;

  const totalDays = viewWeeks * 7;
  const dayWidth = 45; 
  const totalWidth = totalDays * dayWidth;

  const getLeft = (dateStr: string) => {
    const diff = (new Date(dateStr).getTime() - minDate.getTime()) / 86400000;
    return Math.max(0, diff * dayWidth);
  };
  const getWidth = (start: string, end: string) => {
    const diff = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
    return Math.max(dayWidth, (diff + 1) * dayWidth);
  };

  return (
    <div className="flex h-full flex-col bg-[#111111] select-none">
      <div className="flex items-center justify-between border-b border-white/5 p-4 shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">Gantt Timeline</h3>
        <select
          className="rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white focus:outline-none"
          value={viewWeeks}
          onChange={(e) => setViewWeeks(Number(e.target.value) as any)}
        >
          <option value={4}>4 Weeks</option>
          <option value={8}>8 Weeks</option>
          <option value={12}>12 Weeks</option>
        </select>
      </div>
      <div
        className={`flex-1 overflow-x-auto overflow-y-auto relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
      >
        <div style={{ width: totalWidth, minHeight: "100%" }} className="relative">
          {/* Header Dates */}
          <div className="sticky top-0 z-20 flex h-8 border-b border-white/5 bg-[#111111]/90 backdrop-blur-sm">
            {Array.from({ length: totalDays }).map((_, i) => {
              const d = new Date(minDate);
              d.setDate(d.getDate() + i);
              return (
                <div key={i} className="absolute h-full border-l border-white/5 text-[9px] text-white/30 flex items-center pl-1" style={{ left: i * dayWidth, width: dayWidth }}>
                  {i % 2 === 0 ? `${d.getMonth()+1}/${d.getDate()}` : ''}
                </div>
              );
            })}
          </div>

          {/* Grid lines */}
          {Array.from({ length: totalDays }).map((_, i) => (
            <div key={i} className="absolute top-8 bottom-0 border-l border-white/[0.02]" style={{ left: i * dayWidth }} />
          ))}

          {/* Bars */}
          <div className="pt-6 pb-6 space-y-4 px-1">
            {tasks.map((t) => {
              const left = getLeft(t.startDate);
              const width = getWidth(t.startDate, t.endDate);
              const isActive = activeId === t.id;
              
              return (
                <div key={t.id} className="relative h-10 w-full group">
                  <div
                    onClick={() => setActiveId(t.id)}
                    className={`absolute top-0 h-full rounded-md shadow-xl transition-all duration-300 overflow-hidden cursor-pointer backdrop-blur-sm
                      ${isActive ? "bg-white/20 border-white/40 ring-1 ring-white/50 z-10" : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 border"}
                    `}
                    style={{ left, width }}
                  >
                    <div className="absolute top-0 left-0 bottom-0 bg-white/20 transition-all duration-500" style={{ width: `${t.progress}%` }} />
                    <span className="relative z-10 px-3 flex items-center h-full text-xs font-semibold text-white/90 drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis">
                      {t.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef, useMemo } from "react";
import { z } from "zod";
import { getSyncChannel } from "@/lib/sync";
import { MOCK_PROJECTS, type Project, type Task, type Issue, type TaskStatus, type IssueStatus } from "@/lib/mockProjects";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Maximize2, Minimize2, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, CheckCircle2, Circle, AlertCircle, Edit2, Save, X } from "lucide-react";
import * as Accordion from "@radix-ui/react-accordion";

const searchSchema = z.object({ id: z.string().optional() });
export const Route = createFileRoute("/detail")({
  validateSearch: (s) => searchSchema.parse(s),
  component: DetailWindow,
});

function DetailWindow() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(() => id ? MOCK_PROJECTS.find((p) => p.id === id) ?? null : null);
  const [activeItemId, setActiveItemId] = useState<string | undefined>(undefined);
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
        setActiveItemId(undefined);
      }
    };
    ch.postMessage({ type: "REQUEST_PROJECT" });
    return () => ch.close();
  }, []);

  if (!project) {
    return <div className="flex h-screen w-screen items-center justify-center bg-black text-white">Loading...</div>;
  }

  // Derived state
  const derivedProgress = project.tasks.length > 0 
    ? Math.round(project.tasks.reduce((acc, t) => acc + t.progress, 0) / project.tasks.length) 
    : 0;

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setProject(prev => {
      if(!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map(t => {
          if (t.id !== taskId) return t;
          const updated = { ...t, ...updates };
          // Two-way binding
          if (updates.progress !== undefined) {
            if (updates.progress === 100) updated.status = "완료";
            else if (t.status === "완료" && updates.progress < 100) updated.status = "진행";
          } else if (updates.status !== undefined) {
            if (updates.status === "완료") updated.progress = 100;
          }
          return updated;
        })
      };
    });
  };

  const updateIssue = (issueId: string, updates: Partial<Issue>) => {
    setProject(prev => {
      if(!prev) return prev;
      return {
        ...prev,
        issues: prev.issues.map(i => i.id === issueId ? { ...i, ...updates } : i)
      };
    });
  };

  const activeTask = project.tasks.find(t => t.id === activeItemId);
  const activeIssue = project.issues.find(i => i.id === activeItemId);
  const imagesToShow = activeTask?.imageUrls || activeIssue?.imageUrls || project.images;

  return (
    <div className="flex h-screen w-screen flex-col bg-[#080808] text-white overflow-hidden font-sans">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#0a0a0a] px-6">
        <div className="flex items-center gap-4">
          <button onClick={() => window.opener ? window.close() : navigate({ to: "/" })} className="hover:bg-white/10 p-1.5 rounded transition">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold tracking-widest uppercase text-white/50">{project.department}</span>
            <span className="text-white/20">/</span>
            <span className="text-base font-semibold">{project.title}</span>
            <span className="ml-4 text-xs font-mono bg-white/10 px-2 py-0.5 rounded text-orange-400">Total {derivedProgress}%</span>
          </div>
        </div>
        <button
          onClick={() => setIsFocusMode(!isFocusMode)}
          className="flex items-center gap-2 rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 transition"
        >
          {isFocusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {isFocusMode ? "Exit Focus Mode" : "Focus Timeline"}
        </button>
      </header>

      <main className="flex-1 overflow-hidden">
        <PanelGroup direction="vertical">
          {!isFocusMode && (
            <>
              <Panel defaultSize={60} minSize={30}>
                <PanelGroup direction="horizontal">
                  {/* Left: Image Viewer */}
                  <Panel defaultSize={65} minSize={30}>
                    <ImageViewer images={imagesToShow} />
                  </Panel>
                  <ResizeHandleVertical />
                  {/* Right: Unified Tracker */}
                  <Panel defaultSize={35} minSize={25} className="bg-[#111] flex flex-col">
                    <div className="p-3 border-b border-white/10 bg-[#161616] font-bold text-xs uppercase tracking-widest text-white/50 shadow-sm shrink-0">
                      Tracker (Double-click to edit)
                    </div>
                    <div className="flex-1 overflow-y-auto p-3">
                      <Accordion.Root type="single" value={activeItemId || ""} onValueChange={setActiveItemId} collapsible className="space-y-4">
                        
                        {/* TASKS */}
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-white/40 pl-1">TASKS</h4>
                          {[...project.tasks]
                            .sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                            .map(t => (
                            <TaskAccordionItem 
                              key={t.id} 
                              task={t} 
                              isActive={activeItemId === t.id}
                              onUpdate={(updates) => updateTask(t.id, updates)}
                            />
                          ))}
                        </div>

                        {/* ISSUES */}
                        <div className="space-y-2 pt-4 border-t border-white/5">
                          <h4 className="text-[10px] font-bold text-rose-500/50 pl-1">ISSUES</h4>
                          {[...project.issues]
                            .sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                            .map(iss => (
                            <IssueAccordionItem 
                              key={iss.id} 
                              issue={iss} 
                              isActive={activeItemId === iss.id}
                              onUpdate={(updates) => updateIssue(iss.id, updates)}
                            />
                          ))}
                          {project.issues.length === 0 && <p className="text-xs text-white/30 pl-1">No issues.</p>}
                        </div>

                      </Accordion.Root>
                    </div>
                  </Panel>
                </PanelGroup>
              </Panel>
              <ResizeHandleHorizontal />
            </>
          )}
          {/* Bottom: Gantt Chart */}
          <Panel defaultSize={isFocusMode ? 100 : 40} minSize={20}>
            <GanttChart 
              tasks={project.tasks} 
              issues={project.issues}
              activeId={activeItemId} 
              setActiveId={setActiveItemId} 
            />
          </Panel>
        </PanelGroup>
      </main>
    </div>
  );
}

function ImageViewer({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);

  // Reset index if images array changes
  useEffect(() => { setIdx(0); }, [images]);

  if (!images || images.length === 0) return <div className="h-full w-full bg-black flex items-center justify-center text-white/20 text-sm">No Images</div>;

  return (
    <div className="relative h-full w-full bg-black group flex flex-col">
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        <img src={images[idx]} alt="" className="max-w-full max-h-full object-contain" />
      </div>
      
      {images.length > 1 && (
        <>
          <button 
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-white/20 rounded-full transition opacity-0 group-hover:opacity-100"
            onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-white/20 rounded-full transition opacity-0 group-hover:opacity-100"
            onClick={() => setIdx(i => (i + 1) % images.length)}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-1.5 bg-white/40"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TaskAccordionItem({ task, isActive, onUpdate }: { task: Task, isActive: boolean, onUpdate: (u: Partial<Task>) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(task);

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if(isActive && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if(!isActive) setIsEditing(false);
  }, [isActive]);

  const handleSave = () => {
    onUpdate(editForm);
    setIsEditing(false);
  };

  const statusOptions: TaskStatus[] = ["대기", "진행", "검토중", "승인됨", "보류", "취소", "완료"];

  return (
    <Accordion.Item 
      value={task.id} 
      ref={ref}
      className={`rounded-lg border transition-all overflow-hidden ${
        isActive ? "border-orange-500/50 bg-orange-500/5 ring-1 ring-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.1)]" : "border-white/10 bg-[#161616] hover:border-white/20"
      }`}
    >
      <Accordion.Header className="flex w-full items-center justify-between">
        <Accordion.Trigger 
          className="flex-1 flex items-center justify-between p-3 focus:outline-none"
          onDoubleClick={(e) => { e.preventDefault(); setIsEditing(true); }}
        >
          {/* Header Layout: Start Date (Left) | Title (Left) | Progress % (Right, Number only) | Status (Right) */}
          <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
            <span className={`text-[10px] font-mono shrink-0 ${isActive ? 'text-orange-400' : 'text-white/40'}`}>
              {task.startDate.slice(5)}
            </span>
            <span className="text-sm font-semibold truncate text-left">{task.title}</span>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-xs font-mono font-bold text-white/80">{task.progress}%</span>
            <span className={`text-[11px] px-2 py-0.5 rounded ${task.status==='완료' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/70'}`}>
              {task.status}
            </span>
          </div>
        </Accordion.Trigger>
      </Accordion.Header>

      <Accordion.Content className="overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
        <div className="p-4 pt-1 border-t border-white/5" onDoubleClick={() => setIsEditing(true)}>
          {isEditing ? (
            <div className="space-y-3 bg-black/40 p-3 rounded border border-white/10" onDoubleClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-2">
                <span className="text-xs font-bold text-orange-400">Edit Task</span>
                <div className="flex gap-2">
                  <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4 text-white/50" /></button>
                  <button onClick={handleSave} className="p-1 hover:bg-emerald-500/20 rounded"><Save className="w-4 h-4 text-emerald-400" /></button>
                </div>
              </div>
              <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded p-1.5 text-sm" placeholder="Title" />
              <textarea value={editForm.content} onChange={e => setEditForm({...editForm, content: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded p-1.5 text-xs min-h-[60px]" placeholder="Content" />
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value as TaskStatus})} className="w-full bg-black/50 border border-white/10 rounded p-1.5 text-xs">
                    {statusOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Progress (%)</label>
                  <input type="number" step="10" min="0" max="100" value={editForm.progress} onChange={e => setEditForm({...editForm, progress: Number(e.target.value)})} className="w-full bg-black/50 border border-white/10 rounded p-1.5 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Start Date</label>
                  <input type="date" value={editForm.startDate} onChange={e => setEditForm({...editForm, startDate: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded p-1.5 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-orange-400/80 block mb-1 font-bold">End Date (Required)</label>
                  <input type="date" required value={editForm.endDate} onChange={e => setEditForm({...editForm, endDate: e.target.value})} className="w-full bg-black/50 border border-orange-500/30 rounded p-1.5 text-xs" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-white/40 block mb-1">Assignee</label>
                  <input value={editForm.assignee} onChange={e => setEditForm({...editForm, assignee: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded p-1.5 text-xs" />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 cursor-text">
              <p className="text-xs text-white/60 leading-relaxed whitespace-normal break-words">{task.content}</p>
              <div className="grid grid-cols-2 gap-4 text-xs mt-2 border-t border-white/5 pt-3">
                <div><span className="text-white/30 block text-[10px] uppercase">Assignee</span><span className="text-white/80">{task.assignee}</span></div>
                <div><span className="text-white/30 block text-[10px] uppercase">Period</span><span className="text-white/80 font-mono">{task.startDate} ~ {task.endDate}</span></div>
              </div>
            </div>
          )}
        </div>
      </Accordion.Content>
    </Accordion.Item>
  );
}

function IssueAccordionItem({ issue, isActive, onUpdate }: { issue: Issue, isActive: boolean, onUpdate: (u: Partial<Issue>) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(issue);

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if(isActive && ref.current) ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if(!isActive) setIsEditing(false);
  }, [isActive]);

  const handleSave = () => {
    onUpdate(editForm);
    setIsEditing(false);
  };

  return (
    <Accordion.Item 
      value={issue.id} 
      ref={ref}
      className={`rounded-lg border transition-all overflow-hidden ${
        isActive ? "border-yellow-500/50 bg-yellow-500/5 ring-1 ring-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]" : "border-white/10 bg-[#161616] hover:border-white/20"
      }`}
    >
      <Accordion.Header className="flex w-full items-center justify-between">
        <Accordion.Trigger 
          className="flex-1 flex items-center justify-between p-3 focus:outline-none"
          onDoubleClick={(e) => { e.preventDefault(); setIsEditing(true); }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
            <span className={`text-[10px] font-mono shrink-0 ${isActive ? 'text-yellow-400' : 'text-white/40'}`}>
              {issue.startDate.slice(5)}
            </span>
            <span className={`text-sm font-semibold truncate text-left ${issue.resolved ? 'line-through text-white/30' : ''}`}>{issue.title}</span>
          </div>
          <div className="flex items-center shrink-0">
            <span className={`text-[11px] px-2 py-0.5 rounded ${issue.resolved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {issue.status}
            </span>
          </div>
        </Accordion.Trigger>
      </Accordion.Header>

      <Accordion.Content className="overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
        <div className="p-4 pt-1 border-t border-white/5" onDoubleClick={() => setIsEditing(true)}>
          {isEditing ? (
            <div className="space-y-3 bg-black/40 p-3 rounded border border-white/10" onDoubleClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-2">
                <span className="text-xs font-bold text-yellow-400">Edit Issue</span>
                <div className="flex gap-2">
                  <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4 text-white/50" /></button>
                  <button onClick={handleSave} className="p-1 hover:bg-emerald-500/20 rounded"><Save className="w-4 h-4 text-emerald-400" /></button>
                </div>
              </div>
              <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded p-1.5 text-sm" placeholder="Title" />
              <textarea value={editForm.content} onChange={e => setEditForm({...editForm, content: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded p-1.5 text-xs min-h-[60px]" placeholder="Content" />
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Status</label>
                  <select value={editForm.status} onChange={e => {
                    const status = e.target.value as IssueStatus;
                    setEditForm({...editForm, status, resolved: status === 'Resolved', timestamp: status === 'Resolved' ? new Date().toISOString() : undefined});
                  }} className="w-full bg-black/50 border border-white/10 rounded p-1.5 text-xs">
                    <option value="Issue">Issue</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Assignee</label>
                  <input value={editForm.assignee} onChange={e => setEditForm({...editForm, assignee: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded p-1.5 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Start Date</label>
                  <input type="date" value={editForm.startDate} onChange={e => setEditForm({...editForm, startDate: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded p-1.5 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">End Date</label>
                  <input type="date" value={editForm.endDate} onChange={e => setEditForm({...editForm, endDate: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded p-1.5 text-xs" />
                </div>
                {editForm.resolved && (
                  <div className="col-span-2">
                    <label className="text-[10px] text-yellow-400 block mb-1 font-bold">Resolution Memo (Required)</label>
                    <textarea required value={editForm.memo || ""} onChange={e => setEditForm({...editForm, memo: e.target.value})} className="w-full bg-black/50 border border-yellow-500/30 rounded p-1.5 text-xs min-h-[40px]" placeholder="How was it resolved?" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3 cursor-text">
              <p className="text-xs text-white/60 leading-relaxed whitespace-normal break-words">{issue.content}</p>
              {issue.resolved && issue.memo && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded whitespace-normal break-words">
                  <span className="block text-[10px] font-bold text-emerald-400 mb-1">Resolution</span>
                  <p className="text-xs text-white/70">{issue.memo}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-xs mt-2 border-t border-white/5 pt-3">
                <div><span className="text-white/30 block text-[10px] uppercase">Assignee</span><span className="text-white/80">{issue.assignee}</span></div>
                <div><span className="text-white/30 block text-[10px] uppercase">Period</span><span className="text-white/80 font-mono">{issue.startDate} ~ {issue.endDate}</span></div>
              </div>
            </div>
          )}
        </div>
      </Accordion.Content>
    </Accordion.Item>
  );
}

function GanttChart({ tasks, issues, activeId, setActiveId }: { tasks: Task[], issues: Issue[], activeId?: string, setActiveId: (id: string) => void }) {
  const [viewWeeks, setViewWeeks] = useState<4 | 8 | 12>(8);
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

  const allItems = [...tasks, ...issues];
  const minDate = useMemo(() => new Date(Math.min(...allItems.map(t => new Date(t.startDate).getTime()))), [allItems]);
  
  if (isNaN(minDate.getTime())) return <div className="flex h-full items-center justify-center text-white/30">No Timeline Data</div>;

  const totalDays = viewWeeks * 7;
  // Dynamic scaling: narrower bars for larger views
  const dayWidth = viewWeeks === 4 ? 60 : viewWeeks === 8 ? 40 : 25; 
  const totalWidth = totalDays * dayWidth;

  const getLeft = (dateStr: string) => Math.max(0, (new Date(dateStr).getTime() - minDate.getTime()) / 86400000 * dayWidth);
  const getWidth = (start: string, end: string) => Math.max(dayWidth, ((new Date(end).getTime() - new Date(start).getTime()) / 86400000 + 1) * dayWidth);

  return (
    <div className="flex h-full flex-col bg-[#0f0f0f] select-none border-t border-white/10">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2 shrink-0 bg-[#161616]">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">Gantt Work Plan</h3>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            <button onClick={() => { if(containerRef.current) containerRef.current.scrollBy({ left: -200, behavior: 'smooth'}) }} className="p-1 hover:bg-white/10 rounded"><ChevronLeft className="w-4 h-4 text-white/50" /></button>
            <button onClick={() => { if(containerRef.current) containerRef.current.scrollBy({ left: 200, behavior: 'smooth'}) }} className="p-1 hover:bg-white/10 rounded"><ChevronRight className="w-4 h-4 text-white/50" /></button>
          </div>
          <select
            className="rounded border border-white/10 bg-black px-2 py-1 text-xs text-white focus:outline-none"
            value={viewWeeks}
            onChange={(e) => setViewWeeks(Number(e.target.value) as any)}
          >
            <option value={4}>4 Weeks</option>
            <option value={8}>8 Weeks</option>
            <option value={12}>12 Weeks</option>
          </select>
        </div>
      </div>
      <div
        className={`flex-1 overflow-x-auto overflow-y-auto relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        ref={containerRef}
        onMouseDown={onMouseDown} onMouseLeave={onMouseLeave} onMouseUp={onMouseUp} onMouseMove={onMouseMove}
      >
        <div style={{ width: totalWidth, minHeight: "100%" }} className="relative">
          {/* Axis Header */}
          <div className="sticky top-0 z-20 flex h-10 border-b border-white/10 bg-[#0f0f0f]/95 backdrop-blur-sm shadow-sm">
            {Array.from({ length: totalDays }).map((_, i) => {
              const d = new Date(minDate);
              d.setDate(d.getDate() + i);
              const isMonday = d.getDay() === 1;
              return (
                <div key={i} className={`absolute h-full border-l text-[10px] flex flex-col justify-end pb-1 pl-1 ${isMonday ? 'border-white/20 text-white/60 font-bold' : 'border-white/5 text-white/30'}`} style={{ left: i * dayWidth, width: dayWidth }}>
                  {isMonday ? <span className="block leading-none">{d.getFullYear()}/{d.getMonth()+1}/{d.getDate()}</span> : <span className="block leading-none">{d.getDate()}</span>}
                </div>
              );
            })}
          </div>

          {/* Grid lines */}
          {Array.from({ length: totalDays }).map((_, i) => {
             const isMonday = new Date(minDate.getTime() + i * 86400000).getDay() === 1;
             return <div key={i} className={`absolute top-10 bottom-0 border-l pointer-events-none ${isMonday ? 'border-white/10' : 'border-white/[0.02]'}`} style={{ left: i * dayWidth }} />
          })}

          {/* Timeline Bars */}
          <div className="py-6 space-y-3 px-1 min-h-[max-content]">
            {tasks.map((t) => (
              <GanttBar key={t.id} item={t} type="task" left={getLeft(t.startDate)} width={getWidth(t.startDate, t.endDate)} isActive={activeId === t.id} onClick={() => setActiveId(t.id)} />
            ))}
            <div className="h-4" /> {/* Spacer */}
            {issues.map((iss) => (
              <GanttBar key={iss.id} item={iss as unknown as Task} type="issue" left={getLeft(iss.startDate)} width={getWidth(iss.startDate, iss.endDate)} isActive={activeId === iss.id} onClick={() => setActiveId(iss.id)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GanttBar({ item, type, left, width, isActive, onClick }: { item: Task, type: 'task'|'issue', left: number, width: number, isActive: boolean, onClick: () => void }) {
  const isTask = type === 'task';
  const progress = isTask ? item.progress : ((item as unknown as Issue).resolved ? 100 : 0);
  
  return (
    <div className="relative h-9 w-full group">
      <div
        onClick={onClick}
        className={`absolute top-0 h-full rounded shadow-xl transition-all duration-300 overflow-hidden cursor-pointer backdrop-blur-sm
          ${isActive 
            ? (isTask ? "bg-orange-500/20 border-orange-500/50 ring-1 ring-orange-500/50 z-10" : "bg-yellow-500/20 border-yellow-500/50 ring-1 ring-yellow-500/50 z-10") 
            : (isTask ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20" : "bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20")
          } border
        `}
        style={{ left, width }}
      >
        <div className={`absolute top-0 left-0 bottom-0 transition-all duration-500 ${isTask ? 'bg-white/20' : 'bg-emerald-500/20'}`} style={{ width: `${progress}%` }} />
        <span className={`relative z-10 px-2 flex items-center h-full text-[11px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis ${isTask ? 'text-white/90' : 'text-rose-200'}`}>
          {item.title}
        </span>
      </div>
    </div>
  );
}

// Utilities
function ResizeHandleVertical() {
  return (
    <PanelResizeHandle className="w-1 bg-[#0a0a0a] hover:bg-white/20 transition-colors cursor-col-resize relative group">
      <div className="absolute inset-y-1/2 -translate-y-1/2 flex flex-col gap-1 items-center justify-center w-full opacity-0 group-hover:opacity-100">
        <div className="w-0.5 h-1.5 bg-white/50 rounded-full" />
        <div className="w-0.5 h-1.5 bg-white/50 rounded-full" />
      </div>
    </PanelResizeHandle>
  );
}

function ResizeHandleHorizontal() {
  return (
    <PanelResizeHandle className="h-1 bg-[#0a0a0a] hover:bg-white/20 transition-colors cursor-row-resize relative group">
      <div className="absolute inset-x-1/2 -translate-x-1/2 flex gap-1 items-center justify-center h-full opacity-0 group-hover:opacity-100">
        <div className="h-0.5 w-1.5 bg-white/50 rounded-full" />
        <div className="h-0.5 w-1.5 bg-white/50 rounded-full" />
      </div>
    </PanelResizeHandle>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef, useMemo } from "react";
import { z } from "zod";
import { getSyncChannel } from "@/lib/sync";
import { MOCK_PROJECTS, type Project, type Task, type Issue, type TaskStatus, type IssueStatus, type ProjectImage, getOptimizedUrl, TEAM_DATA, ALL_MEMBERS, STATUSES } from "@/lib/mockProjects";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Maximize2, Minimize2, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Edit2, Plus, Star, X, Trash2, Calendar, Users, FolderOpen, Image, ChevronUp, ChevronDown } from "lucide-react";
import * as Accordion from "@radix-ui/react-accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const searchSchema = z.object({ id: z.string().optional() });
export const Route = createFileRoute("/detail")({
  validateSearch: (s) => searchSchema.parse(s),
  component: DetailWindow,
});

type ModalConfig = { type: 'task' | 'issue', mode: 'create' | 'edit', id?: string } | { type: 'thumbnails' } | { type: 'project' } | { type: 'design-hub' };

function DndProvider({ children }: { children: React.ReactNode }) {
  return <div className="dnd-provider contents">{children}</div>;
}

function DetailWindow() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(() => {
    if (!id) return null;
    const normalize = (p: Project): Project => p.status === "완료" ? {
      ...p,
      progress: 100,
      tasks: (p.tasks || []).map((t) => ({ ...t, status: "완료" as TaskStatus, progress: 100 })),
      issues: (p.issues || []).map((i) => ({ ...i, status: "Resolved" as IssueStatus, resolved: true })),
    } : p;
    const saved = localStorage.getItem('design-projects-store');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const raw = parsed.find((x: any) => x.id === id);
        if (raw) {
          // Migration: Convert string images to ProjectImage objects
          const migrate = (imgs: any[]): ProjectImage[] => 
            (imgs || []).map(img => typeof img === 'string' ? { url: img, memo: "" } : img);

          const project: Project = {
            ...raw,
            images: migrate(raw.images),
            tasks: (raw.tasks || []).map((t: any) => ({ ...t, imageUrls: migrate(t.imageUrls) })),
            issues: (raw.issues || []).map((i: any) => ({ ...i, imageUrls: migrate(i.imageUrls) })),
          };
          return normalize(project);
        }
      } catch (err) {
        console.error("Migration failed", err);
      }
    }
    const found = MOCK_PROJECTS.find((p) => p.id === id);
    return found ? normalize(found) : null;
  });
  const [activeItemId, setActiveItemId] = useState<string | undefined>(undefined);
  const [isImageViewerFull, setIsImageViewerFull] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'task' | 'issue'; id: string; title: string } | null>(null);
  const [trackerSort, setTrackerSort] = useState<'startDate' | 'progress' | 'status'>('startDate');
  const [trackerSortDesc, setTrackerSortDesc] = useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatus | '전체'>('전체');
  const [issueStatusFilter, setIssueStatusFilter] = useState<'전체' | 'Issue' | 'Resolved'>('전체');
  
  const isAutoScrolling = useRef(false);

  useEffect(() => {
    try { window.moveTo(0, 0); window.resizeTo(screen.availWidth, screen.availHeight); } catch {}
  }, []);

  useEffect(() => {
    const ch = getSyncChannel();
    if (!ch) return;
    ch.onmessage = (e) => {
      const msg = e.data;
      if (msg?.type === "OPEN_PROJECT" && msg.project) {
        const incoming = msg.project as Project;
        const normalized = incoming.status === "완료" ? {
          ...incoming,
          progress: 100,
          tasks: incoming.tasks.map((t) => ({ ...t, status: "완료" as TaskStatus, progress: 100 })),
          issues: incoming.issues.map((i) => ({ ...i, status: "Resolved" as IssueStatus, resolved: true })),
        } : incoming;
        setProject(normalized);
        setActiveItemId(undefined);
        setModalConfig(null);
      } else if (msg?.type === "PROJECT_DELETED" && msg.projectId === project?.id) {
        window.close();
      }
    };
    ch.postMessage({ type: "REQUEST_PROJECT" });
    return () => ch.close();
  }, []);

  // Broadcast changes to other windows (Window A)
  useEffect(() => {
    if (!project) return;
    
    // Update the in-memory MOCK_PROJECTS array so it persists during the session
    const idx = MOCK_PROJECTS.findIndex(p => p.id === project.id);
    if (idx !== -1) {
      MOCK_PROJECTS[idx] = project;
    }

    const ch = getSyncChannel();
    if (!ch) return;
    ch.postMessage({ type: "PROJECT_UPDATE", project });
    
    // Persist to localStorage
    const saved = localStorage.getItem('design-projects-store');
    let allProjects = MOCK_PROJECTS;
    if (saved) {
      try {
        allProjects = JSON.parse(saved);
        const pIdx = allProjects.findIndex(p => p.id === project.id);
        if (pIdx !== -1) allProjects[pIdx] = project;
        else allProjects.push(project);
      } catch { /* ignore */ }
    }
    localStorage.setItem('design-projects-store', JSON.stringify(allProjects));

    return () => ch.close();
  }, [project]);

  if (!project) return <div className="flex h-screen w-screen items-center justify-center bg-[#050505] text-white/50 text-2xl font-bold tracking-widest">LOADING...</div>;

  const derivedProgress = project.tasks.length > 0 ? Math.round(project.tasks.reduce((acc, t) => acc + t.progress, 0) / project.tasks.length) : 0;

  const handleSaveTask = (task: Task) => {
    setProject(prev => {
      if(!prev) return prev;
      const exists = prev.tasks.some(t => t.id === task.id);
      return { ...prev, tasks: exists ? prev.tasks.map(t => t.id === task.id ? task : t) : [...prev.tasks, task] };
    });
    setModalConfig(null);
  };

  const handleSaveIssue = (issue: Issue) => {
    setProject(prev => {
      if(!prev) return prev;
      const exists = prev.issues.some(i => i.id === issue.id);
      return { ...prev, issues: exists ? prev.issues.map(i => i.id === issue.id ? issue : i) : [...prev.issues, issue] };
    });
    setModalConfig(null);
  };

  const handleDeleteTask = (taskId: string) => {
    const t = project?.tasks.find(x => x.id === taskId);
    setPendingDelete({ kind: 'task', id: taskId, title: t?.title ?? '상세 업무' });
  };

  const handleDeleteIssue = (issueId: string) => {
    const i = project?.issues.find(x => x.id === issueId);
    setPendingDelete({ kind: 'issue', id: issueId, title: i?.title ?? '이슈' });
  };

  const confirmPendingDelete = () => {
    if (!pendingDelete) return;
    const { kind, id } = pendingDelete;
    if (kind === 'task') {
      setProject(prev => prev ? { ...prev, tasks: prev.tasks.filter(t => t.id !== id) } : prev);
    } else {
      setProject(prev => prev ? { ...prev, issues: prev.issues.filter(i => i.id !== id) } : prev);
    }
    if (activeItemId === id) setActiveItemId(undefined);
    setPendingDelete(null);
  };

  const handleToggleStar = (imgUrl: string) => {
    setProject(prev => {
      if(!prev) return prev;
      const isStarred = prev.images?.some(img => img.url === imgUrl);
      return { 
        ...prev, 
        images: isStarred 
          ? prev.images.filter(img => img.url !== imgUrl) 
          : [...(prev.images||[]), { url: imgUrl, memo: "" }] 
      };
    });
  };

  const handleUpdateProjectImages = (newImages: ProjectImage[]) => {
    setProject(prev => prev ? { ...prev, images: newImages } : prev);
  };

  const handleFocusItem = (targetId: string, source: 'tracker' | 'gantt') => {
    if (isAutoScrolling.current) return;
    isAutoScrolling.current = true;
    setActiveItemId(targetId);

    setTimeout(() => {
      if (source === 'tracker') {
        const ganttEl = document.querySelector(`[data-gantt-target="${targetId}"]`);
        if (ganttEl) ganttEl.scrollIntoView({ block: 'center', inline: 'start', behavior: 'smooth' });
      } else {
        const trackerEl = document.getElementById(`tracker-item-${targetId}`);
        if (trackerEl) trackerEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      setTimeout(() => { isAutoScrolling.current = false; }, 600);
    }, 50);
  };

  const handleUpdateEndDate = (id: string, daysDelta: number) => {
    setProject(prev => {
      if (!prev) return prev;
      const updateEnd = (dateStr: string, delta: number) => {
        const d = new Date(dateStr);
        d.setDate(d.getDate() + delta);
        return d.toISOString().slice(0, 10);
      };

      const isTask = prev.tasks.some(t => t.id === id);
      if (isTask) {
        return { ...prev, tasks: prev.tasks.map(t => t.id === id ? { ...t, endDate: updateEnd(t.endDate, daysDelta) } : t) };
      } else {
        return { ...prev, issues: prev.issues.map(i => i.id === id ? { ...i, endDate: updateEnd(i.endDate, daysDelta) } : i) };
      }
    });
  };

  const activeTask = project.tasks.find(t => t.id === activeItemId);
  const activeIssue = project.issues.find(i => i.id === activeItemId);
  const imagesToShow = activeTask?.imageUrls && activeTask.imageUrls.length > 0 ? activeTask.imageUrls : 
                       activeIssue?.imageUrls && activeIssue.imageUrls.length > 0 ? activeIssue.imageUrls : project.images;

  return (
    <div className="flex h-screen w-screen flex-col bg-[#050505] bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center text-white overflow-hidden font-sans">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-3xl z-0" />
      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0a0a0a]/60 backdrop-blur-xl px-6">
        <div className="flex items-center gap-6">
          <button onClick={() => window.opener ? window.close() : navigate({ to: "/" })} className="hover:bg-white/10 p-2 rounded transition">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-base font-bold tracking-widest uppercase text-white/40">{project.department}</span>
            <span className="text-white/20 text-xl">/</span>
            <span className="text-2xl font-black tracking-tight">{project.title}</span>
            <button onClick={() => setModalConfig({ type: 'project' })} className="p-1.5 ml-2 text-white/30 hover:text-white/80 hover:bg-white/10 rounded-md transition" title="프로젝트 정보 수정">
              <Edit2 className="w-4 h-4" />
            </button>

            {/* Expanded Info - Enlarged for better visibility */}
            <div className="ml-4 flex items-center gap-6 bg-white/5 px-6 py-2 rounded-full border border-white/10 text-base">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-black text-orange-400 uppercase tracking-widest opacity-80">마감일</span>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4.5 h-4.5 text-white/90" />
                  <span className="font-mono text-white/90 font-bold">{project.deadline}</span>
                </div>
              </div>
              <div className="w-px h-4 bg-white/20" />
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest opacity-80">PM</span>
                <div className="flex items-center gap-2">
                  <Users className="w-4.5 h-4.5 text-white/90" />
                  <span className="font-black text-white/90">{project.pm}</span>
                </div>
              </div>
              <div className="w-px h-4 bg-white/20" />
              <span className="font-black text-teal-400 text-lg">{project.status}</span>
            </div>

            {(() => {
              // Match thumbnail card logic: done(>=100) → emerald, urgent(D-7 & in-progress) → amber, else neutral
              const ddayDiff = (() => {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(project.deadline)) return null;
                const t = new Date(); t.setHours(0,0,0,0);
                const d = new Date(project.deadline); d.setHours(0,0,0,0);
                return Math.round((d.getTime() - t.getTime()) / 86400000);
              })();
              const isUrgentHdr = project.status === "진행" && ddayDiff !== null && ddayDiff <= 7 && derivedProgress < 100;
              const tierBar =
                derivedProgress >= 100 ? "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]"
                : isUrgentHdr ? "bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]"
                : "bg-slate-400 shadow-[0_0_12px_rgba(148,163,184,0.4)]";
              return (
                <div className="ml-2 flex items-center gap-3 bg-white/5 px-5 py-2 rounded-full border border-white/10">
                  <span className="text-base font-bold text-white/90">진행률 {derivedProgress}%</span>
                  <div className="flex w-32 h-2.5 overflow-hidden rounded-full bg-black/50 border border-white/10">
                    <div className={`h-full transition-all duration-500 ${tierBar}`} style={{ width: `${derivedProgress}%` }} />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setModalConfig({ type: 'design-hub' })}
            className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-5 py-2.5 rounded-xl text-sm font-black transition group"
          >
            <FolderOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
            전체 시안
          </button>
          
          <button 
            onClick={() => setIsImageViewerFull(!isImageViewerFull)} 
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-black hover:bg-white/10 transition text-white/70"
          >
            {isImageViewerFull ? <Minimize2 className="h-4.5 w-4.5" /> : <Maximize2 className="h-4.5 w-4.5" />}
            {isImageViewerFull ? "기본 화면" : "시안 확대"}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <PanelGroup direction="vertical">
          <Panel order={1} defaultSize={isImageViewerFull ? 100 : 60} minSize={30}>
            <PanelGroup direction="horizontal">
              <Panel order={1} defaultSize={isImageViewerFull ? 100 : 70} minSize={30}>
                <ImageViewer images={imagesToShow} projectImages={project.images} onToggleStar={handleToggleStar} onEditThumbnails={() => setModalConfig({ type: 'thumbnails' })} />
              </Panel>
              {!isImageViewerFull && (
                <>
                  <ResizeHandleVertical />
                  <Panel order={2} defaultSize={30} minSize={25} className="bg-[#0a0a0a] flex flex-col border-l border-white/10 relative z-10 shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
                    <div className="min-h-[80px] p-5 border-b border-white/10 bg-[#0d0d0d] flex items-center justify-between shrink-0 sticky top-0 z-[20] shadow-sm">
                      <h2 className="font-black text-xl tracking-wider text-white/90">업무 내역</h2>
                      <div className="flex gap-2">
                        <button onClick={() => setModalConfig({ type: 'task', mode: 'create' })} className="flex items-center gap-1 text-[13px] font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-white transition border border-white/20 whitespace-nowrap">
                          <Plus className="w-4 h-4" /> 업무 추가
                        </button>
                        <button onClick={() => setModalConfig({ type: 'issue', mode: 'create' })} className="flex items-center gap-1 text-[13px] font-bold bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 px-3 py-1.5 rounded-md text-rose-400 transition whitespace-nowrap">
                          <Plus className="w-4 h-4" /> 이슈 추가
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 bg-[#0a0a0a]/50 backdrop-blur-xl relative z-10">


                      {(() => {
                        const taskStatusOrder: Record<string, number> = { 진행: 0, 검토중: 1, 대기: 2, 보류: 3, 승인됨: 4, 완료: 5, 취소: 6 };
                        const sortFn = <T extends { startDate: string; progress?: number; status?: string; resolved?: boolean }>(a: T, b: T) => {
                          let cmp = 0;
                          if (trackerSort === 'startDate') cmp = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
                          else if (trackerSort === 'progress') {
                            const ap = (a as any).progress ?? ((a as any).resolved ? 100 : 0);
                            const bp = (b as any).progress ?? ((b as any).resolved ? 100 : 0);
                            cmp = ap - bp;
                          } else if (trackerSort === 'status') {
                            cmp = (taskStatusOrder[a.status ?? ''] ?? 99) - (taskStatusOrder[b.status ?? ''] ?? 99);
                          }
                          return trackerSortDesc ? -cmp : cmp;
                        };
                        const filteredTasks = project.tasks.filter(t => taskStatusFilter === '전체' || t.status === taskStatusFilter).sort(sortFn);
                        const filteredIssues = project.issues.filter(i => issueStatusFilter === '전체' || i.status === issueStatusFilter).sort(sortFn);
                        const sortBtn = (key: typeof trackerSort, label: string) => (
                          <button
                            key={key}
                            onClick={() => { if (trackerSort === key) setTrackerSortDesc(d => !d); else { setTrackerSort(key); setTrackerSortDesc(false); } }}
                            className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition border ${trackerSort === key ? 'bg-orange-400/20 text-orange-200 border-orange-400/50' : 'bg-white/[0.03] text-white/60 border-white/10 hover:text-white/90 hover:border-white/20'}`}
                          >{label}{trackerSort === key ? (trackerSortDesc ? ' ↓' : ' ↑') : ''}</button>
                        );
                        const selectClass = "appearance-none bg-[#0F0F0F] border border-white/15 rounded-md pl-3 pr-8 py-1.5 text-[12px] font-bold text-white/90 focus:outline-none focus:border-orange-400/60 hover:border-white/30 transition cursor-pointer [&>option]:bg-[#0F0F0F] [&>option]:text-white/90";
                        const ChevronIcon = (
                          <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/55" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
                        );
                        return (
                          <>
                            {/* Filter / sort toolbar */}
                            <div className="mb-4 flex flex-wrap items-center gap-2 pb-3 border-b border-white/5">
                              <span className="text-[11px] font-black text-white/50 uppercase tracking-widest mr-1">정렬</span>
                              {sortBtn('startDate', '시작일')}
                              {sortBtn('progress', '진행률')}
                              {sortBtn('status', '상태')}
                              <span className="mx-2 h-4 w-px bg-white/10" />
                              <span className="text-[11px] font-black text-white/50 uppercase tracking-widest mr-1">업무</span>
                              <div className="relative">
                                <select
                                  value={taskStatusFilter}
                                  onChange={(e) => setTaskStatusFilter(e.target.value as any)}
                                  className={selectClass}
                                >
                                  <option value="전체">전체 상태</option>
                                  {(["대기","진행","검토중","승인됨","보류","취소","완료"] as TaskStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                {ChevronIcon}
                              </div>
                              <span className="text-[11px] font-black text-rose-400/80 uppercase tracking-widest ml-1 mr-1">이슈</span>
                              <div className="relative">
                                <select
                                  value={issueStatusFilter}
                                  onChange={(e) => setIssueStatusFilter(e.target.value as any)}
                                  className={selectClass}
                                >
                                  <option value="전체">전체</option>
                                  <option value="Issue">이슈 발생</option>
                                  <option value="Resolved">해결됨</option>
                                </select>
                                {ChevronIcon}
                              </div>
                            </div>

                            <Accordion.Root type="single" value={activeItemId || ""} onValueChange={(val) => { if (val && !isAutoScrolling.current) handleFocusItem(val, 'tracker'); else if (!val && !isAutoScrolling.current) setActiveItemId(undefined); }} collapsible className="space-y-4">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-3 pl-1 pr-1">
                                   <h4 className="text-[15px] font-black text-white/40 tracking-widest uppercase">상세 업무</h4>
                                   <span className="text-[14px] font-bold text-white/40">({filteredTasks.length}/{project.tasks.length})</span>
                                </div>
                                {filteredTasks.map(t => (
                                  <div key={t.id} id={`tracker-item-${t.id}`}>
                                    <TaskAccordionItem task={t} isActive={activeItemId === t.id} onEdit={() => setModalConfig({ type: 'task', mode: 'edit', id: t.id })} onDelete={() => handleDeleteTask(t.id)} />
                                  </div>
                                ))}
                                {filteredTasks.length === 0 && <p className="text-sm font-bold text-white/20 pl-1">조건에 맞는 업무가 없습니다.</p>}
                              </div>
                              <div className="space-y-3 pt-8 border-t border-white/10">
                                <div className="flex items-center gap-2 mb-3 pl-1 pr-1">
                                   <h4 className="text-[15px] font-black text-rose-500/50 tracking-widest">이슈 사항</h4>
                                   <span className="text-[15px] font-bold text-rose-500/50">({filteredIssues.length}/{project.issues.length})</span>
                                </div>
                                {filteredIssues.map(iss => (
                                  <div key={iss.id} id={`tracker-item-${iss.id}`}>
                                    <IssueAccordionItem issue={iss} isActive={activeItemId === iss.id} onEdit={() => setModalConfig({ type: 'issue', mode: 'edit', id: iss.id })} onDelete={() => handleDeleteIssue(iss.id)} />
                                  </div>
                                ))}
                                {filteredIssues.length === 0 && <p className="text-base font-bold text-white/20 pl-1">등록된 이슈 사항이 없습니다.</p>}
                              </div>
                            </Accordion.Root>
                          </>
                        );
                      })()}
                    </div>
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>
          {!isImageViewerFull && (
            <>
              <ResizeHandleHorizontal />
              <Panel order={2} defaultSize={40} minSize={20}>
                <GanttChart 
                  tasks={project.tasks} 
                  issues={project.issues} 
                  activeId={activeItemId} 
                  setActiveId={(id) => handleFocusItem(id, 'gantt')} 
                  onUpdateEndDate={handleUpdateEndDate}
                />
              </Panel>
            </>
          )}
        </PanelGroup>
      </main>

      {modalConfig && modalConfig.type !== 'thumbnails' && modalConfig.type !== 'project' && (
        <CrudModal config={modalConfig} project={project} onClose={() => setModalConfig(null)} onSaveTask={handleSaveTask} onSaveIssue={handleSaveIssue} />
      )}
      
      {modalConfig?.type === 'thumbnails' && (
        <ThumbnailEditorModal images={project.images} onClose={() => setModalConfig(null)} onUpdateImages={handleUpdateProjectImages} />
      )}

      {modalConfig?.type === 'project' && (
        <ProjectEditModal project={project} onClose={() => setModalConfig(null)} onSave={(updates) => setProject(prev => prev ? { ...prev, ...updates } : prev)} />
      )}

      {modalConfig?.type === 'design-hub' && (
        <DesignHubModal project={project} onClose={() => setModalConfig(null)} />
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete?.kind === 'task' ? '상세 업무를 삭제할까요?' : '이슈를 삭제할까요?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.title ?? ''}" 항목이 제거됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPendingDelete}
              className="bg-rose-600 hover:bg-rose-500 text-white"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ImageViewer({ images, projectImages, onToggleStar, onEditThumbnails }: { images: ProjectImage[], projectImages: ProjectImage[], onToggleStar: (url: string) => void, onEditThumbnails: () => void }) {
  const [idx, setIdx] = useState(0);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => { 
    setIdx(0); 
    handleFit();
  }, [images]);

  useEffect(() => {
    handleFit();
  }, [idx]);

  // Auto-refit when the viewer container resizes (e.g. toggling 시안 확대 / 기본 화면)
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      handleFit();
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const handleFit = () => {
    if (!containerRef.current || !imgRef.current) {
       setScale(1); setPosition({ x: 0, y: 0 });
       return;
    }
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const iw = imgRef.current.naturalWidth;
    const ih = imgRef.current.naturalHeight;
    if (!iw || !ih) return;

    const scaleW = cw / iw;
    const scaleH = ch / ih;
    const newScale = Math.min(scaleW, scaleH) * 0.95; // 5% margin
    setScale(newScale);
    setPosition({ x: 0, y: 0 });
  };

  const handlePanStart = (e: React.MouseEvent) => {
    setIsPanning(true);
    setStartPan({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  const handlePanMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPosition({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
  };
  const handlePanEnd = () => setIsPanning(false);
  const handleWheel = (e: React.WheelEvent) => {
    setScale(prev => Math.min(Math.max(0.1, prev - e.deltaY * 0.001 * prev), 10));
  };

  if (!images || images.length === 0) return <div className="h-full w-full bg-[#050505] flex items-center justify-center text-white/20 font-bold text-xl">No Images</div>;

  const currentImg = images[idx];
  const isStarred = projectImages?.some(img => img.url === currentImg.url) ?? false;
  const [showMemo, setShowMemo] = useState(false);

  useEffect(() => {
    setShowMemo(false); // Hide memo when image changes
  }, [idx]);

  return (
    <div className="relative h-full w-full bg-[#050505] group flex flex-col" ref={containerRef}>
      <div className="absolute top-5 right-5 z-10 flex gap-3">
         {currentImg.memo && (
           <button 
             onClick={() => setShowMemo(!showMemo)} 
             className={`p-3 rounded-lg border transition shadow-lg backdrop-blur-sm flex items-center gap-2 ${showMemo ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-black/60 text-white/50 border-white/10 hover:bg-white/10'}`}
           >
             <Image className="w-5 h-5 stroke-[2.5]" />
             <span className="text-sm font-black uppercase tracking-tighter">메모</span>
           </button>
         )}
         <button onClick={() => onToggleStar(currentImg.url)} className="p-3 bg-black/60 hover:bg-white/10 rounded-lg border border-white/10 transition shadow-lg backdrop-blur-sm">
           <Star className={`w-6 h-6 ${isStarred ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'text-white/50'}`} />
         </button>
         <button onClick={onEditThumbnails} className="px-5 py-2.5 bg-black/60 hover:bg-white/10 rounded-lg border border-white/10 transition text-base font-bold text-white/90 shadow-lg backdrop-blur-sm">
           썸네일 편집
         </button>
         <button onClick={handleFit} className="p-3 bg-black/60 hover:bg-white/10 rounded-lg border border-white/10 transition shadow-lg backdrop-blur-sm" title="Fit to Screen">
            <Minimize2 className="w-6 h-6 text-white/80" />
         </button>
      </div>

      {/* Memo Overlay - Positioned to avoid sidebar conflict */}
      {showMemo && currentImg.memo && (
        <div className="absolute top-24 right-20 z-[60] w-80 animate-in slide-in-from-right-5 fade-in duration-300">
           <div className="bg-black/90 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.6)]">
              <div className="flex items-center gap-2 mb-4">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">메모</span>
              </div>
              <div className="max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                <p className="text-white/90 font-bold leading-relaxed whitespace-pre-wrap italic">
                  "{currentImg.memo}"
                </p>
              </div>
           </div>
        </div>
      )}
      <div 
        className={`flex-1 relative overflow-hidden flex items-center justify-center ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
        onWheel={handleWheel}
      >
        <img 
          ref={imgRef}
          src={currentImg.url} 
          alt="" 
          onLoad={handleFit}
          style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
          className="max-w-none transition-transform duration-75 select-none pointer-events-none drop-shadow-2xl"
        />
        {scale !== 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-white/80 font-mono text-sm pointer-events-none">
            {Math.round(scale * 100)}%
          </div>
        )}
      </div>
      {images.length > 1 && (
        <>
          <button 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-32 w-14 bg-white/10 hover:bg-white/20 border-y border-r border-white/10 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-md z-[70] flex items-center justify-center text-white/50 hover:text-white rounded-r-3xl shadow-[5px_0_15px_rgba(0,0,0,0.3)]" 
            onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}
            title="이전 시안"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button 
            className="absolute right-0 top-1/2 -translate-y-1/2 h-32 w-14 bg-white/10 hover:bg-white/20 border-y border-l border-white/10 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-md z-[70] flex items-center justify-center text-white/50 hover:text-white rounded-l-3xl shadow-[-5px_0_15px_rgba(0,0,0,0.3)]" 
            onClick={() => setIdx(i => (i + 1) % images.length)}
            title="다음 시안"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}
    </div>
  );
}

function ThumbnailEditorModal({ images, onClose, onUpdateImages }: { images: ProjectImage[], onClose: () => void, onUpdateImages: (imgs: ProjectImage[]) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <DndProvider>
        <div className="w-full max-w-4xl bg-[#111] border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
           <div className="p-6 border-b border-white/10 bg-[#161616] flex justify-between items-center">
              <h2 className="text-2xl font-black text-white/90">썸네일 편집</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition"><X className="w-8 h-8 text-white/50" /></button>
           </div>
           <div className="p-8 grid grid-cols-3 gap-6 overflow-y-auto max-h-[60vh]">
              {images?.map((img, idx) => (
                <div key={img.url} className="relative group rounded-xl overflow-hidden border border-white/10 aspect-video bg-black shadow-lg">
                  <img src={getOptimizedUrl(img.url, 'thumb')} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
                     <button type="button" onClick={() => {
                        const newImgs = [...images];
                        if(idx > 0) { [newImgs[idx-1], newImgs[idx]] = [newImgs[idx], newImgs[idx-1]]; onUpdateImages(newImgs); }
                     }} className="p-3 bg-black/80 hover:bg-white/20 rounded-full border border-white/20"><ArrowLeft className="w-5 h-5 text-white" /></button>
                     <button type="button" onClick={() => {
                        const newImgs = [...images];
                        if(idx < newImgs.length - 1) { [newImgs[idx+1], newImgs[idx]] = [newImgs[idx], newImgs[idx+1]]; onUpdateImages(newImgs); }
                     }} className="p-3 bg-black/80 hover:bg-white/20 rounded-full border border-white/20"><ArrowRight className="w-5 h-5 text-white" /></button>
                     <button type="button" onClick={() => onUpdateImages(images.filter((_, i) => i !== idx))} className="p-3 bg-rose-500/80 hover:bg-rose-500 rounded-full border border-rose-500/50"><X className="w-5 h-5 text-white" /></button>
                  </div>
                </div>
              ))}
              {(!images || images.length === 0) && <p className="text-white/30 font-bold col-span-3 text-center py-16 text-lg">선택된 썸네일이 없습니다.</p>}
           </div>
        </div>
      </DndProvider>
    </div>
  );
}

function TaskAccordionItem({ task, isActive, onEdit, onDelete }: { task: Task, isActive: boolean, onEdit: () => void, onDelete: () => void }) {
  return (
    <Accordion.Item value={task.id} className={`rounded-xl border transition-all overflow-hidden ${isActive ? "border-orange-400 bg-gradient-to-br from-orange-500/[0.18] to-[#111] ring-2 ring-orange-400/70 shadow-[0_0_0_1px_rgba(251,146,60,0.5),0_0_32px_rgba(251,146,60,0.45)]" : "border-white/10 bg-[#111] hover:border-white/20"}`}>
      <Accordion.Header>
        <Accordion.Trigger className="flex w-full flex-col p-5 pb-6 focus:outline-none gap-3 relative z-10 bg-transparent">
          <div className="flex items-center justify-between w-full relative z-10">
            <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
              <span className={`text-sm font-mono font-bold shrink-0 ${isActive ? 'text-orange-400' : 'text-white/40'}`}>{task.startDate.slice(5)}</span>
              <span className="text-lg font-bold truncate text-left text-white/90">{task.title}</span>
            </div>
            <span className={`text-sm font-bold px-3 py-1.5 rounded border shrink-0 ${task.status==='완료' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-white/60 border-white/10'}`}>{task.status}</span>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-[4px] bg-[#E0E0E0]/10 overflow-hidden">
             <div className="h-full bg-gradient-to-r from-[#0d3b2f] to-[#147058] transition-all duration-500" style={{ width: `${task.progress}%` }} />
          </div>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown relative z-10">
        <div className="p-5 pt-3 border-t border-white/10 bg-black/40 backdrop-blur-md">
          <div className="max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
            <p className="text-base text-white/70 leading-relaxed whitespace-pre-wrap font-medium">{task.content || "내용이 없습니다."}</p>
          </div>
          <div className="flex items-center justify-between mt-6">
            <div className="flex gap-8">
              <div><span className="text-white/30 block text-xs font-bold uppercase mb-1.5">담당자</span><span className="text-white/90 font-bold text-base">{task.assignee}</span></div>
              <div><span className="text-white/30 block text-xs font-bold uppercase mb-1.5">기간</span><span className="text-white/90 font-bold font-mono text-base">{task.startDate} ~ {task.endDate}</span></div>
              <div><span className="text-white/30 block text-xs font-bold uppercase mb-1.5">진행률</span><span className="text-white/90 font-bold font-mono text-base">{task.progress}%</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={onEdit} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 rounded-lg text-sm font-bold transition">
                <Edit2 className="w-4 h-4" /> 수정
              </button>
              <button onClick={onDelete} className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 px-5 py-2.5 rounded-lg text-sm font-bold transition">
                <Trash2 className="w-4 h-4" /> 삭제
              </button>
            </div>
          </div>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  );
}

function IssueAccordionItem({ issue, isActive, onEdit, onDelete }: { issue: Issue, isActive: boolean, onEdit: () => void, onDelete: () => void }) {
  const progress = issue.resolved ? 100 : 0;
  return (
    <Accordion.Item value={issue.id} className={`rounded-xl border transition-all overflow-hidden ${isActive ? "border-orange-400 bg-gradient-to-br from-orange-500/[0.18] to-[#111] ring-2 ring-orange-400/70 shadow-[0_0_0_1px_rgba(251,146,60,0.5),0_0_32px_rgba(251,146,60,0.45)]" : "border-white/10 bg-[#111] hover:border-white/20"}`}>
      <Accordion.Header>
        <Accordion.Trigger className="flex w-full flex-col p-5 pb-6 focus:outline-none gap-3 relative z-10 bg-transparent">
          <div className="flex items-center justify-between w-full relative z-10">
            <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
              <span className={`text-sm font-mono font-bold shrink-0 ${isActive ? 'text-orange-400' : 'text-white/40'}`}>{issue.startDate.slice(5)}</span>
              <span className={`text-lg font-bold truncate text-left ${issue.resolved ? 'text-white/50' : 'text-white/90'}`}>{issue.title}</span>
            </div>
            <span className={`text-sm font-bold px-3 py-1.5 rounded border shrink-0 ${issue.resolved ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
              {issue.status === "Issue" ? "이슈 발생" : "해결됨"}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-[4px] bg-[#E0E0E0]/10 overflow-hidden">
             <div className="h-full bg-gradient-to-r from-red-800 to-red-950 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown relative z-10">
        <div className="p-5 pt-3 border-t border-white/10 bg-black/40 backdrop-blur-md">
          <div className="max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
            <p className="text-base text-white/70 leading-relaxed whitespace-pre-wrap font-medium">{issue.content || "내용이 없습니다."}</p>
          </div>
          {issue.resolved && issue.memo && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl mt-4">
              <span className="block text-sm font-black text-emerald-400 mb-2">해결 메모</span>
              <p className="text-base font-bold text-white/80 whitespace-normal break-words">{issue.memo}</p>
            </div>
          )}
          <div className="flex items-center justify-between mt-6">
            <div className="flex gap-8">
              <div><span className="text-white/30 block text-xs font-bold uppercase mb-1.5">담당자</span><span className="text-white/90 font-bold text-base">{issue.assignee}</span></div>
              <div><span className="text-white/30 block text-xs font-bold uppercase mb-1.5">기간</span><span className="text-white/90 font-bold font-mono text-base">{issue.startDate} ~ {issue.endDate}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={onEdit} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 rounded-lg text-sm font-bold transition">
                <Edit2 className="w-4 h-4" /> 수정
              </button>
              <button onClick={onDelete} className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 px-5 py-2.5 rounded-lg text-sm font-bold transition">
                <Trash2 className="w-4 h-4" /> 삭제
              </button>
            </div>
          </div>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  );
}

function CrudModal({ config, project, onClose, onSaveTask, onSaveIssue }: { config: any, project: Project, onClose: () => void, onSaveTask: (t: Task) => void, onSaveIssue: (i: Issue) => void }) {
  const isTask = config.type === 'task';
  const existingTask = isTask && config.id ? project.tasks.find(t => t.id === config.id) : null;
  const existingIssue = !isTask && config.id ? project.issues.find(i => i.id === config.id) : null;

  const [form, setForm] = useState<any>(() => {
    if (existingTask) return { ...existingTask, imageUrls: existingTask.imageUrls || [] };
    if (existingIssue) return { ...existingIssue, imageUrls: existingIssue.imageUrls || [] };
    return {
      id: config.id || `${config.type}-${Date.now()}`,
      title: "", content: "",
      status: isTask ? "대기" : "Issue", progress: 0,
      startDate: new Date().toISOString().slice(0,10), endDate: "",
      assignee: project.pm, imageUrls: [],
      resolved: false, memo: ""
    };
  });

  const members = Array.from(new Set([project.pm, ...project.members]));
  const taskStatuses: TaskStatus[] = ["대기", "진행", "검토중", "승인됨", "보류", "취소", "완료"];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTask) onSaveTask(form as Task);
    else onSaveIssue(form as Issue);
  };

  const handleProgressChange = (val: number) => {
    let newStatus = form.status;
    if (val === 100) newStatus = "완료";
    else if (form.status === "완료" && val < 100) newStatus = "진행";
    setForm({ ...form, progress: val, status: newStatus });
  };

  const handleStatusChange = (status: string) => {
    if (isTask) {
      let newProgress = form.progress;
      if (status === "완료") newProgress = 100;
      setForm({ ...form, status, progress: newProgress });
    } else {
      const resolved = status === "Resolved";
      setForm({ ...form, status, resolved, timestamp: resolved ? new Date().toISOString() : undefined });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center backdrop-blur-md">
          <h2 className="text-2xl font-black text-white/90">{config.mode === 'create' ? '새로 만들기' : '수정'} - {isTask ? '상세 업무' : '이슈 사항'}</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition"><X className="w-7 h-7 text-white/50" /></button>
        </div>
        
        <form onSubmit={handleSave} className="p-8 overflow-y-auto max-h-[80vh] space-y-8">
          <div className="space-y-3">
            <label className="text-base font-bold text-white/60">제목</label>
            <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-black border border-white/20 rounded-xl p-4 text-white text-lg font-bold focus:border-orange-500 focus:outline-none" placeholder="제목을 입력하세요" />
          </div>
          <div className="space-y-3">
            <label className="text-base font-bold text-white/60">상세 내용</label>
            <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="w-full bg-black border border-white/20 rounded-xl p-4 text-white text-lg focus:border-orange-500 focus:outline-none min-h-[120px]" placeholder="상세 내용을 입력하세요" />
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-base font-bold text-white/60">담당자</label>
              <select value={form.assignee} onChange={e => setForm({...form, assignee: e.target.value})} className="w-full bg-black border border-white/20 rounded-xl p-4 text-white text-lg font-bold focus:border-orange-500 focus:outline-none">
                {members.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-base font-bold text-white/60">진행 상태</label>
              <select value={form.status} onChange={e => handleStatusChange(e.target.value)} className="w-full bg-black border border-white/20 rounded-xl p-4 text-white text-lg font-bold focus:border-orange-500 focus:outline-none">
                {isTask ? taskStatuses.map(s => <option key={s} value={s}>{s}</option>) : (
                  <><option value="Issue">이슈 발생</option><option value="Resolved">해결됨</option></>
                )}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-base font-bold text-white/60">시작일</label>
              <input type="date" required value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className="w-full bg-black border border-white/20 rounded-xl p-4 text-white font-mono text-lg focus:border-orange-500 focus:outline-none" />
            </div>
            <div className="space-y-3">
              <label className="text-base font-black text-orange-400">종료일 (필수)</label>
              <input type="date" required value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} className="w-full bg-orange-500/10 border border-orange-500/50 rounded-xl p-4 text-white font-mono text-lg focus:border-orange-500 focus:outline-none" />
            </div>
          </div>
          {isTask && (
            <div className="space-y-4 bg-white/5 p-6 rounded-xl border border-white/10">
              <div className="flex justify-between items-center">
                <label className="text-base font-bold text-white/60">진행률</label>
                <span className="font-black text-orange-400 text-lg">{form.progress}%</span>
              </div>
              <input type="range" min="0" max="100" step="10" value={form.progress} onChange={e => handleProgressChange(Number(e.target.value))} className="w-full accent-orange-500 h-3 bg-black rounded-full appearance-none cursor-pointer" />
            </div>
          )}
          {!isTask && form.resolved && (
            <div className="space-y-3 bg-emerald-500/10 p-6 rounded-xl border border-emerald-500/30">
              <label className="text-base font-black text-emerald-400">해결 메모 (필수)</label>
              <textarea required value={form.memo || ""} onChange={e => setForm({...form, memo: e.target.value})} className="w-full bg-black border border-emerald-500/50 rounded-xl p-4 text-white text-lg focus:border-emerald-500 focus:outline-none min-h-[100px]" placeholder="해결 방안을 작성해주세요" />
            </div>
          )}
          {/* Image Management Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <label className="text-lg font-black text-white/90 flex items-center gap-3">
                <FolderOpen className="w-6 h-6 text-emerald-400" /> 시안 및 이미지 관리
              </label>
              <button 
                type="button"
                onClick={() => {
                  const url = window.prompt("추가할 이미지 URL을 입력하세요:");
                  if (url) setForm({ ...form, imageUrls: [...form.imageUrls, { url, memo: "" }] });
                }}
                className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-bold hover:bg-white/90 transition-all text-sm shadow-lg"
              >
                <Plus className="w-4 h-4" /> URL 추가
              </button>
            </div>
            
            {form.imageUrls.length === 0 ? (
              <div className="border-2 border-dashed border-white/5 rounded-3xl p-12 text-center bg-white/[0.01]">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Image className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-base font-bold text-white/20 italic">등록된 시안이 없습니다. 이미지를 추가하여 디자인 히스토리를 관리하세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {form.imageUrls.map((img: ProjectImage, i: number) => (
                  <div key={i} className="group flex gap-5 p-5 bg-[#111] border border-white/5 rounded-[2rem] hover:border-emerald-500/30 transition-all duration-300 relative">
                    <div className="w-40 h-24 rounded-2xl overflow-hidden bg-black shrink-0 border border-white/10 shadow-2xl relative">
                      <img src={getOptimizedUrl(img.url, 'thumb')} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-black text-white/60">#{i + 1}</div>
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div className="flex items-start justify-between gap-6">
                        <textarea 
                          value={img.memo || ""} 
                          onChange={e => {
                            const next = [...form.imageUrls];
                            next[i] = { ...next[i], memo: e.target.value };
                            setForm({ ...form, imageUrls: next });
                          }}
                          className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-sm font-bold text-white/90 placeholder:text-white/20 focus:ring-1 focus:ring-emerald-500/50 focus:bg-white/10 transition-all resize-none h-16" 
                          placeholder="이 시안에 대한 피드백이나 수정 사항 메모..." 
                        />
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            type="button"
                            disabled={i === 0}
                            onClick={() => {
                              const next = [...form.imageUrls];
                              [next[i-1], next[i]] = [next[i], next[i-1]];
                              setForm({ ...form, imageUrls: next });
                            }}
                            className="p-2 hover:bg-white/10 rounded-xl text-white/30 hover:text-white disabled:opacity-0 transition"
                            title="위로 이동"
                          >
                            <ChevronUp className="w-5 h-5" />
                          </button>
                          <button 
                            type="button"
                            disabled={i === form.imageUrls.length - 1}
                            onClick={() => {
                              const next = [...form.imageUrls];
                              [next[i+1], next[i]] = [next[i], next[i+1]];
                              setForm({ ...form, imageUrls: next });
                            }}
                            className="p-2 hover:bg-white/10 rounded-xl text-white/30 hover:text-white disabled:opacity-0 transition"
                            title="아래로 이동"
                          >
                            <ChevronDown className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-[10px] font-mono text-white/20 truncate max-w-[200px] hover:text-white/40 transition-colors cursor-help" title={img.url}>{img.url}</div>
                        <button 
                          type="button"
                          onClick={() => {
                            const next = form.imageUrls.filter((_: any, idx: number) => idx !== i);
                            setForm({ ...form, imageUrls: next });
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg transition-all text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> 시안 삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pt-6 border-t border-white/10 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-8 py-4 rounded-xl border border-white/20 hover:bg-white/10 font-bold transition text-white text-lg">취소</button>
            <button type="submit" className="px-10 py-4 rounded-xl bg-orange-500 hover:bg-orange-600 font-black text-black transition shadow-[0_0_20px_rgba(249,115,22,0.3)] text-lg">저장하기</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GanttChart({ tasks, issues, activeId, setActiveId, onUpdateEndDate }: { tasks: Task[], issues: Issue[], activeId?: string, setActiveId: (id: string) => void, onUpdateEndDate: (id: string, days: number) => void }) {
  const [viewWeeks, setViewWeeks] = useState<4 | 8 | 12>(8);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const onMouseDown = (e: React.MouseEvent) => { setIsDragging(true); setStartX(e.pageX - (containerRef.current?.offsetLeft || 0)); setScrollLeft(containerRef.current?.scrollLeft || 0); };
  const onMouseLeave = () => setIsDragging(false);
  const onMouseUp = () => setIsDragging(false);
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    containerRef.current.scrollLeft = scrollLeft - ((e.pageX - containerRef.current.offsetLeft - startX) * 1.5);
  };

  const allItems = [...tasks, ...issues];
  const minDate = useMemo(() => new Date(Math.min(...allItems.map(t => new Date(t.startDate).getTime()))), [allItems]);
  const maxDate = useMemo(() => new Date(Math.max(...allItems.map(t => new Date(t.endDate).getTime()))), [allItems]);
  if (isNaN(minDate.getTime())) return <div className="flex h-full items-center justify-center text-white/30 font-bold text-xl">워크 플랜 데이터가 없습니다.</div>;

  const projectDays = Math.max(0, Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000)) + 14;
  const totalDays = Math.max(viewWeeks * 7, projectDays);
  const dayWidth = viewWeeks === 4 ? 90 : viewWeeks === 8 ? 50 : 35; 
  const totalWidth = totalDays * dayWidth;

  const getLeft = (dateStr: string) => Math.max(0, (new Date(dateStr).getTime() - minDate.getTime()) / 86400000 * dayWidth);
  const getWidth = (start: string, end: string) => Math.max(dayWidth, ((new Date(end).getTime() - new Date(start).getTime()) / 86400000) * dayWidth);

  // Time-Independent Now Date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mockNow = today.getTime();

  return (
    <div className="flex h-full flex-col bg-[#0f0f0f]/60 backdrop-blur-md select-none border-t border-white/10 overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-8 py-5 shrink-0 bg-[#0a0a0a]/80 backdrop-blur-xl z-30">
        <h3 className="text-xl font-black tracking-widest text-white/80">워크 플랜</h3>
        <div className="flex items-center gap-6">
          <div className="flex gap-2">
            <button onClick={() => containerRef.current?.scrollBy({ left: -300, behavior: 'smooth'})} className="p-2.5 border border-white/20 hover:bg-white/10 rounded-lg transition"><ChevronLeft className="w-5 h-5 text-white/80" /></button>
            <button onClick={() => containerRef.current?.scrollBy({ left: 300, behavior: 'smooth'})} className="p-2.5 border border-white/20 hover:bg-white/10 rounded-lg transition"><ChevronRight className="w-5 h-5 text-white/80" /></button>
          </div>
          <div className="relative group">
            <select 
              value={viewWeeks} 
              onChange={(e) => setViewWeeks(Number(e.target.value) as any)} 
              className="appearance-none rounded-xl border border-white/10 bg-white/5 pl-6 pr-12 py-3 text-sm font-black text-white focus:outline-none focus:border-emerald-500/50 transition-all cursor-pointer hover:bg-white/10"
            >
              <option value={4} className="bg-[#111]">4주 단위 보기</option>
              <option value={8} className="bg-[#111]">8주 단위 보기</option>
              <option value={12} className="bg-[#111]">12주 단위 보기</option>
            </select>
            <ChevronDown className="w-4 h-4 text-white/40 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-white/70 transition-colors" />
          </div>
        </div>
      </div>
      <div className={`flex-1 overflow-x-auto overflow-y-auto relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} ref={containerRef} onMouseDown={onMouseDown} onMouseLeave={onMouseLeave} onMouseUp={onMouseUp} onMouseMove={onMouseMove}>
        <div style={{ width: totalWidth, minWidth: "max-content", minHeight: "100%" }} className="relative">
          <div className="sticky top-0 z-20 flex h-20 border-b border-white/10 bg-[#0f0f0f]/95 backdrop-blur-md shadow-sm">
            {Array.from({ length: totalDays }).map((_, i) => {
              const d = new Date(minDate); d.setDate(d.getDate() + i);
              d.setHours(0, 0, 0, 0);
              const isNow = d.getTime() === mockNow;
              const step = viewWeeks === 4 ? 2 : viewWeeks === 8 ? 4 : 7;
              if (i % step !== 0 && !isNow) return null;
              
              return (
                <div key={i} className="absolute top-0 flex flex-col items-center -translate-x-1/2 h-full z-10" style={{ left: i * dayWidth }}>
                  {isNow ? (
                    <div className="bg-teal-500 text-[#FFFFFF] text-[14px] font-black px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(20,184,166,0.6)] mt-3">현재({d.getMonth()+1}월 {d.getDate()}일)</div>
                  ) : (
                    <span className="text-[20px] font-black text-[#FFFFFF] mt-4 bg-[#0f0f0f] px-3 whitespace-nowrap overflow-visible drop-shadow-md flex-shrink-0 min-w-max">
                      {d.getMonth()+1}월 {d.getDate()}일
                    </span>
                  )}
                  <div className={`h-full absolute top-12 ${isNow ? 'w-[2px] bg-teal-500/80 shadow-[0_0_10px_rgba(20,184,166,0.8)]' : 'w-px bg-white/10'}`} />
                </div>
              );
            })}
          </div>

          <div className="py-10 px-2 min-h-[max-content] relative">
             {Array.from({ length: totalDays }).map((_, i) => {
               const d = new Date(minDate); d.setDate(d.getDate() + i);
               d.setHours(0, 0, 0, 0);
               if(d.getTime() === mockNow) {
                 return <div key={`nowline-${i}`} className="absolute top-0 bottom-0 w-[2px] bg-teal-500/30 pointer-events-none -translate-x-1/2 z-0 shadow-[0_0_10px_rgba(20,184,166,0.4)]" style={{ left: i * dayWidth }} />;
               }
               return null;
            })}

            {tasks.map((t) => (
               <div key={t.id} data-gantt-id={t.id}>
                 <GanttBar item={t} type="task" left={getLeft(t.startDate)} width={getWidth(t.startDate, t.endDate)} dayWidth={dayWidth} isActive={activeId === t.id} onClick={() => setActiveId(t.id)} onUpdateEnd={(days) => onUpdateEndDate(t.id, days)} />
               </div>
            ))}
            <div className="h-8" />
            {issues.map((iss) => (
               <div key={iss.id} data-gantt-id={iss.id}>
                 <GanttBar item={iss as unknown as Task} type="issue" left={getLeft(iss.startDate)} width={getWidth(iss.startDate, iss.endDate)} dayWidth={dayWidth} isActive={activeId === iss.id} onClick={() => setActiveId(iss.id)} onUpdateEnd={(days) => onUpdateEndDate(iss.id, days)} />
               </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GanttBar({ item, type, left, width, dayWidth, isActive, onClick, onUpdateEnd }: { item: Task, type: 'task'|'issue', left: number, width: number, dayWidth: number, isActive: boolean, onClick: () => void, onUpdateEnd: (days: number) => void }) {
  const isTask = type === 'task';
  const durationDays = Math.max(1, Math.round((new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / 86400000));
  
  const progress = isTask ? item.progress : ((item as any).resolved ? 100 : 0);
  const isResolvedIssue = !isTask && progress === 100;
  
  let gradientClass = "";
  if (isTask) gradientClass = "bg-gradient-to-r from-[#0d3b2f] to-[#147058]";
  else if (progress === 100) gradientClass = "bg-white";
  else gradientClass = "bg-gradient-to-r from-[#800020] via-[#a52a2a] to-[#800020] border border-red-500/40 shadow-[0_0_20px_rgba(128,0,32,0.4)]"; // Definitive Burgundy red

  const textColor = isResolvedIssue ? "text-black" : "text-[#FFFFFF]";

  const [dragWidth, setDragWidth] = useState<number | null>(null);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = width;

    const onMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.pageX - startX;
      setDragWidth(Math.max(dayWidth, startWidth + diff));
    };

    const onUp = (upEvent: MouseEvent) => {
      const diff = upEvent.pageX - startX;
      const daysDelta = Math.round(diff / dayWidth);
      if (daysDelta !== 0) onUpdateEnd(daysDelta);
      setDragWidth(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const activeWidth = dragWidth !== null ? dragWidth : width;
  const displayDays = dragWidth !== null ? Math.max(1, Math.round(dragWidth / dayWidth)) : durationDays;
  
  let previewDateStr = "";
  if (dragWidth !== null) {
    const d = new Date(item.startDate);
    d.setDate(d.getDate() + displayDays);
    previewDateStr = `${d.getMonth()+1}월 ${d.getDate()}일`;
  }

  return (
    <div className="relative h-14 w-full group mb-5">
      <div 
        data-gantt-target={item.id}
        onClick={onClick} 
        style={{ left, width: activeWidth }} 
        className={`absolute top-0 h-full rounded-2xl scroll-ml-[100px] shadow-2xl cursor-pointer flex items-center justify-between px-5 transition-none bg-[#1a1a1a] border overflow-visible ${isActive ? 'border-orange-400 ring-4 ring-orange-400/80 ring-offset-2 ring-offset-[#0f0f0f] shadow-[0_0_28px_rgba(251,146,60,0.7)] z-20 scale-[1.02]' : 'border-white/5'}`}
      >
        <div 
          className={`absolute top-0 left-0 bottom-0 ${gradientClass} transition-none`} 
          style={{ 
            width: !isTask ? '100%' : `${progress}%`, 
            opacity: 1, 
            borderTopLeftRadius: '1rem', 
            borderBottomLeftRadius: '1rem',
            borderTopRightRadius: (progress === 100 || !isTask) ? '1rem' : '0',
            borderBottomRightRadius: (progress === 100 || !isTask) ? '1rem' : '0'
          }} 
        />
        
        <span className={`relative z-10 text-lg font-black truncate pr-4 drop-shadow-md flex-1 min-w-0 ${textColor}`}>
          {item.title}
        </span>
        {activeWidth > 150 && (
          <span className={`relative z-10 text-[13px] font-black px-3 py-1.5 rounded-md shrink-0 shadow-sm ${isResolvedIssue ? 'bg-black/10' : 'bg-black/80'} ${textColor}`}>
            {displayDays} days
          </span>
        )}

        {/* Resize Handle */}
        <div 
          onMouseDown={handleResizeStart}
          className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/20 hover:bg-white/40 transition-colors"
        />
        {dragWidth !== null && (
          <div className="absolute -top-10 right-0 transform translate-x-1/2 bg-white text-black font-bold text-xs px-3 py-1.5 rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.5)] whitespace-nowrap z-[100] pointer-events-none">
            {previewDateStr}
          </div>
        )}
      </div>
    </div>
  );
}


function ResizeHandleVertical() {
  return (
    <PanelResizeHandle className="w-1.5 bg-[#050505] hover:bg-orange-500/50 transition-colors cursor-col-resize relative group">
      <div className="absolute inset-y-1/2 -translate-y-1/2 flex flex-col gap-1.5 items-center justify-center w-full opacity-0 group-hover:opacity-100"><div className="w-0.5 h-3 bg-white/80 rounded-full" /><div className="w-0.5 h-3 bg-white/80 rounded-full" /></div>
    </PanelResizeHandle>
  );
}
function ResizeHandleHorizontal() {
  return (
    <PanelResizeHandle className="h-1.5 bg-[#050505] hover:bg-orange-500/50 transition-colors cursor-row-resize relative group">
      <div className="absolute inset-x-1/2 -translate-x-1/2 flex gap-1.5 items-center justify-center h-full opacity-0 group-hover:opacity-100"><div className="h-0.5 w-3 bg-white/80 rounded-full" /><div className="h-0.5 w-3 bg-white/80 rounded-full" /></div>
    </PanelResizeHandle>
  );
}

function ProjectEditModal({ project, onClose, onSave }: { project: Project, onClose: () => void, onSave: (p: Partial<Project>) => void }) {
  const [startDate, setStartDate] = useState(project.startDate ?? "");
  const [deadline, setDeadline] = useState(project.deadline);
  const [pm, setPm] = useState(project.pm);
  const [status, setStatus] = useState<any>(project.status);

  const availableMembers = useMemo(() => {
    return project.department === "공통" ? ALL_MEMBERS : TEAM_DATA[project.department] || ALL_MEMBERS;
  }, [project.department]);

  const dateError = status !== "상시" && startDate && deadline && deadline !== "상시" && startDate > deadline
    ? "시작일이 마감일보다 늦을 수 없습니다."
    : "";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center backdrop-blur-md">
          <h2 className="text-xl font-black text-white/90">프로젝트 정보 수정</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition"><X className="w-5 h-5 text-white/50" /></button>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-white/70 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-white/60" /> 일정
              {status === "상시" && <span className="text-[11px] font-normal text-white/40">(상시 프로젝트는 일정 없음)</span>}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">시작일</span>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-orange-500 transition color-scheme-dark disabled:opacity-40" disabled={status === "상시"} />
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">마감일</span>
                <input type="date" value={deadline === "상시" ? "" : deadline} min={startDate || undefined} onChange={e => setDeadline(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-orange-500 transition color-scheme-dark disabled:opacity-40" disabled={status === "상시"} />
              </div>
            </div>
            {dateError && <p className="text-xs font-semibold text-amber-300">{dateError}</p>}
          </div>
          <div className="space-y-3">
            <label className="text-sm font-semibold text-white/70">PM (담당 책임자)</label>
            <select value={pm} onChange={e => setPm(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition appearance-none">
              {availableMembers.map(m => (
                <option key={m.name} value={m.name} className="bg-neutral-900">{m.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-semibold text-white/70">상태</label>
            <div className="flex gap-2">
              {STATUSES.map(s => (
                <button key={s} type="button" onClick={() => setStatus(s)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${status === s ? "bg-white/20 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>{s}</button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-white/5">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-bold text-white/70 hover:text-white hover:bg-white/10 transition">취소</button>
          <button type="button" disabled={!!dateError} onClick={() => {
            const finalDeadline = status === "상시" ? "상시" : deadline;
            const finalStart = status === "상시" ? undefined : (startDate || undefined);
            onSave({ startDate: finalStart, deadline: finalDeadline, pm, status, updatedAt: new Date().toISOString() });
            onClose();
          }} className="px-5 py-2.5 rounded-lg text-sm font-bold bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition">저장</button>
        </div>
      </div>
    </div>
  );
}

function DesignHubModal({ project, onClose }: { project: Project, onClose: () => void }) {
  const [idx, setIdx] = useState(0);

  // Collect all images from everywhere
  const allImages = useMemo(() => {
    const map = new Map<string, ProjectImage>();
    
    // 1. Base project images
    project.images.forEach(img => {
      if (!map.has(img.url)) map.set(img.url, img);
    });

    // 2. Task images
    project.tasks.forEach(t => {
      t.imageUrls.forEach(img => {
        if (!map.has(img.url)) map.set(img.url, img);
        else {
           // If it exists, merge memo if current one is empty
           const existing = map.get(img.url)!;
           if (!existing.memo && img.memo) map.set(img.url, img);
        }
      });
    });

    // 3. Issue images
    project.issues.forEach(iss => {
      iss.imageUrls.forEach(img => {
        if (!map.has(img.url)) map.set(img.url, img);
        else {
           const existing = map.get(img.url)!;
           if (!existing.memo && img.memo) map.set(img.url, img);
        }
      });
    });

    return Array.from(map.values());
  }, [project]);

  const currentImg = allImages[idx];

  // Traceability logic
  const associatedItems = useMemo(() => {
    if (!currentImg) return [];
    const found: { type: 'Task' | 'Issue', title: string }[] = [];
    project.tasks.forEach(t => {
      if (t.imageUrls.some(i => i.url === currentImg.url)) {
        found.push({ type: 'Task', title: t.title });
      }
    });
    project.issues.forEach(i => {
      if (i.imageUrls.some(i => i.url === currentImg.url)) {
        found.push({ type: 'Issue', title: i.title });
      }
    });
    return found;
  }, [currentImg, project]);

  if (allImages.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 md:p-12 animate-in fade-in duration-300">
      <button onClick={onClose} className="absolute top-6 right-6 z-20 p-3 bg-white/10 hover:bg-white/20 rounded-full transition text-white/70 hover:text-white shadow-2xl border border-white/10">
        <X className="w-8 h-8" />
      </button>

      <div className="w-full h-full max-w-7xl flex flex-col gap-8">
        {/* Main Preview Area */}
        <div className="flex-1 min-h-0 bg-black/40 rounded-3xl border border-white/10 relative overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0 flex items-center justify-center p-8">
             <img src={currentImg.url} alt="" className="max-w-full max-h-full object-contain drop-shadow-[0_0_80px_rgba(255,255,255,0.05)] rounded-lg transition-all duration-500" />
          </div>
          
          {/* Metadata Overlay */}
          <div className="absolute bottom-0 left-0 w-full p-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
             <div className="flex items-end justify-between gap-12">
                <div className="space-y-4 max-w-2xl">
                   <div className="flex items-center gap-3">
                     <span className="bg-emerald-500 text-black text-[10px] font-black px-2 py-0.5 rounded tracking-tighter uppercase">Total Collection</span>
                     <h2 className="text-white/40 text-[11px] font-black uppercase tracking-[0.3em]">Design No.{idx + 1} / {allImages.length}</h2>
                   </div>
                   <h3 className="text-white font-black text-3xl tracking-tight leading-tight">프로젝트 전체 시안 모음</h3>
                   {currentImg.memo && (
                     <div className="max-h-[150px] overflow-y-auto custom-scrollbar pr-2 mt-4">
                       <p className="text-lg font-bold text-white/70 bg-white/5 border-l-4 border-emerald-500 px-4 py-3 rounded-r-lg italic whitespace-pre-wrap">
                         "{currentImg.memo}"
                       </p>
                     </div>
                   )}
                </div>
                {associatedItems.length > 0 && (
                   <div className="bg-white/5 border border-white/10 px-8 py-6 rounded-[2rem] backdrop-blur-xl shadow-2xl max-w-md">
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-4">연결된 워크플로우</span>
                      <div className="space-y-3 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                        {associatedItems.map((item, i) => (
                           <div key={i} className="flex items-center gap-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black tracking-tighter shrink-0 ${item.type === 'Task' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'bg-rose-500/20 text-rose-400 border border-rose-500/20'}`}>{item.type}</span>
                              <span className="text-base font-bold text-white/90 truncate">{item.title}</span>
                           </div>
                        ))}
                      </div>
                   </div>
                )}
             </div>
          </div>
        </div>

        {/* Thumbnail Strip */}
        <div className="h-32 shrink-0 flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide px-4">
           {allImages.map((img, i) => (
              <button 
                key={i} 
                onClick={() => setIdx(i)}
                className={`relative w-32 h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 group ${idx === i ? 'border-emerald-500 scale-110 shadow-[0_0_30px_rgba(16,185,129,0.4)]' : 'border-white/10 opacity-30 hover:opacity-100 hover:border-white/40'}`}
              >
                 <img src={getOptimizedUrl(img.url, 'thumb')} alt="" className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                 {idx === i && <div className="absolute inset-0 bg-emerald-500/10" />}
              </button>
           ))}
        </div>
      </div>
    </div>
  );
}

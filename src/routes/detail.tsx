import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef, useMemo } from "react";
import { z } from "zod";
import { getSyncChannel } from "@/lib/sync";
import { MOCK_PROJECTS, type Project, type Task, type Issue, type TaskStatus, type IssueStatus } from "@/lib/mockProjects";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Maximize2, Minimize2, ArrowLeft, ChevronLeft, ChevronRight, Edit2, Plus, Star, X } from "lucide-react";
import * as Accordion from "@radix-ui/react-accordion";

const searchSchema = z.object({ id: z.string().optional() });
export const Route = createFileRoute("/detail")({
  validateSearch: (s) => searchSchema.parse(s),
  component: DetailWindow,
});

type ModalConfig = { type: 'task' | 'issue', mode: 'create' | 'edit', id?: string } | { type: 'thumbnails' };

function SafeDndProvider({ children }: { children: React.ReactNode }) {
  return <div className="safe-dnd-provider contents">{children}</div>;
}

function DetailWindow() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(() => id ? MOCK_PROJECTS.find((p) => p.id === id) ?? null : null);
  const [activeItemId, setActiveItemId] = useState<string | undefined>(undefined);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);
  
  const isInternalScroll = useRef(false);
  const ganttContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { window.moveTo(0, 0); window.resizeTo(screen.availWidth, screen.availHeight); } catch {}
  }, []);

  useEffect(() => {
    const ch = getSyncChannel();
    if (!ch) return;
    ch.onmessage = (e) => {
      const msg = e.data;
      if (msg?.type === "OPEN_PROJECT" && msg.project) {
        setProject(msg.project as Project);
        setActiveItemId(undefined);
        setModalConfig(null);
      }
    };
    ch.postMessage({ type: "REQUEST_PROJECT" });
    return () => ch.close();
  }, []);

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

  const handleToggleStar = (imgUrl: string) => {
    setProject(prev => {
      if(!prev) return prev;
      const isStarred = prev.images?.includes(imgUrl);
      return { ...prev, images: isStarred ? prev.images.filter(u => u !== imgUrl) : [...(prev.images||[]), imgUrl] };
    });
  };

  const handleUpdateProjectImages = (newImages: string[]) => {
    setProject(prev => prev ? { ...prev, images: newImages } : prev);
  };

  const handleFocusItem = (id: string, source: 'tracker' | 'gantt') => {
    if (isInternalScroll.current) return;
    isInternalScroll.current = true;
    setActiveItemId(id);

    if (source === 'tracker') {
      const ganttEl = document.getElementById(`gantt-bar-${id}`);
      if (ganttEl && ganttContainerRef.current) {
        ganttContainerRef.current.scrollTo({ left: Math.max(0, ganttEl.offsetLeft - 150), behavior: 'smooth' });
      }
    } else {
      const trackerEl = document.getElementById(`tracker-item-${id}`);
      if (trackerEl) {
        trackerEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    setTimeout(() => { isInternalScroll.current = false; }, 600);
  };

  const activeTask = project.tasks.find(t => t.id === activeItemId);
  const activeIssue = project.issues.find(i => i.id === activeItemId);
  const imagesToShow = activeTask?.imageUrls && activeTask.imageUrls.length > 0 ? activeTask.imageUrls : 
                       activeIssue?.imageUrls && activeIssue.imageUrls.length > 0 ? activeIssue.imageUrls : project.images;

  return (
    <div className="flex h-screen w-screen flex-col bg-[#050505] text-white overflow-hidden font-sans">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0a0a0a] px-6">
        <div className="flex items-center gap-6">
          <button onClick={() => window.opener ? window.close() : navigate({ to: "/" })} className="hover:bg-white/10 p-2 rounded transition">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-base font-bold tracking-widest uppercase text-white/40">{project.department}</span>
            <span className="text-white/20 text-xl">/</span>
            <span className="text-2xl font-black tracking-tight">{project.title}</span>
            <div className="ml-6 flex items-center gap-3 bg-white/5 px-5 py-2 rounded-full border border-white/10">
              <span className="text-base font-bold text-white/90">진행률 {derivedProgress}%</span>
              <div className="flex w-32 h-2.5 overflow-hidden rounded-full bg-black/50 border border-white/10">
                <div className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full transition-all duration-500" style={{ width: `${derivedProgress}%` }} />
              </div>
            </div>
          </div>
        </div>
        <button onClick={() => setIsFocusMode(!isFocusMode)} className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 py-2 text-base font-bold hover:bg-white/20 transition">
          {isFocusMode ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          {isFocusMode ? "기본 화면" : "타임라인 확대"}
        </button>
      </header>

      <main className="flex-1 overflow-hidden">
        <PanelGroup direction="vertical">
          {!isFocusMode && (
            <>
              <Panel defaultSize={60} minSize={30}>
                <PanelGroup direction="horizontal">
                  <Panel defaultSize={70} minSize={30}>
                    <ImageViewer images={imagesToShow} projectImages={project.images} onToggleStar={handleToggleStar} onEditThumbnails={() => setModalConfig({ type: 'thumbnails' })} />
                  </Panel>
                  <ResizeHandleVertical />
                  <Panel defaultSize={30} minSize={25} className="bg-[#0a0a0a] flex flex-col border-l border-white/10">
                    <div className="p-5 border-b border-white/10 bg-[#0d0d0d] flex items-center justify-between shrink-0">
                      <h2 className="font-black text-xl tracking-wider text-white/90">업무 내역</h2>
                      <div className="flex gap-2">
                        <button onClick={() => setModalConfig({ type: 'task', mode: 'create' })} className="flex items-center gap-1 text-[13px] font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-white transition border border-white/20">
                          <Plus className="w-4 h-4" /> 업무 추가
                        </button>
                        <button onClick={() => setModalConfig({ type: 'issue', mode: 'create' })} className="flex items-center gap-1 text-[13px] font-bold bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 px-3 py-1.5 rounded-md text-rose-400 transition">
                          <Plus className="w-4 h-4" /> 이슈 추가
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 bg-[#0a0a0a]">
                      <Accordion.Root type="single" value={activeItemId || ""} onValueChange={(val) => { if (val && !isInternalScroll.current) handleFocusItem(val, 'tracker'); else if (!val && !isInternalScroll.current) setActiveItemId(undefined); }} collapsible className="space-y-4">
                        <div className="space-y-3">
                          <h4 className="text-sm font-black text-white/40 tracking-widest pl-1 mb-3">상세 업무 ({project.tasks.length})</h4>
                          {[...project.tasks].sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(t => (
                            <div key={t.id} id={`tracker-item-${t.id}`}>
                              <TaskAccordionItem task={t} isActive={activeItemId === t.id} onEdit={() => setModalConfig({ type: 'task', mode: 'edit', id: t.id })} />
                            </div>
                          ))}
                        </div>
                        <div className="space-y-3 pt-8 border-t border-white/10">
                          <h4 className="text-sm font-black text-rose-500/50 tracking-widest pl-1 mb-3">이슈 사항 ({project.issues.length})</h4>
                          {[...project.issues].sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(iss => (
                            <div key={iss.id} id={`tracker-item-${iss.id}`}>
                              <IssueAccordionItem issue={iss} isActive={activeItemId === iss.id} onEdit={() => setModalConfig({ type: 'issue', mode: 'edit', id: iss.id })} />
                            </div>
                          ))}
                          {project.issues.length === 0 && <p className="text-base font-bold text-white/20 pl-1">등록된 이슈 사항이 없습니다.</p>}
                        </div>
                      </Accordion.Root>
                    </div>
                  </Panel>
                </PanelGroup>
              </Panel>
              <ResizeHandleHorizontal />
            </>
          )}
          <Panel defaultSize={isFocusMode ? 100 : 40} minSize={20}>
            <GanttChart containerRef={ganttContainerRef} tasks={project.tasks} issues={project.issues} activeId={activeItemId} setActiveId={(id) => handleFocusItem(id, 'gantt')} />
          </Panel>
        </PanelGroup>
      </main>

      {modalConfig && modalConfig.type !== 'thumbnails' && (
        <CrudModal config={modalConfig} project={project} onClose={() => setModalConfig(null)} onSaveTask={handleSaveTask} onSaveIssue={handleSaveIssue} />
      )}
      
      {modalConfig?.type === 'thumbnails' && (
        <ThumbnailEditorModal images={project.images} onClose={() => setModalConfig(null)} onUpdateImages={handleUpdateProjectImages} />
      )}
    </div>
  );
}

function ImageViewer({ images, projectImages, onToggleStar, onEditThumbnails }: { images: string[], projectImages: string[], onToggleStar: (url: string) => void, onEditThumbnails: () => void }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [images]);

  if (!images || images.length === 0) return <div className="h-full w-full bg-[#050505] flex items-center justify-center text-white/20 font-bold text-xl">No Images</div>;

  const currentImg = images[idx];
  const isStarred = projectImages?.includes(currentImg) ?? false;

  return (
    <div className="relative h-full w-full bg-[#050505] group flex flex-col">
      <div className="absolute top-5 right-5 z-10 flex gap-3">
         <button onClick={() => onToggleStar(currentImg)} className="p-3 bg-black/60 hover:bg-white/10 rounded-lg border border-white/10 transition shadow-lg backdrop-blur-sm">
           <Star className={`w-6 h-6 ${isStarred ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'text-white/50'}`} />
         </button>
         <button onClick={onEditThumbnails} className="px-5 py-2.5 bg-black/60 hover:bg-white/10 rounded-lg border border-white/10 transition text-base font-bold text-white/90 shadow-lg backdrop-blur-sm">
           썸네일 편집
         </button>
      </div>
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        <img src={currentImg} alt="" className="max-w-full max-h-full object-contain drop-shadow-2xl" />
      </div>
      {images.length > 1 && (
        <>
          <button className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-black/50 border border-white/10 hover:bg-white/20 rounded-full transition opacity-0 group-hover:opacity-100 backdrop-blur-sm" onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}>
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-black/50 border border-white/10 hover:bg-white/20 rounded-full transition opacity-0 group-hover:opacity-100 backdrop-blur-sm" onClick={() => setIdx(i => (i + 1) % images.length)}>
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}
    </div>
  );
}

function ThumbnailEditorModal({ images, onClose, onUpdateImages }: { images: string[], onClose: () => void, onUpdateImages: (imgs: string[]) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <SafeDndProvider>
        <div className="w-full max-w-4xl bg-[#111] border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
           <div className="p-6 border-b border-white/10 bg-[#161616] flex justify-between items-center">
              <h2 className="text-2xl font-black text-white/90">썸네일 편집</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition"><X className="w-8 h-8 text-white/50" /></button>
           </div>
           <div className="p-8 grid grid-cols-3 gap-6 overflow-y-auto max-h-[60vh]">
              {images?.map((img, idx) => (
                <div key={img} className="relative group rounded-xl overflow-hidden border border-white/10 aspect-video bg-black shadow-lg">
                  <img src={img} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
                     <button onClick={() => {
                        const newImgs = [...images];
                        if(idx > 0) { [newImgs[idx-1], newImgs[idx]] = [newImgs[idx], newImgs[idx-1]]; onUpdateImages(newImgs); }
                     }} className="p-3 bg-black/80 hover:bg-white/20 rounded-full border border-white/20"><ArrowLeft className="w-5 h-5 text-white" /></button>
                     <button onClick={() => {
                        const newImgs = [...images];
                        if(idx < newImgs.length - 1) { [newImgs[idx+1], newImgs[idx]] = [newImgs[idx], newImgs[idx+1]]; onUpdateImages(newImgs); }
                     }} className="p-3 bg-black/80 hover:bg-white/20 rounded-full border border-white/20"><ArrowRight className="w-5 h-5 text-white" /></button>
                     <button onClick={() => onUpdateImages(images.filter((_, i) => i !== idx))} className="p-3 bg-rose-500/80 hover:bg-rose-500 rounded-full border border-rose-500/50"><X className="w-5 h-5 text-white" /></button>
                  </div>
                </div>
              ))}
              {(!images || images.length === 0) && <p className="text-white/30 font-bold col-span-3 text-center py-16 text-lg">선택된 썸네일이 없습니다.</p>}
           </div>
        </div>
      </SafeDndProvider>
    </div>
  );
}

function TaskAccordionItem({ task, isActive, onEdit }: { task: Task, isActive: boolean, onEdit: () => void }) {
  return (
    <Accordion.Item value={task.id} className={`rounded-xl border transition-all overflow-hidden ${isActive ? "border-orange-500/60 bg-orange-500/10 ring-2 ring-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.15)]" : "border-white/10 bg-[#111] hover:border-white/20"}`}>
      <Accordion.Header>
        <Accordion.Trigger className="flex w-full flex-col p-5 focus:outline-none gap-3 relative">
          {/* Partial Gradient Fill Logic for Task Item Header */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-[#111]">
             <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500" style={{ width: `${task.progress}%` }} />
          </div>
          <div className="flex items-center justify-between w-full relative z-10">
            <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
              <span className={`text-sm font-mono font-bold shrink-0 ${isActive ? 'text-orange-400' : 'text-white/40'}`}>{task.startDate.slice(5)}</span>
              <span className="text-lg font-bold truncate text-left text-white/90">{task.title}</span>
            </div>
            <span className={`text-sm font-bold px-3 py-1.5 rounded border shrink-0 ${task.status==='완료' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-white/60 border-white/10'}`}>{task.status}</span>
          </div>
          <div className="flex items-center gap-4 w-full relative z-10">
            <div className="flex-1 h-2 bg-black/60 rounded-full overflow-hidden border border-white/5 shadow-inner">
              <div className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full transition-all duration-500" style={{ width: `${task.progress}%` }} />
            </div>
            <span className="text-base font-black font-mono text-white/80 w-10 text-right">{task.progress}%</span>
          </div>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown relative z-10">
        <div className="p-5 pt-3 border-t border-white/10 bg-black/40 backdrop-blur-md">
          <p className="text-base text-white/70 leading-relaxed whitespace-normal break-words font-medium">{task.content || "내용이 없습니다."}</p>
          <div className="flex items-center justify-between mt-6">
            <div className="flex gap-8">
              <div><span className="text-white/30 block text-xs font-bold uppercase mb-1.5">담당자</span><span className="text-white/90 font-bold text-base">{task.assignee}</span></div>
              <div><span className="text-white/30 block text-xs font-bold uppercase mb-1.5">기간</span><span className="text-white/90 font-bold font-mono text-base">{task.startDate} ~ {task.endDate}</span></div>
            </div>
            <button onClick={onEdit} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 rounded-lg text-sm font-bold transition">
              <Edit2 className="w-4 h-4" /> 수정
            </button>
          </div>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  );
}

function IssueAccordionItem({ issue, isActive, onEdit }: { issue: Issue, isActive: boolean, onEdit: () => void }) {
  const progress = issue.resolved ? 100 : 0;
  return (
    <Accordion.Item value={issue.id} className={`rounded-xl border transition-all overflow-hidden ${isActive ? "border-orange-500/60 bg-orange-500/10 ring-2 ring-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.15)]" : "border-white/10 bg-[#111] hover:border-white/20"}`}>
      <Accordion.Header>
        <Accordion.Trigger className="flex w-full flex-col p-5 focus:outline-none gap-3 relative">
          <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-[#111]">
             <div className="h-full bg-gradient-to-r from-red-500 to-rose-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between w-full relative z-10">
            <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
              <span className={`text-sm font-mono font-bold shrink-0 ${isActive ? 'text-orange-400' : 'text-white/40'}`}>{issue.startDate.slice(5)}</span>
              <span className={`text-lg font-bold truncate text-left text-white/90 ${issue.resolved ? 'line-through text-white/30' : ''}`}>{issue.title}</span>
            </div>
            <span className={`text-sm font-bold px-3 py-1.5 rounded border shrink-0 ${issue.resolved ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
              {issue.status === "Issue" ? "이슈 발생" : "해결됨"}
            </span>
          </div>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown relative z-10">
        <div className="p-5 pt-3 border-t border-white/10 bg-black/40 backdrop-blur-md">
          <p className="text-base text-white/70 leading-relaxed whitespace-normal break-words font-medium">{issue.content || "내용이 없습니다."}</p>
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
            <button onClick={onEdit} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 rounded-lg text-sm font-bold transition">
              <Edit2 className="w-4 h-4" /> 수정
            </button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-3xl bg-[#111] border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-white/10 bg-[#161616] flex justify-between items-center">
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
          <div className="space-y-4">
            <label className="text-base font-bold text-white/60">이미지 첨부 (URLs)</label>
            {form.imageUrls.map((url: string, idx: number) => (
              <div key={idx} className="flex gap-3">
                <input value={url} onChange={e => { const newUrls = [...form.imageUrls]; newUrls[idx] = e.target.value; setForm({...form, imageUrls: newUrls}); }} className="flex-1 bg-black border border-white/20 rounded-xl p-4 text-white font-mono text-base focus:border-orange-500 focus:outline-none" placeholder="https://..." />
                <button type="button" onClick={() => setForm({...form, imageUrls: form.imageUrls.filter((_:any, i:number) => i !== idx)})} className="p-4 text-rose-500 hover:bg-rose-500/20 rounded-xl border border-rose-500/30 transition font-bold"><X className="w-6 h-6"/></button>
              </div>
            ))}
            <button type="button" onClick={() => setForm({...form, imageUrls: [...form.imageUrls, ""]})} className="w-full py-4 border border-dashed border-white/30 text-white/60 hover:text-white hover:border-white/60 hover:bg-white/5 rounded-xl font-bold transition flex items-center justify-center gap-2 text-base">
              <Plus className="w-5 h-5" /> 이미지 URL 추가
            </button>
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

function GanttChart({ containerRef, tasks, issues, activeId, setActiveId }: { containerRef: any, tasks: Task[], issues: Issue[], activeId?: string, setActiveId: (id: string) => void }) {
  const [viewWeeks, setViewWeeks] = useState<4 | 8 | 12>(8);

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
  if (isNaN(minDate.getTime())) return <div className="flex h-full items-center justify-center text-white/30 font-bold text-xl">워크 플랜 데이터가 없습니다.</div>;

  const totalDays = viewWeeks * 7;
  const dayWidth = viewWeeks === 4 ? 90 : viewWeeks === 8 ? 50 : 35; 
  const totalWidth = totalDays * dayWidth;

  const getLeft = (dateStr: string) => Math.max(0, (new Date(dateStr).getTime() - minDate.getTime()) / 86400000 * dayWidth);
  const getWidth = (start: string, end: string) => Math.max(dayWidth, ((new Date(end).getTime() - new Date(start).getTime()) / 86400000 + 1) * dayWidth);

  const mockNow = new Date(2026, 3, 28).getTime(); 
  const nowLeft = (mockNow - minDate.getTime()) / 86400000 * dayWidth;

  return (
    <div className="flex h-full flex-col bg-[#0f0f0f] select-none border-t border-white/10">
      <div className="flex items-center justify-between border-b border-white/10 px-8 py-5 shrink-0 bg-[#0a0a0a]">
        <h3 className="text-xl font-black tracking-widest text-white/80">워크 플랜</h3>
        <div className="flex items-center gap-6">
          <div className="flex gap-2">
            <button onClick={() => containerRef.current?.scrollBy({ left: -300, behavior: 'smooth'})} className="p-2.5 border border-white/20 hover:bg-white/10 rounded-lg transition"><ChevronLeft className="w-5 h-5 text-white/80" /></button>
            <button onClick={() => containerRef.current?.scrollBy({ left: 300, behavior: 'smooth'})} className="p-2.5 border border-white/20 hover:bg-white/10 rounded-lg transition"><ChevronRight className="w-5 h-5 text-white/80" /></button>
          </div>
          <select value={viewWeeks} onChange={(e) => setViewWeeks(Number(e.target.value) as any)} className="rounded-lg border border-white/20 bg-black px-5 py-2.5 text-base font-bold text-white focus:outline-none focus:border-orange-500">
            <option value={4}>4주 보기</option><option value={8}>8주 보기</option><option value={12}>12주 보기</option>
          </select>
        </div>
      </div>
      <div className={`flex-1 overflow-x-auto overflow-y-auto relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} ref={containerRef} onMouseDown={onMouseDown} onMouseLeave={onMouseLeave} onMouseUp={onMouseUp} onMouseMove={onMouseMove}>
        <div style={{ width: totalWidth, minHeight: "100%" }} className="relative">
          <div className="sticky top-0 z-20 flex h-20 border-b border-white/10 bg-[#0f0f0f]/95 backdrop-blur-md shadow-sm">
            {Array.from({ length: totalDays }).map((_, i) => {
              const d = new Date(minDate); d.setDate(d.getDate() + i);
              const step = viewWeeks === 4 ? 3 : viewWeeks === 8 ? 5 : 7;
              if (i % step !== 0) return null;
              return (
                <div key={i} className="absolute top-0 flex flex-col items-center -translate-x-1/2 h-full" style={{ left: i * dayWidth }}>
                  <span className="text-[20px] font-black text-white/50 mt-4 bg-[#0f0f0f] px-3 whitespace-nowrap overflow-visible drop-shadow-md">{d.getMonth()+1}월 {d.getDate()}일</span>
                  <div className="w-px h-full bg-white/10 absolute top-12" />
                </div>
              );
            })}
            {nowLeft > 0 && nowLeft < totalWidth && (
              <div className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center -translate-x-1/2" style={{ left: nowLeft }}>
                <div className="bg-teal-500 text-white text-[14px] font-black px-4 py-1.5 rounded shadow-[0_0_20px_rgba(20,184,166,0.6)] mt-2">Now</div>
                <div className="w-px flex-1 bg-teal-500/60 mt-1" />
              </div>
            )}
          </div>

          <div className="py-10 px-2 min-h-[max-content] relative">
            {nowLeft > 0 && nowLeft < totalWidth && (
              <div className="absolute top-0 bottom-0 w-px bg-teal-500/20 pointer-events-none -translate-x-1/2 z-0" style={{ left: nowLeft }} />
            )}
            {tasks.map((t) => (
               <div key={t.id} id={`gantt-bar-${t.id}`}>
                 <GanttBar item={t} type="task" left={getLeft(t.startDate)} width={getWidth(t.startDate, t.endDate)} isActive={activeId === t.id} onClick={() => setActiveId(t.id)} />
               </div>
            ))}
            <div className="h-8" />
            {issues.map((iss) => (
               <div key={iss.id} id={`gantt-bar-${iss.id}`}>
                 <GanttBar item={iss as unknown as Task} type="issue" left={getLeft(iss.startDate)} width={getWidth(iss.startDate, iss.endDate)} isActive={activeId === iss.id} onClick={() => setActiveId(iss.id)} />
               </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GanttBar({ item, type, left, width, isActive, onClick }: { item: Task, type: 'task'|'issue', left: number, width: number, isActive: boolean, onClick: () => void }) {
  const isTask = type === 'task';
  const durationDays = Math.max(1, Math.ceil((new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / 86400000));
  
  // Partial Gradient Fill Logic for Gantt Bar
  const progress = isTask ? item.progress : ((item as any).resolved ? 100 : 0);
  
  let gradientClass = "";
  if (isTask) gradientClass = "bg-gradient-to-r from-teal-500 to-emerald-500";
  else if (progress === 100) gradientClass = "bg-white"; // Resolved
  else gradientClass = "bg-gradient-to-r from-red-600 to-red-800"; // Unresolved Issue

  return (
    <div className="relative h-14 w-full group mb-5">
      <div 
        onClick={onClick} 
        style={{ left, width }} 
        className={`absolute top-0 h-full rounded-2xl shadow-2xl cursor-pointer flex items-center justify-between px-5 transition-all bg-[#1a1a1a] border border-white/5 overflow-hidden ${isActive ? 'ring-4 ring-orange-500 ring-offset-2 ring-offset-[#0f0f0f] z-20' : ''}`}
      >
        {/* Dynamic Gradient Fill */}
        <div className={`absolute top-0 left-0 bottom-0 ${gradientClass} transition-all duration-500`} style={{ width: `${progress}%`, opacity: 0.8 }} />
        
        <span className="relative z-10 text-lg font-black truncate pr-4 drop-shadow-md text-white mix-blend-difference">
          {item.title}
        </span>
        <span className="relative z-10 text-[13px] font-black px-3 py-1.5 rounded-md shrink-0 shadow-sm bg-black/80 text-white">
          {durationDays} days
        </span>
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

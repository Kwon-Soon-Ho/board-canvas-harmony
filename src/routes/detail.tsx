import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef, useMemo } from "react";
import { z } from "zod";
import { getSyncChannel } from "@/lib/sync";
import { MOCK_PROJECTS, type Project, type Task, type Issue, type TaskStatus, type IssueStatus } from "@/lib/mockProjects";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Maximize2, Minimize2, ArrowLeft, ChevronLeft, ChevronRight, Edit2, Plus } from "lucide-react";
import * as Accordion from "@radix-ui/react-accordion";

const searchSchema = z.object({ id: z.string().optional() });
export const Route = createFileRoute("/detail")({
  validateSearch: (s) => searchSchema.parse(s),
  component: DetailWindow,
});

type ModalConfig = { type: 'task' | 'issue', mode: 'create' | 'edit', id?: string };

function DetailWindow() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(() => id ? MOCK_PROJECTS.find((p) => p.id === id) ?? null : null);
  const [activeItemId, setActiveItemId] = useState<string | undefined>(undefined);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);

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
        setModalConfig(null);
      }
    };
    ch.postMessage({ type: "REQUEST_PROJECT" });
    return () => ch.close();
  }, []);

  if (!project) return <div className="flex h-screen w-screen items-center justify-center bg-[#050505] text-white/50 text-xl font-bold tracking-widest">LOADING...</div>;

  const derivedProgress = project.tasks.length > 0 ? Math.round(project.tasks.reduce((acc, t) => acc + t.progress, 0) / project.tasks.length) : 0;

  const handleSaveTask = (task: Task) => {
    setProject(prev => {
      if(!prev) return prev;
      const exists = prev.tasks.some(t => t.id === task.id);
      return {
        ...prev,
        tasks: exists ? prev.tasks.map(t => t.id === task.id ? task : t) : [...prev.tasks, task]
      };
    });
    setModalConfig(null);
  };

  const handleSaveIssue = (issue: Issue) => {
    setProject(prev => {
      if(!prev) return prev;
      const exists = prev.issues.some(i => i.id === issue.id);
      return {
        ...prev,
        issues: exists ? prev.issues.map(i => i.id === issue.id ? issue : i) : [...prev.issues, issue]
      };
    });
    setModalConfig(null);
  };

  const activeTask = project.tasks.find(t => t.id === activeItemId);
  const activeIssue = project.issues.find(i => i.id === activeItemId);
  const imagesToShow = activeTask?.imageUrls || activeIssue?.imageUrls || project.images;

  return (
    <div className="flex h-screen w-screen flex-col bg-[#050505] text-white overflow-hidden font-sans">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0a0a0a] px-6">
        <div className="flex items-center gap-6">
          <button onClick={() => window.opener ? window.close() : navigate({ to: "/" })} className="hover:bg-white/10 p-2 rounded transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-widest uppercase text-white/40">{project.department}</span>
            <span className="text-white/20 text-lg">/</span>
            <span className="text-xl font-black tracking-tight">{project.title}</span>
            <div className="ml-6 flex items-center gap-3 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
              <span className="text-sm font-bold text-white/90">진행률 {derivedProgress}%</span>
              <div className="flex w-32 h-2 overflow-hidden rounded-full bg-black/50 border border-white/10">
                <div className="bg-orange-500 h-full transition-all duration-500" style={{ width: `${derivedProgress}%` }} />
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsFocusMode(!isFocusMode)}
          className="flex items-center gap-2 rounded border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20 transition"
        >
          {isFocusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {isFocusMode ? "기본 화면" : "타임라인 확대"}
        </button>
      </header>

      <main className="flex-1 overflow-hidden">
        <PanelGroup direction="vertical">
          {!isFocusMode && (
            <>
              <Panel defaultSize={60} minSize={30}>
                <PanelGroup direction="horizontal">
                  {/* Left: Image Viewer */}
                  <Panel defaultSize={70} minSize={30}>
                    <ImageViewer images={imagesToShow} />
                  </Panel>
                  <ResizeHandleVertical />
                  {/* Right: Unified Tracker */}
                  <Panel defaultSize={30} minSize={25} className="bg-[#0a0a0a] flex flex-col border-l border-white/10">
                    <div className="p-4 border-b border-white/10 bg-[#0d0d0d] flex items-center justify-between shrink-0">
                      <h2 className="font-black text-lg tracking-wider text-white/90">업무 내역</h2>
                      <div className="flex gap-2">
                        <button onClick={() => setModalConfig({ type: 'task', mode: 'create' })} className="flex items-center gap-1 text-[11px] font-bold bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-white transition border border-white/20">
                          <Plus className="w-3 h-3" /> 업무 추가
                        </button>
                        <button onClick={() => setModalConfig({ type: 'issue', mode: 'create' })} className="flex items-center gap-1 text-[11px] font-bold bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 px-2 py-1 rounded text-rose-400 transition">
                          <Plus className="w-3 h-3" /> 이슈 추가
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 bg-[#0a0a0a]">
                      <Accordion.Root type="single" value={activeItemId || ""} onValueChange={setActiveItemId} collapsible className="space-y-4">
                        
                        <div className="space-y-2">
                          <h4 className="text-xs font-black text-white/30 tracking-widest pl-1 mb-3">TASKS</h4>
                          {[...project.tasks].sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(t => (
                            <TaskAccordionItem key={t.id} task={t} isActive={activeItemId === t.id} onEdit={(e) => { e.stopPropagation(); setModalConfig({ type: 'task', mode: 'edit', id: t.id })}} />
                          ))}
                        </div>

                        <div className="space-y-2 pt-6 border-t border-white/10">
                          <h4 className="text-xs font-black text-rose-500/40 tracking-widest pl-1 mb-3">ISSUES</h4>
                          {[...project.issues].sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(iss => (
                            <IssueAccordionItem key={iss.id} issue={iss} isActive={activeItemId === iss.id} onEdit={(e) => { e.stopPropagation(); setModalConfig({ type: 'issue', mode: 'edit', id: iss.id })}} />
                          ))}
                          {project.issues.length === 0 && <p className="text-sm font-bold text-white/20 pl-1">등록된 이슈 사항이 없습니다.</p>}
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
            <GanttChart tasks={project.tasks} issues={project.issues} activeId={activeItemId} setActiveId={setActiveItemId} />
          </Panel>
        </PanelGroup>
      </main>

      {/* CRUD Modal */}
      {modalConfig && (
        <CrudModal 
          config={modalConfig} 
          project={project} 
          onClose={() => setModalConfig(null)} 
          onSaveTask={handleSaveTask} 
          onSaveIssue={handleSaveIssue} 
        />
      )}
    </div>
  );
}

function ImageViewer({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [images]);

  if (!images || images.length === 0) return <div className="h-full w-full bg-[#050505] flex items-center justify-center text-white/20 font-bold text-lg">No Images</div>;

  return (
    <div className="relative h-full w-full bg-[#050505] group flex flex-col">
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        <img src={images[idx]} alt="" className="max-w-full max-h-full object-contain drop-shadow-2xl" />
      </div>
      {images.length > 1 && (
        <>
          <button className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-black/50 border border-white/10 hover:bg-white/20 rounded-full transition opacity-0 group-hover:opacity-100" onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}>
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-black/50 border border-white/10 hover:bg-white/20 rounded-full transition opacity-0 group-hover:opacity-100" onClick={() => setIdx(i => (i + 1) % images.length)}>
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}
    </div>
  );
}

function TaskAccordionItem({ task, isActive, onEdit }: { task: Task, isActive: boolean, onEdit: (e: React.MouseEvent) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if(isActive && ref.current) ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [isActive]);

  return (
    <Accordion.Item 
      value={task.id} ref={ref}
      className={`rounded-xl border transition-all overflow-hidden ${
        isActive ? "border-orange-500/60 bg-orange-500/10 ring-2 ring-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.15)]" : "border-white/10 bg-[#111] hover:border-white/20"
      }`}
    >
      <Accordion.Header>
        <Accordion.Trigger className="flex w-full items-center justify-between p-4 focus:outline-none">
          <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
            <span className={`text-xs font-mono font-bold shrink-0 ${isActive ? 'text-orange-400' : 'text-white/40'}`}>{task.startDate.slice(5)}</span>
            <span className="text-base font-bold truncate text-left">{task.title}</span>
          </div>
          <div className="flex items-center gap-5 shrink-0">
            <span className="text-sm font-black font-mono text-white/90">{task.progress}%</span>
            <span className={`text-xs font-bold px-2 py-1 rounded border ${task.status==='완료' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-white/60 border-white/10'}`}>
              {task.status}
            </span>
          </div>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
        <div className="p-4 pt-2 border-t border-white/10 bg-black/20">
          <p className="text-sm text-white/70 leading-relaxed whitespace-normal break-words font-medium">{task.content || "내용이 없습니다."}</p>
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-6">
              <div><span className="text-white/30 block text-[10px] font-bold uppercase mb-1">담당자</span><span className="text-white/90 font-bold text-sm">{task.assignee}</span></div>
              <div><span className="text-white/30 block text-[10px] font-bold uppercase mb-1">기간</span><span className="text-white/90 font-bold font-mono text-sm">{task.startDate} ~ {task.endDate}</span></div>
            </div>
            <button onClick={onEdit} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded text-sm font-bold transition">
              <Edit2 className="w-3.5 h-3.5" /> 수정
            </button>
          </div>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  );
}

function IssueAccordionItem({ issue, isActive, onEdit }: { issue: Issue, isActive: boolean, onEdit: (e: React.MouseEvent) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if(isActive && ref.current) ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [isActive]);

  return (
    <Accordion.Item 
      value={issue.id} ref={ref}
      className={`rounded-xl border transition-all overflow-hidden ${
        isActive ? "border-yellow-500/60 bg-yellow-500/10 ring-2 ring-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.15)]" : "border-white/10 bg-[#111] hover:border-white/20"
      }`}
    >
      <Accordion.Header>
        <Accordion.Trigger className="flex w-full items-center justify-between p-4 focus:outline-none">
          <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
            <span className={`text-xs font-mono font-bold shrink-0 ${isActive ? 'text-yellow-400' : 'text-white/40'}`}>{issue.startDate.slice(5)}</span>
            <span className={`text-base font-bold truncate text-left ${issue.resolved ? 'line-through text-white/30' : ''}`}>{issue.title}</span>
          </div>
          <div className="flex items-center shrink-0">
            <span className={`text-xs font-bold px-2 py-1 rounded border ${issue.resolved ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
              {issue.status === "Issue" ? "이슈 발생" : "해결됨"}
            </span>
          </div>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
        <div className="p-4 pt-2 border-t border-white/10 bg-black/20">
          <p className="text-sm text-white/70 leading-relaxed whitespace-normal break-words font-medium">{issue.content || "내용이 없습니다."}</p>
          {issue.resolved && issue.memo && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg mt-3">
              <span className="block text-xs font-black text-emerald-400 mb-1">해결 메모</span>
              <p className="text-sm font-bold text-white/80 whitespace-normal break-words">{issue.memo}</p>
            </div>
          )}
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-6">
              <div><span className="text-white/30 block text-[10px] font-bold uppercase mb-1">담당자</span><span className="text-white/90 font-bold text-sm">{issue.assignee}</span></div>
              <div><span className="text-white/30 block text-[10px] font-bold uppercase mb-1">기간</span><span className="text-white/90 font-bold font-mono text-sm">{issue.startDate} ~ {issue.endDate}</span></div>
            </div>
            <button onClick={onEdit} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded text-sm font-bold transition">
              <Edit2 className="w-3.5 h-3.5" /> 수정
            </button>
          </div>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  );
}

// Modal Component
function CrudModal({ config, project, onClose, onSaveTask, onSaveIssue }: { config: ModalConfig, project: Project, onClose: () => void, onSaveTask: (t: Task) => void, onSaveIssue: (i: Issue) => void }) {
  const isTask = config.type === 'task';
  const existingTask = isTask && config.id ? project.tasks.find(t => t.id === config.id) : null;
  const existingIssue = !isTask && config.id ? project.issues.find(i => i.id === config.id) : null;

  const [form, setForm] = useState<any>(() => {
    if (existingTask) return { ...existingTask };
    if (existingIssue) return { ...existingIssue };
    return {
      id: config.id || `${config.type}-${Date.now()}`,
      title: "", content: "",
      status: isTask ? "대기" : "Issue",
      progress: 0,
      startDate: new Date().toISOString().slice(0,10),
      endDate: "",
      assignee: project.pm,
      imageUrls: [],
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
      <div className="w-full max-w-2xl bg-[#111] border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-white/10 bg-[#161616] flex justify-between items-center">
          <h2 className="text-xl font-black text-white/90">{config.mode === 'create' ? '새로 만들기' : '수정'} - {isTask ? '업무(Task)' : '이슈 사항(Issue)'}</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition"><ChevronLeft className="w-6 h-6 rotate-180 text-white/50" /></button>
        </div>
        
        <form onSubmit={handleSave} className="p-6 overflow-y-auto max-h-[80vh] space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-white/60">제목</label>
            <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-black border border-white/20 rounded-lg p-3 text-white font-bold focus:border-orange-500 focus:outline-none" placeholder="제목을 입력하세요" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-white/60">상세 내용</label>
            <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-orange-500 focus:outline-none min-h-[100px]" placeholder="상세 내용을 입력하세요" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-white/60">담당자</label>
              <select value={form.assignee} onChange={e => setForm({...form, assignee: e.target.value})} className="w-full bg-black border border-white/20 rounded-lg p-3 text-white font-bold focus:border-orange-500 focus:outline-none">
                {members.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-white/60">진행 상태</label>
              <select value={form.status} onChange={e => handleStatusChange(e.target.value)} className="w-full bg-black border border-white/20 rounded-lg p-3 text-white font-bold focus:border-orange-500 focus:outline-none">
                {isTask ? taskStatuses.map(s => <option key={s} value={s}>{s}</option>) : (
                  <><option value="Issue">이슈 발생</option><option value="Resolved">해결됨</option></>
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-white/60">시작일</label>
              <input type="date" required value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className="w-full bg-black border border-white/20 rounded-lg p-3 text-white font-mono focus:border-orange-500 focus:outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-orange-400">종료일 (필수)</label>
              <input type="date" required value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} className="w-full bg-orange-500/10 border border-orange-500/50 rounded-lg p-3 text-white font-mono focus:border-orange-500 focus:outline-none" />
            </div>
          </div>

          {isTask && (
            <div className="space-y-3 bg-white/5 p-4 rounded-lg border border-white/10">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-white/60">진행률</label>
                <span className="font-black text-orange-400">{form.progress}%</span>
              </div>
              <input type="range" min="0" max="100" step="10" value={form.progress} onChange={e => handleProgressChange(Number(e.target.value))} className="w-full accent-orange-500 h-2 bg-black rounded-lg appearance-none cursor-pointer" />
            </div>
          )}

          {!isTask && form.resolved && (
            <div className="space-y-2 bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/30">
              <label className="text-sm font-black text-emerald-400">해결 메모 (필수)</label>
              <textarea required value={form.memo || ""} onChange={e => setForm({...form, memo: e.target.value})} className="w-full bg-black border border-emerald-500/50 rounded-lg p-3 text-white focus:border-emerald-500 focus:outline-none min-h-[80px]" placeholder="해결 방안을 작성해주세요" />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-white/60">이미지 첨부 (URL, 쉼표로 구분)</label>
            <textarea value={form.imageUrls?.join(', ') || ''} onChange={e => setForm({...form, imageUrls: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} className="w-full bg-black border border-white/20 rounded-lg p-3 text-white text-xs font-mono focus:border-orange-500 focus:outline-none min-h-[60px]" placeholder="https://..." />
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-lg border border-white/20 hover:bg-white/10 font-bold transition text-white">취소</button>
            <button type="submit" className="px-8 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 font-black text-black transition shadow-[0_0_20px_rgba(249,115,22,0.3)]">저장하기</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GanttChart({ tasks, issues, activeId, setActiveId }: { tasks: Task[], issues: Issue[], activeId?: string, setActiveId: (id: string) => void }) {
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
  if (isNaN(minDate.getTime())) return <div className="flex h-full items-center justify-center text-white/30 font-bold">워크 플랜 데이터가 없습니다.</div>;

  const totalDays = viewWeeks * 7;
  const dayWidth = viewWeeks === 4 ? 70 : viewWeeks === 8 ? 45 : 30; 
  const totalWidth = totalDays * dayWidth;

  const getLeft = (dateStr: string) => Math.max(0, (new Date(dateStr).getTime() - minDate.getTime()) / 86400000 * dayWidth);
  const getWidth = (start: string, end: string) => Math.max(dayWidth, ((new Date(end).getTime() - new Date(start).getTime()) / 86400000 + 1) * dayWidth);

  return (
    <div className="flex h-full flex-col bg-[#050505] select-none border-t border-white/10">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 shrink-0 bg-[#0a0a0a]">
        <h3 className="text-base font-black tracking-widest text-white/80">워크 플랜</h3>
        <div className="flex items-center gap-6">
          <div className="flex gap-2">
            <button onClick={() => containerRef.current?.scrollBy({ left: -300, behavior: 'smooth'})} className="p-2 border border-white/20 hover:bg-white/10 rounded-lg transition"><ChevronLeft className="w-5 h-5 text-white/80" /></button>
            <button onClick={() => containerRef.current?.scrollBy({ left: 300, behavior: 'smooth'})} className="p-2 border border-white/20 hover:bg-white/10 rounded-lg transition"><ChevronRight className="w-5 h-5 text-white/80" /></button>
          </div>
          <select value={viewWeeks} onChange={(e) => setViewWeeks(Number(e.target.value) as any)} className="rounded-lg border border-white/20 bg-black px-4 py-2 text-sm font-bold text-white focus:outline-none focus:border-orange-500">
            <option value={4}>4주 보기</option><option value={8}>8주 보기</option><option value={12}>12주 보기</option>
          </select>
        </div>
      </div>
      <div className={`flex-1 overflow-x-auto overflow-y-auto relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} ref={containerRef} onMouseDown={onMouseDown} onMouseLeave={onMouseLeave} onMouseUp={onMouseUp} onMouseMove={onMouseMove}>
        <div style={{ width: totalWidth, minHeight: "100%" }} className="relative">
          {/* Axis Header */}
          <div className="sticky top-0 z-20 flex h-16 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-md shadow-sm">
            {Array.from({ length: totalDays }).map((_, i) => {
              const d = new Date(minDate); d.setDate(d.getDate() + i);
              const isMonday = d.getDay() === 1;
              return (
                <div key={i} className={`absolute h-full border-l flex flex-col justify-end pb-2 pl-2 ${isMonday ? 'border-white/20' : 'border-white/5'}`} style={{ left: i * dayWidth, width: dayWidth }}>
                  {isMonday ? (
                    <div className="whitespace-nowrap z-10 relative">
                      <span className="block text-[11px] font-black text-white/40 mb-0.5">{d.getFullYear()}.{d.getMonth()+1}</span>
                      <span className="block text-sm font-black text-white/90">{d.getDate()}</span>
                    </div>
                  ) : (
                    <span className="block text-sm font-bold text-white/30">{d.getDate()}</span>
                  )}
                </div>
              );
            })}
          </div>

          {Array.from({ length: totalDays }).map((_, i) => (
             <div key={i} className={`absolute top-16 bottom-0 border-l pointer-events-none ${new Date(minDate.getTime() + i * 86400000).getDay() === 1 ? 'border-white/10' : 'border-white/[0.02]'}`} style={{ left: i * dayWidth }} />
          ))}

          <div className="py-8 space-y-4 px-2 min-h-[max-content]">
            {tasks.map((t) => <GanttBar key={t.id} item={t} type="task" left={getLeft(t.startDate)} width={getWidth(t.startDate, t.endDate)} isActive={activeId === t.id} onClick={() => setActiveId(t.id)} />)}
            <div className="h-6" />
            {issues.map((iss) => <GanttBar key={iss.id} item={iss as unknown as Task} type="issue" left={getLeft(iss.startDate)} width={getWidth(iss.startDate, iss.endDate)} isActive={activeId === iss.id} onClick={() => setActiveId(iss.id)} />)}
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
    <div className="relative h-12 w-full group">
      <div onClick={onClick} style={{ left, width }} className={`absolute top-0 h-full rounded-lg shadow-xl transition-all duration-300 overflow-hidden cursor-pointer backdrop-blur-md border ${isActive ? (isTask ? "bg-orange-500/30 border-orange-500/60 ring-2 ring-orange-500/40 z-10" : "bg-yellow-500/30 border-yellow-500/60 ring-2 ring-yellow-500/40 z-10") : (isTask ? "bg-white/10 border-white/20 hover:bg-white/20" : "bg-rose-500/20 border-rose-500/30 hover:bg-rose-500/30")}`}>
        <div className={`absolute top-0 left-0 bottom-0 transition-all duration-500 ${isTask ? 'bg-white/20' : 'bg-emerald-500/30'}`} style={{ width: `${progress}%` }} />
        <span className={`relative z-10 px-3 flex items-center h-full text-sm font-black whitespace-nowrap overflow-hidden text-ellipsis ${isTask ? 'text-white/95' : 'text-rose-100'}`}>
          {item.title}
        </span>
      </div>
    </div>
  );
}

function ResizeHandleVertical() {
  return (
    <PanelResizeHandle className="w-1.5 bg-[#050505] hover:bg-orange-500/50 transition-colors cursor-col-resize relative group">
      <div className="absolute inset-y-1/2 -translate-y-1/2 flex flex-col gap-1.5 items-center justify-center w-full opacity-0 group-hover:opacity-100"><div className="w-0.5 h-2 bg-white/80 rounded-full" /><div className="w-0.5 h-2 bg-white/80 rounded-full" /></div>
    </PanelResizeHandle>
  );
}
function ResizeHandleHorizontal() {
  return (
    <PanelResizeHandle className="h-1.5 bg-[#050505] hover:bg-orange-500/50 transition-colors cursor-row-resize relative group">
      <div className="absolute inset-x-1/2 -translate-x-1/2 flex gap-1.5 items-center justify-center h-full opacity-0 group-hover:opacity-100"><div className="h-0.5 w-2 bg-white/80 rounded-full" /><div className="h-0.5 w-2 bg-white/80 rounded-full" /></div>
    </PanelResizeHandle>
  );
}

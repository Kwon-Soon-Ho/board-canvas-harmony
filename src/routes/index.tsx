import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/control/Header";
import { FilterBar } from "@/components/control/FilterBar";
import { ProjectCard } from "@/components/control/ProjectCard";
import { CreateProjectModal } from "@/components/control/CreateProjectModal";
import { Plus, ArrowUpDown, Clock, CheckCircle2 } from "lucide-react";
import { MOCK_PROJECTS, type Department, type Status, type Project } from "@/lib/mockProjects";
import { getSyncChannel, openDetailWindow } from "@/lib/sync";
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
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: ControlCenter,
});

const STORAGE_KEY = "design-projects-store";

function migrateImages(imgs: any[]): any[] {
  return (imgs || []).map((img) => (typeof img === "string" ? { url: img, memo: "" } : img));
}

function ControlCenter() {
  // SSR-safe initial state
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [hydrated, setHydrated] = useState(false);

  const [dept, setDept] = useState<Department | "전체">("전체");
  const [statuses, setStatuses] = useState<Set<Status>>(new Set());
  const [searchValue, setSearchValue] = useState("");
  const [query, setQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"deadline" | "progress" | "recent">("recent");
  const [sortDesc, setSortDesc] = useState(true);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Hydrate from localStorage on client only
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const migrated = parsed.map((p: any) => ({
          ...p,
          images: migrateImages(p.images),
          tasks: (p.tasks || []).map((t: any) => ({ ...t, imageUrls: migrateImages(t.imageUrls) })),
          issues: (p.issues || []).map((i: any) => ({ ...i, imageUrls: migrateImages(i.imageUrls) })),
        }));
        setProjects(migrated);
      }
    } catch (err) {
      console.error("Dashboard Migration failed", err);
    }
    setHydrated(true);
  }, []);

  const persist = (next: Project[]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };

  const toggleStatus = (s: Status) => {
    setStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const handleResetAll = () => {
    setSearchValue("");
    setQuery("");
    setDept("전체");
    setStatuses(new Set());
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const baseFiltered = projects.filter((p) => {
      if (dept !== "전체" && p.department !== dept) return false;
      if (statuses.size > 0 && !statuses.has(p.status)) return false;
      if (q) {
        const hay = [p.title, p.pm, ...p.members].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return baseFiltered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "deadline") {
        if (a.deadline === "상시") return 1;
        if (b.deadline === "상시") return -1;
        cmp = a.deadline.localeCompare(b.deadline);
      } else if (sortBy === "progress") {
        cmp = a.progress - b.progress;
      } else {
        cmp = b.id.localeCompare(a.id);
      }
      return sortDesc ? -cmp : cmp;
    });
  }, [dept, statuses, query, projects, sortBy, sortDesc]);

  const [lastOpenedId, setLastOpenedId] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    const ch = getSyncChannel();
    if (!ch) return;
    ch.onmessage = (e) => {
      const msg = e.data;
      if (msg?.type === "REQUEST_PROJECT" && lastOpenedId) {
        const p = projects.find((x) => x.id === lastOpenedId);
        if (p) ch.postMessage({ type: "OPEN_PROJECT", projectId: p.id, project: p });
      }
      if (msg?.type === "PROJECT_UPDATE" && msg.project) {
        setProjects((prev) => {
          const next = prev.map((p) => (p.id === msg.project.id ? msg.project : p));
          persist(next);
          return next;
        });
      }
    };
    return () => ch.close();
  }, [lastOpenedId, projects, hydrated]);

  const handleOpen = async (id: string) => {
    setLastOpenedId(id);
    const project = projects.find((p) => p.id === id);
    const ch = getSyncChannel();
    ch?.postMessage({ type: "OPEN_PROJECT", projectId: id, project });
    ch?.close();
    await openDetailWindow(id);
  };

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    const snapshot = projects;
    const deleted = projects.find((p) => p.id === id);
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persist(next);
      return next;
    });
    const ch = getSyncChannel();
    ch?.postMessage({ type: "PROJECT_DELETED", projectId: id });
    ch?.close();
    setPendingDeleteId(null);

    toast(`"${deleted?.title ?? "프로젝트"}" 삭제됨`, {
      description: "5초 이내에 되돌릴 수 있습니다.",
      duration: 5000,
      action: {
        label: "되돌리기",
        onClick: () => {
          setProjects(snapshot);
          persist(snapshot);
          toast.success("복원되었습니다.");
        },
      },
    });
  };

  const pendingDeleteProject = pendingDeleteId
    ? projects.find((p) => p.id === pendingDeleteId)
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <FilterBar
        projects={projects}
        dept={dept}
        setDept={setDept}
        statuses={statuses}
        toggleStatus={toggleStatus}
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        onSubmitSearch={(v) => setQuery(v)}
        onLiveSearch={(v) => setQuery(v)}
        onResetAll={handleResetAll}
      />

      <main className="mx-auto max-w-[1600px] px-10 py-12">
        <div className="mb-8 flex items-end justify-between border-b border-white/10 pb-6">
          <div>
            <h1 className="text-[32px] font-black tracking-tighter text-white">전체 프로젝트</h1>
            <p className="mt-2 text-[15px] font-medium text-white/40">
              총 <strong className="text-white">{filtered.length}</strong>개의 프로젝트가 조건에 일치합니다
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div
              role="group"
              aria-label="정렬"
              className="flex bg-white/5 border border-white/10 rounded-xl p-1 backdrop-blur-md"
            >
              <button
                aria-pressed={sortBy === "recent"}
                onClick={() => { setSortBy("recent"); setSortDesc(true); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${sortBy === "recent" ? "bg-white/20 text-white" : "text-white/40 hover:text-white"}`}
              >
                최신순
              </button>
              <button
                aria-pressed={sortBy === "progress"}
                onClick={() => { setSortBy("progress"); setSortDesc(true); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1 ${sortBy === "progress" ? "bg-white/20 text-white" : "text-white/40 hover:text-white"}`}
              >
                <CheckCircle2 className="w-4 h-4" /> 진행률순
              </button>
              <button
                aria-pressed={sortBy === "deadline"}
                onClick={() => { setSortBy("deadline"); setSortDesc(false); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1 ${sortBy === "deadline" ? "bg-white/20 text-white" : "text-white/40 hover:text-white"}`}
              >
                <Clock className="w-4 h-4" /> 마감임박순
              </button>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              aria-label="새 프로젝트 생성"
              className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-white/90 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              <Plus className="w-5 h-5" />
              새 프로젝트
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col h-[400px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] backdrop-blur-sm">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <ArrowUpDown className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-bold text-white/70 mb-2">조건에 맞는 프로젝트가 없습니다</h3>
            <p className="text-[15px] text-white/40">필터를 조정하거나 새로운 프로젝트를 생성해보세요.</p>
          </div>
        ) : (
          <section
            aria-label="프로젝트 목록"
            className="grid grid-cols-1 gap-x-12 gap-y-16 px-2 pb-24 md:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={handleOpen}
                onDelete={() => setPendingDeleteId(p.id)}
              />
            ))}
          </section>
        )}
      </main>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={(newProject) => {
          setProjects((prev) => {
            const next = [newProject, ...prev];
            persist(next);
            return next;
          });
        }}
      />

      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>프로젝트를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDeleteProject?.title ?? ""}" 프로젝트가 목록에서 제거됩니다.
              삭제 후 5초 동안 토스트의 "되돌리기" 버튼으로 복원할 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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

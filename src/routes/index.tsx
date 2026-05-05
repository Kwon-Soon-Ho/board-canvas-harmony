import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/control/Header";
import { FilterBar } from "@/components/control/FilterBar";

import { ActiveFilterChips } from "@/components/control/ActiveFilterChips";
import { ProjectCard } from "@/components/control/ProjectCard";
import { ActivityFeed } from "@/components/control/ActivityFeed";
import { TeamWorkloadBar } from "@/components/control/TeamWorkloadBar";
import { KanbanBoard } from "@/components/control/KanbanBoard";
import { TimelineView } from "@/components/control/TimelineView";
import { ViewSwitcher, type ViewMode } from "@/components/control/ViewSwitcher";
import { CreateProjectModal } from "@/components/control/CreateProjectModal";
import { Plus, ArrowUpDown } from "lucide-react";
import { MOCK_PROJECTS, backfillStartDate, type Department, type Status, type Project } from "@/lib/mockProjects";
import { getSyncChannel, openDetailWindow, ensureScreenDetails } from "@/lib/sync";
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
  // Dashboard is localStorage-driven; SSR adds no value and causes hydration mismatch.
  ssr: false,
});

const STORAGE_KEY = "design-projects-store";
const BACKUP_KEY = "design-projects-store-backup-v4";
const MIGRATION_KEY = "design-projects-migration-v5";

function migrateImages(imgs: any[]): any[] {
  return (imgs || []).map((img) => (typeof img === "string" ? { url: img, memo: "" } : img));
}

function normalizeProgress(list: Project[]): Project[] {
  return list.map((p) => {
    if (p.status !== "완료") return p;
    return {
      ...p,
      progress: 100,
      tasks: (p.tasks || []).map((t) => ({ ...t, status: "완료", progress: 100 })),
      issues: (p.issues || []).map((i) => ({ ...i, status: "Resolved", resolved: true })),
    };
  });
}

function ControlCenter() {
  // SSR-safe initial state
  const [projects, setProjects] = useState<Project[]>(() => normalizeProgress(MOCK_PROJECTS));
  const [hydrated, setHydrated] = useState(false);

  const [dept, setDept] = useState<Department | "전체">("전체");
  const [statuses, setStatuses] = useState<Set<Status>>(new Set());
  const [searchValue, setSearchValue] = useState("");
  const [query, setQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"updated" | "created" | "progress" | "deadline">("updated");
  const [sortDesc, setSortDesc] = useState(true);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [assignees, setAssignees] = useState<Set<string>>(new Set());
  const toggleAssignee = (name: string) => {
    setAssignees((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };
  const [view, setView] = useState<ViewMode>("grid");

  // Quarter filter — defaults to current quarter
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = (Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  const [year, setYear] = useState<number>(currentYear);
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4 | "all">(currentQuarter);

  // Hydrate from localStorage on client only
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const migrationDone = localStorage.getItem(MIGRATION_KEY) === "1";
      const force = !migrationDone;
      // Snapshot pre-migration data once for safety.
      if (force && saved && !localStorage.getItem(BACKUP_KEY)) {
        localStorage.setItem(BACKUP_KEY, saved);
      }
      // Merge: ensure every seed project exists, then overlay saved overrides.
      const seedById = new Map(MOCK_PROJECTS.map((p) => [p.id, p]));
      const savedList: any[] = saved ? JSON.parse(saved) : [];
      for (const s of savedList) {
        const merged = {
          ...seedById.get(s.id),
          ...s,
          images: migrateImages(s.images),
          tasks: (s.tasks || []).map((t: any) => ({ ...t, imageUrls: migrateImages(t.imageUrls) })),
          issues: (s.issues || []).map((i: any) => ({ ...i, imageUrls: migrateImages(i.imageUrls) })),
        };
        seedById.set(s.id, merged as Project);
      }
      const merged = Array.from(seedById.values()).map((p: any) => backfillStartDate(p, force));
      const normalized = normalizeProgress(merged);
      setProjects(normalized);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      localStorage.setItem(MIGRATION_KEY, "1");
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
    setUrgentOnly(false);
    setIssuesOnly(false);
    setAssignees(new Set());
  };

  // Quarter range (inclusive) — shared between FilterBar (counts) and main filtering
  const { qStart, qEnd } = useMemo(() => {
    const s = quarter === "all" ? new Date(year, 0, 1) : new Date(year, (quarter - 1) * 3, 1);
    const e = quarter === "all" ? new Date(year, 11, 31) : new Date(year, quarter * 3, 0);
    s.setHours(0, 0, 0, 0);
    e.setHours(23, 59, 59, 999);
    return { qStart: s, qEnd: e };
  }, [year, quarter]);

  // Projects scoped to selected quarter — used by FilterBar so dept/status counts sync
  // Year-scope: 상시/대기 should only appear in years that contain real project deadlines.
  // (e.g. mock data lives in 2026 → selecting 2025/2027 should yield zero, both quarterly and yearly.)
  const yearHasData = useMemo(() => {
    return projects.some((p) => {
      const eStr = p.deadline;
      if (!eStr || !/^\d{4}-\d{2}-\d{2}$/.test(eStr)) return false;
      return new Date(eStr).getFullYear() === year;
    });
  }, [projects, year]);

  const projectsInQuarter = useMemo(() => {
    if (!qStart || !qEnd) return projects;
    return projects.filter((p) => {
      if (p.deadline === "상시") return yearHasData;
      if (p.status === "대기") return yearHasData;
      const sStr = p.startDate;
      const eStr = p.deadline;
      const s = sStr && /^\d{4}-\d{2}-\d{2}$/.test(sStr) ? new Date(sStr) : null;
      const e = eStr && /^\d{4}-\d{2}-\d{2}$/.test(eStr) ? new Date(eStr) : null;
      if (!s && !e) return false;
      const start = s ?? e!;
      const end = e ?? s!;
      return !(end < qStart || start > qEnd);
    });
  }, [projects, qStart, qEnd, yearHasData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseFiltered = projects.filter((p) => {
      if (dept !== "전체" && p.department !== dept) return false;
      if (statuses.size > 0 && !statuses.has(p.status)) return false;
      if (q) {
        const hay = [p.title, p.pm, ...p.members].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (urgentOnly) {
        if (!p.deadline || !/^\d{4}-\d{2}-\d{2}$/.test(p.deadline)) return false;
        const d = new Date(p.deadline);
        d.setHours(0, 0, 0, 0);
        const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
        if (!(diff <= 7 && p.progress < 100)) return false;
      }
      if (issuesOnly) {
        const open = p.issues.filter((i) => !i.resolved).length;
        if (open === 0) return false;
      }
      if (assignees.size > 0) {
        const involved = new Set<string>([p.pm, ...p.members]);
        let ok = false;
        for (const a of assignees) if (involved.has(a)) { ok = true; break; }
        if (!ok) return false;
      }
      // 상시 / 대기: 해당 연도에 실제 데이터가 있을 때만 노출.
      if (p.deadline === "상시" || p.status === "대기") {
        if (!yearHasData) return false;
        return true;
      }
      if (qStart && qEnd) {
        const sStr = p.startDate;
        const eStr = p.deadline;
        const s = sStr && /^\d{4}-\d{2}-\d{2}$/.test(sStr) ? new Date(sStr) : null;
        const e = eStr && /^\d{4}-\d{2}-\d{2}$/.test(eStr) ? new Date(eStr) : null;
        if (!s && !e) return false;
        const start = s ?? e!;
        const end = e ?? s!;
        if (end < qStart || start > qEnd) return false;
      }
      return true;
    });

    const statusOrder: Record<Status, number> = { 진행: 0, 상시: 1, 대기: 2, 완료: 3 };

    return baseFiltered.sort((a, b) => {
      // When 마감임박 filter or 마감임박순 sort: prioritize by status 진행→상시→대기→완료
      if (urgentOnly || sortBy === "deadline") {
        const so = statusOrder[a.status] - statusOrder[b.status];
        if (so !== 0) return so;
        const aHas = !!a.deadline && a.deadline !== "상시";
        const bHas = !!b.deadline && b.deadline !== "상시";
        if (!aHas && bHas) return 1;
        if (aHas && !bHas) return -1;
        if (!aHas && !bHas) return a.id.localeCompare(b.id);
        return a.deadline.localeCompare(b.deadline);
      }

      let cmp = 0;
      if (sortBy === "progress") {
        cmp = a.progress - b.progress;
      } else if (sortBy === "updated") {
        const au = a.updatedAt ?? "";
        const bu = b.updatedAt ?? "";
        cmp = au.localeCompare(bu);
        if (cmp === 0) cmp = a.id.localeCompare(b.id);
      } else {
        // "created" — id desc
        cmp = b.id.localeCompare(a.id);
      }
      return sortDesc ? -cmp : cmp;
    });
  }, [dept, statuses, query, projects, sortBy, sortDesc, urgentOnly, issuesOnly, assignees, qStart, qEnd, yearHasData]);

  // Dynamic heading based on active filters
  const heading = useMemo(() => {
    const parts: string[] = [];
    if (quarter !== "all") parts.push(`${year}년 ${quarter}분기`);
    else parts.push(`${year}년 전체`);
    if (dept !== "전체") parts.push(`${dept} 부서`);
    if (statuses.size > 0) parts.push([...statuses].join("·") + " 상태");
    if (urgentOnly) parts.push("마감 7일 이내");
    if (issuesOnly) parts.push("이슈 있음");
    if (assignees.size > 0) parts.push(`${[...assignees].join("·")} 담당`);
    return parts.join(" · ");
  }, [dept, statuses, urgentOnly, issuesOnly, assignees, year, quarter]);

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
      if (msg?.type === "MEMBER_RENAME") {
        // localStorage was already rewritten by teamSync; sync in-memory state.
        const { oldName, newName } = msg as { oldName: string; newName: string };
        setProjects((prev) => {
          const next = prev.map((p) => {
            let touched = false;
            const np = { ...p };
            if (p.pm === oldName) { np.pm = newName; touched = true; }
            if (p.members.includes(oldName)) {
              np.members = p.members.map((m) => (m === oldName ? newName : m));
              touched = true;
            }
            if (p.tasks?.some((t) => t.assignee === oldName)) {
              np.tasks = p.tasks.map((t) => (t.assignee === oldName ? { ...t, assignee: newName } : t));
              touched = true;
            }
            if (p.issues?.some((i) => i.assignee === oldName)) {
              np.issues = p.issues.map((i) => (i.assignee === oldName ? { ...i, assignee: newName } : i));
              touched = true;
            }
            return touched ? np : p;
          });
          return next;
        });
      }
    };
    return () => ch.close();
  }, [lastOpenedId, projects, hydrated]);

  // Resolve right-monitor target once after first user gesture (lazy permission prompt).
  useEffect(() => {
    if (!hydrated) return;
    const handler = () => {
      void ensureScreenDetails();
      window.removeEventListener("pointerdown", handler);
    };
    window.addEventListener("pointerdown", handler, { once: true });
    return () => window.removeEventListener("pointerdown", handler);
  }, [hydrated]);

  const handleOpen = (id: string) => {
    setLastOpenedId(id);
    const project = projects.find((p) => p.id === id);
    const ch = getSyncChannel();
    ch?.postMessage({ type: "OPEN_PROJECT", projectId: id, project });
    ch?.close();

    // Anti-jump: snapshot scroll, drop focus, then PIN scroll for ~600ms.
    // Published (popup-blocked or slow) environments fire a delayed
    // scrollIntoView from the click target; a single rAF restore isn't enough.
    const savedY = window.scrollY;
    const savedX = window.scrollX;
    const active = document.activeElement as HTMLElement | null;
    active?.blur?.();

    openDetailWindow(id);

    const pin = () => window.scrollTo({ top: savedY, left: savedX, behavior: "auto" });
    pin();
    const onScroll = () => pin();
    window.addEventListener("scroll", onScroll, { passive: true });
    const interval = window.setInterval(pin, 16);
    window.setTimeout(() => {
      window.clearInterval(interval);
      window.removeEventListener("scroll", onScroll);
    }, 600);
  };

  const handleStatusChange = (id: string, next: Status) => {
    const now = new Date().toISOString();
    const todayStr = new Date().toISOString().slice(0, 10);
    setProjects((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== id) return p;
        if (next === "완료") {
          return {
            ...p,
            status: next,
            progress: 100,
            updatedAt: now,
            tasks: p.tasks.map((t) => ({ ...t, status: "완료" as const, progress: 100 })),
            issues: p.issues.map((i) => ({ ...i, status: "Resolved" as const, resolved: true })),
          };
        }
        if (next === "대기") {
          // 대기는 시작일/마감일 모두 비움 (v5 규칙)
          return { ...p, status: next, updatedAt: now, startDate: undefined, deadline: "" };
        }
        if (next === "상시") {
          // 상시는 마감일을 "상시"로, 시작일이 없으면 오늘로 채움 (무한바 시작점 필요)
          return {
            ...p,
            status: next,
            updatedAt: now,
            startDate: p.startDate || todayStr,
            deadline: "상시",
          };
        }
        if (next === "진행") {
          // 진행으로 돌아올 때 시작일이 없으면 오늘로. 마감일이 "상시"거나 비어있으면 비움.
          const cleanedDeadline =
            p.deadline && p.deadline !== "상시" && /^\d{4}-\d{2}-\d{2}$/.test(p.deadline)
              ? p.deadline
              : "";
          return {
            ...p,
            status: next,
            updatedAt: now,
            startDate: p.startDate || todayStr,
            deadline: cleanedDeadline,
          };
        }
        return { ...p, status: next, updatedAt: now };
      });
      persist(updated);
      const changed = updated.find((p) => p.id === id);
      const ch = getSyncChannel();
      if (changed) ch?.postMessage({ type: "PROJECT_UPDATE", project: changed });
      ch?.close();
      return updated;
    });
    toast.success(`상태가 "${next}"(으)로 변경되었습니다.`);
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
        projects={projectsInQuarter}
        dept={dept}
        setDept={setDept}
        statuses={statuses}
        toggleStatus={toggleStatus}
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        onSubmitSearch={(v) => setQuery(v)}
        onLiveSearch={(v) => setQuery(v)}
        onResetAll={handleResetAll}
        urgentOnly={urgentOnly}
        setUrgentOnly={setUrgentOnly}
        issuesOnly={issuesOnly}
        setIssuesOnly={setIssuesOnly}
      />

      <TeamWorkloadBar projects={projectsInQuarter} assignees={assignees} toggleAssignee={toggleAssignee} clearAssignees={() => setAssignees(new Set())} />

      <main className="mx-auto max-w-[1920px] px-12 py-12">
        <div className="flex gap-8">
          <div className="min-w-0 flex-1">
            <div className="mb-8 border-b border-white/10 pb-6">
              {/* Heading row — title left, controls right */}
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-[32px] font-black tracking-tighter text-white break-keep leading-tight">
                    {heading}
                  </h1>
                  <p className="mt-1.5 text-[14px] font-medium text-white/40">
                    총 <strong className="text-white">{filtered.length}</strong>개의 프로젝트가 조건에 일치합니다
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2.5 shrink-0">
                  <div
                    role="group"
                    aria-label="기간"
                    className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 backdrop-blur-md"
                  >
                    <select
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      aria-label="연도 선택"
                      className="bg-transparent text-white text-sm font-bold px-2 py-2 rounded-lg hover:bg-white/10 focus:outline-none cursor-pointer appearance-none tabular-nums"
                    >
                      {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                        <option key={y} value={y} className="bg-neutral-900 text-white">{y}년</option>
                      ))}
                    </select>
                    <div className="h-5 w-px bg-white/15" />
                    {([1, 2, 3, 4] as const).map((q) => (
                      <button
                        key={q}
                        type="button"
                        aria-pressed={quarter === q}
                        onClick={() => setQuarter(q)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${quarter === q ? "bg-white/20 text-white" : "text-white/40 hover:text-white"}`}
                      >
                        {q}분기
                      </button>
                    ))}
                    <button
                      type="button"
                      aria-pressed={quarter === "all"}
                      onClick={() => setQuarter("all")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${quarter === "all" ? "bg-white/20 text-white" : "text-white/40 hover:text-white"}`}
                    >
                      연간
                    </button>
                  </div>
                  <ViewSwitcher view={view} setView={setView} />
                  <div
                    role="group"
                    aria-label="정렬"
                    className="flex bg-white/5 border border-white/10 rounded-xl p-1 backdrop-blur-md"
                  >
                    <button
                      aria-pressed={sortBy === "updated"}
                      onClick={() => { setSortBy("updated"); setSortDesc(true); }}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${sortBy === "updated" ? "bg-white/20 text-white" : "text-white/40 hover:text-white"}`}
                      title="최근 수정 순"
                    >
                      최신순
                    </button>
                    <button
                      aria-pressed={sortBy === "created"}
                      onClick={() => { setSortBy("created"); setSortDesc(true); }}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${sortBy === "created" ? "bg-white/20 text-white" : "text-white/40 hover:text-white"}`}
                      title="프로젝트 생성 순"
                    >
                      생성순
                    </button>
                    <button
                      aria-pressed={sortBy === "progress"}
                      onClick={() => { setSortBy("progress"); setSortDesc(true); }}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${sortBy === "progress" ? "bg-white/20 text-white" : "text-white/40 hover:text-white"}`}
                    >
                      진행률순
                    </button>
                    <button
                      aria-pressed={sortBy === "deadline"}
                      onClick={() => { setSortBy("deadline"); setSortDesc(false); }}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${sortBy === "deadline" ? "bg-white/20 text-white" : "text-white/40 hover:text-white"}`}
                    >
                      마감임박순
                    </button>
                  </div>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    aria-label="새 프로젝트 생성"
                    className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-bold hover:bg-white/90 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                  >
                    <Plus className="w-4 h-4" />
                    새 프로젝트
                  </button>
                </div>
              </div>

              {/* Active filter chips */}
              <ActiveFilterChips
                dept={dept}
                statuses={statuses}
                query={query}
                urgentOnly={urgentOnly}
                issuesOnly={issuesOnly}
                assignees={assignees}
                onClearDept={() => setDept("전체")}
                onClearStatus={(s) => toggleStatus(s)}
                onClearQuery={() => { setSearchValue(""); setQuery(""); }}
                onClearUrgent={() => setUrgentOnly(false)}
                onClearIssues={() => setIssuesOnly(false)}
                onClearAssignee={(name) => toggleAssignee(name)}
                onResetAll={handleResetAll}
              />
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col h-[400px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] backdrop-blur-sm">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <ArrowUpDown className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-xl font-bold text-white/70 mb-2">조건에 맞는 프로젝트가 없습니다</h3>
                <p className="text-[15px] text-white/40 mb-5">필터를 조정하거나 새로운 프로젝트를 생성해보세요.</p>
                {(dept !== "전체" || statuses.size > 0 || query.trim().length > 0) && (
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-5 max-w-[600px]">
                    {dept !== "전체" && (
                      <span className="px-2.5 py-1 rounded-md bg-white/10 text-[12px] text-white/70 font-medium">
                        부서: {dept}
                      </span>
                    )}
                    {[...statuses].map((s) => (
                      <span key={s} className="px-2.5 py-1 rounded-md bg-white/10 text-[12px] text-white/70 font-medium">
                        상태: {s}
                      </span>
                    ))}
                    {query.trim().length > 0 && (
                      <span className="px-2.5 py-1 rounded-md bg-white/10 text-[12px] text-white/70 font-medium">
                        검색: "{query}"
                      </span>
                    )}
                  </div>
                )}
                {(dept !== "전체" || statuses.size > 0 || query.trim().length > 0) && (
                  <button
                    onClick={handleResetAll}
                    className="px-4 py-2 rounded-lg bg-white text-black text-[13px] font-bold hover:bg-white/90 transition"
                  >
                    필터 초기화
                  </button>
                )}
              </div>
            ) : view === "kanban" ? (
              <KanbanBoard
                projects={filtered}
                onOpen={handleOpen}
                onDelete={(id) => setPendingDeleteId(id)}
                onStatusChange={handleStatusChange}
              />
            ) : view === "timeline" ? (
              <TimelineView projects={filtered} onOpen={handleOpen} />
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
                    quarterRange={quarter === "all" ? null : { year, quarter }}
                  />
                ))}
              </section>
            )}
          </div>

          {/* P9 + P10: Activity feed in the previously unused right gutter */}
          <ActivityFeed projects={projects} onOpen={handleOpen} />
        </div>
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

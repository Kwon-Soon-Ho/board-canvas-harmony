import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/control/Header";
import { FilterBar } from "@/components/control/FilterBar";
import { ProjectCard } from "@/components/control/ProjectCard";
import { MOCK_PROJECTS, type Department, type Status } from "@/lib/mockProjects";
import { getSyncChannel, openDetailWindow } from "@/lib/sync";

export const Route = createFileRoute("/")({
  component: ControlCenter,
});

function ControlCenter() {
  const [dept, setDeptRaw] = useState<Department | "전체">("전체");
  const [statuses, setStatuses] = useState<Set<Status>>(new Set());
  const [searchValue, setSearchValue] = useState("");
  const [query, setQuery] = useState("");

  const clearSearch = () => {
    setSearchValue("");
    setQuery("");
  };

  const setDept = (d: Department | "전체") => {
    setDeptRaw(d);
    clearSearch();
  };
  const toggleStatus = (s: Status) => {
    setStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
    clearSearch();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_PROJECTS.filter((p) => {
      if (dept !== "전체" && p.department !== dept) return false;
      if (statuses.size > 0 && !statuses.has(p.status)) return false;
      if (q) {
        const hay = [p.title, p.pm, ...p.members].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [dept, statuses, query]);

  // Keep a ref to "last opened project" so Window B can request it on load.
  const [lastOpenedId, setLastOpenedId] = useState<string | null>(null);

  useEffect(() => {
    const ch = getSyncChannel();
    if (!ch) return;
    ch.onmessage = (e) => {
      const msg = e.data;
      if (msg?.type === "REQUEST_PROJECT" && lastOpenedId) {
        const p = MOCK_PROJECTS.find((x) => x.id === lastOpenedId);
        if (p) ch.postMessage({ type: "OPEN_PROJECT", projectId: p.id, project: p });
      }
    };
    return () => ch.close();
  }, [lastOpenedId]);

  const handleOpen = async (id: string) => {
    setLastOpenedId(id);
    const project = MOCK_PROJECTS.find((p) => p.id === id);
    const ch = getSyncChannel();
    ch?.postMessage({ type: "OPEN_PROJECT", projectId: id, project });
    ch?.close();
    await openDetailWindow(id);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <FilterBar
        dept={dept}
        setDept={setDept}
        statuses={statuses}
        toggleStatus={toggleStatus}
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        onSubmitSearch={(v) => setQuery(v)}
        onClearAll={() => {
          clearSearch();
          setDeptRaw("전체");
          setStatuses(new Set());
        }}
      />

      <main className="mx-auto max-w-[1600px] px-10 py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight">프로젝트</h1>
            <p className="mt-1 text-[16px] text-muted-foreground">
              총 {filtered.length}개 / 전체 {MOCK_PROJECTS.length}개
            </p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-hairline text-[16px] text-muted-foreground">
            조건에 맞는 프로젝트가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-12 gap-y-16 px-2 pb-24 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p} onOpen={handleOpen} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

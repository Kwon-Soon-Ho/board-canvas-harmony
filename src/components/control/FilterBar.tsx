import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEPT_COLOR,
  type Department,
  type Status,
  type Project,
} from "@/lib/mockProjects";
import { RotateCcw, Clock3, AlertTriangle } from "lucide-react";

const DEPARTMENTS: Array<Department | "전체"> = ["전체", "공통", "영상", "편집", "UX"];
const STATUSES: Status[] = ["진행", "상시", "대기", "완료"];

const STATUS_COLOR_VAR: Record<Status, string> = {
  진행: "var(--status-active)",
  상시: "var(--status-ongoing)",
  대기: "var(--status-pending)",
  완료: "var(--status-done)",
};

interface Props {
  projects: Project[];
  dept: Department | "전체";
  setDept: (d: Department | "전체") => void;
  statuses: Set<Status>;
  toggleStatus: (s: Status) => void;
  searchValue: string;
  setSearchValue: (v: string) => void;
  onSubmitSearch: (v: string) => void;
  onLiveSearch: (v: string) => void;
  onResetAll: () => void;
  urgentOnly: boolean;
  setUrgentOnly: (v: boolean) => void;
  issuesOnly: boolean;
  setIssuesOnly: (v: boolean) => void;
}

export function FilterBar({
  projects,
  dept,
  setDept,
  statuses,
  toggleStatus,
  searchValue,
  setSearchValue,
  onSubmitSearch,
  onLiveSearch,
  onResetAll,
  urgentOnly,
  setUrgentOnly,
  issuesOnly,
  setIssuesOnly,
}: Props) {
  const [local, setLocal] = useState(searchValue);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setLocal(searchValue);
  }, [searchValue]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setSearchValue(local);
      onLiveSearch(local);
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const handleClearInput = () => {
    setLocal("");
    setSearchValue("");
    onLiveSearch("");
  };

  const deptCounts = useMemo(() => {
    const m: Record<string, number> = { 전체: projects.length };
    for (const p of projects) m[p.department] = (m[p.department] ?? 0) + 1;
    return m;
  }, [projects]);

  const statusCounts = useMemo(() => {
    const base =
      dept === "전체"
        ? projects
        : projects.filter((p) => p.department === dept);

    const m = { 진행: 0, 상시: 0, 대기: 0, 완료: 0 } as Record<Status, number>;
    for (const p of base) {
      m[p.status] += 1;
    }
    return m;
  }, [dept, projects]);

  const quickStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let urgent = 0;
    let issues = 0;
    for (const p of projects) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(p.deadline)) {
        const d = new Date(p.deadline);
        d.setHours(0, 0, 0, 0);
        const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
        if (diff <= 7 && p.progress < 100) urgent += 1;
      }
      if (p.issues.filter((i) => !i.resolved).length > 0) issues += 1;
    }
    return { urgent, issues };
  }, [projects]);

  const isAnyActive =
    dept !== "전체" || statuses.size > 0 || (searchValue?.trim().length ?? 0) > 0 || (local?.trim().length ?? 0) > 0 || urgentOnly || issuesOnly;

  return (
    <div className="sticky top-16 z-40 border-b border-white/10 bg-black">
      <div className="mx-auto flex max-w-[1600px] flex-nowrap items-center justify-between gap-4 px-10 py-3">
        <div className="flex flex-nowrap items-center gap-5 min-w-0">
          {/* Department */}
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-white/40">부서</span>
            <div className="flex items-center gap-1.5" role="group" aria-label="부서 필터">
              {DEPARTMENTS.map((d) => {
                const active = dept === d;
                const count = deptCounts[d] ?? 0;
                const color = d === "전체" ? "#FFFFFF" : DEPT_COLOR[d];
                return (
                  <button
                    key={d}
                    aria-pressed={active}
                    onClick={() => setDept(d)}
                    style={{
                      background: active
                        ? `linear-gradient(to bottom, ${color}55, ${color}22)`
                        : undefined,
                      borderColor: active ? color : undefined,
                      boxShadow: active ? `0 0 0 1px ${color}88, 0 0 18px ${color}55` : undefined,
                      color: active ? "#000" : undefined,
                    }}
                    className={`group flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[14px] font-semibold transition-all ${
                      active
                        ? ""
                        : "border-white/10 bg-[#1A1A1A] text-gray-400 hover:border-white/25 hover:bg-[#222] hover:text-foreground"
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: active ? "#000" : (d === "전체" ? "rgba(255,255,255,0.35)" : color),
                        boxShadow: active ? "none" : (d === "전체" ? "none" : `0 0 6px ${color}`),
                      }}
                    />
                    <span>{d}</span>
                    <span
                      className="ml-0.5 rounded px-1.5 py-0.5 font-mono text-[12px] font-bold tabular-nums"
                      style={{
                        background: active ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.06)",
                        color: active ? "#000" : "rgba(255,255,255,0.6)",
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-8 w-px shrink-0 bg-white/15" />

          {/* Status */}
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-white/40">상태</span>
            <div className="flex items-center gap-1.5" role="group" aria-label="상태 필터">
              {STATUSES.map((s) => {
                const active = statuses.has(s);
                const colorVar = STATUS_COLOR_VAR[s];
                return (
                  <button
                    key={s}
                    aria-pressed={active}
                    onClick={() => toggleStatus(s)}
                    style={{
                      background: active
                        ? `linear-gradient(to bottom, color-mix(in srgb, ${colorVar} 55%, transparent), color-mix(in srgb, ${colorVar} 25%, transparent))`
                        : undefined,
                      borderColor: active ? colorVar : undefined,
                      boxShadow: active
                        ? `0 0 0 1px color-mix(in srgb, ${colorVar} 70%, transparent), 0 0 18px color-mix(in srgb, ${colorVar} 45%, transparent)`
                        : undefined,
                      color: active ? "#000" : undefined,
                    }}
                    className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[14px] font-semibold transition-all ${
                      active
                        ? ""
                        : "border-white/10 bg-[#1A1A1A] text-gray-400 hover:border-white/25 hover:bg-[#222] hover:text-foreground"
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: active ? "#000" : colorVar,
                        boxShadow: active ? "none" : `0 0 6px ${colorVar}`,
                      }}
                    />
                    <span>{s}</span>
                    <span
                      className="ml-0.5 rounded px-1.5 py-0.5 font-mono text-[12px] font-bold tabular-nums"
                      style={{
                        background: active ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.06)",
                        color: active ? "#000" : "rgba(255,255,255,0.6)",
                      }}
                    >
                      {statusCounts[s] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Search + Reset */}
        <div className="flex shrink-0 items-center gap-3">
          {isAnyActive && (
            <button
              type="button"
              onClick={() => {
                setLocal("");
                onResetAll();
              }}
              className="flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-white/50 hover:text-white transition"
              aria-label="모든 필터 및 검색 초기화"
              title="모든 필터 및 검색 초기화"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              초기화
            </button>
          )}
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSearchValue(local);
              onSubmitSearch(local);
            }}
          >
            <div className="relative">
              <input
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                placeholder="검색어 입력"
                aria-label="프로젝트 검색"
                className="h-9 w-56 rounded-md border border-white/10 bg-white/[0.03] px-3 pr-8 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:border-white/30 focus:outline-none"
              />
              {local && (
                <button
                  type="button"
                  onClick={handleClearInput}
                  aria-label="검색어 지우기"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button
              type="submit"
              className="h-9 rounded-md bg-foreground px-4 text-[13px] font-semibold text-background hover:opacity-90"
            >
              검색
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

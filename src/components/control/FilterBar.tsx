import { useEffect, useMemo, useState } from "react";
import {
  DEPT_COLOR,
  MOCK_PROJECTS,
  type Department,
  type Status,
} from "@/lib/mockProjects";

const DEPARTMENTS: Array<Department | "전체"> = ["전체", "공통", "영상", "편집", "UX"];
const STATUSES: Status[] = ["진행", "상시", "대기", "완료"];

const STATUS_COLOR_VAR: Record<Status, string> = {
  진행: "var(--status-active)",
  상시: "var(--status-ongoing)",
  대기: "var(--status-pending)",
  완료: "var(--status-done)",
};

interface Props {
  dept: Department | "전체";
  setDept: (d: Department | "전체") => void;
  statuses: Set<Status>;
  toggleStatus: (s: Status) => void;
  searchValue: string;
  setSearchValue: (v: string) => void;
  onSubmitSearch: (v: string) => void;
  onClearAll: () => void;
}

export function FilterBar({
  dept,
  setDept,
  statuses,
  toggleStatus,
  searchValue,
  setSearchValue,
  onSubmitSearch,
  onClearAll,
}: Props) {
  const [local, setLocal] = useState(searchValue);

  useEffect(() => {
    setLocal(searchValue);
  }, [searchValue]);

  const handleClear = () => {
    setLocal("");
    setSearchValue("");
    onClearAll();
  };

  // Department counts: always against full dataset
  const deptCounts = useMemo(() => {
    const m: Record<string, number> = { 전체: MOCK_PROJECTS.length };
    for (const p of MOCK_PROJECTS) m[p.department] = (m[p.department] ?? 0) + 1;
    return m;
  }, []);

  // STATUS SYNC LOGIC (CRITICAL):
  // Status counts are DERIVED from the selected Department.
  // Filter mockProjects by active dept first, THEN count statuses.
  const statusCounts = useMemo(() => {
    const base =
      dept === "전체"
        ? MOCK_PROJECTS
        : MOCK_PROJECTS.filter((p) => p.department === dept);

    const m = { 진행: 0, 상시: 0, 대기: 0, 완료: 0 } as Record<Status, number>;
    for (const p of base) {
      m[p.status] += 1;
    }
    return m;
  }, [dept]);

  return (
    <div className="sticky top-16 z-40 border-b border-white/10 bg-black/70 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-10 gap-y-5 px-10 py-6">
        {/* Department — LEFT side */}
        <div className="flex items-center gap-4">
          <span className="text-[16px] font-medium text-gray-300">부서</span>
          <div className="flex items-center gap-2">
            {DEPARTMENTS.map((d) => {
              const active = dept === d;
              const count = deptCounts[d] ?? 0;
              const color = d === "전체" ? "#FFFFFF" : DEPT_COLOR[d];
              return (
                 <button
                 key={d}
                 onClick={() => setDept(d)}
                 style={{
                   background: active
                     ? `linear-gradient(to bottom, ${color}33, ${color}11)`
                     : undefined,
                   borderColor: active ? `${color}66` : undefined,
                 }}
                 className={`group flex items-center gap-2 rounded-lg border px-5 py-2.5 text-[16px] font-medium transition-all ${
                   active
                     ? "text-foreground shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                     : "border-white/10 bg-[#1A1A1A] text-gray-300 hover:border-white/25 hover:bg-[#222] hover:text-foreground"
                 }`}
               >
                  {d !== "전체" && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
                    />
                  )}
                  <span>{d}</span>
                  <span className={`text-[15px] font-bold ${active ? "text-foreground" : "text-gray-400"}`}>({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-9 w-px bg-white/10" />

        {/* Status — RIGHT side, same size as Department cards */}
        <div className="flex items-center gap-4">
          <span className="text-[16px] font-medium text-gray-300">상태</span>
          <div className="flex items-center gap-2">
            {STATUSES.map((s) => {
              const active = statuses.has(s);
              const colorVar = STATUS_COLOR_VAR[s];
              // For inline styles we can use color-mix or just standard gradient if we assume oklch works or we use color-mix for opacity.
              // Since CSS variables here are oklch, we can use them directly or with color-mix for the gradient.
              return (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  style={{
                    background: active
                      ? `linear-gradient(to bottom, color-mix(in srgb, ${colorVar} 20%, transparent), color-mix(in srgb, ${colorVar} 5%, transparent))`
                      : undefined,
                    borderColor: active ? `color-mix(in srgb, ${colorVar} 40%, transparent)` : undefined,
                  }}
                  className={`flex items-center gap-2 rounded-lg border px-5 py-2.5 text-[16px] font-medium transition-all ${
                    active
                      ? "text-foreground shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                      : "border-white/10 bg-[#1A1A1A] text-gray-300 hover:border-white/25 hover:bg-[#222] hover:text-foreground"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: colorVar, boxShadow: `0 0 6px ${colorVar}` }}
                  />
                  <span>{s}</span>
                  <span className={`text-[15px] font-bold ${active ? "text-foreground" : "text-gray-400"}`}>
                    ({statusCounts[s] ?? 0})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <form
          className="ml-auto flex items-center gap-2"
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
              placeholder="프로젝트, PM, 멤버 검색"
              className="h-12 w-80 rounded-lg border border-white/10 bg-white/[0.03] px-4 pr-10 text-[16px] text-foreground placeholder:text-muted-foreground/60 backdrop-blur-md focus:border-white/30 focus:outline-none"
            />
            {local && (
              <button
                type="button"
                aria-label="검색어 지우기"
                onClick={handleClear}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
          <button
            type="submit"
            className="h-12 rounded-lg bg-foreground px-6 text-[16px] font-semibold text-background transition-opacity hover:opacity-85"
          >
            검색
          </button>
        </form>
      </div>
    </div>
  );
}

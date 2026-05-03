import { useEffect, useMemo, useState } from "react";
import {
  DEPT_COLOR,
  type Department,
  type Status,
  type Project,
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
  projects: Project[];
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
  projects,
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
  }, [dept]);

  return (
    <div className="sticky top-16 z-40 border-b border-white/10 bg-black">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-10 py-4">
        <div className="flex items-center gap-8">
          {/* Department */}
          <div className="flex items-center gap-3">
            <span className="text-[15px] font-medium text-gray-400">부서</span>
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
                    className={`group flex items-center gap-2 rounded-lg border px-4 py-2 text-[15px] font-medium transition-all ${
                      active
                        ? "text-foreground shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                        : "border-white/10 bg-[#1A1A1A] text-gray-400 hover:border-white/25 hover:bg-[#222] hover:text-foreground"
                    }`}
                  >
                    {d !== "전체" && (
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
                      />
                    )}
                    <span>{d}</span>
                    <span className={`text-[14px] font-bold ${active ? "text-foreground" : "text-gray-500"}`}>({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-6 w-px bg-white/10" />

          {/* Status */}
          <div className="flex items-center gap-3">
            <span className="text-[15px] font-medium text-gray-400">상태</span>
            <div className="flex items-center gap-2">
              {STATUSES.map((s) => {
                const active = statuses.has(s);
                const colorVar = STATUS_COLOR_VAR[s];
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
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-[15px] font-medium transition-all ${
                      active
                        ? "text-foreground shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                        : "border-white/10 bg-[#1A1A1A] text-gray-400 hover:border-white/25 hover:bg-[#222] hover:text-foreground"
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: colorVar, boxShadow: `0 0 6px ${colorVar}` }}
                    />
                    <span>{s}</span>
                    <span className={`text-[14px] font-bold ${active ? "text-foreground" : "text-gray-500"}`}>
                      ({statusCounts[s] ?? 0})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Search */}
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
              className="h-10 w-64 rounded-lg border border-white/10 bg-white/[0.03] px-3 pr-8 text-[14px] text-foreground placeholder:text-muted-foreground/40 focus:border-white/30 focus:outline-none"
            />
            {local && (
              <button
                type="button"
                onClick={handleClear}
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
            className="h-10 rounded-lg bg-foreground px-4 text-[14px] font-semibold text-background hover:opacity-90"
          >
            검색
          </button>
        </form>
      </div>
    </div>
  );
}

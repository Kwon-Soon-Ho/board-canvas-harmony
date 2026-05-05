import { X } from "lucide-react";
import { DEPT_COLOR, type Department } from "@/lib/mockProjects";
import { formatRank } from "@/lib/teamStats";

export type TeamView = "tree";

export interface TeamFiltersState {
  depts: Set<Department | "공통">;
  ranks: Set<string>;
  search: string;
  onlyOnLeaveToday: boolean;
}

const ALL_DEPTS: (Department | "공통")[] = ["공통", "영상", "편집", "UX"];
const ALL_RANKS = ["수석", "책임", "선임", "연구원"];

export const DEFAULT_TEAM_FILTERS: TeamFiltersState = {
  depts: new Set(ALL_DEPTS),
  ranks: new Set(ALL_RANKS),
  search: "",
  onlyOnLeaveToday: false,
};

interface Props {
  filters: TeamFiltersState;
  onChange: (next: TeamFiltersState) => void;
}

export function TeamFilters({ filters, onChange }: Props) {
  const toggle = <T,>(set: Set<T>, v: T): Set<T> => {
    const next = new Set(set);
    next.has(v) ? next.delete(v) : next.add(v);
    return next;
  };

  return (
    <aside className="w-64 shrink-0 border-r border-white/10 bg-[#0a0a0a] p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold text-foreground">필터</h3>
        <button
          onClick={() => onChange(DEFAULT_TEAM_FILTERS)}
          className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-foreground"
        >
          <X className="h-3 w-3" /> 초기화
        </button>
      </div>

      <input
        type="text"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        placeholder="이름·직급 검색"
        className="w-full mb-5 px-3 py-2 text-[13px] bg-white/5 border border-white/10 rounded-md text-foreground placeholder:text-gray-500 focus:outline-none focus:border-white/30"
      />

      <Section title="부서">
        {ALL_DEPTS.map((d) => (
          <Check
            key={d}
            label={d}
            color={DEPT_COLOR[d as Department] ?? "#FFFFFF"}
            checked={filters.depts.has(d)}
            onChange={() => onChange({ ...filters, depts: toggle(filters.depts, d) })}
          />
        ))}
      </Section>

      <Section title="직급">
        {ALL_RANKS.map((r) => (
          <Check
            key={r}
            label={formatRank(r)}
            checked={filters.ranks.has(r)}
            onChange={() => onChange({ ...filters, ranks: toggle(filters.ranks, r) })}
          />
        ))}
      </Section>

      <Section title="상태">
        <Check
          label="오늘 연차 중인 인원만"
          checked={filters.onlyOnLeaveToday}
          onChange={() => onChange({ ...filters, onlyOnLeaveToday: !filters.onlyOnLeaveToday })}
        />
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[12px] uppercase tracking-wider text-gray-500 mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
  color,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  color?: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-[13px] text-gray-300 hover:text-foreground">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 accent-teal-500" />
      {color && (
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
      )}
      <span className="truncate">{label}</span>
    </label>
  );
}

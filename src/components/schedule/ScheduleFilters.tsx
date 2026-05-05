import { DEPT_COLOR, DEPTS, type Department } from "@/lib/mockProjects";
import { X } from "lucide-react";

export type EventTypeKey = "deadline" | "milestone" | "leave" | "holiday";

export interface ScheduleFilters {
  types: Set<EventTypeKey>;
  depts: Set<Department>;
  members: Set<string>;
  search: string;
  onlyUrgent: boolean;
}

export const DEFAULT_FILTERS: ScheduleFilters = {
  types: new Set<EventTypeKey>(["deadline", "milestone", "leave", "holiday"]),
  depts: new Set<Department>(DEPTS),
  members: new Set<string>(),
  search: "",
  onlyUrgent: false,
};

const TYPE_LABEL: Record<EventTypeKey, string> = {
  deadline: "프로젝트 마감",
  milestone: "마일스톤",
  leave: "연차/휴가",
  holiday: "공휴일",
};

interface Props {
  filters: ScheduleFilters;
  onChange: (next: ScheduleFilters) => void;
  allMembers: { name: string; rank: string }[];
}

export function ScheduleFilters({ filters, onChange, allMembers }: Props) {
  const toggleSet = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const reset = () => onChange(DEFAULT_FILTERS);

  return (
    <aside className="w-64 shrink-0 border-r border-white/10 bg-[#0a0a0a] p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">필터</h3>
        <button
          onClick={reset}
          className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-foreground"
        >
          <X className="h-3 w-3" /> 초기화
        </button>
      </div>

      <input
        type="text"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        placeholder="프로젝트·담당자 검색"
        className="w-full mb-5 px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-md text-foreground placeholder:text-gray-500 focus:outline-none focus:border-white/30"
      />

      <Section title="이벤트 종류">
        {(Object.keys(TYPE_LABEL) as EventTypeKey[]).map((k) => (
          <Check
            key={k}
            label={TYPE_LABEL[k]}
            checked={filters.types.has(k)}
            onChange={() => onChange({ ...filters, types: toggleSet(filters.types, k) })}
          />
        ))}
      </Section>

      <Section title="부서">
        {DEPTS.map((d) => (
          <Check
            key={d}
            label={d}
            color={DEPT_COLOR[d]}
            checked={filters.depts.has(d)}
            onChange={() => onChange({ ...filters, depts: toggleSet(filters.depts, d) })}
          />
        ))}
      </Section>

      <Section title="긴급도">
        <Check
          label="마감 임박/지연만 (D-7)"
          checked={filters.onlyUrgent}
          onChange={() => onChange({ ...filters, onlyUrgent: !filters.onlyUrgent })}
        />
      </Section>

      <Section title="담당자">
        <div className="max-h-56 overflow-y-auto pr-1 space-y-1">
          {allMembers.map((m) => (
            <Check
              key={m.name}
              label={`${m.name} · ${m.rank}`}
              checked={filters.members.size === 0 || filters.members.has(m.name)}
              onChange={() => onChange({ ...filters, members: toggleSet(filters.members, m.name) })}
            />
          ))}
        </div>
        <p className="text-[10px] text-gray-500 mt-1">선택 없음 = 전체 표시</p>
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">{title}</p>
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
    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 hover:text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 accent-teal-500"
      />
      {color && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }}
        />
      )}
      <span className="truncate">{label}</span>
    </label>
  );
}

import { X } from "lucide-react";
import type { Department, Status } from "@/lib/mockProjects";

interface Props {
  dept: Department | "전체";
  statuses: Set<Status>;
  query: string;
  urgentOnly: boolean;
  issuesOnly: boolean;
  onClearDept: () => void;
  onClearStatus: (s: Status) => void;
  onClearQuery: () => void;
  onClearUrgent: () => void;
  onClearIssues: () => void;
  onResetAll: () => void;
}

export function ActiveFilterChips({
  dept,
  statuses,
  query,
  urgentOnly,
  issuesOnly,
  onClearDept,
  onClearStatus,
  onClearQuery,
  onClearUrgent,
  onClearIssues,
  onResetAll,
}: Props) {
  const hasAny =
    dept !== "전체" ||
    statuses.size > 0 ||
    query.trim().length > 0 ||
    urgentOnly ||
    issuesOnly;

  if (!hasAny) return null;

  const Chip = ({
    label,
    onRemove,
    tone = "default",
  }: {
    label: string;
    onRemove: () => void;
    tone?: "default" | "warn" | "danger";
  }) => {
    const toneClass =
      tone === "warn"
        ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
        : tone === "danger"
        ? "border-red-500/40 bg-red-500/10 text-red-300"
        : "border-white/15 bg-white/[0.06] text-white/80";
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium ${toneClass}`}
      >
        {label}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${label} 필터 제거`}
          className="rounded-full p-0.5 hover:bg-white/15"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    );
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/35">
        적용된 필터
      </span>
      {dept !== "전체" && <Chip label={`부서: ${dept}`} onRemove={onClearDept} />}
      {[...statuses].map((s) => (
        <Chip key={s} label={`상태: ${s}`} onRemove={() => onClearStatus(s)} />
      ))}
      {query.trim().length > 0 && (
        <Chip label={`검색: "${query.trim()}"`} onRemove={onClearQuery} />
      )}
      {urgentOnly && <Chip label="마감 7일 이내" onRemove={onClearUrgent} tone="warn" />}
      {issuesOnly && <Chip label="이슈 있음" onRemove={onClearIssues} tone="danger" />}
      <button
        type="button"
        onClick={onResetAll}
        className="ml-1 text-[12px] font-semibold text-white/50 underline-offset-4 hover:text-white hover:underline"
      >
        모두 초기화
      </button>
    </div>
  );
}

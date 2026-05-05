import { GripVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type MemberStats, formatRank } from "@/lib/teamStats";

interface Props {
  s: MemberStats;
  selected: boolean;
  onSelect: (n: string) => void;
  editing: boolean;
  onDelete?: (s: MemberStats) => void;
}

const ROLE_TONE: Record<string, string> = {
  팀장: "text-amber-300 font-medium",
  셀장: "text-teal-300 font-medium",
  팀원: "text-gray-400",
};

export function SortableMemberRow({ s, selected, onSelect, editing, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: s.id ?? s.name, disabled: !editing });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const activeTone =
    s.activeProjects.length === 0
      ? "text-gray-600"
      : s.activeProjects.length >= 4
        ? "text-amber-300 font-semibold"
        : "text-foreground";

  return (
    <tr
      ref={setNodeRef}
      style={style}
      onClick={() => !editing && onSelect(s.name)}
      className={`border-t border-white/5 hover:bg-white/[0.03] ${
        editing ? "" : "cursor-pointer"
      } ${selected ? "bg-teal-950/20" : ""}`}
    >
      {editing && (
        <td className="px-2 py-2 w-8">
          <button
            {...attributes}
            {...listeners}
            className="text-gray-500 hover:text-foreground cursor-grab active:cursor-grabbing"
            aria-label="드래그하여 순서 변경"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </td>
      )}
      <td className="px-3 py-2 text-gray-300">{s.department}</td>
      <td className="px-3 py-2 text-gray-400">{formatRank(s.rank)}</td>
      <td className={`px-3 py-2 ${ROLE_TONE[s.role] ?? "text-gray-400"}`}>{s.role}</td>
      <td className="px-3 py-2 text-foreground">
        <span className="inline-flex items-center gap-1">
          {s.name}
          {s.onLeaveToday && <span className="ml-1 text-[10px] text-blue-300">●</span>}
        </span>
      </td>
      <td className="px-3 py-2 text-gray-400 tabular-nums">{s.phone || "—"}</td>
      <td className={`px-3 py-2 text-right tabular-nums ${activeTone}`}>
        {s.activeProjects.length}
      </td>
      <td className="px-3 py-2 text-right text-gray-500 tabular-nums">
        {s.pendingProjects.length}
      </td>
      <td className="px-3 py-2 text-right text-gray-500 tabular-nums">
        {s.doneProjects.length}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        {s.openIssues.length > 0 ? (
          <span className="text-amber-300">{s.openIssues.length}</span>
        ) : (
          <span className="text-gray-600">0</span>
        )}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        {s.leavesThisMonth.length > 0 ? (
          <span className="text-blue-300">{s.leavesThisMonth.length}</span>
        ) : (
          <span className="text-gray-600">0</span>
        )}
      </td>
      {editing && (
        <td className="px-2 py-2 w-10 text-right">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(s);
            }}
            className="text-gray-500 hover:text-red-400"
            aria-label="삭제"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </td>
      )}
    </tr>
  );
}

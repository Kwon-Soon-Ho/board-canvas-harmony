import { DEPT_COLOR, type Department } from "@/lib/mockProjects";
import { AlertTriangle } from "lucide-react";

export type EventKind = "deadline" | "leave" | "holiday";

export interface CalendarEvent {
  id: string;
  kind: EventKind;
  date: string;
  title: string;
  department?: Department;
  // deadline-only
  projectId?: string;
  pm?: string;
  status?: string;
  dDay?: number;
  // leave-only
  member?: string;
  leaveType?: string;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
}

export function EventChip({
  event,
  compact = false,
  onClick,
}: {
  event: CalendarEvent;
  compact?: boolean;
  onClick?: () => void;
}) {
  if (event.kind === "holiday") {
    return (
      <div
        className="truncate rounded px-1.5 py-0.5 text-[11px] font-semibold text-red-300 bg-red-500/10 border border-red-500/30"
        title={event.title}
      >
        {event.title}
      </div>
    );
  }

  if (event.kind === "leave") {
    const isShift = event.leaveType === "시차";
    const label = isShift
      ? `⏱ ${event.member} ${event.startTime ?? ""}-${event.endTime ?? ""}`
      : `🏖 ${event.member}`;
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] text-gray-300 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-colors"
        title={`${event.member} · ${event.leaveType}${
          isShift ? ` ${event.startTime}-${event.endTime}` : ""
        }`}
      >
        {label}
      </button>
    );
  }

  // deadline
  const color = event.department ? DEPT_COLOR[event.department] : "#888";
  const isUrgent = event.dDay !== undefined && event.dDay >= 0 && event.dDay <= 7;
  const isOverdue =
    event.dDay !== undefined && event.dDay < 0 && event.status !== "완료";
  const isDone = event.status === "완료";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition-colors ${
        isDone
          ? "bg-white/[0.03] text-gray-500 line-through"
          : isOverdue
            ? "bg-red-500/15 text-red-200 border border-red-500/40 hover:bg-red-500/25"
            : isUrgent
              ? "bg-orange-500/15 text-orange-200 border border-orange-500/40 hover:bg-orange-500/25"
              : "bg-white/[0.06] text-gray-200 hover:bg-white/[0.12] border border-white/10"
      }`}
      title={`${event.title}${event.pm ? ` · ${event.pm}` : ""}${
        event.dDay !== undefined ? ` · D${event.dDay >= 0 ? "-" : "+"}${Math.abs(event.dDay)}` : ""
      }`}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }}
      />
      {(isOverdue || isUrgent) && !compact && (
        <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
      )}
      <span className="truncate">{event.title}</span>
    </button>
  );
}

import type { Status } from "@/lib/mockProjects";

const MAP: Record<Status, string> = {
  진행: "bg-[color:var(--status-active)]/15 text-[color:var(--status-active)] ring-[color:var(--status-active)]/30",
  상시: "bg-[color:var(--status-ongoing)]/15 text-[color:var(--status-ongoing)] ring-[color:var(--status-ongoing)]/30",
  대기: "bg-[color:var(--status-pending)]/15 text-[color:var(--status-pending)] ring-[color:var(--status-pending)]/30",
  완료: "bg-white/5 text-muted-foreground ring-white/10",
};

export function StatusTag({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset ${MAP[status]}`}
    >
      <span className="mr-1.5 h-1 w-1 rounded-full bg-current" />
      {status}
    </span>
  );
}

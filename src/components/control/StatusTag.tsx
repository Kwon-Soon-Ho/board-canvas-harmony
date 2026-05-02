import type { Status } from "@/lib/mockProjects";

const MAP: Record<Status, string> = {
  진행: "text-[color:var(--status-active)] border-[color:var(--status-active)]/30",
  상시: "text-[color:var(--status-ongoing)] border-[color:var(--status-ongoing)]/30",
  대기: "text-[color:var(--status-pending)] border-[color:var(--status-pending)]/30",
  완료: "text-white border-white/40 shadow-[0_0_10px_rgba(255,255,255,0.2)]",
};

const DOT_MAP: Record<Status, string> = {
  진행: "bg-[color:var(--status-active)]",
  상시: "bg-[color:var(--status-ongoing)]",
  대기: "bg-[color:var(--status-pending)]",
  완료: "bg-white shadow-[0_0_8px_white]",
};

export function StatusTag({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border bg-black/60 px-2.5 py-1 text-[13px] font-medium backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.5)] ${MAP[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_MAP[status]}`} />
      {status}
    </span>
  );
}

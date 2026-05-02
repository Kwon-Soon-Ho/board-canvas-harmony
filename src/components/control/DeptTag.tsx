import { DEPT_COLOR, type Department } from "@/lib/mockProjects";

export function DeptTag({ dept }: { dept: Department }) {
  const color = DEPT_COLOR[dept];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border bg-white/[0.04] px-2.5 py-1 text-[14px] font-medium text-foreground backdrop-blur-md"
      style={{ borderColor: `${color}55` }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
      />
      {dept}
    </span>
  );
}

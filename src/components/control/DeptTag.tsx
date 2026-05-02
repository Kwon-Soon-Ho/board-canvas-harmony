import { DEPT_COLOR, type Department } from "@/lib/mockProjects";

export function DeptTag({ dept }: { dept: Department }) {
  const color = DEPT_COLOR[dept];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border bg-black/60 px-2.5 py-1 text-[14px] font-medium text-foreground shadow-[0_2px_10px_rgba(0,0,0,0.5)] backdrop-blur-md"
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

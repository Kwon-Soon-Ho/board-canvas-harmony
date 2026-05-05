import { ALL_MEMBERS, DEPT_COLOR, type Department, type Project } from "./mockProjects";
import { MEMBER_DEPT, type Leave } from "./mockSchedule";

export interface MemberStats {
  name: string;
  rank: string;
  department: Department | "공통";
  activeProjects: Project[];
  pendingProjects: Project[];
  doneProjects: Project[];
  pmProjects: Project[];
  openIssues: { project: Project; issueId: string; title: string }[];
  leavesThisMonth: Leave[];
  onLeaveToday: boolean;
  workload: number; // 0..150
  workloadColor: string; // tailwind text color
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function computeMemberStats(
  member: { name: string; rank: string },
  projects: Project[],
  leaves: Leave[],
  deptAvgs: Record<string, number>,
): MemberStats {
  const dept = (MEMBER_DEPT[member.name] ?? "공통") as Department | "공통";
  const involved = projects.filter(
    (p) => p.pm === member.name || p.members.includes(member.name),
  );
  const active = involved.filter((p) => p.status === "진행" || p.status === "상시");
  const pending = involved.filter((p) => p.status === "대기");
  const done = involved.filter((p) => p.status === "완료");
  const pmProjects = involved.filter((p) => p.pm === member.name);

  const openIssues: MemberStats["openIssues"] = [];
  involved.forEach((p) => {
    p.issues.forEach((i) => {
      if (!i.resolved && i.assignee === member.name) {
        openIssues.push({ project: p, issueId: i.id, title: i.title });
      }
    });
  });

  const today = dayKey(new Date());
  const month = today.slice(0, 7);
  const memberLeaves = leaves.filter((l) => l.member_name === member.name);
  const leavesThisMonth = memberLeaves.filter((l) => l.leave_date.startsWith(month));
  const onLeaveToday = memberLeaves.some((l) => l.leave_date === today);

  const avg = deptAvgs[dept] || 1;
  const isPM = pmProjects.length > 0;
  const raw = (active.length / avg) * 100 * (isPM ? 1.1 : 1);
  const workload = Math.min(150, Math.round(raw));
  const workloadColor =
    workload >= 91 ? "text-red-400" : workload >= 61 ? "text-amber-300" : "text-emerald-300";

  return {
    name: member.name,
    rank: member.rank,
    department: dept,
    activeProjects: active,
    pendingProjects: pending,
    doneProjects: done,
    pmProjects,
    openIssues,
    leavesThisMonth,
    onLeaveToday,
    workload,
    workloadColor,
  };
}

export function buildAllStats(projects: Project[], leaves: Leave[]): MemberStats[] {
  // Compute department averages for active projects per member.
  const byDept: Record<string, number[]> = {};
  ALL_MEMBERS.forEach((m) => {
    const d = (MEMBER_DEPT[m.name] ?? "공통") as string;
    const cnt = projects.filter(
      (p) =>
        (p.pm === m.name || p.members.includes(m.name)) &&
        (p.status === "진행" || p.status === "상시"),
    ).length;
    (byDept[d] ??= []).push(cnt);
  });
  const deptAvgs: Record<string, number> = {};
  Object.entries(byDept).forEach(([d, arr]) => {
    const sum = arr.reduce((a, b) => a + b, 0);
    deptAvgs[d] = Math.max(1, sum / arr.length);
  });

  return ALL_MEMBERS.map((m) => computeMemberStats(m, projects, leaves, deptAvgs));
}

export function deptColorFor(dept: Department | "공통"): string {
  return DEPT_COLOR[dept as Department] ?? "#FFFFFF";
}

import { ALL_MEMBERS, DEPT_COLOR, type Department, type Project } from "./mockProjects";
import { MEMBER_DEPT, type Leave } from "./mockSchedule";
import type { TeamMemberRow } from "./teamSync";

export interface MemberStats {
  id?: string;
  name: string;
  rank: string;
  department: Department | "공통";
  phone: string;
  email: string;
  sortOrder: number;
  activeProjects: Project[];
  pendingProjects: Project[];
  doneProjects: Project[];
  pmProjects: Project[];
  openIssues: { project: Project; issueId: string; title: string }[];
  leavesThisMonth: Leave[];
  onLeaveToday: boolean;
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const RANK_ORDER: Record<string, number> = {
  수석: 0,
  책임: 1,
  선임: 2,
  연구원: 3,
};

/** 부서 표시 순서: 공통 → 영상 → 편집 → UX */
export const DEPT_ORDER: (Department | "공통")[] = ["공통", "영상", "편집", "UX"];

/** 직급 표시 라벨: 수석/책임/선임 → "OO 연구원", 연구원은 그대로 */
export function formatRank(rank: string): string {
  if (!rank) return "";
  if (rank === "연구원") return "연구원";
  return `${rank} 연구원`;
}

/** sort_order 기반 정렬, 같은 값이면 직급/이름 */
export function sortMembers(list: MemberStats[]): MemberStats[] {
  return list.slice().sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    const ra = RANK_ORDER[a.rank] ?? 99;
    const rb = RANK_ORDER[b.rank] ?? 99;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name, "ko");
  });
}

/** 이전 호환: 직급+이름순 */
export function sortByRankThenName(list: MemberStats[]): MemberStats[] {
  return sortMembers(list);
}

export function groupByDept(
  list: MemberStats[],
): Record<string, MemberStats[]> {
  const out: Record<string, MemberStats[]> = {};
  list.forEach((s) => {
    (out[s.department] ??= []).push(s);
  });
  Object.keys(out).forEach((d) => (out[d] = sortMembers(out[d])));
  return out;
}

function statsFor(
  member: {
    id?: string;
    name: string;
    rank: string;
    department: Department | "공통";
    phone?: string | null;
    email?: string | null;
    sortOrder?: number;
  },
  projects: Project[],
  leaves: Leave[],
): MemberStats {
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

  return {
    id: member.id,
    name: member.name,
    rank: member.rank,
    department: member.department,
    phone: member.phone ?? "",
    email: member.email ?? "",
    sortOrder: member.sortOrder ?? 999,
    activeProjects: active,
    pendingProjects: pending,
    doneProjects: done,
    pmProjects,
    openIssues,
    leavesThisMonth,
    onLeaveToday,
  };
}

export function buildAllStats(
  projects: Project[],
  leaves: Leave[],
  members?: TeamMemberRow[],
): MemberStats[] {
  if (members && members.length > 0) {
    return members.map((m) =>
      statsFor(
        {
          id: m.id,
          name: m.name,
          rank: m.rank,
          department: m.department as Department | "공통",
          phone: m.phone,
          email: m.email,
          sortOrder: m.sort_order ?? 999,
        },
        projects,
        leaves,
      ),
    );
  }
  return ALL_MEMBERS.map((m) =>
    statsFor(
      {
        name: m.name,
        rank: m.rank,
        department: (MEMBER_DEPT[m.name] ?? "공통") as Department | "공통",
      },
      projects,
      leaves,
    ),
  );
}

export function deptColorFor(dept: Department | "공통"): string {
  return DEPT_COLOR[dept as Department] ?? "#FFFFFF";
}

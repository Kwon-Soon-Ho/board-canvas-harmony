import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Table as TableIcon, Network, Crown } from "lucide-react";
import { Header } from "@/components/control/Header";
import {
  TeamFilters,
  DEFAULT_TEAM_FILTERS,
  type TeamFiltersState,
} from "@/components/team/TeamFilters";
import { MemberDrawer } from "@/components/team/MemberDrawer";
import { AddLeaveModal } from "@/components/schedule/AddLeaveModal";
import { MOCK_PROJECTS, type Project, DEPT_COLOR } from "@/lib/mockProjects";
import { buildSeedLeaves, type Leave } from "@/lib/mockSchedule";
import {
  buildAllStats,
  groupByDept,
  sortByRankThenName,
  type MemberStats,
} from "@/lib/teamStats";
import { supabase } from "@/integrations/supabase/client";
import { getSyncChannel, openProjectWindow } from "@/lib/sync";
import { loadOrSeedTeamMembers, type TeamMemberRow } from "@/lib/teamSync";
import { toast } from "sonner";

export const Route = createFileRoute("/team")({
  component: TeamPage,
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    member: typeof s.member === "string" ? s.member : undefined,
  }),
});

const STORAGE_KEY = "design-projects-store";
type ViewMode = "tree" | "table";

function TeamPage() {
  const search = useSearch({ from: "/team" });
  const [filters, setFilters] = useState<TeamFiltersState>(DEFAULT_TEAM_FILTERS);
  const [view, setView] = useState<ViewMode>("tree");
  const [selected, setSelected] = useState<string | null>(search.member ?? null);
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);
  const [addLeaveOpen, setAddLeaveOpen] = useState(false);

  // Load projects from shared store
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Project[];
        if (Array.isArray(parsed) && parsed.length > 0) setProjects(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  // Sync from other windows
  useEffect(() => {
    const ch = getSyncChannel();
    if (!ch) return;
    ch.onmessage = (e) => {
      const msg = e.data;
      if (msg?.type === "PROJECT_UPDATE" && msg.project) {
        setProjects((prev) => {
          const exists = prev.some((p) => p.id === msg.project.id);
          return exists
            ? prev.map((p) => (p.id === msg.project.id ? msg.project : p))
            : [...prev, msg.project];
        });
      }
      if (msg?.type === "MEMBER_RENAME" || msg?.type === "MEMBER_UPDATE") {
        setRefreshTick((t) => t + 1);
      }
    };
    return () => ch.close();
  }, []);

  // Load leaves + team members
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: leaveData }, mem] = await Promise.all([
        supabase.from("leaves").select("*").order("leave_date", { ascending: true }),
        loadOrSeedTeamMembers(),
      ]);
      if (cancelled) return;

      if (!leaveData || leaveData.length === 0) {
        const seeds = buildSeedLeaves();
        await supabase.from("leaves").insert(seeds);
        const { data: data2 } = await supabase
          .from("leaves")
          .select("*")
          .order("leave_date", { ascending: true });
        if (!cancelled && data2) setLeaves(data2 as Leave[]);
      } else {
        setLeaves(leaveData as Leave[]);
      }
      setMembers(mem);
    })();
    return () => { cancelled = true; };
  }, [refreshTick]);

  const allStats = useMemo(
    () => buildAllStats(projects, leaves, members),
    [projects, leaves, members],
  );

  const filteredStats = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return allStats.filter((s) => {
      if (!filters.depts.has(s.department)) return false;
      if (!filters.ranks.has(s.rank)) return false;
      if (filters.onlyOnLeaveToday && !s.onLeaveToday) return false;
      if (q && !(s.name.toLowerCase().includes(q) || s.rank.toLowerCase().includes(q)))
        return false;
      return true;
    });
  }, [allStats, filters]);

  const selectedStats = selected
    ? allStats.find((s) => s.name === selected) ?? null
    : null;

  // KPI
  const kpi = useMemo(() => {
    const total = allStats.length;
    const onLeave = allStats.filter((s) => s.onLeaveToday).length;
    const activeSum = allStats.reduce((a, s) => a + s.activeProjects.length, 0);
    return { total, onLeave, activeSum };
  }, [allStats]);

  const todayLeavers = allStats.filter((s) => s.onLeaveToday);

  const handleDeleteLeave = async (id: string) => {
    const { error } = await supabase.from("leaves").delete().eq("id", id);
    if (error) {
      toast.error("삭제 실패: " + error.message);
      return;
    }
    toast.success("연차 삭제됨");
    setRefreshTick((t) => t + 1);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#080808]">
        <div className="flex items-center gap-4">
          <h1 className="text-[19px] font-semibold">팀 관리</h1>
          <div className="hidden md:flex items-center gap-4 text-[13px] ml-2">
            <Kpi label="총원" value={kpi.total} />
            <Kpi label="진행중 프로젝트" value={`${kpi.activeSum}건`} tone="text-emerald-300" />
            <Kpi label="오늘 연차" value={kpi.onLeave} tone="text-blue-300" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {todayLeavers.length > 0 && (
            <div className="hidden lg:flex items-center gap-1 mr-2">
              <span className="text-[12px] text-gray-500 mr-1">오늘 휴가:</span>
              {todayLeavers.slice(0, 5).map((s) => (
                <button
                  key={s.name}
                  onClick={() => setSelected(s.name)}
                  className="h-6 w-6 rounded-full text-[10px] font-semibold text-black"
                  style={{ backgroundColor: DEPT_COLOR[s.department as "영상"] ?? "#FFFFFF" }}
                  title={s.name}
                >
                  {s.name.slice(-2)}
                </button>
              ))}
              {todayLeavers.length > 5 && (
                <span className="text-[12px] text-gray-400">+{todayLeavers.length - 5}</span>
              )}
            </div>
          )}
          <ViewBtn icon={<Network className="h-4 w-4" />} active={view === "tree"} onClick={() => setView("tree")} label="부서" />
          <ViewBtn icon={<TableIcon className="h-4 w-4" />} active={view === "table"} onClick={() => setView("table")} label="표" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <TeamFilters filters={filters} onChange={setFilters} />

        <main className="flex-1 overflow-auto bg-[#050505] p-5">
          {filteredStats.length === 0 ? (
            <p className="text-center text-gray-500 text-[14px] mt-20">
              조건에 맞는 팀원이 없습니다.
            </p>
          ) : view === "table" ? (
            <TeamTableGrouped stats={filteredStats} selected={selected} onSelect={setSelected} />
          ) : (
            <TeamTreeView stats={filteredStats} selected={selected} onSelect={setSelected} />
          )}
        </main>

        {selectedStats && (
          <MemberDrawer
            stats={selectedStats}
            onClose={() => setSelected(null)}
            onAddLeave={() => setAddLeaveOpen(true)}
            onLeaveDeleted={() => setRefreshTick((t) => t + 1)}
            onDeleteLeave={handleDeleteLeave}
            onMemberChanged={() => setRefreshTick((t) => t + 1)}
          />
        )}
      </div>

      {addLeaveOpen && selectedStats && (
        <AddLeaveModal
          defaultDate={new Date().toISOString().slice(0, 10)}
          defaultMember={selectedStats.name}
          onClose={() => setAddLeaveOpen(false)}
          onCreated={() => {
            setAddLeaveOpen(false);
            setRefreshTick((t) => t + 1);
          }}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold ${tone ?? "text-foreground"}`}>{value}</span>
    </div>
  );
}

function ViewBtn({
  icon, active, onClick, label,
}: { icon: React.ReactNode; active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] border transition-colors ${
        active
          ? "bg-teal-700/30 border-teal-500/50 text-teal-200"
          : "bg-white/5 border-white/10 text-gray-400 hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ─── Shared table renderer ─────────────────────────────────────── */
function MemberRow({
  s, selected, onSelect,
}: { s: MemberStats; selected: boolean; onSelect: (n: string) => void }) {
  const activeTone =
    s.activeProjects.length === 0
      ? "text-gray-600"
      : s.activeProjects.length >= 4
        ? "text-amber-300 font-semibold"
        : "text-foreground";
  return (
    <tr
      onClick={() => onSelect(s.name)}
      className={`cursor-pointer border-t border-white/5 hover:bg-white/[0.03] ${
        selected ? "bg-teal-950/20" : ""
      }`}
    >
      <td className="px-3 py-2 text-gray-300">{s.department}</td>
      <td className="px-3 py-2 text-gray-400">{s.rank}</td>
      <td className="px-3 py-2 text-foreground">
        <span className="inline-flex items-center gap-1">
          {s.name}
          {s.pmProjects.length > 0 && (
            <Crown className="h-3 w-3 text-amber-300" aria-label="PM" />
          )}
          {s.onLeaveToday && (
            <span className="ml-1 text-[10px] text-blue-300">●</span>
          )}
        </span>
      </td>
      <td className="px-3 py-2 text-gray-400 tabular-nums">{s.phone || "—"}</td>
      <td className={`px-3 py-2 text-right tabular-nums ${activeTone}`}>{s.activeProjects.length}</td>
      <td className="px-3 py-2 text-right text-gray-500 tabular-nums">{s.pendingProjects.length}</td>
      <td className="px-3 py-2 text-right text-gray-500 tabular-nums">{s.doneProjects.length}</td>
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
    </tr>
  );
}

const TABLE_HEAD = (
  <thead className="bg-[#0a0a0a] text-[12px] uppercase tracking-wider text-gray-500">
    <tr>
      <th className="text-left px-3 py-2">부서</th>
      <th className="text-left px-3 py-2">직급</th>
      <th className="text-left px-3 py-2">이름</th>
      <th className="text-left px-3 py-2">연락처</th>
      <th className="text-right px-3 py-2">진행</th>
      <th className="text-right px-3 py-2">대기</th>
      <th className="text-right px-3 py-2">완료</th>
      <th className="text-right px-3 py-2">이슈</th>
      <th className="text-right px-3 py-2">이번달 연차</th>
    </tr>
  </thead>
);

function TeamTableGrouped({
  stats, selected, onSelect,
}: { stats: MemberStats[]; selected: string | null; onSelect: (n: string) => void }) {
  const groups = groupByDept(stats);
  const deptOrder = ["영상", "편집", "UX", "공통"];
  const orderedDepts = deptOrder.filter((d) => groups[d]?.length);
  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      <table className="w-full text-[13px]">
        {TABLE_HEAD}
        <tbody>
          {orderedDepts.map((dept) => {
            const members = groups[dept];
            const activeSum = members.reduce((a, m) => a + m.activeProjects.length, 0);
            return (
              <>
                <tr key={`hd-${dept}`} className="bg-[#0c0c0c]">
                  <td colSpan={9} className="px-3 py-2">
                    <span className="inline-flex items-center gap-2 text-[12px] uppercase tracking-wider">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: DEPT_COLOR[dept as "영상"] ?? "#FFFFFF",
                          boxShadow: `0 0 6px ${DEPT_COLOR[dept as "영상"] ?? "#FFFFFF"}`,
                        }}
                      />
                      <span className="text-foreground font-semibold">{dept}</span>
                      <span className="text-gray-500 normal-case tracking-normal">
                        · {members.length}명 · 진행중 {activeSum}건
                      </span>
                    </span>
                  </td>
                </tr>
                {members.map((s) => (
                  <MemberRow key={s.name} s={s} selected={selected === s.name} onSelect={onSelect} />
                ))}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TeamTreeView({
  stats, selected, onSelect,
}: { stats: MemberStats[]; selected: string | null; onSelect: (n: string) => void }) {
  const groups = groupByDept(stats);
  const deptOrder = ["영상", "편집", "UX", "공통"];
  const orderedDepts = deptOrder.filter((d) => groups[d]?.length);
  return (
    <div className="space-y-5">
      {orderedDepts.map((dept) => {
        const members = sortByRankThenName(groups[dept]);
        const activeSum = members.reduce((a, m) => a + m.activeProjects.length, 0);
        const color = DEPT_COLOR[dept as "영상"] ?? "#FFFFFF";
        return (
          <section key={dept}>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
              />
              <h3 className="text-[15px] font-semibold text-foreground">{dept}</h3>
              <span className="text-[12px] text-gray-500">
                · {members.length}명 · 진행중 프로젝트 {activeSum}건
              </span>
            </div>
            <div className="rounded-lg border border-white/10 overflow-hidden">
              <table className="w-full text-[13px]">
                {TABLE_HEAD}
                <tbody>
                  {members.map((s) => (
                    <MemberRow key={s.name} s={s} selected={selected === s.name} onSelect={onSelect} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

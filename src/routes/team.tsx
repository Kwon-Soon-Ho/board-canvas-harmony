import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Check } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Header } from "@/components/control/Header";
import {
  TeamFilters,
  DEFAULT_TEAM_FILTERS,
  type TeamFiltersState,
} from "@/components/team/TeamFilters";
import { MemberDrawer } from "@/components/team/MemberDrawer";
import { AddLeaveModal } from "@/components/schedule/AddLeaveModal";
import { AddMemberModal } from "@/components/team/AddMemberModal";
import { SortableMemberRow } from "@/components/team/SortableMemberRow";
import { MOCK_PROJECTS, type Project, DEPT_COLOR } from "@/lib/mockProjects";
import { buildSeedLeaves, type Leave } from "@/lib/mockSchedule";
import {
  buildAllStats,
  groupByDept,
  sortMembers,
  DEPT_ORDER,
  type MemberStats,
} from "@/lib/teamStats";
import { supabase } from "@/integrations/supabase/client";
import { getSyncChannel } from "@/lib/sync";
import {
  loadOrSeedTeamMembers,
  reorderMembers,
  deleteMember,
  type TeamMemberRow,
} from "@/lib/teamSync";
import { toast } from "sonner";

export const Route = createFileRoute("/team")({
  component: TeamPage,
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    member: typeof s.member === "string" ? s.member : undefined,
  }),
});

const STORAGE_KEY = "design-projects-store";

function TeamPage() {
  const search = useSearch({ from: "/team" });
  const [filters, setFilters] = useState<TeamFiltersState>(DEFAULT_TEAM_FILTERS);
  const [selected, setSelected] = useState<string | null>(search.member ?? null);
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);
  const [addLeaveOpen, setAddLeaveOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Project[];
        if (Array.isArray(parsed) && parsed.length > 0) setProjects(parsed);
      }
    } catch { /* ignore */ }
  }, []);

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

  const kpi = useMemo(() => {
    const total = allStats.length;
    const onLeave = allStats.filter((s) => s.onLeaveToday).length;
    return { total, onLeave };
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

  const handleDeleteMember = async (s: MemberStats) => {
    if (!s.id) return;
    if (!confirm(`'${s.name}' 팀원을 삭제하시겠습니까? 등록된 연차도 함께 삭제됩니다.`)) return;
    const res = await deleteMember(s.id, s.name);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("팀원이 삭제되었습니다.");
    if (selected === s.name) setSelected(null);
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
            <Kpi label="오늘 연차" value={kpi.onLeave} tone="text-blue-300" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {todayLeavers.length > 0 && !editing && (
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
          <button
            onClick={() => setAddMemberOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] bg-teal-600 hover:bg-teal-500 text-white"
          >
            <Plus className="h-4 w-4" /> 팀원 추가
          </button>
          <button
            onClick={() => setEditing((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] border transition-colors ${
              editing
                ? "bg-amber-500/20 border-amber-400/50 text-amber-200"
                : "bg-white/5 border-white/10 text-gray-300 hover:text-foreground"
            }`}
          >
            {editing ? <><Check className="h-4 w-4" /> 완료</> : <><Pencil className="h-4 w-4" /> 편집</>}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <TeamFilters filters={filters} onChange={setFilters} />

        <main className="flex-1 overflow-auto bg-[#050505] p-5">
          {filteredStats.length === 0 ? (
            <p className="text-center text-gray-500 text-[14px] mt-20">
              조건에 맞는 팀원이 없습니다.
            </p>
          ) : (
            <TeamTreeView
              stats={filteredStats}
              selected={selected}
              onSelect={setSelected}
              editing={editing}
              onDeleteMember={handleDeleteMember}
              onReordered={() => setRefreshTick((t) => t + 1)}
            />
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

      {addMemberOpen && (
        <AddMemberModal
          onClose={() => setAddMemberOpen(false)}
          onCreated={() => {
            setAddMemberOpen(false);
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

function tableHead(editing: boolean) {
  return (
    <thead className="bg-[#0a0a0a] text-[12px] uppercase tracking-wider text-gray-500">
      <tr>
        {editing && <th className="w-8" />}
        <th className="text-left px-3 py-2">부서</th>
        <th className="text-left px-3 py-2">직급</th>
        <th className="text-left px-3 py-2">역할</th>
        <th className="text-left px-3 py-2">이름</th>
        <th className="text-left px-3 py-2">연락처</th>
        <th className="text-right px-3 py-2">진행</th>
        <th className="text-right px-3 py-2">대기</th>
        <th className="text-right px-3 py-2">완료</th>
        <th className="text-right px-3 py-2">이슈</th>
        <th className="text-right px-3 py-2">이번달 연차</th>
        {editing && <th className="w-10" />}
      </tr>
    </thead>
  );
}

function TeamTreeView({
  stats, selected, onSelect, editing, onDeleteMember, onReordered,
}: {
  stats: MemberStats[];
  selected: string | null;
  onSelect: (n: string) => void;
  editing: boolean;
  onDeleteMember: (s: MemberStats) => void;
  onReordered: () => void;
}) {
  const groups = groupByDept(stats);
  const orderedDepts = DEPT_ORDER.filter((d) => groups[d]?.length);
  return (
    <div className="space-y-5">
      {orderedDepts.map((dept) => {
        const list = sortMembers(groups[dept]);
        const color = DEPT_COLOR[dept as "영상"] ?? "#FFFFFF";
        return (
          <DeptSection
            key={dept}
            dept={dept}
            color={color}
            members={list}
            selected={selected}
            onSelect={onSelect}
            editing={editing}
            onDeleteMember={onDeleteMember}
            onReordered={onReordered}
          />
        );
      })}
    </div>
  );
}

function DeptSection({
  dept, color, members, selected, onSelect, editing, onDeleteMember, onReordered,
}: {
  dept: string;
  color: string;
  members: MemberStats[];
  selected: string | null;
  onSelect: (n: string) => void;
  editing: boolean;
  onDeleteMember: (s: MemberStats) => void;
  onReordered: () => void;
}) {
  const [items, setItems] = useState<MemberStats[]>(members);

  // Re-sync when parent data changes
  useEffect(() => {
    setItems(members);
  }, [members]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((m) => (m.id ?? m.name) === active.id);
    const newIdx = items.findIndex((m) => (m.id ?? m.name) === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(items, oldIdx, newIdx);
    setItems(next);
    const ids = next.map((m) => m.id).filter((x): x is string => !!x);
    const res = await reorderMembers(ids);
    if (res.error) {
      toast.error("순서 저장 실패: " + res.error);
    }
    onReordered();
  };

  const ids = items.map((m) => m.id ?? m.name);

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
        />
        <h3 className="text-[15px] font-semibold text-foreground">{dept}</h3>
        <span className="text-[12px] text-gray-500">· {items.length}명</span>
      </div>
      <div className="rounded-lg border border-white/10 overflow-hidden">
        <table className="w-full text-[13px]">
          {tableHead(editing)}
          <tbody>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                {items.map((s) => (
                  <SortableMemberRow
                    key={s.id ?? s.name}
                    s={s}
                    selected={selected === s.name}
                    onSelect={onSelect}
                    editing={editing}
                    onDelete={onDeleteMember}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </tbody>
        </table>
      </div>
    </section>
  );
}

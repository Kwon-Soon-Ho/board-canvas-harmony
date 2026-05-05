import { useEffect, useState } from "react";
import { X, ExternalLink, Plus, Pencil, Save, XCircle } from "lucide-react";
import { type MemberStats, deptColorFor, formatRank } from "@/lib/teamStats";
import { dDay } from "@/lib/mockSchedule";
import { openProjectWindow } from "@/lib/sync";
import { useNavigate } from "@tanstack/react-router";
import { renameMember, updateMemberFields, formatPhone, ROLES } from "@/lib/teamSync";
import type { Department } from "@/lib/mockProjects";
import { toast } from "sonner";

interface Props {
  stats: MemberStats;
  onClose: () => void;
  onAddLeave: () => void;
  onLeaveDeleted: () => void;
  onDeleteLeave: (id: string) => void;
  onMemberChanged: () => void;
}

const DEPTS: (Department | "공통")[] = ["영상", "편집", "UX", "공통"];
const RANKS = ["수석", "책임", "선임", "연구원"];

const ROLE_TONE: Record<string, string> = {
  팀장: "bg-amber-500/15 text-amber-200 border-amber-400/30",
  셀장: "bg-teal-500/15 text-teal-200 border-teal-400/30",
  팀원: "bg-white/5 text-gray-300 border-white/10",
};

export function MemberDrawer({
  stats,
  onClose,
  onAddLeave,
  onDeleteLeave,
  onMemberChanged,
}: Props) {
  const color = deptColorFor(stats.department);
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: stats.name,
    rank: stats.rank,
    role: stats.role,
    department: stats.department,
    phone: stats.phone,
    email: stats.email,
  });
  const [saving, setSaving] = useState(false);

  // Reset form whenever a different member is selected.
  useEffect(() => {
    setForm({
      name: stats.name,
      rank: stats.rank,
      role: stats.role,
      department: stats.department,
      phone: stats.phone,
      email: stats.email,
    });
    setEditing(false);
  }, [stats.id, stats.name]);

  const save = async () => {
    if (!stats.id) {
      toast.error("팀원 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setSaving(true);
    try {
      // Field updates first (rank/role/dept/phone/email)
      const fieldRes = await updateMemberFields(stats.id, {
        rank: form.rank,
        role: form.role,
        department: form.department,
        phone: form.phone,
        email: form.email,
      });
      if (fieldRes.error) {
        toast.error("저장 실패: " + fieldRes.error);
        setSaving(false);
        return;
      }
      // Rename last (touches projects + leaves)
      if (form.name.trim() !== stats.name) {
        const renameRes = await renameMember(stats.id, stats.name, form.name);
        if (renameRes.error) {
          toast.error("이름 변경 실패: " + renameRes.error);
          setSaving(false);
          return;
        }
      }
      toast.success("저장되었습니다.");
      setEditing(false);
      onMemberChanged();
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="w-[380px] shrink-0 border-l border-white/10 bg-[#0a0a0a] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="h-10 w-10 rounded-full flex items-center justify-center text-[14px] font-semibold text-black"
            style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}55` }}
          >
            {stats.name.slice(-2)}
          </span>
          <div className="min-w-0">
            <p className="text-[16px] font-semibold text-foreground flex items-center gap-1.5">
              {stats.name}
              {stats.pmProjects.length > 0 && (
                <Crown className="h-4 w-4 text-amber-300" aria-label="PM" />
              )}
            </p>
            <p className="text-[12px] text-gray-400">
              {stats.department} · {formatRank(stats.rank)}
              {stats.onLeaveToday && (
                <span className="ml-2 text-blue-300">· 오늘 휴가</span>
              )}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-foreground" aria-label="닫기">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {/* Profile / edit */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] uppercase tracking-wider text-gray-500">팀원 정보</p>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 text-[12px] text-teal-300 hover:text-teal-200"
              >
                <Pencil className="h-3 w-3" /> 수정
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setForm({
                      name: stats.name,
                      rank: stats.rank,
                      department: stats.department,
                      phone: stats.phone,
                      email: stats.email,
                    });
                  }}
                  className="inline-flex items-center gap-1 text-[12px] text-gray-400 hover:text-foreground"
                >
                  <XCircle className="h-3 w-3" /> 취소
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-1 text-[12px] text-emerald-300 hover:text-emerald-200 disabled:opacity-50"
                >
                  <Save className="h-3 w-3" /> 저장
                </button>
              </div>
            )}
          </div>

          {!editing ? (
            <dl className="grid grid-cols-[80px_1fr] gap-y-1.5 text-[13px]">
              <dt className="text-gray-500">이름</dt><dd className="text-foreground">{stats.name}</dd>
              <dt className="text-gray-500">부서</dt><dd className="text-foreground">{stats.department}</dd>
              <dt className="text-gray-500">직급</dt><dd className="text-foreground">{formatRank(stats.rank)}</dd>
              <dt className="text-gray-500">연락처</dt>
              <dd className="text-foreground">{stats.phone || "—"}</dd>
              <dt className="text-gray-500">이메일</dt>
              <dd className="text-foreground truncate">{stats.email || "—"}</dd>
            </dl>
          ) : (
            <div className="space-y-2 text-[13px]">
              <Field label="이름">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="부서">
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value as Department })}
                  className={inputCls + " [&>option]:bg-[#0a0a0a]"}
                >
                  {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="직급">
                <select
                  value={form.rank}
                  onChange={(e) => setForm({ ...form, rank: e.target.value })}
                  className={inputCls + " [&>option]:bg-[#0a0a0a]"}
                >
                  {RANKS.map((r) => <option key={r} value={r}>{formatRank(r)}</option>)}
                </select>
              </Field>
              <Field label="연락처">
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  onBlur={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                  placeholder="010-0000-0000"
                  className={inputCls}
                />
              </Field>
              <Field label="이메일">
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@company.com"
                  className={inputCls}
                />
              </Field>
            </div>
          )}
        </section>

        {/* Active projects */}
        <section>
          <p className="text-[12px] uppercase tracking-wider text-gray-500 mb-2">
            업무 중인 프로젝트 ({stats.activeProjects.length})
          </p>
          {stats.activeProjects.length === 0 ? (
            <p className="text-[13px] text-gray-500">진행 중인 프로젝트가 없습니다.</p>
          ) : (
            <div className="space-y-1.5">
              {stats.activeProjects.map((p) => {
                const dd = /^\d{4}-\d{2}-\d{2}$/.test(p.deadline) ? dDay(p.deadline) : null;
                const tone =
                  dd === null
                    ? "text-gray-500"
                    : dd < 0
                      ? "text-red-400"
                      : dd <= 7
                        ? "text-amber-300"
                        : "text-gray-400";
                return (
                  <button
                    key={p.id}
                    onClick={() => openProjectWindow(p.id)}
                    className="w-full flex items-center justify-between text-left px-3 py-2 rounded-md bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-foreground truncate flex items-center gap-1.5">
                        {p.pm === stats.name && (
                          <Crown className="h-3 w-3 text-amber-300 shrink-0" />
                        )}
                        {p.title}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {p.department} · {p.status} · {p.progress}%
                      </p>
                    </div>
                    <span className={`text-[12px] font-medium ${tone} ml-2`}>
                      {dd !== null && (dd < 0 ? `D+${Math.abs(dd)}` : `D-${dd}`)}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-gray-600 group-hover:text-gray-300 ml-2" />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Open issues */}
        {stats.openIssues.length > 0 && (
          <section>
            <p className="text-[12px] uppercase tracking-wider text-gray-500 mb-2">
              미해결 이슈 ({stats.openIssues.length})
            </p>
            <div className="space-y-1">
              {stats.openIssues.slice(0, 6).map((i) => (
                <button
                  key={i.issueId}
                  onClick={() => openProjectWindow(i.project.id)}
                  className="w-full text-left px-3 py-2 rounded-md bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10"
                >
                  <p className="text-[13px] text-amber-200 truncate">{i.title}</p>
                  <p className="text-[11px] text-gray-500">{i.project.title}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Leaves this month */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] uppercase tracking-wider text-gray-500">
              이번 달 연차 ({stats.leavesThisMonth.length})
            </p>
            <button
              onClick={onAddLeave}
              className="inline-flex items-center gap-1 text-[12px] text-teal-300 hover:text-teal-200"
            >
              <Plus className="h-3 w-3" /> 추가
            </button>
          </div>
          {stats.leavesThisMonth.length === 0 ? (
            <p className="text-[13px] text-gray-500">이번 달 등록된 연차가 없습니다.</p>
          ) : (
            <div className="space-y-1">
              {stats.leavesThisMonth.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between px-3 py-2 rounded-md bg-blue-500/5 border border-blue-500/20"
                >
                  <div>
                    <p className="text-[13px] text-blue-200">
                      {l.leave_date} · {l.leave_type}
                      {l.leave_type === "시차" && l.start_time && (
                        <span className="text-blue-300/70 ml-1">
                          ({l.start_time}~{l.end_time})
                        </span>
                      )}
                    </p>
                    {l.reason && <p className="text-[11px] text-gray-500">{l.reason}</p>}
                  </div>
                  <button
                    onClick={() => onDeleteLeave(l.id)}
                    className="text-gray-500 hover:text-red-400 text-[12px]"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="border-t border-white/10 p-4">
        <button
          onClick={() =>
            navigate({ to: "/schedule", search: { member: stats.name } as any })
          }
          className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-[13px] text-gray-200"
        >
          일정 관리에서 보기 →
        </button>
      </div>
    </aside>
  );
}

const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-md px-2.5 py-1.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
      <span className="text-gray-500">{label}</span>
      {children}
    </div>
  );
}

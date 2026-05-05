import { useState } from "react";
import { ALL_MEMBERS, TEAM_DATA, type Department } from "@/lib/mockProjects";
import { MEMBER_DEPT, type LeaveType } from "@/lib/mockSchedule";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X } from "lucide-react";

interface Props {
  defaultDate: string;
  onClose: () => void;
  onCreated: () => void;
}

const TYPES: LeaveType[] = ["전일", "오전반차", "오후반차", "병가"];

export function AddLeaveModal({ defaultDate, onClose, onCreated }: Props) {
  const [member, setMember] = useState(ALL_MEMBERS[0].name);
  const [date, setDate] = useState(defaultDate);
  const [type, setType] = useState<LeaveType>("전일");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const dept = MEMBER_DEPT[member] as Department;
    const { error } = await supabase.from("leaves").insert({
      member_name: member,
      department: dept,
      leave_type: type,
      leave_date: date,
      reason: reason || null,
    });
    setSaving(false);
    if (error) {
      toast.error("저장 실패: " + error.message);
      return;
    }
    toast.success(`${member} · ${date} 연차 등록됨`);
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-[420px] rounded-lg border border-white/10 bg-[#0a0a0a] p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-foreground">연차 등록</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="팀원">
            <select
              value={member}
              onChange={(e) => setMember(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground"
            >
              {(Object.keys(TEAM_DATA) as Department[]).map((d) => (
                <optgroup key={d} label={d}>
                  {TEAM_DATA[d].map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} · {m.rank}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>

          <Field label="날짜">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground"
              required
            />
          </Field>

          <Field label="유형">
            <div className="grid grid-cols-4 gap-1.5">
              {TYPES.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-2 py-1.5 rounded-md text-xs border transition-colors ${
                    type === t
                      ? "bg-teal-700 border-teal-500 text-white"
                      : "bg-white/5 border-white/10 text-gray-400 hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

          <Field label="사유 (선택)">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 가족 행사"
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-gray-500"
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-gray-400 hover:text-foreground"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-md bg-gradient-to-r from-[#0d3b2f] to-[#147058] text-white text-xs font-medium disabled:opacity-50"
          >
            {saving ? "저장 중..." : "등록"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-gray-500 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

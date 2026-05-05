import { useState } from "react";
import { TEAM_DATA, ALL_MEMBERS, type Department } from "@/lib/mockProjects";
import { MEMBER_DEPT, TIME_SLOTS, type LeaveType } from "@/lib/mockSchedule";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X } from "lucide-react";

interface Props {
  defaultDate: string;
  onClose: () => void;
  onCreated: () => void;
}

export function AddLeaveModal({ defaultDate, onClose, onCreated }: Props) {
  const [member, setMember] = useState(ALL_MEMBERS[0].name);
  const [date, setDate] = useState(defaultDate);
  const [type, setType] = useState<LeaveType>("연차");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("19:00");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type === "시차" && startTime >= endTime) {
      toast.error("시차는 시작 시간이 종료 시간보다 빨라야 합니다.");
      return;
    }
    setSaving(true);
    const dept = MEMBER_DEPT[member] as Department;
    const { error } = await supabase.from("leaves").insert({
      member_name: member,
      department: dept,
      leave_type: type,
      leave_date: date,
      start_time: type === "시차" ? startTime : null,
      end_time: type === "시차" ? endTime : null,
      reason: reason || null,
    });
    setSaving(false);
    if (error) {
      toast.error("저장 실패: " + error.message);
      return;
    }
    toast.success(`${member} · ${date} 등록됨`);
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-[440px] rounded-lg border border-white/10 bg-[#0a0a0a] p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-semibold text-foreground">연차 등록</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="팀원">
            <select
              value={member}
              onChange={(e) => setMember(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-[14px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal-500 [&>option]:bg-[#0a0a0a] [&>option]:text-foreground [&>optgroup]:bg-[#0a0a0a] [&>optgroup]:text-gray-400"
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
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-[14px] text-foreground"
              required
            />
          </Field>

          <Field label="유형">
            <div className="grid grid-cols-2 gap-2">
              {(["연차", "시차"] as LeaveType[]).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-3 py-2 rounded-md text-[13px] border transition-colors ${
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

          {type === "시차" && (
            <Field label="시간 선택">
              <div className="flex items-center gap-2">
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-[14px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal-500 [&>option]:bg-[#0a0a0a] [&>option]:text-foreground"
                >
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <span className="text-gray-500 text-[13px]">~</span>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-[14px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal-500 [&>option]:bg-[#0a0a0a] [&>option]:text-foreground"
                >
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </Field>
          )}

          <Field label="사유 (선택)">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 가족 행사, 병원 진료"
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-[14px] text-foreground placeholder:text-gray-500"
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-gray-400 hover:text-foreground"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-md bg-gradient-to-r from-[#0d3b2f] to-[#147058] text-white text-[13px] font-medium disabled:opacity-50"
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
      <span className="text-[12px] uppercase tracking-wider text-gray-500 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

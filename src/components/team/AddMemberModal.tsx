import { useState } from "react";
import { X } from "lucide-react";
import { addMember, formatPhone, ROLES } from "@/lib/teamSync";
import { toast } from "sonner";

const DEPTS = ["공통", "영상", "편집", "UX"] as const;
const RANKS = ["수석", "책임", "선임", "연구원"] as const;

const RANK_LABEL: Record<string, string> = {
  수석: "수석 연구원",
  책임: "책임 연구원",
  선임: "선임 연구원",
  연구원: "연구원",
};

interface Props {
  defaultDepartment?: string;
  onClose: () => void;
  onCreated: () => void;
}

export function AddMemberModal({ defaultDepartment = "영상", onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    department: defaultDepartment,
    rank: "선임",
    name: "",
    phone: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("이름을 입력해주세요.");
      return;
    }
    setSaving(true);
    const res = await addMember({
      name: form.name,
      rank: form.rank,
      department: form.department,
      phone: form.phone,
      email: form.email,
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("팀원이 추가되었습니다.");
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[440px] bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-[15px] font-semibold text-foreground">팀원 추가</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3 text-[13px]">
          <Field label="부서">
            <select
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
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
              {RANKS.map((r) => <option key={r} value={r}>{RANK_LABEL[r]}</option>)}
            </select>
          </Field>
          <Field label="이름">
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="홍길동"
              className={inputCls}
            />
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
              placeholder="(선택)"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[13px] text-gray-300 hover:text-foreground"
          >
            취소
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-3 py-1.5 text-[13px] rounded-md bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-50"
          >
            {saving ? "추가 중…" : "추가"}
          </button>
        </div>
      </div>
    </div>
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

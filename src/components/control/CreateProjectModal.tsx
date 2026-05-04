import { useState, useMemo } from "react";
import { X, Plus, Calendar, Users, Image as ImageIcon } from "lucide-react";
import { TEAM_DATA, ALL_MEMBERS, DEPTS, STATUSES, type Project, type Department, type Status } from "@/lib/mockProjects";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (project: Project) => void;
}

export function CreateProjectModal({ isOpen, onClose, onCreate }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState<Department>("UX");
  const [status, setStatus] = useState<Status>("대기");
  const [startDate, setStartDate] = useState(today);
  const [deadline, setDeadline] = useState("");
  const [pm, setPm] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  const dateError = status !== "상시" && startDate && deadline && startDate > deadline
    ? "시작일이 마감일보다 늦을 수 없습니다."
    : "";

  const availableMembers = useMemo(() => {
    return department === "공통" ? ALL_MEMBERS : TEAM_DATA[department];
  }, [department]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !pm || imageUrls.length === 0) return;
    if (dateError) return;

    const newProject: Project = {
      id: `p-new-${Date.now()}`,
      title,
      department,
      status,
      progress: 0,
      startDate: status === "상시" ? undefined : (startDate || today),
      deadline: status === "상시" ? "상시" : deadline || today,
      updatedAt: new Date().toISOString(),
      pm,
      members,
      image: imageUrls[0],
      images: imageUrls.map((url) => ({ url, memo: "" })),
      thumbnail: {
        coverIndex: 0,
        focal: { x: 0.5, y: 0.5 },
        zoom: 1,
        sequence: imageUrls.map((_, i) => i),
      },
      tasks: [],
      issues: [],
    };

    onCreate(newProject);
    onClose();
  };

  const toggleMember = (m: string) => {
    setMembers(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const addImage = () => {
    if (newImageUrl.trim()) {
      setImageUrls(prev => [...prev, newImageUrl.trim()]);
      setNewImageUrl("");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0A0A0A]/95 border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0A0A0A]/90 p-6 backdrop-blur-md">
          <h2 className="text-xl font-bold text-white tracking-tight">새 프로젝트 생성</h2>
          <button onClick={onClose} className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-white/70">프로젝트 타이틀 *</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition"
              placeholder="예: 신규 브랜드 아이덴티티 구축"
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-white/70">담당 부서</label>
              <div className="flex gap-2">
                {DEPTS.map(d => (
                  <button 
                    key={d} 
                    type="button" 
                    onClick={() => { setDepartment(d); setPm(""); setMembers([]); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${department === d ? "bg-white/20 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
                  >
                    {d}
                  </button>
                ))}
                <button 
                  type="button" 
                  onClick={() => { setDepartment("공통"); setPm(""); setMembers([]); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${department === "공통" ? "bg-white/20 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
                >
                  공통
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-white/70">상태</label>
              <div className="flex gap-2">
                {STATUSES.map(s => (
                  <button 
                    key={s} 
                    type="button" 
                    onClick={() => setStatus(s)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${status === s ? "bg-white/20 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-white/90 flex items-center gap-2"><Calendar className="w-4 h-4 text-white/80 drop-shadow-md" /> 마감일</label>
            <input 
              type="date" 
              value={deadline} 
              onChange={e => setDeadline(e.target.value)} 
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-orange-500 transition color-scheme-dark"
              disabled={status === "상시"}
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-white/70 flex items-center gap-2"><Users className="w-4 h-4" /> PM (담당 책임자) *</label>
            <select 
              value={pm} 
              onChange={e => setPm(e.target.value)} 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition appearance-none"
              required
            >
              <option value="" disabled className="bg-neutral-900">PM을 선택하세요</option>
              {availableMembers.map(m => (
                <option key={m.name} value={m.name} className="bg-neutral-900">{m.name} ({m.rank})</option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-white/70">참여 멤버</label>
            <div className="flex flex-wrap gap-2">
              {availableMembers.filter(m => m.name !== pm).map(m => (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => toggleMember(m.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${members.includes(m.name) ? "bg-white/20 border-white/30 text-white" : "bg-transparent border-white/10 text-white/50 hover:border-white/20"}`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-white/70 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> 레퍼런스 이미지 URL (최소 1장) *</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newImageUrl} 
                onChange={e => setNewImageUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addImage())}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition text-sm"
                placeholder="Unsplash 이미지 주소 등 입력"
              />
              <button type="button" onClick={addImage} className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-xl transition">
                추가
              </button>
            </div>
            {imageUrls.length > 0 && (
              <div className="flex gap-4 overflow-x-auto py-2">
                {imageUrls.map((url, i) => (
                  <div key={i} className="relative group w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-white/10">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setImageUrls(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full opacity-0 group-hover:opacity-100 transition">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-white/10 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl text-sm font-bold text-white/70 hover:text-white hover:bg-white/5 transition">
              취소
            </button>
            <button type="submit" disabled={!title || !pm || imageUrls.length === 0} className="px-6 py-3 rounded-xl text-sm font-bold bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition">
              프로젝트 생성
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { LayoutGrid, Columns3 } from "lucide-react";

export type ViewMode = "grid" | "kanban";

interface Props {
  view: ViewMode;
  setView: (v: ViewMode) => void;
}

export function ViewSwitcher({ view, setView }: Props) {
  const items: Array<{ key: ViewMode; label: string; Icon: typeof LayoutGrid }> = [
    { key: "grid", label: "그리드", Icon: LayoutGrid },
    { key: "kanban", label: "칸반", Icon: Columns3 },
  ];
  return (
    <div
      role="group"
      aria-label="보기 방식"
      className="flex rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-md"
    >
      {items.map(({ key, label, Icon }) => {
        const active = view === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => setView(key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              active ? "bg-white/20 text-white" : "text-white/40 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

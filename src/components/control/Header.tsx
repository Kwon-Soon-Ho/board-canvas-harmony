const NAV = ["프로젝트", "일정 관리", "인사이트", "팀 관리"];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-10">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2.5">
            <div
              className="h-2 w-2 rounded-full bg-foreground"
              style={{ boxShadow: "0 0 8px rgba(255,255,255,0.7)" }}
            />
            <span className="text-[18px] font-semibold tracking-tight text-foreground">
              Design Team
            </span>
          </div>
          <nav className="flex items-center gap-1">
            {NAV.map((item, i) => (
              <button
                key={item}
                className={`rounded-md px-4 py-2 text-[16px] transition-colors ${
                  i === 0
                    ? "bg-white/15 text-foreground"
                    : "bg-[#1A1A1A] text-gray-300 hover:bg-[#222] hover:text-foreground"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full border border-white/15 bg-[#1A1A1A]" />
        </div>
      </div>
    </header>
  );
}

## 1. 칸반에서 진행/상시/완료 → 대기 이동 시 발생하는 오류

### 원인
`src/routes/index.tsx`의 `handleStatusChange`(294~319)는 **status만 바꾸고 날짜(startDate/deadline)는 손대지 않습니다.** 하지만 데이터 모델 규칙(`backfillStartDate`)상 대기는 시작일/마감일이 모두 비어 있어야 합니다. 이 불일치 때문에 다음 증상이 발생합니다.

- **진행 → 대기**: 옛 deadline(yyyy-mm-dd)이 그대로 남아 칸반/그리드 카드에 D-day 배지·캘린더 아이콘이 계속 보입니다. 대기 컬럼인데 "D-3" 같은 표시가 남는 시각 버그.
- **상시 → 대기**: deadline 값이 `"상시"` 문자열로 남습니다. 카드/칸반에서 "일정: 상시" 텍스트가 대기 컬럼에 그대로 노출됩니다. 또한 `projectsInQuarter`(159)에서 `p.deadline === "상시"` 분기를 타고 모든 분기에 무조건 포함되어, 대기인데도 분기 카운트에 누락 없이 잡힙니다.
- **완료 → 대기**: 완료 시 100%로 강제됐던 progress/tasks/issues가 그대로 남아 대기 카드가 100% + 모든 task "완료"로 표시됩니다.
- **타임라인**: 대기는 원래 하단 칩 섹션으로 빠져야 하는데 옛 날짜가 남아있으면 메인 타임라인 바로 그려집니다(대기 라벨 + 일반 바 동시 노출). 또한 quarter 필터 통과 여부가 옛 날짜에 의존해 들쭉날쭉.
- **Kanban 카드 자체 오류**: `KanbanBoard.ddayLabel`은 `"상시"` 문자열이 들어오면 정규식 검사에서 null 반환하니 throw는 안 나지만, 진행 → 대기로 옮긴 카드의 deadline이 yyyy-mm-dd면 "마감 임박" 황색 링이 대기 컬럼에 남는 시각 오류.

### 해결
`handleStatusChange`에서 status 변경과 동시에 정규화 적용:
- `next === "대기"` → `startDate: undefined`, `deadline: ""`로 강제.
- `next === "상시"` → `deadline: "상시"`로 강제(시작일이 없으면 오늘 날짜로 채움 — 무한바 렌더링 시 시작점 필요).
- `next === "진행"`이고 이전이 대기였던 경우(=날짜가 비어 있음) → 시작일을 오늘로 채움. 마감일은 비워두고 사용자에게 편집 안내(또는 그대로 빈 채로 둠).
- `next === "완료"` 분기는 기존 로직 유지(이미 100% 정규화).

추가로 `src/components/control/KanbanBoard.tsx`에서 대기 컬럼 카드는 D-day 배지/마감임박 링을 아예 숨기는 가드 한 줄을 넣어 시각적 일관성 보강.

---

## 2. 그리드/칸반/타임라인에서 카드 클릭 시 페이지가 최하단/아래칸으로 점프

### 원인 (두 요인이 겹침)

**(A) `openDetailWindow`의 `await getScreenDetails()` (src/lib/sync.ts 38~53)**
`handleOpen`은 `async`이고 내부에서 `await window.getScreenDetails()`를 호출합니다. 이 API는 **Window Management 권한이 없으면 권한 프롬프트를 띄우고, 프롬프트가 뜨는 동안 `window.open` 호출이 사용자 제스처에서 분리되어 팝업 차단되거나 지연**됩니다. 프롬프트가 닫히면 브라우저가 직전에 포커스됐던 요소(클릭한 카드 버튼)를 `scrollIntoView`로 화면에 다시 끌어옵니다. 카드가 확대(scale 1.25)되어 원래 위치보다 아래로 늘어나 있는 상태에서 이 스크롤 보정이 일어나면 **"바로 아래 칸으로 점프"** 하는 것처럼 보입니다.

**(B) ProjectCard 확대(scale-[1.25]) + transformOrigin "center top"**
그리드 카드는 hover 시 1.25배 확대되며 `<article>` 자체 크기는 그대로(absolute 자식). 클릭 시점에 hover가 유지되어 카드가 확대된 채로 있습니다. 클릭 → 버튼에 포커스 → 새 창 열림 → 부모 창이 포커스 잃음 → 다시 부모로 돌아오면 브라우저가 포커스 요소를 가시 영역으로 스크롤합니다. 카드가 화면 하단부에 있을 때 확대된 부분이 viewport 밖으로 나가 있으면 브라우저가 페이지를 아래로 스크롤해 맞추므로 "최하단으로 넘어간 듯" 보입니다. 칸반/타임라인은 확대가 없어 폭은 작지만, (A) 요인 + 포커스 스크롤만으로도 약간의 점프가 생깁니다.

### 해결
1. **`openDetailWindow`에서 동기 `window.open`을 먼저 호출**하고, 그 후에 `getScreenDetails`로 위치만 보정(`win.moveTo`/`resizeTo`). 즉 호출 순서를 뒤집어 사용자 제스처와 `window.open`을 분리하지 않습니다. 권한 프롬프트는 기존 창 위치 보정 시도에서만 발생하고, 프롬프트가 떠도 부모 페이지 포커스가 그대로 유지되어 스크롤 보정이 일어나지 않습니다.
2. **클릭 핸들러에서 포커스로 인한 스크롤 차단**: 카드/칸반 카드/타임라인 바의 클릭 트리거에 `onMouseDown={(e) => e.preventDefault()}`를 추가해 클릭 시 버튼이 포커스를 가져가지 않도록 합니다(키보드 접근성은 `onKeyDown` Enter/Space 분기로 별도 유지).
3. **ProjectCard hover 해제 보정**: 클릭 직후 `setHover(false)`를 호출해 카드가 확대된 채 새 창이 열리지 않도록 합니다. 새 창 닫고 돌아왔을 때 카드가 원위치라 브라우저 포커스 스크롤 보정도 영향 없음.
4. (옵션) `handleOpen`에서 `await openDetailWindow(...)` 대신 `void openDetailWindow(...)`로 fire-and-forget. 부모 컴포넌트가 await 동안 다른 상태 변화로 리렌더되는 것을 막습니다.

---

## 수정 파일

- `src/routes/index.tsx` — `handleStatusChange`에 상태별 날짜 정규화 추가, `handleOpen`을 fire-and-forget로 변경.
- `src/lib/sync.ts` — `openDetailWindow`에서 `window.open`을 먼저 호출 후 위치 보정.
- `src/components/control/ProjectCard.tsx` — 클릭 시 `onMouseDown` preventDefault, 클릭 직후 hover 해제.
- `src/components/control/KanbanBoard.tsx` — 카드 클릭 `onMouseDown` preventDefault, 대기 컬럼에서 D-day/임박 링 숨김.
- `src/components/control/TimelineView.tsx` — 바 클릭 요소에 `onMouseDown` preventDefault.

---

## 확인 부탁

1. 대기로 이동 시 **이전 시작일을 보존**해뒀다가 다시 진행/상시로 돌아왔을 때 복원할까요, 아니면 그냥 **항상 비우고 사용자가 다시 입력**하게 둘까요? (권장: 항상 비움 — 단순하고 v5 규칙과 일치)
2. 클릭 시 **새 창 자동 위치 정렬(getScreenDetails 보정)** 자체를 제거할까요? 멀티모니터 환경에서만 의미 있고, 단일 모니터에서는 권한 프롬프트 비용만 큽니다. (권장: 제거하고 단순 `window.open`만 사용)

## 수정 계획

### 1. 타임라인 막대 위아래 위치가 바뀌는 원인과 해결

**원인**
`TimelineView.tsx` items 정렬이 `a.e.getTime() - b.e.getTime()` 한 가지 키만 사용합니다. 데모 데이터에는 같은 마감일을 가진 프로젝트가 여럿 있어서 동률(tie)이 생기고, preset(이번 주/이번 달 등)을 클릭할 때마다 컴포넌트가 재렌더되면서 `Array.sort`가 동률 항목 순서를 다르게 반환합니다. 게다가 시작일만 있거나 마감일만 있는 항목을 `s/e` 한쪽 값으로 채우는 로직(`s ?? e`, `e ?? s`)이 동률을 더 만듭니다. 그래서 preset을 누르거나 같은 preset을 다시 누를 때 행 순서가 흔들리는 것처럼 보입니다.

**해결**

- 정렬 키를 다단계로 안정화: `endDate → startDate → id` 순서 비교. id 비교가 들어가면 동률이 사라져 항상 같은 순서가 보장됩니다.
- 가능하다면 `useMemo`로 정렬 결과를 캐싱(이미 useMemo로 감싸져 있으니 키만 보강).

### 2. 상시(Ongoing) 프로젝트 표현 방식

**현황**
상시는 시작일은 있지만 마감이 없어서 타임라인에서 거의 점처럼 보이거나, 마감 미정 칸으로 빠집니다.

**제안 (선택지)**
A. **"화면 끝까지 이어지는 바 + 우측 페이드아웃"** — 시작일 위치에서 시작해 현재 보이는 범위의 오른쪽 끝까지 채우고, 우측에 ‹‹ 같은 그라데이션을 깔아 "끝이 열려 있음"을 시각적으로 표현. 진행률도 꼭 표기해야함, 대신 "상시" 라벨 표시.  
B. **별도 섹션 유지하되 시작일 노출** — 지금처럼 "상시 · 진행 중" 섹션을 따로 두되, 칩에 시작일/경과일을 함께 표시 (예: "프로젝트명 · 23일째").
C. **A + B 동시** — 메인 타임라인에 무한바로 그리고, 하단에도 칩 요약을 둠.

권장: **A 안**. 시각적으로 가장 눈에 띄고 타임라인 정렬 흐름에서 이탈하지 않습니다. (마감 미정 섹션은 제거.)

### 3. 대기(Pending) 프로젝트 — 시작일/마감일 모두 제거

- `mockProjects.ts`의 `backfillStartDate`에서 대기 프로젝트는 `startDate`와 `deadline` 모두 비웁니다(현재는 startDate만 정리). 마감 데이터는 빈 문자열 또는 `undefined`로 처리.
- `Project.deadline` 타입을 `string` → `string | undefined`로 변경하고, `format`/parse 호출부에서 옵셔널 처리 추가 (Header, ProjectCard, KanbanBoard, TimelineView, detail.tsx 등).
- 마이그레이션 키 `v5`로 올려서 기존 localStorage 데이터에서 대기 프로젝트의 deadline을 정리.
- 타임라인은 시작일/마감일이 둘 다 없는 대기 프로젝트는 표시 대상에서 제외 (현재 ongoing 섹션과 같은 분기). 별도로 "대기" 섹션을 보여줄지 여부는 옵션 — 권장: 표시하지 않음 (칸반/그리드에서 보면 됨).

### 4. 프로젝트 생성 모달 — 필수 필드 완화

`CreateProjectModal.tsx` 수정:

- **상태별 필수 필드 매트릭스**

  | 상태    | 시작일           | 마감일           |
  | ----- | ------------- | ------------- |
  | 진행/완료 | 선택(없어도 OK)    | 선택(없어도 OK)    |
  | 상시    | 선택            | 항상 비활성/저장 안 함 |
  | 대기    | 항상 비활성/저장 안 함 | 항상 비활성/저장 안 함 |

- 저장 시 비어있는 날짜는 `undefined`로 저장 (오늘 날짜로 자동 채우는 현재 로직 제거).
- **레퍼런스 이미지**: 필수 해제. 0장이면 placeholder 이미지(예: 회색 그라데이션 `image` URL 또는 부서 색 기반 SVG data-URI)를 자동 할당해 카드/썸네일이 깨지지 않게 함. `images` 배열은 빈 배열 허용.
- 제출 버튼 disabled 조건을 `!title || !pm`만 남김 (이미지/날짜 제거).
- 날짜 검증(`dateError`)은 둘 다 입력된 경우에만 실행.

### 5. 영향 범위 (수정할 파일)

- `src/lib/mockProjects.ts` — `Project.deadline` 옵셔널화, `backfillStartDate` 대기 처리 강화, 마이그레이션 키 v5.
- `src/routes/index.tsx` — 마이그레이션 트리거, 카드/필터에서 deadline 옵셔널 대응.
- `src/routes/detail.tsx` — deadline 표시/편집 옵셔널 대응.
- `src/components/control/CreateProjectModal.tsx` — 필수 필드 완화, placeholder 이미지.
- `src/components/control/TimelineView.tsx` — 안정 정렬, 상시 무한바 렌더, ongoing 섹션 제거, 대기 제외.
- `src/components/control/ProjectCard.tsx`, `KanbanBoard.tsx`, `Header.tsx` — deadline `undefined` 처리("미정" 표시).

### 확인할 점 (답변 부탁)

1. **상시 표현**: A(무한바) / B(칩 유지) / C(둘 다) 중 어느 쪽으로 진행할까요? (기본 권장 A)
2. **대기 프로젝트를 타임라인에 아예 안 보여주는 게 맞나요?** (그리드/칸반에서만 보이게)
3. **이미지 없는 프로젝트의 placeholder**: 부서 색 기반 자동 SVG / 단색 회색 / 텍스트 이니셜 중 선호하는 스타일이 있나요?
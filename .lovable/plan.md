## 변경 사항

### 1. 정렬 필터 분리: 최신순 ↔ 생성순

- `Project` 타입에 `updatedAt?: string` 필드 추가 (`src/lib/mockProjects.ts`)
- 새 프로젝트 생성 시 `updatedAt = new Date().toISOString()` 자동 세팅
- 상세 페이지에서 다음 변경 발생 시 `updatedAt` 갱신:
  - 프로젝트 정보 수정 (PM/마감/상태/시작일)
  - 업무·이슈 추가/수정/삭제
  - 이미지/썸네일 변경
- `src/routes/index.tsx`의 정렬 옵션을 4개로 확장:
  - **최신순(수정)** — `updatedAt` desc, fallback to id
  - **생성순** — id desc (현재 "최신순"이 하던 동작 그대로)
  - **진행률순**
  - **마감임박순**

### 2. 정렬 메뉴 항상 노출

- 현재는 `view === "grid"`일 때만 정렬 그룹이 렌더링됨 → 조건 제거
- 칸반/타임라인에서도 동일한 정렬 그룹을 사용하도록 `KanbanBoard`/`TimelineView`에 정렬된 `filtered` 배열을 그대로 전달 (이미 그렇게 동작 중이므로 UI 표시만 풀면 됨)

### 3. 시작일 입력 추가

- `src/components/control/CreateProjectModal.tsx`
  - "마감일" 입력을 **시작일 / 마감일 2-컬럼 그리드**로 변경
  - 마감일 필드는 `상태 === "상시"`일 때 비활성화
  - 시작일 default = 오늘
  - 시작일 > 마감일 시 검증 메시지
- `src/routes/detail.tsx` `ProjectEditModal`
  - 동일하게 시작일 + 마감일을 한 행에 나란히 배치
  - `onSave({ startDate, deadline, pm, status })`
- 헤더 정보 패널에 "시작일 ~ 마감일" 표시 추가 (기존 마감일 단독 표기 자리)

### 4. 레이아웃 보존

- 두 모달 모두 기존 `space-y-*` 리듬을 유지하면서 날짜만 `grid grid-cols-2 gap-4` 한 블록으로 묶음 — 모달 폭 확장 없음
- 정렬 그룹 4개 버튼은 `최신순 / 생성순 / 진행률순 / 마감임박순` 가로 배치, 1920px 헤더 폭에서 우측 컨트롤이 줄바꿈되지 않도록 `최신순/생성순` 라벨은 짧게 유지 (아이콘 + 1단어)

### 5. 기술 메모

- `updatedAt` 마이그레이션: localStorage에 없으면 `id` 기반 fallback, 신규 프로젝트는 항상 채움
- Mock 데이터는 변경하지 않음 (실행 시 fallback으로 동작)
- 칸반/타임라인의 내부 정렬(상태 그룹·날짜 축)은 그대로 두고, 인덱스에서 정렬한 `filtered` 배열의 순서가 유지되도록만 함

### 변경 파일

- `src/lib/mockProjects.ts` — `Project.updatedAt`, `Project.startDate` 추가
- `src/routes/index.tsx` — 정렬 옵션 4개, 정렬 그룹을 view 조건에서 분리, `updatedAt` 갱신 헬퍼
- `src/components/control/CreateProjectModal.tsx` — 시작일 필드 추가
- `src/routes/detail.tsx` — `ProjectEditModal`에 시작일 추가, 모든 변경 경로에서 `updatedAt` 갱신, 헤더 표시 업데이트
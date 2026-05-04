## 목표

1. 모든 데모 프로젝트(대기 제외)에 랜덤 시작일이 확실하게 들어가게 한다.
2. 대시보드/상세페이지/타임라인이 같은 시작일을 보게 한다.
3. SSR/하이드레이션 불일치(React #418)를 없앤다.

## 원인 정리

- `MOCK_PROJECTS`가 모듈 로딩 시점에 `localStorage`와 `Math.random()`을 호출 → 서버와 클라이언트 출력이 달라져 hydration mismatch 발생.
- `localStorage`에 예전 데이터가 남아 있고, 마이그레이션 키(`v3`)가 이미 완료 상태라 새 시작일 로직이 안 돌아감.
- `detail.tsx`는 시작일 보정 로직을 안 거치고 오래된 데이터로 `localStorage`를 다시 덮어씀 → 대시보드의 보정값이 되돌려짐.
- 타임라인은 선택 기간 이전 시작일을 왼쪽 경계로 잘라 보여줘서, 시작일이 다르더라도 똑같이 보임.

## 수정 계획

### 1. `src/lib/mockProjects.ts` 안정화
- 모듈 로딩 시점의 `localStorage` 접근 제거. `MOCK_PROJECTS`는 순수한 시드 데이터만 반환.
- `Math.random()` 제거하고 인덱스 기반 deterministic 값으로 대체 (task progress 등).
- 모든 비-대기 프로젝트에 시작일을 인덱스 시드로 14~75일 전 랜덤 부여.

### 2. 시작일 보정 유틸 공통화
- `backfillStartDate(project)`를 `src/lib/mockProjects.ts`(또는 별도 유틸 파일)로 옮겨 export.
- 대시보드와 상세페이지가 같은 함수를 import.

### 3. 마이그레이션 강제 재실행
- 키를 `design-projects-migration-v4`로 올림.
- 이번에는 기존 시작일이 있어도 “대기 아닌데 시작일이 deadline과 너무 가깝거나 동일” 같은 비정상 케이스를 다시 계산.
- 사용자가 직접 수정한 값(예: 상세페이지 편집모달로 입력한 시작일)은 보존 — 별도 플래그(`startDateUserSet: true`)로 구분.

### 4. `src/routes/detail.tsx` 보정
- localStorage에서 프로젝트를 읽을 때 공통 `backfillStartDate` 적용.
- BroadcastChannel로 받은 프로젝트에도 동일 보정 적용.
- 편집모달에서 사용자가 시작일을 변경했을 때만 `startDateUserSet: true` 플래그 설정.

### 5. SSR/하이드레이션 불일치 제거
- 대시보드 초기 state는 “시작일 없는 순수 mock”으로 그대로 쓰되, 하이드레이션 후 `useEffect`에서 보정 + localStorage 머지.
- 또는 라우트 옵션에 `ssr: false`를 적용해 대시보드 자체를 클라이언트 전용으로 처리(가장 안전, 하이드레이션 mismatch 원천 차단).
- 둘 중 안전한 쪽은 `ssr: false`. 대시보드는 어차피 localStorage 의존이 강해서 SSR 의미가 적음. 권장.

### 6. 타임라인 표시 보완
- 프로젝트 시작일이 선택 기간보다 이전이면 막대 왼쪽에 “‹” 그라데이션 표시(잘렸음 표시).
- 막대 hover 툴팁에 실제 시작일과 기간 일수 표시.
- 정렬을 deadline 순뿐 아니라 startDate 순으로도 볼 수 있게(선택사항, 작업 분량 보고 결정).

## 검증 시나리오

1. 시크릿 창에서 페이지 열기 → 모든 진행/완료/상시 프로젝트에 시작일이 보임, 콘솔에 React #418 없음.
2. 기존 브라우저(예전 데이터 있음) → 새 마이그레이션이 돌면서 시작일이 채워짐, 사용자가 직접 입력한 값은 유지.
3. 썸네일 클릭 → 상세페이지 헤더와 편집 모달에 시작일이 보임.
4. 타임라인 “이번 달” 선택 → 프로젝트마다 막대 시작 위치가 서로 다르게 분포함.
5. 상세페이지에서 시작일 수정 후 대시보드로 돌아와도 값 유지, 다음 새로고침에서도 보존.

## 작업 분량

- 파일 변경: `src/lib/mockProjects.ts`, `src/routes/index.tsx`, `src/routes/detail.tsx`, `src/components/control/TimelineView.tsx` (소폭).
- 위험도: 중간. localStorage 마이그레이션이 한 번 잘못되면 사용자 데이터에 영향 → 마이그레이션 함수에 try/catch와 백업 키(`design-projects-store-backup-v3`) 둠.
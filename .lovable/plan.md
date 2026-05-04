# UI/UX 개선 계획

## #4에 대한 답변 (사용성 판단)

**필터를 누를 때 검색어를 자동으로 초기화하는 동작은 일반적인 사용성 패턴과는 어긋납니다.** 이유는:

1. **사용자의 입력 손실**: 사용자가 "홍길동"을 검색해서 결과를 본 뒤, "영상" 부서로 좁히려고 필터를 누르면 검색어가 사라집니다. 보통은 "영상 부서 + 홍길동" 결과를 기대합니다.
2. **업계 표준**: Notion, Linear, Figma, Jira 등 대부분의 대시보드는 검색어와 필터를 **AND 조건으로 결합**합니다.
3. **재입력 비용**: 다시 검색어를 치는 비용 > 명시적으로 X를 누르는 비용.

**권장**: 검색과 필터를 독립적으로 동작시키고, "전체 초기화" 버튼을 별도로 두는 방식. 단, 기획 의도가 "한 번에 한 가지 차원으로만 탐색"이라면 유지해도 됩니다. 결정은 사용자께 맡기되, 본 계획에서는 **독립 동작 + 전체 초기화 버튼** 안으로 진행하겠습니다 (변경 원치 않으시면 알려주세요).

---

## 수정 대상 요약

| # | 항목 | 처리 |
|---|---|---|
| #1 | 카드 hover scale | 보류 (그대로 유지) |
| #2 | 삭제 확인 → AlertDialog + Undo | 적용 |
| #3 | 검색/필터 디커플링 + 디바운스 | 적용 |
| #4 | 필터 클릭 시 검색 초기화 제거 | 적용 (위 권장안) |
| #5 | CreateProjectModal 타입 오류 | 적용 |
| #6 | 배지 가독성 (페이지 곧 추가됨) | 보류 |
| #7 | D-day 조건부 색상 (진행률 기준 통일) | 적용 |
| #8 | 진행률 바 색상 단계화 | 적용 |
| #9 | 로고 placeholder | 보류 |
| #10 | A11y (aria-label, focus trap) | 적용 |
| #11 | 시맨틱 HTML (article/section) | 적용 |
| #12 | 반응형 | 보류 (1920×1080 고정) |
| #13 | 키보드 네비게이션 (Esc, Enter) | 적용 |
| #14 | 라이트 테마 토글 | 보류 |

---

## 상세 구현

### #5 — CreateProjectModal 타입 정합성
- `imageUrls: string[]` → `images: ProjectImage[]`로 변환
- 변환 코드: `images: imageUrls.map(url => ({ url, memo: "" }))`

### #2 — 삭제 확인 다이얼로그 + Undo
- `src/routes/index.tsx`의 `window.confirm` 제거
- `@/components/ui/alert-dialog` 사용해서 모달 형태로 변경
- 삭제 후 `sonner` toast로 "삭제됨 · 되돌리기" 표시 (5초)
- 되돌리기 클릭 시 직전 projects 스냅샷 복원

### #3 + #4 — 검색/필터 디커플링
- `FilterBar.tsx`에서 사용자 입력 시 300ms 디바운스 후 `setQuery` 호출 → 실시간 검색
- 엔터/검색 버튼은 즉시 검색 (보조 수단으로 유지)
- `setDept` / `toggleStatus`에서 `clearSearch()` 호출 제거
- FilterBar 우측에 "전체 초기화" 텍스트 버튼 추가 (검색 + 부서 + 상태 모두 리셋)

### #7 — D-day 조건부 색상 (진행률 기준)
ProjectCard `dday` 배지 색상을 **진행률 기반**으로 통일:
- progress >= 100: 녹색 (`emerald-500`)
- progress >= 70: 흰색/뉴트럴
- progress >= 40: 호박색 (`amber-500`)
- progress < 40: 빨강 (`red-500`)
- 단, deadline === "상시"는 슬레이트 톤 고정

### #8 — 진행률 바 색상 단계화
ProjectCard 진행률 바도 동일한 진행률 임계값으로 색상 변경:
- 100%: emerald
- 70%+: white
- 40%+: amber
- <40%: red
- 글로우 색상도 진행률 색상과 동기화

### #10 — A11y
- ProjectCard 삭제 버튼: `aria-label="프로젝트 삭제"` 추가
- FilterBar 검색 input: `aria-label="프로젝트 검색"`
- 모달(`CreateProjectModal`, `AlertDialog`): shadcn `Dialog` 사용 시 자동 focus trap 확인 (필요 시 보강)
- 정렬 버튼 그룹: `role="group"` + `aria-pressed`

### #11 — 시맨틱 HTML
- `ProjectCard` 루트를 `<article>`로 변경
- `index.tsx` 카드 grid 컨테이너를 `<section aria-label="프로젝트 목록">`으로 변경
- `<h3>` 프로젝트 제목 유지

### #13 — 키보드 네비게이션
- ProjectCard에 `tabIndex={0}` + `onKeyDown` (Enter/Space → onOpen)
- AlertDialog는 shadcn 기본 Esc 닫기 동작 활용
- CreateProjectModal: Esc로 닫기 동작 보장 (Dialog 사용 확인)

### 부수 — SSR localStorage 오류
런타임 에러 `localStorage is not defined`는 SSR 시 `useState` 초기화에서 발생.
- `index.tsx`의 `useState(() => { localStorage.getItem(...) })`를 `typeof window !== "undefined"`로 가드
- 또는 초기값을 `MOCK_PROJECTS`로 두고 `useEffect`에서 마이그레이션 수행

```text
ControlCenter
  ├─ initial state = MOCK_PROJECTS  (SSR 안전)
  └─ useEffect(() => migrateFromLocalStorage(), [])
```

---

## 수정 파일 목록

- `src/routes/index.tsx` — SSR 가드, AlertDialog 통합, Undo toast, 필터/검색 디커플링
- `src/components/control/FilterBar.tsx` — 디바운스, clearSearch 제거, 전체 초기화 버튼, aria-label
- `src/components/control/ProjectCard.tsx` — 진행률 기반 색상, article 태그, 키보드, aria-label
- `src/components/control/CreateProjectModal.tsx` — `images` 객체 타입 변환

## 진행 순서

1. SSR localStorage 가드 (#긴급)
2. #5 타입 오류 (빌드 안정화)
3. #3 + #4 검색/필터 동작 변경
4. #2 AlertDialog + Undo
5. #7 + #8 진행률 색상 시스템
6. #10 + #11 + #13 A11y / 시맨틱 / 키보드

승인하시면 위 순서대로 일괄 적용하겠습니다.

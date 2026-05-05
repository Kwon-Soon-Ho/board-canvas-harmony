# 인사이트 페이지 개선 계획

요청 4가지를 한 번에 반영합니다. 톤앤매너(다크 + 부서 컬러: 영상 #FF5C00 / 편집 #007BFF / UX #FF007F / 공통 #FFFFFF)는 유지합니다.

## 1. 용어 변경

`src/routes/insights.tsx`의 카드 타이틀:
- "담당자별 활성 태스크 TOP 10" → **"담당자별 활성 업무 TOP 10"**
- 본문/Empty 문구도 "태스크" 단어가 남아있으면 "업무"로 통일.

## 2. 이슈/마감 임박 클릭 → 단일 풀스크린 창(window B) 재사용

현재는 `window.open(url, "_blank", "noopener")` 로 매번 새 탭이 열림.

변경:
- `openIssueWindow`, `openProjectWindow` 두 헬퍼를 통합해 **고정 이름 `"design-detail-window"`** 와 **창 features**(width=screen.availWidth, height=screen.availHeight, left=0, top=0, popup=yes)로 호출.
- 같은 이름으로 재호출하면 기존 창이 그대로 재사용되며 URL만 갱신되고 `win.focus()`로 앞으로 가져옴.
- detail 페이지가 이미 열려 있다면 검색 파라미터(`id`, `focus`)가 바뀌어 `useEffect`가 재발화 → 새 프로젝트/이슈로 즉시 포커싱됨.
- noopener 대신 noreferrer만 두어 named-target 동작 보장.

```ts
const DETAIL_WIN_NAME = "design-detail-window";
function openDetailWindow(qs: string) {
  const w = screen.availWidth, h = screen.availHeight;
  const features = `popup=yes,width=${w},height=${h},left=0,top=0,noreferrer`;
  const win = window.open(`/detail?${qs}`, DETAIL_WIN_NAME, features);
  win?.focus();
}
```

이슈 행/마감 임박 행/(필요 시) 추후 항목 모두 이 헬퍼만 사용.

## 3. 진입 시 현재 분기 자동 필터

현재 `q` 기본값이 `0`(연간)이라 진입 시 연간 보기가 됨.

변경:
- `searchSchema`의 `q` 기본값/fallback을 **함수형으로 현재 분기 계산** — `Math.floor(new Date().getMonth() / 3) + 1`.
- `y`도 동일하게 현재 연도 유지(이미 그러함).
- 사용자가 직접 "연간" 토글 시 `q=0`을 URL에 명시 → 그 값이 그대로 보존되므로 자동 분기 필터를 덮어쓰지 않음.
- URL에 q가 없으면 현재 분기로 자동 진입, 새로고침 후에도 동일 동작.

## 4. 차트 디자인 세련화 — 그라데이션 적극 활용 (톤 유지)

참조 이미지(FundFlow / Vitality)의 부드러운 카드·그라데이션·라운드 무드를 가져오되, 색은 부서 컬러 팔레트로 한정.

### 4-1. 카드 컨테이너 업그레이드 (`Card` 로컬 컴포넌트)
- 배경: `bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent`
- 보더: `border border-white/8` + 안쪽 하이라이트 `shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]`
- 외곽: 은은한 컬러 글로우 `shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]`
- 라운드: `rounded-2xl` 유지, 패딩 24px.
- 호버 시 보더 opacity 살짝 상승.

### 4-2. KPI Strip 리디자인
- 각 KPI 카드 좌측에 액센트 컬러 세로 바(2px) + 액센트 컬러의 8% 라디얼 그라데이션 백.
- 숫자 폰트 크기 ↑(28px), `tabular-nums`, 하단에 작은 라벨.
- 상단 우측에 작은 점(액센트색)으로 카테고리 표식.

### 4-3. 차트 그라데이션 (Recharts `<defs><linearGradient>`)
모든 차트 색은 **단색 → 그라데이션**으로 교체. 색 자체는 기존과 동일.

- **부서별 분포 (도넛)**: 각 셀에 부서색 → 부서색 60% 투명도 라디얼 그라데이션. innerRadius 55, outerRadius 88, paddingAngle 3, 중앙에 총 프로젝트 수 텍스트 배치.
- **상태별 분포 (Bar)**: `linearGradient` (top: 상태색 / bottom: 상태색 30%), `radius={[10,10,0,0]}`, 막대 사이 간격 ↑.
- **월별 완료 추이 (Line)**: `<Area>`로 변경 — 라인 + 하단 그라데이션 채움(완료 그린 50% → 0%). dot 강조, activeDot에 글로우.
- **진행률 구간 (Bar)**: 그라데이션(에메랄드 → 블루 톤 전환으로 진행률 상승감 표현).
- **부서 × 상태 매트릭스 (Stacked Bar)**: 각 스택 세그먼트에 상태색 그라데이션, 라운드 상단 8px.
- **마감 임박 카드**:
  - 상단 3-bucket 카드를 그라데이션 칩으로(7일=로즈→앰버 그라데이션, 8–14=앰버→옐로우, 15–30=옐로우→에메랄드).
  - 하단 리스트는 좌측에 D-day 컬러 도트 + 호버 시 부서색 글로우.
- **담당자별 활성 업무 TOP 10 (Horizontal Bar)**: 막대를 부서색 매핑 그라데이션(왼→오, 진하게→옅게), 막대 끝에 값 라벨.
- **부서별 평균 진행률**: 진행률 바를 단색→그라데이션(부서색 100% → 부서색 40%) + 트랙에 미세 그리드.
- **연차 히트맵**: 셀을 `linear-gradient`로 강도 표현(0건=transparent, 1=핑크 20%, 2+=핑크 40~60%), 값 0인 셀은 가는 점선 보더만, 셀 사이 gap 4px, 라운드 6px.

### 4-4. 공통
- `tooltipStyle` 업그레이드: `backdrop-blur`, 그라데이션 배경, 보더 `border-white/15`.
- 그리드 라인 색을 `rgba(255,255,255,0.04)`로 더 약하게.
- 모든 축 `tickLine={false} axisLine={false}` 유지.
- 페이지 배경에 매우 옅은 라디얼 그라데이션(상단에 영상 오렌지 4%, 하단에 편집 블루 4%) 한 장만 추가하여 카드들이 떠 보이게.

## 5. 변경 파일

- `src/routes/insights.tsx` — KPI/카드/차트 리디자인, 분기 기본값, 단일 창 재사용 헬퍼, 용어 변경.
- (필요 시) `src/lib/insights.ts` — 변경 없음 예정. 데이터 함수는 그대로.

승인해 주시면 위 순서대로 구현하겠습니다.

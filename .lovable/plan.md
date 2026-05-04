## 원인 분석 및 해결 방안

### 1. 프리뷰에서는 멀쩡한데 배포 URL에서 카드 클릭 시 페이지가 아래로 점프

**원인**
- 프리뷰는 iframe 안에서 앱이 실행되어, iframe 내부 body의 스크롤이 상위 페이지로 전파되지 않습니다. 그래서 포커스/스크롤 부작용이 가려져 보이지 않습니다.
- 배포 URL은 top-level 문서이기 때문에 다음 두 가지가 함께 작동합니다:
  1. `openDetailWindow`가 동기로 `window.open`을 호출하긴 하지만, 그 직후 `getScreenDetails()`가 **권한 프롬프트**를 띄우고, 프롬프트가 닫힐 때 브라우저가 클릭한 카드(activeElement)를 `scrollIntoView`로 강제로 보이게 만듭니다. 이때 카드가 hover로 1.25배 확대된 상태라 "scroll-into-view 위치"가 화면 아래쪽이 되어 페이지가 점프합니다.
  2. `onMouseDown preventDefault`가 적용되어도, popup open 자체가 일부 브라우저(특히 Chromium)에서 opener 문서에 focus 이벤트를 다시 발생시키고, 활성 요소가 카드라면 동일한 자동 스크롤이 일어납니다.

**해결 방안**
- `openDetailWindow` 호출 직전에 `const savedY = window.scrollY`를 저장하고, `requestAnimationFrame` 두 번 후에 `window.scrollTo({ top: savedY, behavior: "instant" })`로 복원합니다. 이렇게 하면 브라우저의 자동 scroll-into-view를 무력화할 수 있습니다.
- 카드 클릭 핸들러에서 `(e.currentTarget as HTMLElement).blur()`를 호출해 활성 요소를 카드에서 떼어냅니다(현재는 hover state만 false로 바꾸고 focus는 그대로).
- `getScreenDetails()` 권한 프롬프트가 점프의 직접적인 유발자이므로, 권한 요청을 **앱 진입 시 1회**만 수행하고 결과(우측 모니터 좌표)를 모듈 변수에 캐시합니다. 이후 `openDetailWindow`는 캐시된 좌표로 동기 `window.open`만 수행하고 `getScreenDetails`를 다시 호출하지 않습니다.

---

### 2. 타임라인의 TODAY 배지가 날짜를 가림 / 빨간 선이 차트 영역까지 이어지지 않음 / 라벨 변경

**원인**
- `TimelineView.tsx` 279~289줄: TODAY 배지는 tick header(높이 36px) 안에 `-top-1 -left-4`로 절대 배치되어, tick 라벨(`5/4` 등)과 동일한 가로 위치에 겹쳐서 텍스트를 덮습니다.
- 빨간 세로선 또한 tick header div의 `top-0 bottom-0` 안쪽에만 그려져 있어, 그 아래 프로젝트 행 영역까지 이어지지 않습니다.

**해결 방안**
- 타임라인 영역을 하나의 grid 컨테이너로 묶고, 그 안에 헤더 + 행 목록을 두며, 그 위에 **`absolute inset-0`로 깔리는 오버레이 div**를 따로 만들어 그 안에 빨간 세로선을 한 번만 그립니다. 선이 헤더부터 마지막 행까지 자연스럽게 관통됩니다.
- TODAY 배지는 tick header 위쪽으로 빼서 음수 top으로 띄우거나(예: `-top-7`), 헤더와 별도의 얇은 라벨 행을 추가합니다. 위치는 `transform: translateX(-50%)`로 선 중앙에 정렬합니다.
- 라벨 텍스트는 "TODAY" → `현재 (M월 D일)`로 변경 (`format(today, "M월 d일")`). 상세페이지의 워크플랜과 동일한 톤으로 통일.

---

### 3. Window B가 같은 화면에 열림(예전엔 두 번째 모니터 풀스크린)

**원인**
- 이전 수정에서 "사용자 제스처 분리로 인한 페이지 점프"를 막기 위해 `window.open`을 **동기**로 먼저 호출하도록 바꿨고, `getScreenDetails()`는 그 뒤로 미뤘습니다(`src/lib/sync.ts` 36~70줄).
- 이때 동기 open은 항상 현재 화면 좌표(left=0, top=0, availWidth/Height)를 features 문자열로 사용합니다. 이후 `moveTo/resizeTo`로 두 번째 모니터로 옮기려 하지만, 다수 브라우저는 popup의 `moveTo/resizeTo`를 이미 표시 중인 창에 대해 **무시**(특히 Chrome의 multi-screen 정책)하기 때문에 결과적으로 항상 현재 화면에서 열립니다.

**해결 방안 (1번 해결책과 함께 자연스럽게 해결됨)**
- 권한 요청과 우측 모니터 좌표 탐색을 **앱 마운트 시점**(혹은 사용자가 처음으로 카드 hover/click한 직후)에 한 번만 수행해 모듈 변수에 캐싱합니다.
- 캐시된 좌표가 있으면 `window.open(url, name, "left=...,top=...,width=...,height=...")`를 곧바로 그 좌표로 호출 → 처음부터 두 번째 모니터에서 풀스크린으로 열립니다. 동기 호출이라 사용자 제스처도 유지됩니다.
- 캐시가 없으면(권한 미부여/단일 모니터) 현재 화면 풀스크린으로 fallback.

---

### 4. 진행률 바에 "37%" 같은 텍스트가 잘릴 때

**원인**
- `TimelineView`의 진행률 바, 그리고 `KpiBar`/카드 등의 게이지는 너비가 좁아도 항상 텍스트를 렌더합니다. 작은 너비 + `overflow: hidden`이 만나 글자가 잘립니다(업로드한 두 번째 이미지의 "37%[" 처럼).

**해결 방안**
- 공통 규칙: **바 내부 가용폭이 텍스트 최소폭(대략 28~32px)보다 작으면 텍스트를 숨김**.
- 구현: `widthPct`(또는 픽셀)를 계산해 임계값 미만일 때 `<span>%</span>`를 렌더하지 않는 조건을 추가합니다. 필요한 곳:
  - `TimelineView.tsx`: 377~388줄의 progress/D-day 라벨. `widthPct`로 분기.
  - `KpiBar.tsx`: 진행률 게이지 텍스트. 컴포넌트 내부에서 ref로 px 너비 측정 후 분기(또는 부모가 전달한 percent 기준).
  - `ProjectCard.tsx`의 진행률 표시는 카드 본문이라 잘릴 일은 없지만, 동일 헬퍼 함수로 통일 가능.
- 헬퍼 추가 제안: `src/lib/utils.ts`에 `shouldShowBarLabel(widthPx, minPx = 32)` 같은 함수.

---

## 기술적 변경 요약 (구현 시)

```text
src/lib/sync.ts
  + 모듈 변수 cachedRightScreen: { left, top, width, height } | null
  + ensureScreenDetails(): 1회 권한 요청, 결과 캐시
  ~ openDetailWindow(): 캐시 사용 → 동기 window.open만, getScreenDetails 제거

src/routes/index.tsx (또는 __root.tsx)
  + 마운트 시 ensureScreenDetails() 호출 (사용자 제스처 직후가 안전)
  ~ 카드 onClick에서 savedY 저장 → openDetailWindow → rAF×2 후 scrollTo 복원
  ~ onClick 핸들러 내부에서 currentTarget.blur()

src/components/control/TimelineView.tsx
  ~ 컨테이너 구조 재배치: 헤더와 행을 감싸는 wrapper + absolute overlay
  ~ 빨간 세로선: overlay에 한 번만, top-0 bottom-0
  ~ TODAY 배지: 헤더 위쪽으로 분리, "현재 (M월 d일)" 텍스트
  ~ 진행률/D-day 라벨: widthPct < threshold면 숨김

src/components/control/KpiBar.tsx
  ~ 진행률 텍스트: 바 너비가 충분할 때만 렌더
```

질문 없이 그대로 진행해도 되는지, 또는 4번을 "텍스트는 항상 바 외부(우측)에 표시"로 바꾸고 싶은지만 알려주시면 바로 구현하겠습니다.
## 문제
`src/styles.css` 4번째 줄의 Pretendard URL `@import`가 `@import "tailwindcss"` 뒤에 위치해 PostCSS가 "@import must precede all other statements" 에러를 발생시킴 → CSS 빌드 실패 → 프리뷰 흰 화면.

## 수정
`src/styles.css` 1~4행 순서 재배치. URL `@import`를 최상단으로 옮김.

```css
@import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css");
@import "tailwindcss" source(none);
@source "../src";
@import "tw-animate-css";
```

## 변경 파일
- `src/styles.css` (1~4행만)

## 검증
- 저장 후 dev-server 로그에서 `[vite:css][postcss] @import must precede` 에러가 사라지는지 확인
- 프리뷰 새로고침하여 화면 정상 표시 확인

export type Department = "공통" | "영상" | "편집" | "UX";
export type Status = "진행" | "상시" | "대기" | "완료";

export interface ThumbnailConfig {
  /** image index from `images` to use as cover */
  coverIndex: number;
  /** focal point for future custom cropping (0..1) */
  focal: { x: number; y: number };
  /** zoom factor for cover crop */
  zoom: number;
  /** order indices for hover slideshow sequence */
  sequence: number[];
}

export interface Project {
  id: string;
  title: string;
  department: Department;
  status: Status;
  progress: number;
  deadline: string;
  pm: string;
  members: string[];
  image: string; // primary cover (first of images)
  images: string[]; // ≥3 high-res for hover slideshow
  thumbnail: ThumbnailConfig;
}

// Department neon accent map (used by tags & dots)
export const DEPT_COLOR: Record<Department, string> = {
  공통: "#FFFFFF",
  영상: "#FF5C00",
  편집: "#007BFF",
  UX: "#FF007F",
};

/**
 * FRESH VERIFIED UNSPLASH POOL
 * High-resolution design/studio oriented images.
 */
const POOL: Record<Department, string[]> = {
  영상: [
    "1492551557933-34265f7af79e", // Video gear
    "1536440136628-849c177e76a1", // Cinema
    "1550745165-9bc0b252726f", // Tech setup
    "1485846234645-a62644f84728", // Movie clapper
    "1522860335839-aa0086395e0e", // Camera lens
    "1516035069371-29a1b244cc32", // Photography
    "1574717024653-61fd2cf4d44d", // Editing
    "1500051638674-ff996a0ec29e", // Drone/Video
  ],
  편집: [
    "1542204165-65bf26472b9b", // Books/Graphic
    "1562613531-d2bf327b82f0", // Magazine
    "1586717791821-3f44a563fa4c", // Print layout
    "1626785774573-4b799315345d", // Graphic design
    "1506452305024-9d3f02d1c9b3", // Sketchbook
    "1543004218-ee141104e7f3", // Typography
    "1611162617213-7d7a39e9b1d7", // Packaging
    "1517694712202-14dd9538aa97", // Laptop code/design
  ],
  UX: [
    "1558655146-9f40138edfeb", // App interface
    "1581291518857-4e27b48ff24e", // Prototyping
    "1545235617-9465d2a55698", // UI design
    "1551650975-87deedd944c3", // Mobile UX
    "1559028012-481c04fa702d", // Modern interface
    "1586717791821-3f44a563fa4c", // Design system
    "1542744173-8e7e53415bb0", // Tech office
    "1517292987719-0369a794ec0f", // Web design
  ],
  공통: [
    "1497032628192-86f99bcd76bc", // Clean office
    "1499951360447-b19be8fe80f5", // Studio space
    "1522071823991-b1ae5fe23042", // Team meeting
    "1531403009284-440f080d1e12", // Collaboration
    "1552664730-d307ca884978", // Workshop
    "1561070791-2526d30994b8", // Minimalist workspace
    "1586953208448-b95a79798f07", // Abstract design
    "1620712943543-bcc4688e7485", // Creative tools
  ],
};

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1600&q=85&auto=format&fit=crop`;

function pickImages(dept: Department, seed: number): string[] {
  const ids = POOL[dept];
  const out: string[] = [];
  // Ensure we get 4 unique high-res images
  for (let i = 0; i < 4; i++) {
    const id = ids[(seed + i * 2) % ids.length];
    out.push(img(id));
  }
  return Array.from(new Set(out)).slice(0, 4);
}

const DEPTS: Department[] = ["공통", "영상", "편집", "UX"];
const STATUSES: Status[] = ["진행", "상시", "대기", "완료"];

const PMS = [
  "김도윤", "한지오", "서지훈", "문가람", "백연우", "이도하", "정유진",
  "차서후", "유노아", "박세린", "장우진", "오하린", "조윤서", "신예찬",
  "강하윤", "임도현", "윤서아", "노태경", "허재이", "민하준",
];
const MEMBERS = [
  "이서아", "박민준", "최유나", "정하늘", "오세진", "윤다은", "김다인",
  "노유진", "장태오", "임수빈", "조시현", "허재이", "강서윤", "민하준",
  "김소율", "전이안", "송하랑", "권시우", "강한별", "백도윤", "이루다",
  "박서진", "한지율", "양재민", "고은채",
];

const TITLES = [
  "브랜드 리뉴얼 마스터 가이드라인",
  "신규 캠페인 키비주얼",
  "분기 리포트 모션 그래픽",
  "온보딩 플로우 리디자인",
  "디자인 시스템 토큰 정비",
  "프로모션 비디오 컷 편집",
  "사내 위클리 뉴스레터 템플릿",
  "모바일 앱 아이콘 패키지 리프레시",
  "런칭 티저 영상 시리즈",
  "글로벌 랜딩 페이지 개편",
  "B2B 세일즈 덱 비주얼",
  "이벤트 키비주얼 & 굿즈",
  "리테일 디스플레이 광고",
  "대시보드 정보 구조 개선",
  "프로덕트 사진 후보정",
  "분기 IR 모션 인포그래픽",
  "메인 KV 콘셉트 스터디",
  "구독 전환 페이지 A/B",
  "내부 세미나 인트로 영상",
  "검색 결과 화면 개편",
  "광고 캠페인 컷 편집",
  "마이크로 인터랙션 가이드",
  "푸시 알림 카피 비주얼",
  "결제 플로우 시각화",
  "온라인 매거진 표지",
  "런칭 트레일러 색보정",
  "타이포그래피 리파인",
  "프로모션 LP 일러스트",
  "데이터 비주얼라이제이션",
  "팀 채용 브랜드 페이지",
  "UI 컴포넌트 라이브러리 고도화",
  "스토리보드 시각화 워크샵",
];

function makeMembers(seed: number): string[] {
  const n = 2 + (seed % 4);
  const start = (seed * 3) % MEMBERS.length;
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(MEMBERS[(start + i) % MEMBERS.length]);
  return Array.from(new Set(out));
}

function makeDeadline(seed: number, status: Status): string {
  if (status === "상시") return "상시";
  const d = new Date(2026, 4, 1);
  d.setDate(d.getDate() + ((seed * 7) % 90));
  return d.toISOString().slice(0, 10);
}

export const MOCK_PROJECTS: Project[] = Array.from({ length: 48 }, (_, i) => {
  const department = DEPTS[i % DEPTS.length];
  const status =
    i % 9 === 0 ? "완료" : i % 5 === 0 ? "대기" : i % 4 === 0 ? "상시" : "진행";
  const progress =
    status === "완료" ? 100 : status === "대기" ? (i * 7) % 20 : 25 + ((i * 13) % 70);
  const images = pickImages(department, i + 1);
  return {
    id: `p-${String(i + 1).padStart(3, "0")}`,
    title: TITLES[i % TITLES.length] + (i >= TITLES.length ? ` V${Math.floor(i / TITLES.length) + 1}` : ""),
    department,
    status,
    progress,
    deadline: makeDeadline(i + 1, status),
    pm: PMS[i % PMS.length],
    members: makeMembers(i + 2),
    image: images[0],
    images,
    thumbnail: {
      coverIndex: 0,
      focal: { x: 0.5, y: 0.5 },
      zoom: 1,
      sequence: images.map((_, idx) => idx),
    },
  };
});

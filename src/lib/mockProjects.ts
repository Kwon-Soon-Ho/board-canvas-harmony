export type Department = "영상" | "편집" | "UX";
export type Status = "진행" | "상시" | "대기" | "완료";

export interface ThumbnailConfig {
  coverIndex: number;
  focal: { x: number; y: number };
  zoom: number;
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
  image: string; 
  images: string[]; 
  thumbnail: ThumbnailConfig;
}

export const DEPT_COLOR: Record<Department, string> = {
  영상: "#FF5C00",
  편집: "#007BFF",
  UX: "#FF007F",
};

const POOLS: Record<Department, string[]> = {
  영상: [
    "1536240478770-bbf43356df13", "1492691523567-6119e289df3a", "1515634928517-2a4eaa194fb1",
    "1485846234645-a62644f84728", "1550745127-d0d01d58d4f0", "1535016120720-40c646be44d0",
    "1574717024653-61fd2cf4d44d", "1506157786151-b8491531f063", "1524985069026-dd778a51c967",
    "1478720566765-e137c1645317", "1598897340027-e67b67232230", "1501446529957-6226bd447c46"
  ],
  편집: [
    "1558655140-709c46e8762e", "1626785774625-ddcddc245eab", "1509343256512-d77a5fd3221d",
    "1561070791-2526d30994b5", "1544716278-ca5e3f4abd8c", "1586075010472-9859ff70bbd1",
    "1516321318423-f06f85e504b3", "1515378960530-7c0da6231fb1", "1550684848-fac1c5b4e853",
    "1542744094-24638eff58bb", "1534670007418-fbb7f6cf32c3", "1519389950473-47ba0277781c"
  ],
  UX: [
    "1581291518633-83b4b2435433", "1586717791821-3f44a563df4c", "1512941937669-90a1b58e7e9c",
    "1507238691740-187a5b1d37b8", "1460925895917-afdab827c52f", "1499951360447-b19be8fe80f5",
    "1551650975-87deedd944c3", "1522542550221-31fd19b45641", "1555066931-4365d14bab8c",
    "1551434678-e076c223a692", "1531403009184-a8a4a56057a6", "1508921912186-1d13951df3c1"
  ],
};

const img = (id: string) => `https://images.unsplash.com/photo-${id}?q=80&w=1200&auto=format&fit=crop`;

const DEPTS: Department[] = ["영상", "편집", "UX"];
const STATUSES: Status[] = ["진행", "상시", "대기", "완료"];
const PMS = ["김도윤", "한지오", "서지훈", "문가람", "백연우", "이도하", "정유진", "차서후", "유노아", "박세린", "장우진", "오하린", "조윤서", "신예찬", "강하윤", "임도현"];
const MEMBERS = ["이서아", "박민준", "최유나", "정하늘", "오세진", "윤다은", "김다인", "노유진", "장태오", "임수빈"];

const TITLES: Record<Department, string[]> = {
  영상: ["시네마틱 4K 프로모션", "모션 그래픽 오프닝", "브랜드 필름 에디팅", "유튜브 시리즈 편집", "CF 광고 영상 제작", "인터뷰 다큐멘터리", "3D 제품 렌더링", "뮤직비디오 컬러그레이딩", "티저 트레일러", "이벤트 현장 스케치", "숏폼 챌린지 시리즈", "기업 홍보 영상", "디지털 사이니지 모션", "캠페인 히어로 비디오", "SNS 프로모션 영상", "드론 항공 촬영본"],
  편집: ["브랜드 가이드북 디자인", "매거진 레이아웃 시스템", "타이포그래피 포스터", "패키지 그래픽 시스템", "전시 아이덴티티", "애뉴얼 리포트", "로고 리뉴얼 가이드", "룩북 에디토리얼", "커스텀 서체 개발", "오프라인 팝업 그래픽", "명함 및 스테이셔너리", "인포그래픽 리포트", "일러스트레이션 패키지", "북 디자인 프로젝트", "메뉴얼 시스템 구축", "굿즈 비주얼 가이드"],
  UX: ["모바일 뱅킹 앱 개편", "디자인 시스템 고도화", "구독 플랫폼 웹 대시보드", "이커머스 결제 흐름 개선", "신규 온보딩 프로세스", "스마트 홈 인터페이스", "CRM 툴 리디자인", "여행 예약 앱 프로토타입", "반응형 랜딩 페이지", "관리자 페이지 UI 시스템", "콘텐츠 플랫폼 UX 스터디", "AI 어시스턴트 GUI", "건강 관리 앱 인터랙션", "피트니스 워치 UI", "커뮤니티 웹 리뉴얼", "B2B SaaS 프로덕트 디자인"],
};

export const MOCK_PROJECTS: Project[] = Array.from({ length: 48 }, (_, i) => {
  const dept = DEPTS[i % DEPTS.length];
  const pool = POOLS[dept];
  const titleList = TITLES[dept];
  const title = titleList[Math.floor(i / DEPTS.length)] || `${dept} 프로젝트 ${i}`;
  
  // Ensure at least 3 images per project, rotated from the pool
  const imgCount = 3;
  const images = Array.from({ length: imgCount }, (_, j) => {
    const idx = (i * imgCount + j) % pool.length;
    return img(pool[idx]);
  });
  
  const status = STATUSES[i % STATUSES.length];
  const deadline = new Date(2026, 4, 1 + (i % 30)).toISOString().slice(0, 10);

  return {
    id: `p-${String(i + 1).padStart(3, "0")}`,
    title,
    department: dept,
    status,
    progress: 20 + (i * 7) % 80,
    deadline: status === "상시" ? "상시" : deadline,
    pm: PMS[i % PMS.length],
    members: Array.from(new Set([MEMBERS[i % MEMBERS.length], MEMBERS[(i + 1) % MEMBERS.length]])),
    image: images[0],
    images,
    thumbnail: {
      coverIndex: 0,
      focal: { x: 0.5, y: 0.5 },
      zoom: 1,
      sequence: Array.from({ length: images.length }, (_, j) => j),
    },
  };
});

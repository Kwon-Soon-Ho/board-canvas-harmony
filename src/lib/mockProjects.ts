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
    "e4lWaiRrQwo", "iBdlZiMY6nM", "7BsVs1WozGw", "17pZVer2Rhs", "MH2XPRA_fm4",
    "kzJOISwdpGc", "7JShZSKl-Xc", "fSPfE2KuHp4", "RAAzOnAHlCc", "bpbevci8_XI"
  ],
  편집: [
    "0hiIRLV3c64", "goTw482Jwoo", "2mr-cjSJHD8", "QrVG5BIqV28", "AWcZ8WSY2W0",
    "GRwP3etjaO4", "_SHxt6JI1qc", "c3la3yZkpxA", "ixOSD6IDQJ0", "2ll0H7sFIz4"
  ],
  UX: [
    "qOA1-UjXxSc", "4CCD0YYODL8", "2240pvzVP1A", "K7igmbb11NQ", "9BVDg1EelC8",
    "UX-yo33LgPA", "_-86XIfqgwA", "s4NiSN2FM-A", "HaN5SBZIVNw", "t9Kklq8SsmY"
  ],
};

const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80&w=800`;

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
  
  const imgIndices = [(i * 3) % pool.length, (i * 3 + 1) % pool.length, (i * 3 + 2) % pool.length];
  const images = imgIndices.map(idx => img(pool[idx]));
  
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
      sequence: [0, 1, 2],
    },
  };
});

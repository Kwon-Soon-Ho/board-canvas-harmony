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
    "1492551557933-34265f7af79e", "1536440136628-849c177e76a1", "1550745165-9bc0b252726f",
    "1485846234645-a62644f84728", "1522860335839-aa0086395e0e", "1516035069371-29a1b244cc32",
    "1574717024653-61fd2cf4d44d", "1500051638674-ff996a0ec29e", "1478720566765-8bb91170e23f",
    "1535016120720-40c646be44da", "1490971688637-f2362b74aeae", "1523240795612-9a054b0db644",
    "1470225620780-dba8ba36b745", "1493711662062-fa541adb3fc8", "1518676515622-b6607d346e99",
    "1516280440614-37939bb912b5", "1506157786401-b73976552621", "1514467317777-018e87b9ea7a",
    "1512070673716-952206751a44", "1524995997946-a1c2e315a42f", "1492691523562-29937e424af9",
    "1508700115892-45ecd05ae2ad", "1559133967-686a93944de4", "1495352494455-1520188aa14a",
  ],
  편집: [
    "1542204165-65bf26472b9b", "1562613531-d2bf327b82f0", "1586717791821-3f44a563fa4c",
    "1626785774573-4b799315345d", "1506452305024-9d3f02d1c9b3", "1543004218-ee141104e7f3",
    "1611162617213-7d7a39e9b1d7", "1517694712202-14dd9538aa97", "1558655146-9f40138edfeb",
    "1586717791821-3f44a563fa4c", "1513346940221-6f673d962e97", "1534670007418-fbb796ce32c2",
    "1453991288008-a83ad7fc9730", "1503387762223-f3c325ef9e1c", "1515248183841-f762f26ad6c2",
    "1531346878347-ba0bbbbe270a", "1455390582263-12f7ef33e00b", "1498184970415-32e73551527a",
    "1512314889337-44a759240edc", "1508197142825-6b21b5c47672", "1507208773366-473d84f881f2",
    "1450101496222-0751f72e93a6", "1516315720237-7746973c5a61", "1528698827-c11540f28e2b",
  ],
  UX: [
    "1581291518857-4e27b48ff24e", "1545235617-9465d2a55698", "1551650975-87deedd944c3",
    "1559028012-481c04fa702d", "1542744173-8e7e53415bb0", "1517292987719-0369a794ec0f",
    "1498050108023-c5249f4df085", "1512314889337-44a759240edc", "1519389950417-18c7a3d20080",
    "1460925895903-0d2746d547f2", "1586717791821-3f44a563fa4c", "1522541026335-a5d2ad7b3cd2",
    "1512290923902-84f13c749463", "1486312338242-a560c7493c5d", "1551033042-26d0b5c92411",
    "1508830524258-a8475c74164b", "1522071823991-b1ae5fe23042", "1531403009284-440f080d1e12",
    "1552664730-d307ca884978", "1561070791-2526d30994b8", "1586953208448-b95a79798f07",
    "1516321312338-758a0327705e", "1555066931-4365d14bab8c", "1541462608-87545ca30401",
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

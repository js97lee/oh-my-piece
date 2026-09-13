import heroBannerTwo from "../../assets/hero-banner-2.jpg";
import heroBannerThree from "../../assets/hero-banner-3.jpg";
import heroBannerOne from "../../assets/hero-banner.jpg";

export const heroBanners = [
  { src: heroBannerOne, alt: "오마이피스 - 매일 카톡으로 쌓이는 학습 습관" },
  { src: heroBannerTwo, alt: "오마이피스 영어 - 하루 단어 세 개로 시작하는 영어 루틴" },
  { src: heroBannerThree, alt: "오마이피스 수학 - 매일 한 문제씩 키우는 수학 자신감" },
];

export const flowSteps = [
  { icon: "book", title: "콘텐츠 선택", description: "관심 있는 콘텐츠 구독권을 고릅니다." },
  { icon: "clock", title: "발송 시간 설정", description: "원하는 요일과 시간을 선택합니다." },
  { icon: "send", title: "샘플 즉시 발송", description: "첫 콘텐츠를 카카오톡으로 바로 받아봅니다." },
];

export const serviceLinks = [
  { to: "/", label: "홈" },
  { to: "/notices", label: "공지사항" },
  { to: "/FAQ", label: "FAQ" },
];

export const policyLinks = [
  { to: "/policies/terms", label: "이용약관" },
  { to: "/policies/privacy", label: "개인정보처리방침" },
];

export const memberMenuGroups = [
  {
    title: "결제 관리",
    items: [
      { to: "/coupons", label: "쿠폰함", icon: "ticket" },
      { to: "/payments", label: "결제 내역", icon: "card" },
    ],
  },
  {
    title: "선물",
    items: [
      { to: "/gifts", label: "콘텐츠 선물하기", icon: "gift" },
      { to: "/gifts/sent", label: "보낸 선물", icon: "gift" },
      { to: "/gifts/received", label: "받은 선물", icon: "gift" },
    ],
  },
  {
    title: "계정",
    items: [{ to: "/account", label: "계정", icon: "settings" }],
  },
];

export const footerSections = [
  { title: "서비스", links: serviceLinks },
  { title: "정책", links: policyLinks },
  {
    title: "고객센터",
    open: true,
    lines: [
      "카카오톡 친구추가 : 오마이피스",
      "이메일 : studio.realday@gmail.com",
      "평일 10:00 - 18:00",
      "점심 12:00 - 13:00",
      "주말/공휴일 휴무",
    ],
  },
  {
    title: "사업자 정보",
    lines: [
      "리얼데이 | 대표 : 이지수",
      "사업자등록번호 : 146-11-03027",
      "통신판매업신고 : 제2025-서울광진-1581호",
      "이메일 : studio.realday@gmail.com",
      "서울특별시 광진구 아차산로27길 29, B01",
    ],
  },
];

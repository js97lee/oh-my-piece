# 오마이피스 모바일 랜딩 (React)

오마이피스 모바일 랜딩 페이지를 React + Vite 기반으로 구성한 프로젝트입니다.
PC에서는 512px 폭의 모바일 커머스 페이지로 중앙 정렬되며, 작은 모바일 화면에서는 100% 폭으로 동작합니다.

## 실행 방법

```bash
npm install
npm run dev
```

기본 개발 서버 주소: `http://localhost:5173`

## 프로젝트 구성

- `src/App.jsx`: 라우팅
- `src/main.jsx`: React 엔트리 포인트
- `src/pages`: 랜딩, 콘텐츠 상세, 공지사항, FAQ, 정책, 마이페이지
- `src/components`: 레이아웃, 콘텐츠, 카탈로그, 정보 페이지 공통 UI
- `src/data`: 콘텐츠와 사이트 안내 데이터
- `src/styles`: 디자인 토큰과 전역 스타일
- `vercel.json`: 클라이언트 라우트 리라이트 설정

## 주요 화면

- 자동 전환 히어로 배너
- 콘텐츠 카드와 콘텐츠별 상세 페이지
- 이용방법 안내
- 카카오 로그인 진입 UI
- 분리 페이지 라우트: `/notices`, `/FAQ`, `/mypage`, `/contents/:slug`, `/policies/terms`, `/policies/privacy`

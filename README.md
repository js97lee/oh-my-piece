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

## 카카오 로그인

1. `.env.local`에 REST API 키를 넣습니다. (`.env.example` 참고)
2. [카카오 개발자 콘솔](https://developers.kakao.com/) → 내 애플리케이션 → **카카오 로그인** → **Redirect URI**에 아래를 모두 등록합니다.
   - `http://localhost:5173/mypage`
   - `http://localhost:5174/mypage` (포트가 다를 때)
   - `https://oh-my-piece.vercel.app/mypage`
3. 카카오 로그인 활성화, 필요 시 닉네임/이메일 동의 항목을 설정합니다.
4. Vercel Production/Preview 환경변수:
   - `VITE_KAKAO_REST_API_KEY`
   - `KAKAO_REST_API_KEY` (토큰 교환 API용, 값은 REST API 키와 동일)
5. Redirect URI는 기본으로 `${현재 origin}/mypage`를 사용하므로 로컬과 배포 도메인이 각각 자동 적용됩니다.

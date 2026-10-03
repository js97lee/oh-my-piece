# 오마이피스 모바일 랜딩 (React)

오마이피스 모바일 랜딩 페이지를 React + Vite 기반으로 구성한 프로젝트입니다.
PC에서는 512px 폭의 모바일 커머스 페이지로 중앙 정렬되며, 작은 모바일 화면에서는 100% 폭으로 동작합니다.

## 알리고 알림톡 테스트 페이지

`/alimtalk-test`에서 기존에 등록한 카카오채널과 승인된 알림톡 템플릿으로 수신자 1명에게 테스트할 수 있습니다.
채널 가입자 목록 조회 기능은 없으므로 테스트할 사용자의 휴대전화 번호를 직접 입력합니다.

1. `frontend/.env.local`에 다음 서버 환경변수를 설정합니다. 기존 파일이 있다면 덮어쓰지 않고 추가합니다.

   ```dotenv
   ALIGO_API_KEY=발급받은_API_키
   ALIGO_USER_ID=알리고_아이디
   ALIGO_SENDER_KEY=등록된_발신프로필_키
   ALIGO_SENDER_PHONE=등록된_발신번호
   ALIGO_TEST_TOKEN=테스트_접근용_임의의_긴_비밀번호
   ```

   `ALIGO_TEST_TOKEN`은 알리고 계정 비밀번호가 아닙니다. `openssl rand -hex 24` 등으로 별도 생성합니다.
   다섯 변수는 서버 전용입니다. `VITE_` 접두사를 붙이면 클라이언트에 노출될 수 있으므로 붙이지 않습니다.

2. `frontend`에서 `npm run dev`를 실행하고 `http://localhost:5173/alimtalk-test`를 엽니다. 환경변수를 변경하면 서버를 다시 실행합니다.
3. `ALIGO_TEST_TOKEN` 값을 화면의 테스트 접근 비밀번호에 입력하고 **템플릿 불러오기**를 누릅니다.
4. 승인 템플릿, 수신번호, 템플릿 변수(본문·강조 제목·버튼 링크)를 입력합니다. 이름 입력란은 알리고 수신자 기록용이며 `#{고객명}` 등의 변수는 별도로 입력합니다.
5. **API 테스트**는 `testMode=Y`로 요청하며 카카오톡은 전송되지 않습니다. 실제 수신을 확인하려면 **실제 발송**을 선택한 뒤 **알림톡 1건 실제 발송**을 누릅니다. 실제 발송은 알리고 잔액을 사용합니다.
6. 실제 발송 응답의 메시지 ID(`mid`)로 **전달 결과 조회**를 누릅니다. 발송 API의 `code=0`은 접수 성공이며 최종 수신 성공이 아닙니다. 결과는 비동기로 반영됩니다.

승인된 템플릿 문구와 개행은 서버에서 보존하며 변수만 치환합니다. 버튼 링크와 강조 제목도 함께 치환합니다.
SMS 대체 발송은 `failover=N`으로 고정합니다. 네트워크 오류 시 자동 재발송하지 않으므로, 접수 여부가 불명확하면 알리고 전송 내역부터 확인합니다.
일반 알림톡 본문·버튼·강조 제목을 지원하며, 미리보기에서 이미지와 부가 문구 등은 실제 카카오톡 화면과 다를 수 있습니다.

### API와 배포

- `GET /api/alimtalk/config`: 설정 상태와 마스킹한 발신번호
- `GET /api/alimtalk/templates`: 등록된 템플릿 조회
- `POST /api/alimtalk/send`: 승인된 템플릿으로 수신자 1명에게 발송
- `GET /api/alimtalk/history?mid=...`: 메시지별 전달 결과 조회

모든 API는 `Authorization: Bearer <ALIGO_TEST_TOKEN>`을 요구합니다. 기존 브라우저 기반 로그인과 독립된 테스트 운영자용 접근 제어이며, 고객에게 비밀번호를 배포하지 않습니다.
설정되지 않은 환경에서는 발송 API가 열리지 않습니다. 테스트 페이지를 닫거나 새로고침하면 입력한 비밀번호와 발송 결과는 사라집니다.

로컬 개발/미리보기는 `vite.alimtalk-api.js`, Vercel은 `api/alimtalk/[action].js`가 같은 `server/alimtalk.js`를 사용합니다.
Vercel에서는 위 환경변수를 설정한 뒤 재배포합니다. API IP 인증을 사용하는 계정은 서버의 실제 외부 IP가 허용되어 있어야 합니다.
외부 API 제한 시간은 요청당 15초이며 발송 전에 템플릿을 재조회합니다.

`alim-server`의 Python 파일은 공급자 예제로 유지했습니다. 현재 공식 가이드는 `apikey`와 `userid` 인증을 명시하므로 예전 예제의 토큰 발급 단계는 추가하지 않았습니다.
별도 Python 서버나 추가 npm 의존성 없이 기존 Vite/Vercel 실행 환경을 사용합니다.

```bash
npm run test:alimtalk  # 모의 응답으로 검증하며 실제 메시지는 발송하지 않습니다.
npm run build
```

참고: [알리고 알림톡 API 가이드](https://smartsms.aligo.in/alimapi.html)

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

## Supabase 회원가입·로그인

Node.js 22 이상을 사용합니다. `.env` 또는 `.env.local`에 다음 값을 설정합니다.

```dotenv
APP_BASE_URL=http://localhost:5173
SUPABASE_URL=https://프로젝트주소.supabase.co
SUPABASE_PUBLISHABLE_KEY=발급받은_공개키
```

모든 인증 요청은 같은 출처의 `/api/auth/*` 서버를 거칩니다. 환경변수 이름에는 `VITE_` 접두사를 붙이지 않습니다.
`SUPABASE_SECRET_KEY`와 `DATABASE_URL`은 일반 회원가입·로그인에 사용하지 않습니다.
로컬 개발과 미리보기는 `vite.auth-api.js`, Vercel은 `api/auth/[action].js`가 같은 서버 코드를 사용합니다.
정적 파일만 배포하는 호스팅에서는 인증 API가 실행되지 않습니다.

### 인증 설정

1. Supabase **Authentication → Sign In / Providers → Email**에서 이메일 가입을 허용하고 **Confirm email**을 켭니다.
2. **Authentication → URL Configuration**의 Site URL을 서비스 주소로 설정합니다.
3. Redirect URLs에 아래 주소를 등록합니다. `?**`는 가입 후 복귀 경로와 PKCE 흐름 식별자 쿼리를 허용합니다.
   - `http://localhost:5173/api/auth/callback?**`
   - `https://실제서비스도메인/api/auth/callback?**`
4. 배포 환경의 `APP_BASE_URL`을 실제 HTTPS 서비스 주소로 설정합니다. Origin 검사와 인증 메일의 복귀 주소에 사용하므로, 브라우저 주소의 호스트·포트가 반드시 일치해야 합니다.
5. Supabase 기본 가입 인증 메일 템플릿의 `{{ .ConfirmationURL }}`을 사용합니다. 이 구현은 PKCE `code` 콜백을 처리합니다. `token_hash` 전용 커스텀 템플릿과는 호환되지 않습니다.
6. 일반 사용자에게 인증 메일을 보내려면 Supabase에서 **Custom SMTP**를 설정하고 발신 도메인을 인증합니다. 기본 메일 서비스는 발송 대상·횟수 제한이 있으므로 운영 발송을 맡기지 않습니다.

다른 포트로 개발 서버를 실행한다면 환경변수와 Supabase Redirect URLs에도 같은 주소를 반영합니다. 예:

```bash
APP_BASE_URL=http://localhost:5196 npm run dev -- --host localhost --port 5196 --strictPort
```

### 사용 흐름과 저장

- `/signup`: 이름·연락처·이메일·8자 이상 비밀번호를 입력합니다. 선택한 학습 정보는 Supabase `auth.users.user_metadata`에 함께 저장합니다. 인증 기능만 사용할 때는 별도 프로필 테이블이나 SQL 마이그레이션이 필요하지 않습니다. 결제 기능에는 아래 결제 마이그레이션을 적용합니다.
- 이메일 확인이 필요한 경우 인증 안내와 재발송 버튼을 표시합니다. 가입을 시작한 **동일한 브라우저**에서 메일 링크를 열어야 PKCE 인증을 마칠 수 있습니다. 이미 가입한 이메일에도 가입 여부를 노출하지 않는 안내를 표시합니다.
- `/login`: 이메일·비밀번호 로그인 후 원래 열려던 내부 페이지로 복귀합니다. 비밀번호 오류, 이메일 미인증, 요청 제한을 구분해 안내합니다.
- `/account`: 서버에서 검증한 계정·학습 정보를 표시하고 현재 로그인 세션을 로그아웃합니다. 전화번호는 미인증 연락처이며, 카카오 로그인은 알림톡 수신 동의를 의미하지 않습니다.
- 회원 전용 화면은 초기 세션 확인 후 열립니다. 새로고침·탭 전환·주기적 확인 시 세션을 검증하고 필요하면 갱신합니다. 서버 데이터 API를 추가할 때도 각 API에서 사용자와 소유권을 별도로 검증해야 합니다.
- 세션 쿠키는 `HttpOnly`, `SameSite=Lax`, 운영 HTTPS에서는 `Secure`를 사용합니다. 서버는 `getUser()`로 신원을 확인하며 인증 토큰은 응답 JSON이나 localStorage에 저장하지 않습니다. 변경 API는 JSON 및 정확한 Origin을 요구합니다.
- 과거 데모의 로컬 계정·평문 비밀번호·카카오 토큰·미리보기 로그인 상태는 앱 시작 시 제거합니다. 이 계정은 실제 Supabase 계정으로 이전되지 않으므로 다시 가입해야 합니다.
- 실제 계정을 삭제하지 않던 기존 회원 탈퇴 버튼은 제거했습니다. 회원 탈퇴 정책과 데이터 삭제 처리는 별도 구현이 필요합니다.

구독·결제 화면은 아래 나이스페이 연동으로 저장한 본인의 실제 주문·구독 데이터를 표시합니다. 전화번호 인증 및 비밀번호 재설정은 아직 제공하지 않습니다.

### 카카오 로그인 활성화

카카오 인증은 Supabase OAuth로 통합했습니다. Supabase에서 Kakao 제공자가 활성화되어 있을 때 로그인 버튼이 나타납니다.

1. 카카오 개발자 콘솔에서 카카오 로그인을 활성화합니다.
2. 카카오 REST API 키의 Redirect URI에 Supabase가 안내하는 `https://프로젝트주소.supabase.co/auth/v1/callback`을 등록합니다.
3. Supabase **Authentication → Sign In / Providers → Kakao**에 REST API 키와 Client Secret을 입력하고 활성화합니다.
4. 필요한 프로필·이메일 동의 항목을 설정합니다. 이메일을 제공받지 않는 앱이라면 Supabase의 **Allow users without an email** 설정도 확인합니다.
5. 위의 앱 콜백 Redirect URLs도 등록되어 있어야 합니다. 제공자 설정은 최대 1분 캐시되며 화면을 새로고침하면 버튼에 반영됩니다.

기존 `VITE_KAKAO_REST_API_KEY`, `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`, `/api/kakao/token`은 더 이상 사용하지 않습니다.

### 검증

```bash
npm test                 # 인증·알림톡·결제 모의 테스트. 외부 발송·결제 없음
npm run build
npm run test:auth:live    # 선택: 실제 Supabase에 임시 계정을 생성하고 마지막에 삭제
```

실제 연결 검증은 서버의 `SUPABASE_SECRET_KEY`가 필요합니다. 메일을 발송하지 않으며, 로그인·쿠키 세션 복원·만료 갱신·사용자 검증·로그아웃을 확인합니다.
관리자 키는 이 검증과 결제 서버의 주문·구독 저장에 사용하며 인증 API에서는 사용하지 않습니다. 프로세스가 강제 종료되면 정리가 실행되지 않을 수 있으므로 Supabase Auth의 `auth-smoke-...@example.invalid` 테스트 계정을 확인합니다.

참고: [Supabase 서버 인증](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [이메일·비밀번호 인증](https://supabase.com/docs/guides/auth/passwords), [카카오 로그인](https://supabase.com/docs/guides/auth/social-login/auth-kakao)

## 나이스페이 결제·구독

콘텐츠별 **1년 이용권을 한 번 결제**하는 흐름입니다. 자동 갱신이나 정기 청구는 하지 않습니다.
로그인 → `/contents/:slug/purchase` → 나이스페이 결제창 → 서버 승인 → `/payment/result` → `/subscriptions`로 이어집니다.
`/payments`에서는 최근 주문 100건과 상세 결과·영수증을 확인할 수 있습니다.

### 환경변수와 데이터베이스

위 인증 설정에 이어 `.env` 또는 `.env.local`에 다음 값을 설정합니다. 같은 상점에서 발급한 **Server 승인 / Basic 인증** 키 쌍을 사용합니다.

```dotenv
NICEPAY_ENV=sandbox
NICEPAY_CLIENT_KEY=테스트_클라이언트키
NICEPAY_SECRET_KEY=테스트_시크릿키
SUPABASE_SECRET_KEY=Supabase_서버_비밀키
DATABASE_URL=postgresql://사용자:비밀번호@호스트:포트/데이터베이스
```

모든 환경변수는 서버에서 읽습니다. 결제창에 필요한 공개 클라이언트 키만 로그인한 사용자에게 응답합니다. 시크릿 키에는 `VITE_` 접두사를 붙이지 않습니다.

```bash
npm run db:migrate
```

`psql`이 필요하며, 필요하면 `PSQL_BIN`으로 실행 파일 경로를 지정합니다. 마이그레이션은 `supabase/migrations/202610020001_commerce.sql`입니다.
`commerce_orders`, `commerce_subscriptions`와 원자적 주문·승인 처리 함수를 만듭니다. 두 테이블은 RLS를 활성화하고 일반 사용자·익명 사용자의 직접 접근을 차단합니다. 서버가 Supabase 로그인과 주문 소유권을 확인한 뒤 비밀키로 접근합니다.
`DATABASE_URL`은 마이그레이션에만 필요하고, 실행 중인 결제 API는 Supabase API를 사용합니다.

`APP_BASE_URL`은 브라우저에서 여는 정확한 주소로 설정합니다. 로컬 개발 예:

```bash
APP_BASE_URL=http://localhost:5196 npm run dev -- --host localhost --port 5196 --strictPort
```

### 결제 처리와 복구

- 카드·카카오페이 결제창을 지원합니다. 카카오페이는 나이스페이 상점의 해당 결제 수단 계약·활성화가 필요합니다.
- `shared/commerce.js`의 상품·가격을 화면과 서버가 공유합니다. 서버는 클라이언트가 보낸 금액을 사용하지 않고 상품 가격으로 주문합니다.
- 발송 연락처, 한국 시간 기준 발송 시각, 시작일과 1년 이용 기간을 주문에 저장합니다. 같은 콘텐츠의 이용 기간이 겹치는 중복 구독은 차단합니다.
- 주문 생성 재요청은 같은 요청 키로 처리하며, 데이터베이스 잠금과 고유 제약으로 중복 승인·중복 구독 생성을 막습니다.
- 콜백에서 주문 토큰·나이스페이 서명·금액을 검증하고 서버가 승인 API를 호출합니다. 승인 응답을 검증한 뒤 주문 상태와 구독 생성을 한 트랜잭션으로 저장합니다.
- 승인 요청이 끊기거나 응답 검증에 실패하면 망취소를 요청합니다. 결과가 불분명하면 확인 중 상태로 두고, 결과 화면 재조회와 웹훅으로 복구합니다. 망취소 재시도는 나이스페이의 승인 후 1시간 제한을 넘지 않도록 주문 생성 후 1시간 이내에서만 수행합니다.
- 웹훅은 서명 검증 후 나이스페이에 현재 거래를 재조회합니다. 전체 취소 시 구독을 해제하고, 부분 취소·취소 확인 중에는 구독을 일시 중지합니다. 지연된 승인 응답이 취소된 구독을 다시 활성화하지 않습니다.
- 결과 화면은 확인 중 거래를 자동 조회하며 이후에는 **상태 다시 확인**으로 재조회할 수 있습니다. 장시간 미확정 거래·부분 취소는 상점 관리자에서 확인해야 합니다. 별도 주기적 대사 작업과 고객용 환불 요청 화면은 아직 없습니다.

### 배포와 웹훅 등록

Vite에서는 `vite.payments-api.js`, Vercel에서는 `api/payments/[action].js`가 동일한 `server/payments.js`를 실행합니다. Vercel 프로젝트 루트는 `package.json`이 있는 이 Git 저장소의 루트, Node.js는 22 이상으로 설정합니다. 상위 작업 폴더에서는 이 저장소가 `frontend`에 있습니다. 승인·망취소 처리를 위해 결제 함수 최대 실행 시간을 60초로 지정했습니다. 정적 호스팅만으로는 결제가 동작하지 않습니다.

1. 공개 HTTPS 도메인에 배포하고 `APP_BASE_URL`을 해당 주소로 설정합니다.
2. 나이스페이 개발정보의 웹훅 URL에 `https://실제서비스도메인/api/payments/webhook`을 등록합니다. 외부 POST 요청이 로그인·배포 보호 화면 없이 이 경로에 도달해야 합니다. 웹훅 자체 인증은 서버에서 처리합니다.
3. 먼저 `sandbox` 환경과 테스트 키로 인증·승인·결과 화면·구독 반영을 확인합니다. `localhost`에는 나이스페이 서버가 웹훅을 보낼 수 없으므로 공개 테스트 주소에서 웹훅 수신도 검증합니다.
4. 운영 전환 시 `NICEPAY_ENV=production`과 같은 운영 상점의 두 키를 함께 설정하고 재배포합니다. 테스트 거래와 운영 거래는 별도로 조회되며 테스트 구독은 운영 구독으로 바뀌지 않습니다.

웹훅 주소는 코드 생성만으로 나이스페이에 등록되지 않습니다. 상점 관리자에서 등록해야 합니다.

| API | 용도 |
| --- | --- |
| `GET /api/payments/config` | 로그인한 사용자의 결제 환경 확인 |
| `POST /api/payments/checkout` | 주문 생성과 결제창 파라미터 발급 |
| `POST /api/payments/callback` | 나이스페이 인증 결과 수신·서버 승인 |
| `POST /api/payments/webhook` | 결제·취소 결과 재조회와 반영 |
| `GET /api/payments/order?orderId=...` | 본인 주문 확인·미확정 결과 복구 |
| `GET /api/payments/orders` | 본인의 최근 주문 내역 |
| `GET /api/payments/subscriptions` | 본인의 구독 내역 |
| `POST /api/payments/abandon` | 아직 승인을 시작하지 않은 주문 종료 |

### 검증과 현재 범위

```bash
npm run test:payments       # 결제사·저장소 모의 테스트: 외부 결제 없음
npm run test:payments:live  # 실제 Supabase + 결제사 모의 응답: 외부 결제 없음
npm run test:auth:live      # 실제 Supabase 인증 회귀 검증: 메일 발송 없음
npm test
npm run build
```

실제 DB 검증은 `sandbox` 설정과 관리자 키가 필요하며 임시 회원·주문·구독을 만든 뒤 삭제합니다. 강제 종료 시 `payment-db-...@example.invalid` 검증 회원과 연결된 거래가 남을 수 있습니다.

2026-10-02 검증에서 전체 모의 테스트 54개, 빌드, 실제 Supabase의 동시 주문·승인·구독 생성·접근 제어·취소 반영 및 인증 회귀 검사를 통과했습니다. 브라우저에서는 실제 나이스페이 샌드박스 결제창 표시와 주문 내역·미승인 주문 종료를 확인했습니다. 브라우저 도구의 중첩 프레임 조작 제약으로 카드 인증부터 실제 샌드박스 승인까지의 전체 흐름은 확인하지 못했습니다. 운영 전환 전 이 흐름과 공개 주소의 웹훅 수신을 추가 확인해야 합니다.

이번 연동 범위는 본인 구독 구매와 결제·구독 내역입니다. 알리고 정기 발송 작업, 선물 결제, 쿠폰 할인, 정기 청구는 연결하지 않았습니다. 발송 정보는 저장되며 실제 콘텐츠 자동 발송은 별도 작업이 필요합니다.

참고: [나이스페이 Server 승인](https://github.com/nicepayments/nicepay-manual/blob/main/api/payment-window-server.md), [웹훅](https://github.com/nicepayments/nicepay-manual/blob/main/api/hook.md), [취소·망취소](https://github.com/nicepayments/nicepay-manual/blob/main/api/cancel.md), [테스트 결제](https://github.com/nicepayments/nicepay-manual/blob/main/common/test.md), [Vercel 함수 실행 시간](https://vercel.com/docs/functions/configuring-functions/duration)

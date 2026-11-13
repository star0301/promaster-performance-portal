# Pro / Master Performance Portal

토마토솔루션 Pro / Master 자격 보유자 및 합격자를 위한 모바일 중심 실적 조회 웹 서비스입니다.

사용자는 휴대폰 번호와 비밀번호로 로그인하여 자신의 자격, 오픈 실적, 매출 발생 POS, 월별 실적, 수당 지급 내역 등을 확인할 수 있습니다.

## 주요 기능

- Firebase Authentication 기반 로그인
- 로그인 상태 자동 유지
- 합격자 / Pro / Master / Grand Master 자격 표시
- 다음 등급까지 남은 실적 안내
- 파트너사 오픈 매장 / POS / 매출발생 POS 조회
- RI 업무 실적 조회
- 월별 실적 및 수당 조회
- 실적 증빙 Google Form 연결
- 매월 20일 기준 데이터 업데이트

## 기술 스택

- React
- Vite
- JavaScript
- CSS
- Firebase Authentication
- Cloud Firestore
- Firebase Hosting
- Firebase Admin SDK
- Google Sheets API

## 로컬 실행

```bash
npm install
npm run dev
```

## 환경변수

프로젝트 루트에 `.env` 파일이 필요합니다.

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

`.env`와 관리자 인증정보는 Git에 포함하지 않습니다.

## 데이터 업데이트

기존 사용자 실적 및 수당 데이터 변경:

```bash
node scripts/sync-google-sheet.js
node scripts/sync-google-sheet.js --write
```

신규 사용자가 추가된 경우:

```bash
node scripts/create-auth-users.js
node scripts/create-auth-users.js --write

node scripts/sync-google-sheet.js
node scripts/sync-google-sheet.js --write
```

데이터만 변경된 경우 웹사이트 재배포는 필요하지 않습니다.

## 배포

React / CSS 등 웹사이트 코드를 수정한 경우:

```bash
npm run build
firebase deploy --only hosting
```

## 보안

다음 파일 및 디렉터리는 Git에 포함하지 않습니다.

```text
.env
secrets/
firebase-admin.json
인증정보 CSV
```

Firestore는 로그인된 사용자가 자신의 UID에 해당하는 데이터만 조회할 수 있도록 Security Rules로 제한합니다.
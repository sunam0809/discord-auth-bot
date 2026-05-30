# Discord 복구봇 & 인증 시스템

Discord 서버용 OAuth2 인증 + 복구 봇 시스템. 유저가 Discord로 인증하면 역할을 받고, 웹훅으로 알림이 전송되며, 복구 키로 다른 서버에서 인증 유저를 복원할 수 있습니다.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API 서버 + Discord 봇 실행 (port 5000)
- `pnpm --filter @workspace/auth-site run dev` — 인증 웹사이트 실행
- `pnpm run typecheck` — 전체 타입체크
- `pnpm run build` — 빌드
- `pnpm --filter @workspace/api-spec run codegen` — API 훅 및 Zod 스키마 재생성
- `pnpm --filter @workspace/db run push` — NEON DB 스키마 반영

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: NEON PostgreSQL + Drizzle ORM
- Discord: discord.js v14
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite + Tailwind CSS + framer-motion

## Where things live

- `lib/api-spec/openapi.yaml` — API 계약 (source of truth)
- `lib/db/src/schema/` — DB 테이블 정의
  - `guilds.ts` — guild_configs 테이블
  - `members.ts` — verified_members 테이블
  - `recovery.ts` — recovery_keys 테이블
- `artifacts/api-server/src/routes/` — API 라우트
  - `auth.ts` — Discord OAuth2 콜백, 인증 URL 생성
  - `guilds.ts` — 길드 설정, 멤버 목록, 통계
  - `recovery.ts` — 복구 키 생성 및 사용
- `artifacts/api-server/src/bot.ts` — Discord 봇 (슬래시 커맨드)
- `artifacts/auth-site/src/` — 인증 웹사이트 (React)

## Architecture decisions

- API 서버와 Discord 봇이 같은 프로세스에서 실행 (bot.ts가 index.ts에서 import됨)
- NEON_DATABASE_URL을 사용 (SSL 자동 설정)
- 인증 콜백이 백엔드에서 처리되어 보안 강화 (OAuth state로 guildId 전달)
- 복구 키는 hex 기반 1회용 키로 구현

## Product

### 인증 플로우
1. Discord 봇에서 `/인증창` 실행 → 채널에 인증 버튼 임베드 전송
2. 유저가 버튼 클릭 → `/?guildId=서버ID` 인증 페이지로 이동
3. "Discord로 인증하기" 클릭 → Discord OAuth2 로그인
4. 콜백 처리 → DB 저장 → 역할 부여 → 웹훅 전송 → 성공 페이지

### Discord 봇 커맨드
- `/인증창` — 인증 버튼 임베드를 채널에 전송
- `/복구키생성` — 현재 서버 인증 유저 목록을 저장하는 키 생성
- `/복구키사용 키:[키]` — 이전 서버의 인증 유저를 현재 서버로 초대

### 어드민 패널
- `/panel` 페이지에서 길드 통계, 인증된 멤버 목록, 역할 및 웹훅 설정 가능

## User preferences

_사용자 지정 설정은 여기에 기록_

## Gotchas

- Discord 봇의 Redirect URI를 Discord 개발자 포털에 반드시 등록해야 함
  - Render 배포 URL: `https://your-render-url.onrender.com/api/auth/callback`
  - Replit 개발 URL: `https://{REPLIT_DOMAIN}/api/auth/callback`
- 봇에 `guilds.join` 스코프 권한이 필요 (유저를 서버에 초대하려면)
- 봇 초대 시 `Manage Roles` 권한 필요 (역할 부여)
- 복구 키는 1회만 사용 가능
- `NEON_DATABASE_URL`에 `sslmode=require` 포함 필요

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

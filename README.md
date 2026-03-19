# MotionLab Server

> AI 기반 스포츠 동작 분석 플랫폼 — 백엔드 API 서버

---

## 📖 Overview

MotionLab은 사용자가 운동 영상을 업로드하면 AI가 자세를 분석하고
개선 피드백을 제공하는 플랫폼입니다.

**핵심 기능**:

- 운동 영상 업로드 및 비동기 분석 (BullMQ Worker)
- AI 분석 서버 연동 (FastAPI HTTP 호출)
- 종합 점수, 각도 분석, 개선사항 피드백 저장/조회
- 7개 종목 지원 (Golf 4 + Weight 3)
- JWT 인증 (Access Token + Refresh Token)
- 로컬/S3 스토리지 자동 전환
- Sentry 에러 트래킹 + Winston 구조화 로깅

---

## System Architecture

```mermaid
graph LR
    A[Frontend<br/>Next.js :4000] -->|HTTP| B[NestJS Server<br/>REST API :3000]
    B -->|HTTP| C[FastAPI AI<br/>Analyzer+LLM :8000]
    B --> D[(MySQL<br/>Meta/상태)]
    B --> E[(MongoDB<br/>분석 결과)]
    B --> F[(Redis<br/>BullMQ Queue)]
    B -->|System Error| G[Sentry]
```

---

## Analysis Pipeline

```mermaid
flowchart TD
    A[🎥 사용자 영상 업로드] --> B[POST /motions/upload]
    B --> B1[MySQL motion 생성<br/>status: UPLOADED]
    B --> B2[파일 저장<br/>tmp → uploads 또는 S3]
    B --> B3[BullMQ Job 등록]
    B3 --> C[⚙️ MotionWorker<br/>Job 소비]
    C --> C1[status → PROCESSING]
    C --> C2[Signed URL 생성]
    C --> C3[FastAPI AI 서버 호출]
    C3 --> D[🤖 AI 분석]
    D --> D1[MediaPipe 포즈 추출<br/>~6초]
    D --> D2[각도 계산 + 구간 감지]
    D --> D3[GPT-4o-mini 피드백<br/>~8초]
    D3 --> E[✅ Worker 완료 처리]
    E --> E1[MongoDB에 분석 결과 저장]
    E --> E2[MySQL status → COMPLETED]
    E2 --> F[📊 Frontend 3초 Polling]
    F --> F1[점수 + 피드백 + 개선사항 표시]
```

---

## Tech Stack

### Backend

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js_20-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white)

### Database

![MySQL](https://img.shields.io/badge/MySQL_8.0-4479A1?style=flat-square&logo=mysql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB_7-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis_7-DC382D?style=flat-square&logo=redis&logoColor=white)

### ORM & ODM

![TypeORM](https://img.shields.io/badge/TypeORM-FE0803?style=flat-square&logo=typeorm&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=flat-square&logo=mongoose&logoColor=white)

### Queue & Worker

![BullMQ](https://img.shields.io/badge/BullMQ-DC382D?style=flat-square&logo=redis&logoColor=white)

### Auth & Docs

![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Passport](https://img.shields.io/badge/Passport-34E27A?style=flat-square&logo=passport&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=flat-square&logo=swagger&logoColor=black)

### Logging & Monitoring

![Winston](https://img.shields.io/badge/Winston-231F20?style=flat-square&logo=winston&logoColor=white)
![Sentry](https://img.shields.io/badge/Sentry-362D59?style=flat-square&logo=sentry&logoColor=white)

### DevOps

![Docker](https://img.shields.io/badge/Docker_Compose-2496ED?style=flat-square&logo=docker&logoColor=white)

---

## 📁 Project Structure

```text
src/
├── common/
│   ├── config/                    # 환경 설정 (app, database, jwt, redis, s3, storage)
│   ├── constants/
│   │   ├── errors/                # DomainErrors, SystemErrors, JobErrors
│   │   ├── motion-status.enum.ts
│   │   ├── motion.constant.ts
│   │   ├── sport-types.constant.ts
│   │   └── storage-type.enum.ts
│   ├── database/                  # TypeORM, Redis 설정
│   ├── decorators/                # @CurrentUser, @Roles, @ApiResponseSpec, @VideoUploadEndpoint
│   ├── dto/                       # BaseOutDto, PaginationDto
│   ├── entities/                  # BaseEntity (createdAt 컨벤션)
│   ├── exceptions/                # DomainException, SystemException
│   ├── filters/                   # AllExceptionFilter (Sentry 연동)
│   ├── guards/                    # JobErrorGuard, RolesGuard, ThrottlerBehindProxyGuard
│   ├── interceptors/              # VideoUploadInterceptor
│   ├── interfaces/                # AnalyzePayload, AnalyzeResponse
│   ├── logger/
│   │   ├── sentry/                # SentryConfig (에러 트래킹 초기화)
│   │   ├── winston/               # WinstonConfig (JSON/Pretty 로거)
│   │   └── logger.bootstrap.ts    # Sentry + Winston 통합 부트스트랩
│   ├── mappers/                   # JobErrorMapper
│   ├── repositories/              # BaseRepository
│   ├── utils/                     # date, mask-url, password
│   └── validators/                # 환경 변수 검증
├── core/
│   ├── health/                    # 헬스체크 컨트롤러
│   └── core.module.ts
├── modules/
│   ├── analysis/                  # MongoDB 분석 결과 (Mongoose)
│   │   ├── dto/                   # UpsertAnalysisResultDto
│   │   └── schemas/               # AnalysisResult Schema
│   ├── admin/                     # 관리자 API (역할 변경)
│   ├── auth/                      # JWT 인증 (login, register, refresh, logout)
│   │   ├── dto/                   # login, register, refresh, auth-out
│   │   ├── guards/                # JwtAuthGuard
│   │   └── strategies/            # JwtStrategy
│   ├── motion/                    # 핵심 모듈
│   │   ├── caches/                # Redis 캐시
│   │   ├── dto/                   # Upload, List, Detail, Analyzer DTO
│   │   ├── entities/              # Motion Entity + Repository
│   │   ├── gateways/              # WebSocket (Phase 3 TODO)
│   │   └── queue/                 # AnalyzerClient + MotionWorker
│   ├── sport/                     # 종목 관리 (7종목 CRUD)
│   ├── storage/                   # 로컬/S3 파일 관리
│   └── user/                      # 사용자 관리
├── app.module.ts
├── app.server.ts
└── main.ts
```

---

## Quick Start

### 사전 준비

- Node.js 20+
- pnpm
- Docker Desktop

### Installation

```bash
git clone https://github.com/wjdghtls95/motionlab-server.git
cd motionlab-server
pnpm install

# 환경 변수 - .env.local 파일에서 DB 비밀번호, JWT 시크릿 등을 설정합니다.
cp environments/.env.example environments/.env.local
```

### Server Running

```bash
pnpm start:dev              # 개발 모드
pnpm build && pnpm start:prod  # 프로덕션
```

### DB Running

Docker로 MySQL, Redis, MongoDB를 실행합니다. Docker Desktop이 켜져있어야 합니다.

```text
pnpm db:up
```

```dockerfile
# 컨테이너 상태 확인 (3개 모두 healthy면 정상):
docker compose -f docker-compose.dev.yml ps
```

### API Documentation

서버 실행 후 Swagger 확인:

```bash
http://localhost:{your-port}/api/docs
```

---

## API Endpoints

### Auth

| Method | Endpoint       | Description |
| ------ | -------------- | ----------- |
| POST   | /auth/register | 회원가입    |
| POST   | /auth/login    | 로그인      |
| POST   | /auth/refresh  | 토큰 재발급 |
| POST   | /auth/logout   | 로그아웃    |

### Users `🔒 JWT 필요`

| Method | Endpoint   | Description      |
| ------ | ---------- | ---------------- |
| GET    | /users     | 전체 사용자 조회 |
| GET    | /users/:id | 사용자 상세 조회 |
| PUT    | /users/:id | 사용자 정보 수정 |
| DELETE | /users/:id | 사용자 탈퇴      |

### Sports

| Method | Endpoint    | Description              |
| ------ | ----------- | ------------------------ |
| GET    | /sports     | 종목 목록 조회           |
| GET    | /sports/:id | 종목 상세 조회           |
| POST   | /sports     | 종목 추가 `🔒 ADMIN`     |
| PATCH  | /sports/:id | 종목 수정 `🔒 ADMIN`     |
| DELETE | /sports/:id | 종목 비활성화 `🔒 ADMIN` |

### Motions `🔒 JWT 필요`

| Method | Endpoint           | Description                 |
| ------ | ------------------ | --------------------------- |
| POST   | /motions/upload    | 영상 업로드 + 분석 요청     |
| GET    | /motions           | 내 영상 목록 (페이지네이션) |
| GET    | /motions/:id       | 영상 상세 + 분석 결과       |
| POST   | /motions/:id/retry | 분석 재시도                 |
| DELETE | /motions/:id       | 영상 삭제 (비활성화)        |

### Admin `🔒 ADMIN 권한 필요`

| Method | Endpoint              | Description      |
| ------ | --------------------- | ---------------- |
| PATCH  | /admin/users/:id/role | 사용자 역할 변경 |

---

## Error Code System

| Prefix   | Domain   | Retry | Example             |
| -------- | -------- | ----- | ------------------- |
| AUTH\_   | Auth     | X     | AUTH_TOKEN_INVALID  |
| MOTION\_ | Motion   | X     | MOTION_NOT_FOUND    |
| AN\_     | Analyzer | X     | AN_DOWNLOAD_FAIL    |
| LLM\_    | LLM/GPT  | X     | LLM_GENERATION_FAIL |
| SYS\_    | System   | O     | SYS_TIMEOUT         |

---

## Related Repositories

| Repository       | Description                | Stack               |
| ---------------- | -------------------------- | ------------------- |
| motionlab-server | 백엔드 API **(현재 레포)** | NestJS + TypeORM    |
| motionlab-ai     | AI 분석 서버               | FastAPI + MediaPipe |
| motionlab-front  | 프론트엔드                 | Next.js 16          |
| motionlab-config | 종목별 기준값 관리         | CSV → JSON          |

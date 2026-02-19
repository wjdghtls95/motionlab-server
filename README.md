# MotionLab Server

> AI 기반 스포츠 동작 분석 플랫폼 — 백엔드 API 서버

---

## 📖 Overview

MotionLab은 사용자가 운동 영상을 업로드하면 AI가 자세를 분석하고
개선 피드백을 제공하는 플랫폼입니다.

**핵심 기능**:

- 🎥 운동 영상 업로드 및 비동기 분석 (BullMQ Worker)
- 🤖 AI 분석 서버 연동 (FastAPI HTTP 호출)
- 📊 종합 점수, 각도 분석, 개선사항 피드백 저장/조회
- 🏌️ 7개 종목 지원 (Golf 4 + Weight 3)
- 🔐 JWT 인증 (Access Token + Refresh Token)
- 📁 로컬/S3 스토리지 자동 전환

---

## 🏗️ System Architecture

```mermaid
graph LR
    A[Frontend<br/>Next.js :4000] -->|HTTP| B[NestJS Server<br/>REST API :3000]
    B -->|HTTP| C[FastAPI AI<br/>Analyzer+LLM :8000]
    B --> D[(MySQL<br/>Meta/상태)]
    B --> E[(MongoDB<br/>분석 결과)]
    B --> F[(Redis<br/>BullMQ Queue)]
```

---

## 🔄 Analysis Pipeline

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

## 🛠️ Tech Stack

### Backend

![NestJS](https://img.shields.io/badge/NestJS_11.x-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript_5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js_18+-339933?style=flat-square&logo=nodedotjs&logoColor=white)

### Database

![MySQL](https://img.shields.io/badge/MySQL_8.0-4479A1?style=flat-square&logo=mysql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB_7.x-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis_7.x-DC382D?style=flat-square&logo=redis&logoColor=white)

### ORM & ODM

![TypeORM](https://img.shields.io/badge/TypeORM_0.3.x-FE0902?style=flat-square)
![Mongoose](https://img.shields.io/badge/Mongoose_8.x-880000?style=flat-square)

### Queue & Worker

![BullMQ](https://img.shields.io/badge/BullMQ-E34F26?style=flat-square)

### Auth & Docs

![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Passport](https://img.shields.io/badge/Passport.js-34E27A?style=flat-square&logo=passport&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=flat-square&logo=swagger&logoColor=black)

---

## 📁 Project Structure

```text
src/
├── common/
│   ├── config/                    # 환경 설정 (app, database, jwt, redis, s3, storage)
│   ├── constants/                 # 상수 정의
│   │   ├── errors/                #   DomainErrors, JobErrors, SystemErrors
│   │   ├── motion-status.enum.ts
│   │   ├── motion.constant.ts
│   │   ├── sport-types.constant.ts
│   │   └── storage-type.enum.ts
│   ├── database/                  # TypeORM, Redis 설정
│   ├── decorators/                # @CurrentUser, @ApiResponseSpec, @VideoUploadEndpoint
│   ├── dto/                       # BaseOutDto, PaginationDto
│   ├── entities/                  # BaseEntity (createAt 컨벤션)
│   ├── exceptions/                # DomainException, SystemException
│   ├── filters/                   # AllExceptionFilter
│   ├── guards/                    # JobErrorGuard
│   ├── interceptors/              # VideoUploadInterceptor
│   ├── interfaces/                # AnalyzePayload, AnalyzeResponse
│   ├── mappers/                   # JobErrorMapper
│   ├── repositories/              # BaseRepository
│   ├── utils/                     # date, mask-url, password
│   └── validators/                # 환경 변수 검증
├── core/
│   ├── health/                    # 헬스체크 컨트롤러
│   └── core.module.ts
├── modules/
│   ├── analysis/                  # MongoDB 분석 결과 (Mongoose)
│   │   ├── dto/                   #   UpsertAnalysisResultDto
│   │   └── schemas/               #   AnalysisResult Schema
│   ├── auth/                      # JWT 인증 (login, register, refresh)
│   │   ├── dto/                   #   login, register, refresh, auth-out
│   │   ├── guards/                #   JwtAuthGuard
│   │   └── strategies/            #   JwtStrategy
│   ├── motion/                    # 핵심 모듈
│   │   ├── caches/                #   Redis 캐시
│   │   ├── dto/                   #   Upload, List, Detail, Analyzer DTO
│   │   ├── entities/              #   Motion Entity + Repository
│   │   ├── gateways/              #   WebSocket (Phase 3 TODO)
│   │   └── queue/                 #   AnalyzerClient + MotionWorker
│   ├── sport/                     # 종목 관리 (7종목 CRUD)
│   ├── storage/                   # 로컬/S3 파일 관리
│   └── user/                      # 사용자 관리
├── app.module.ts
├── app.server.ts
└── main.ts
```

---

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/{username}/motionlab-server.git
cd motionlab-server
pnpm install

# 환경 변수
cp env/.env.example env/.env.development
```

### Running

```bash
pnpm start:dev              # 개발 모드
pnpm build && pnpm start:prod  # 프로덕션
```

### API Documentation

서버 실행 후 Swagger 확인:

```bash
http://localhost:{user-port}/api/docs
```

---

## 📡 API Endpoints

### Auth

| Method | Endpoint       | Description |
| ------ | -------------- | ----------- |
| POST   | /auth/register | 회원가입    |
| POST   | /auth/login    | 로그인      |
| POST   | /auth/refresh  | 토큰 재발급 |

### Sports

| Method | Endpoint    | Description    |
| ------ | ----------- | -------------- |
| GET    | /sports     | 종목 목록 조회 |
| GET    | /sports/:id | 종목 상세 조회 |

### Motions

| Method | Endpoint           | Description                 |
| ------ | ------------------ | --------------------------- |
| POST   | /motions/upload    | 영상 업로드 + 분석 요청     |
| GET    | /motions           | 내 영상 목록 (페이지네이션) |
| GET    | /motions/:id       | 영상 상세 + 분석 결과       |
| POST   | /motions/:id/retry | 분석 재시도                 |
| DELETE | /motions/:id       | 영상 삭제 (비활성화)        |

---

## 🔐 Error Code System

| Prefix | Domain   | Retry | Example            |
| ------ | -------- | ----- | ------------------ |
| MOT\_  | Motion   | X     | MOTION_NOT_FOUND   |
| AN\_   | Analyzer | X     | AN_DOWNLOAD_FAIL   |
| SYS\_  | System   | O     | SYS_TIMEOUT        |
| AUTH\_ | Auth     | X     | AUTH_TOKEN_INVALID |

---

## 🔗 Related Repositories

| Repository       | Description                | Stack               |
| ---------------- | -------------------------- | ------------------- |
| motionlab-server | 백엔드 API **(현재 레포)** | NestJS + TypeORM    |
| motionlab-ai     | AI 분석 서버               | FastAPI + MediaPipe |
| motionlab-front  | 프론트엔드                 | Next.js 16          |
| motionlab-config | 종목별 기준값 관리         | CSV → JSON          |

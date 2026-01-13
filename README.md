# MotionLab Server

> 골프 스윙 분석 플랫폼 백엔드 API 서버

---

## 📖 Overview

MotionLab은 스윙 동영상을 분석하여 자세 교정 및 스윙 개선 인사이트를 제공하는 AI 기반 플랫폼입니다.

**주요 기능**:

- 🎥 스윙 동영상 업로드 및 관리
- 🤖 AI 기반 스윙 분석 (FastAPI 연동)
- 📊 스윙 데이터 통계 및 시각화
- 👤 사용자 관리 및 JWT 인증

---

## 🛠️ Tech Stack

### Backend

![NestJS](https://img.shields.io/badge/NestJS_11.x-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript_5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js_18+-339933?style=flat-square&logo=nodedotjs&logoColor=white)

### Database & ORM

![MySQL](https://img.shields.io/badge/MySQL_8.0-4479A1?style=flat-square&logo=mysql&logoColor=white)
![TypeORM](https://img.shields.io/badge/TypeORM_0.3.x-FE0902?style=flat-square&logo=typeorm&logoColor=white)

### Authentication

![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Passport](https://img.shields.io/badge/Passport.js-34E27A?style=flat-square&logo=passport&logoColor=white)

### Validation & Documentation

![Class Validator](https://img.shields.io/badge/class--validator-gray?style=flat-square)
![Class Transformer](https://img.shields.io/badge/class--transformer-gray?style=flat-square)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=flat-square&logo=swagger&logoColor=black)

### Infrastructure

![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)

### Tools

![npm](https://img.shields.io/badge/npm-CB3837?style=flat-square&logo=npm&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=flat-square&logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=flat-square&logo=prettier&logoColor=black)
![Husky](https://img.shields.io/badge/Husky-🐶-gray?style=flat-square)

---

## 📁 Project Structure

```
~/Doc/pro/motion-lab/
├── server/                     # 백엔드 API 서버 (NestJS)
│   ├── env/                   # 환경 변수
│   │   ├── .env.test
│   │   ├── .env.development
│   │   ├── .env.production
│   │   └── .env.example
│   ├── src/
│   │   ├── common/            # 공통 모듈
│   │   │   ├── config/        # 환경 설정 (registerAs)
│   │   │   ├── database/      # TypeOrmExModule
│   │   │   ├── decorators/    # Custom 데코레이터
│   │   │   ├── dto/           # 공통 DTO (Pagination)
│   │   │   ├── entities/      # BaseEntity
│   │   │   ├── repositories/  # BaseRepository
│   │   │   ├── utils/         # 유틸리티 (Password, Date)
│   │   │   └── validators/    # 환경 변수 검증 (class-validator)
│   │   │ # 환경 설정 가이드
│   │   ├── modules/
│   │   │   ├── user/          # 사용자 관리
│   │   │   │   ├── dto/
│   │   │   │   ├── entities/
│   │   │   │   ├── user.repository.ts
│   │   │   │   ├── user.service.ts
│   │   │   │   ├── user.controller.ts
│   │   │   │   └── user.module.ts
│   │   │   └── auth/          # 인증/인가
│   │   │       ├── dto/
│   │   │       ├── guards/
│   │   │       ├── strategies/
│   │   │       ├── auth.service.ts
│   │   │       ├── auth.controller.ts
│   │   │       └── auth.module.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── test/                  # 테스트
│       └── modules/
│           ├── user/
│           │   ├── user.service.spec.ts
│           │   └── user.e2e-spec.ts
│           └── auth/
│               ├── auth.service.spec.ts
│               └── auth.e2e-spec.ts
```

---

## 🚀 Quick Start

### Option 1: Docker (권장) 🐳

```bash
# 1. 환경 변수 설정
cp .env.docker .env

# 2. Docker Compose로 전체 시스템 실행
docker-compose up -d

# 3. 로그 확인
docker-compose logs -f api

# 4. 종료
docker-compose down
```

**실행 후 접속**:

- API Server: http://localhost:4000
- Swagger Docs: http://localhost:4000/api/docs
- Analyzer: http://localhost:8000
- MySQL: localhost:3306
- Redis: localhost:6379

---

### Option 2: 로컬 개발 환경

#### Prerequisites

- **Node.js**: 18.x 이상
- **MySQL**: 8.0 이상
- **Redis**: 7.x 이상
- **npm**: 9.x 이상

#### Installation

```bash
# 1. 저장소 클론
git clone https://github.com/wjdghtls95/motionlab-server.git
cd motionlab-server

# 2. 패키지 설치
npm install --legacy-peer-deps

# 3. 환경 변수 설정
cp environments/.env.example environments/.env.development
# environments/.env.development 파일 수정 (DB 정보, JWT Secret)

# 4. MySQL DB 생성
mysql -u root -p
CREATE DATABASE motionlab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SOURCE scripts/init-db.sql;
EXIT;

# 5. 개발 서버 실행
npm run start:dev
```

---

## 📚 API Documentation

서버 실행 후 Swagger 문서:

- **Swagger UI**: http://localhost:4000/api/docs
- **OpenAPI JSON**: http://localhost:4000/api/docs-json

---

## 🧪 Testing

```bash
# 단위 테스트
npm test

# 테스트 커버리지
npm run test:cov

# E2E 테스트
npm run test:e2e

# Watch 모드
npm run test:watch
```

---

## 🔧 Development

### Git Hooks (Husky)

커밋 시 자동으로 실행:

- ESLint (코드 린트)
- Prettier (코드 포맷)

```bash
# 수동 실행
npm run lint
npm run format
```

### Docker Commands

```bash
# 빌드
docker-compose build

# 백그라운드 실행
docker-compose up -d

# 특정 서비스만 실행
docker-compose up api

# 로그 확인
docker-compose logs -f api

# 컨테이너 접속
docker exec -it motionlab-api sh

# 정리
docker-compose down -v  # 볼륨까지 삭제
```

---

## 📦 Scripts

| Command               | Description        |
| --------------------- | ------------------ |
| `npm run build`       | 프로덕션 빌드      |
| `npm run start`       | 프로덕션 모드 실행 |
| `npm run start:dev`   | 개발 모드 (watch)  |
| `npm run start:debug` | 디버그 모드        |
| `npm run lint`        | ESLint 실행        |
| `npm run format`      | Prettier 실행      |
| `npm test`            | 단위 테스트        |
| `npm run test:e2e`    | E2E 테스트         |
| `npm run test:cov`    | 테스트 커버리지    |

---

## 🏗️ System Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Frontend   │────────▶│ API Server  │────────▶│  Analyzer   │
│  (Next.js)  │  REST   │  (NestJS)   │  HTTP   │  (FastAPI)  │
│  Port: 3000 │◀────────│  Port: 4000 │◀────────│  Port: 8000 │
└─────────────┘         └─────────────┘         └─────────────┘
                               │                        │
                               ├────────────┐           │
                               ▼            ▼           ▼
                        ┌──────────┐  ┌─────────┐  ┌────────┐
                        │  MySQL   │  │  Redis  │  │ OpenCV │
                        │  :3306   │  │  :6379  │  │TensorFlow│
                        └──────────┘  └─────────┘  └────────┘
```

---

## 🌳 Environment Variables

### `.env.docker` (Docker 환경)

```env
NODE_ENV=development
API_PORT=4000
DB_HOST=mysql
DB_PORT=3306
DB_USERNAME=motionlab
DB_PASSWORD=motionlab123
DB_DATABASE=motionlab
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your-secret-key
ANALYZER_URL=http://analyzer:8000
```

### `environments/.env.development` (로컬 환경)

```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=motionlab
DB_PASSWORD=motionlab123
DB_DATABASE=motionlab
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
```

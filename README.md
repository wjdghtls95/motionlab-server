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

### Tools
![pnpm](https://img.shields.io/badge/pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=flat-square&logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=flat-square&logo=prettier&logoColor=black)

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

### Prerequisites

- **Node.js**: 18.x 이상
- **MySQL**: 8.0 이상
- **pnpm**: 8.x 이상

### Installation

```bash
# 1. 저장소 클론
cd ~/Doc/pro/motion-lab/server

# 2. 패키지 설치
pnpm install

# 3. 환경 변수 설정
cp env/.env.example env/.env.test
# env/.env.test 파일 수정 (DB 정보, JWT Secret)

# 4. MySQL DB 생성
mysql -u root -p
CREATE DATABASE motionlab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
Running
# 개발 모드 (로컬)
pnpm start:test

# Dev 서버
pnpm start:dev

# 프로덕션 빌드
pnpm build
pnpm start:prod
API Documentation
서버 실행 후 Swagger 문서 확인:

http://localhost:4000/api/docs
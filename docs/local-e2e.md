# 로컬 E2E 테스트 실행 가이드

## 전제 조건

- Docker Desktop 실행 중
- Node.js / pnpm 설치됨
- `motionlab-front/test/e2e/fixtures/` 에 테스트 영상 파일 준비:
  - `test-vi-wedge.mp4` — 정상 골프 스윙 영상
  - `test-vi-synthetic.mp4` — 포즈 감지 불가 영상 (실패 케이스)
  - `test-invalid.txt`, `test-invalid.jpg` — 비영상 파일

## 시작 커맨드

```bash
# 1. 풀스택 Docker 환경 기동 (최초 실행 시 NestJS 빌드 포함, ~3분)
cd motionlab-server
pnpm local:up

# 2. Next.js 개발 서버 기동 (별도 터미널)
cd motionlab-front
pnpm dev

# 3. 모든 서비스 준비 확인
curl -s http://localhost:3000/health   # NestJS → {"status":"ok"}
curl -s http://localhost:8000/health   # FastAPI → {"status":"ok"}
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000  # Next.js → 200

# 4. E2E 테스트 실행
cd motionlab-front
pnpm playwright test
```

## 종료 커맨드

```bash
# Docker 환경 종료
cd motionlab-server
pnpm local:down

# Next.js 개발 서버: Ctrl+C
```

## 포트 정보

| 서비스  | 포트     | 비고                                |
| ------- | -------- | ----------------------------------- |
| NestJS  | 3000     | API 서버                            |
| FastAPI | 8000     | AI 분석 (NOOP 모드 — OpenAI 미호출) |
| MySQL   | 3306     |                                     |
| Redis   | **6380** | 로컬 Homebrew Redis(6379) 충돌 방지 |
| MongoDB | 27017    |                                     |
| Next.js | 4000     | `pnpm dev`로 별도 실행              |

## 기대 결과

```
26 passed / 4 skipped (총 30개)
- C-05 (10분 타임아웃): 설계상 skip
- E-02, E-03 (히스토리 상세/삭제): 분석 완료 결과 필요 — 설계상 skip
- G-05 (로딩 시간 3초): 설계상 skip
```

## 주의사항

- `pnpm local:up`은 `docker-compose.local.yml`을 사용 (포트 충돌 방지를 위해 `docker-compose.dev.yml`과 동시 실행 금지)
- Redis 포트가 **6380**이므로, Playwright drain 코드(`03-analysis.spec.ts`)와 `global-teardown.ts`에서 6380을 사용
- FastAPI NOOP 모드에서도 MediaPipe 처리는 실행되므로 C 테스트는 ~30~90초 소요

## 로그 확인

```bash
cd motionlab-server
pnpm local:logs          # 전체 서비스 로그
docker logs -f motionlab-local-nestjs   # NestJS만
docker logs -f motionlab-local-fastapi  # FastAPI만
```

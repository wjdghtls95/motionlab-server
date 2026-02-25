# ============================================
# Stage 1: 빌드 (build)
# - 소스 코드 컴파일 + dist 폴더 생성
# - devDependencies 포함 (빌드에 필요)
# ============================================
FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# 의존성 파일만 먼저 복사 (캐시 활용)
# 코드가 바뀌어도 lock 파일이 안 바뀌면 이 레이어 캐시됨
COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# 소스 복사 + 빌드
COPY . .
RUN pnpm build

# ============================================
# Stage 2: 프로덕션 (production)
# - dist + 프로덕션 의존성만 포함
# - devDependencies 제외 → 이미지 크기 절약
# ============================================
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# 프로덕션 의존성만 설치
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# 빌드 결과물만 복사 (소스 코드 미포함)
COPY --from=build /app/dist ./dist

# 보안: root가 아닌 node 유저로 실행
USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]

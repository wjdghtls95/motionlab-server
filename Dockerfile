# ========================================
# Stage 1: Builder
# ========================================
FROM node:18-alpine AS builder

WORKDIR /app

# 의존성 파일 복사 (캐싱 최적화)
COPY package*.json ./

# 의존성 설치
RUN npm ci --legacy-peer-deps

# 소스 코드 복사
COPY . .

# 빌드
RUN npm run build

# ========================================
# Stage 2: Production
# ========================================
FROM node:18-alpine

WORKDIR /app

# 런타임 의존성만 설치
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# 빌드된 파일 복사
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/environments ./environments

# 비-root 유저 생성 (보안)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

# 포트 노출
EXPOSE 4000

# Health Check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# 실행
CMD ["node", "dist/main"]

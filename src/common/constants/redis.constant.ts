export const REDIS_DB_NUMBER = {
  SESSION: 0, // (사용 안 함)
  AUTH: 1, // Refresh Token 저장용
  CACHE: 2, // 캐싱 데이터
  DATA: 3, // 일반 데이터
  QUEUE: 4, // BullMQ 전용
} as const;

export type RedisDbNumber =
  (typeof REDIS_DB_NUMBER)[keyof typeof REDIS_DB_NUMBER];

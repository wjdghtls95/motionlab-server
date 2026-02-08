/**
 * 에러 심각도 상수
 * - 도메인 에러에서만 사용
 * - 시스템 에러는 무조건 심각하므로 불필요
 */
export const ERROR_SEVERITY = {
  LOW: 'low',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type ErrorSeverity =
  (typeof ERROR_SEVERITY)[keyof typeof ERROR_SEVERITY];

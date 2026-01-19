import { HttpStatus } from '@nestjs/common';

/**
 * 시스템 에러 정의 타입
 * - severity 필드 없음 (무조건 심각하므로 불필요)
 */
export type BaseSystemError = {
  code: string;
  message: string;
  status: HttpStatus;
};

/**
 * 시스템 (인프라) 에러 정의
 * - 서버 내부 문제 (DB 다운, 외부 API 장애 등)
 * - 주로 500번대 HTTP 상태 코드
 * - 무조건 ERROR 로그
 */
export const SYSTEM_ERRORS = {
  // ==================== DATABASE ====================
  SYS_DB_CONNECTION_ERROR: {
    code: 'SYS_001',
    message: '데이터베이스 연결에 실패했습니다',
    status: HttpStatus.SERVICE_UNAVAILABLE,
  },
  SYS_DB_QUERY_ERROR: {
    code: 'SYS_002',
    message: '데이터베이스 쿼리 실행에 실패했습니다',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  },

  // ==================== CACHE (Redis) ====================
  SYS_REDIS_CONNECTION_ERROR: {
    code: 'SYS_010',
    message: 'Redis 연결에 실패했습니다',
    status: HttpStatus.SERVICE_UNAVAILABLE,
  },
  SYS_REDIS_NOT_INITIALIZED: {
    code: 'SYS_011',
    message: 'RedisFactory가 초기화되지 않았습니다',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  SYS_REDIS_CONFIG_NOT_FOUND: {
    code: 'SYS_012',
    message: 'Redis 설정을 찾을 수 없습니다',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  },

  // ==================== EXTERNAL API ====================
  SYS_EXTERNAL_API_TIMEOUT: {
    code: 'SYS_020',
    message: '외부 API 요청 시간이 초과되었습니다',
    status: HttpStatus.GATEWAY_TIMEOUT,
  },
  SYS_EXTERNAL_API_ERROR: {
    code: 'SYS_021',
    message: '외부 API 호출에 실패했습니다',
    status: HttpStatus.BAD_GATEWAY,
  },

  // ==================== CONFIG ====================
  SYS_JWT_CONFIG_NOT_FOUND: {
    code: 'SYS_031',
    message: 'jwt 설정을 찾을 수 없습니다',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  },

  // ==================== GENERAL ====================
  SYS_INTERNAL_SERVER_ERROR: {
    code: 'SYS_999',
    message: '서버 내부 오류가 발생했습니다',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  },
} as const satisfies Record<string, BaseSystemError>;

// 타입 추론
export type SystemError = (typeof SYSTEM_ERRORS)[keyof typeof SYSTEM_ERRORS];

import { HttpStatus } from '@nestjs/common';

/**
 * 에러 심각도
 * - low: 사용자 실수 (WARN 로그)
 * - high: 중요 비즈니스 에러 (ERROR 로그)
 * - critical: 매우 심각 (ERROR 로그 + 즉시 알림)
 */
export type ErrorSeverity = 'low' | 'high' | 'critical';

/**
 * 도메인 에러 정의 타입
 */
export type BaseDomainError = {
  code: string;
  message: string;
  status: HttpStatus;
  severity?: ErrorSeverity;
};

/**
 * 도메인(비즈니스) 에러 정의
 * - 사용자의 잘못된 입력이나 비즈니스 규칙 위반
 * - 주로 400번대 HTTP 상태 코드
 */
export const DOMAIN_ERRORS = {
  // ==================== AUTH (1~99) ====================
  AUTH_EMAIL_ALREADY_EXISTS: {
    code: 'AUTH_001',
    message: '이미 존재하는 이메일입니다',
    status: HttpStatus.CONFLICT,
  },
  AUTH_INVALID_CREDENTIALS: {
    code: 'AUTH_002',
    message: '이메일 또는 비밀번호가 올바르지 않습니다',
    status: HttpStatus.UNAUTHORIZED,
  },
  AUTH_TOKEN_EXPIRED: {
    code: 'AUTH_003',
    message: '토큰이 만료되었습니다',
    status: HttpStatus.UNAUTHORIZED,
  },
  AUTH_TOKEN_INVALID: {
    code: 'AUTH_004',
    message: '유효하지 않은 토큰입니다',
    status: HttpStatus.UNAUTHORIZED,
  },

  // ==================== USER (100~199) ====================
  USER_NOT_FOUND: {
    code: 'USER_001',
    message: '사용자를 찾을 수 없습니다',
    status: HttpStatus.NOT_FOUND,
  },
  USER_ALREADY_EXISTS: {
    code: 'USER_002',
    message: '이미 존재하는 사용자입니다',
    status: HttpStatus.CONFLICT,
  },
  USER_UPDATE_FAILED: {
    code: 'USER_003',
    message: '사용자 정보 수정에 실패했습니다',
    status: HttpStatus.BAD_REQUEST,
  },

  // ==================== MOTION (200~299) ====================
  MOTION_NOT_FOUND: {
    code: 'MOTION_001',
    message: '분석 정보를 찾을 수 없습니다',
    status: HttpStatus.NOT_FOUND,
  },
  MOTION_SPORT_NOT_SUPPORTED: {
    code: 'MOTION_002',
    message: '지원하지 않는 운동 종목입니다',
    status: HttpStatus.BAD_REQUEST,
  },
  MOTION_VIDEO_TOO_LARGE: {
    code: 'MOTION_003',
    message: '비디오 파일 크기가 너무 큽니다 (최대 100MB)',
    status: HttpStatus.PAYLOAD_TOO_LARGE,
  },
  MOTION_INVALID_FORMAT: {
    code: 'MOTION_004',
    message: '지원하지 않는 파일 형식입니다 (MP4, MOV만 지원)',
    status: HttpStatus.BAD_REQUEST,
  },

  /**
   * 모션 분석 실패 (중요!)
   * - Analyzer API 장애 또는 영상 분석 불가
   * - severity: 'high' = ERROR 로그
   * - 비즈니스 임팩트: 핵심 기능 중단
   */
  MOTION_ANALYSIS_FAILED: {
    code: 'MOTION_005',
    message: '모션 분석에 실패했습니다',
    status: HttpStatus.BAD_REQUEST,
    severity: 'high' as const, // 명시적 심각도
  },

  // ==================== SPORT (300~399) ====================
  SPORT_NOT_FOUND: {
    code: 'SPORT_001',
    message: '운동 종목을 찾을 수 없습니다',
    status: HttpStatus.NOT_FOUND,
  },
  SPORT_ALREADY_EXISTS: {
    code: 'SPORT_002',
    message: '이미 존재하는 운동 종목입니다',
    status: HttpStatus.CONFLICT,
  },

  // ==================== 미래 확장 예시 ====================
  /**
   * 결제 실패 (매우 중요!)
   * - severity: 'critical' = ERROR 로그 + 즉시 Slack 알림
   */
  PAYMENT_FAILED: {
    code: 'PAYMENT_001',
    message: '결제에 실패했습니다',
    status: HttpStatus.BAD_REQUEST,
    severity: 'critical' as const, // 매우 심각
  },
} as const;

// 타입 추론
export type DomainError = (typeof DOMAIN_ERRORS)[keyof typeof DOMAIN_ERRORS];

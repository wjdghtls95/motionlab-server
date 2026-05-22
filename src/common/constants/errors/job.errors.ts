import { HttpStatus } from '@nestjs/common';
import {
  ERROR_SEVERITY,
  ErrorSeverity,
} from '@common/constants/errors/error-severity';

export interface BaseJobError {
  code: string;
  message: string;
  /** 생략하면 false — 새 에러 추가 시 실수로 재시도가 무한 루프되는 사고를 예방 */
  retryable?: boolean;
  severity?: ErrorSeverity;
  status?: HttpStatus;
}

export const JOB_ERRORS = {
  // ==================== 시스템 에러: 잡 데이터 검증 (재시도 X) ====================

  /** BullMQ job.data.motionId가 NaN 또는 비정상 값 — 재시도해도 동일 결과 */
  SYS_INVALID_JOB_DATA: {
    code: 'SYS_001',
    message: '잡 데이터가 유효하지 않습니다.',
    retryable: false,
    severity: ERROR_SEVERITY.HIGH,
  },

  // ==================== 시스템 에러: Backend 내부 (재시도 O) ====================

  /** BullMQ 큐 등록 실패 — Backend 내부에서만 발생 */
  SYS_QUEUE_ENQUEUE_FAILED: {
    code: 'SYS_040',
    message: '작업 큐 등록에 실패했습니다.',
    retryable: true,
    severity: ERROR_SEVERITY.HIGH,
  },

  // ==================== 시스템 에러: 네트워크/통신 ====================

  /** Backend → AI 요청 타임아웃 (Axios ECONNABORTED) */
  SYS_TIMEOUT: {
    code: 'SYS_020',
    message: '분석 서버 응답이 지연되고 있습니다.',
    retryable: true,
    severity: ERROR_SEVERITY.HIGH,
  },

  /** AI Server 연결 불가 (네트워크 장애) */
  SYS_ANALYZER_UNREACHABLE: {
    code: 'SYS_021',
    message: '분석 서버에 연결할 수 없습니다.',
    retryable: true,
    severity: ERROR_SEVERITY.HIGH,
  },

  /** AI Server 5xx 응답 */
  SYS_ANALYZER_5XX: {
    code: 'SYS_022',
    message: '분석 서버 오류가 발생했습니다.',
    retryable: true,
    severity: ERROR_SEVERITY.HIGH,
  },

  /** MongoDB 저장 실패 */
  SYS_MONGO_WRITE_FAIL: {
    code: 'SYS_030',
    message: '결과 저장 중 오류가 발생했습니다.',
    retryable: true,
    severity: ERROR_SEVERITY.HIGH,
  },

  // ==================== 시스템 에러: AI 영상 처리 (AI Server 발생 → Backend 수신) ====================

  /** 영상 파일을 찾을 수 없음 */
  SYS_VIDEO_NOT_FOUND: {
    code: 'SYS_010',
    message: '영상 파일을 찾을 수 없습니다.',
    retryable: false,
    severity: ERROR_SEVERITY.HIGH,
  },

  /** 영상 다운로드 실패 */
  SYS_VIDEO_DOWNLOAD: {
    code: 'SYS_011',
    message: '영상 다운로드에 실패했습니다.',
    retryable: true,
    severity: ERROR_SEVERITY.HIGH,
  },

  /** 영상 처리 중 오류 */
  SYS_VIDEO_PROCESSING: {
    code: 'SYS_013',
    message: '영상 처리 중 오류가 발생했습니다.',
    retryable: true,
    severity: ERROR_SEVERITY.HIGH,
  },

  // ==================== 분석 불가 에러 (AI Server 발생 → 재시도 X) ====================

  /** 키포인트 미감지 */
  AN_NO_KEYPOINTS: {
    code: 'AN_001',
    message: '영상에서 사람의 움직임을 감지할 수 없습니다.',
    retryable: false,
    severity: ERROR_SEVERITY.LOW,
  },

  /** 영상 길이 부족 */
  AN_TOO_SHORT: {
    code: 'AN_002',
    message: '영상 길이가 너무 짧습니다.',
    retryable: false,
    severity: ERROR_SEVERITY.LOW,
  },

  /** 프레임 부족 (사람은 감지됐으나 분석 가능한 프레임 부족) */
  AN_NO_PERSON: {
    code: 'AN_003',
    message: '영상에서 사람을 찾을 수 없습니다.',
    retryable: false,
    severity: ERROR_SEVERITY.LOW,
  },

  /** 올바르지 않은 동작 */
  AN_INVALID_MOTION: {
    code: 'AN_004',
    message: '올바르지 않은 동작입니다.',
    retryable: false,
    severity: ERROR_SEVERITY.LOW,
  },

  /** 지원하지 않는 종목 */
  AN_UNSUPPORTED_SPORT: {
    code: 'AN_005',
    message: '지원하지 않는 종목입니다.',
    retryable: false,
    severity: ERROR_SEVERITY.LOW,
  },

  /** 분석 요청 검증 실패 (4xx) */
  AN_VALIDATION_FAIL: {
    code: 'AN_010',
    message: '분석 요청이 올바르지 않습니다.',
    retryable: false,
    severity: ERROR_SEVERITY.HIGH,
  },

  // ==================== LLM 에러 (AI Server 발생 → Backend 수신) ====================

  /** LLM 타임아웃 */
  LLM_TIMEOUT: {
    code: 'LLM_001',
    message: 'AI 피드백 생성 시간이 초과되었습니다.',
    retryable: true,
    severity: ERROR_SEVERITY.HIGH,
  },

  /** LLM 응답 파싱 실패 — 재시도해도 동일 결과 */
  LLM_PARSE_ERROR: {
    code: 'LLM_002',
    message: 'AI 응답 형식이 올바르지 않습니다.',
    retryable: false,
    severity: ERROR_SEVERITY.HIGH,
  },

  /** LLM 피드백 생성 중 일반 오류 */
  LLM_GENERATION_ERROR: {
    code: 'LLM_003',
    message: 'AI 피드백 생성 중 오류가 발생했습니다.',
    retryable: true,
    severity: ERROR_SEVERITY.HIGH,
  },

  /** LLM 응답 검증 실패 — 재시도해도 동일 결과 */
  LLM_INVALID_RESPONSE: {
    code: 'LLM_004',
    message: 'AI 응답이 유효하지 않습니다.',
    retryable: false,
    severity: ERROR_SEVERITY.HIGH,
  },

  // ==================== 알 수 없는 에러 ====================

  SYS_UNKNOWN: {
    code: 'SYS_999',
    message: '알 수 없는 오류가 발생했습니다.',
    retryable: true,
    severity: ERROR_SEVERITY.HIGH,
  },
} as const satisfies Record<string, BaseJobError>;

import { HttpStatus } from '@nestjs/common';
import { ERROR_SEVERITY } from '@common/constants/errors/error-severity';

export interface BaseJobError {
  code: string;
  message: string;
  retryable: boolean;
  severity?: 'low' | 'high' | 'critical';
  status?: HttpStatus;
}

export const JOB_ERRORS = {
  // 시스템 에러 (재시도 ㅇ)
  SYS_QUEUE_ENQUEUE_FAILED: {
    code: 'SYS_010',
    message: '작업 큐 등록에 실패했습니다.',
    retryable: true,
    severity: ERROR_SEVERITY.HIGH,
  },

  SYS_TIMEOUT: {
    code: 'SYS_020',
    message: '분석 서버 응답이 지연되고 있습니다.',
    retryable: true,
    severity: ERROR_SEVERITY.HIGH,
  },
  SYS_ANALYZER_UNREACHABLE: {
    code: 'SYS_021',
    message: '분석 서버에 연결할 수 없습니다.',
    retryable: true,
    severity: ERROR_SEVERITY.HIGH,
  },
  SYS_ANALYZER_5XX: {
    code: 'SYS_022',
    message: '분석 서버 오류가 발생했습니다.',
    retryable: true,
    severity: ERROR_SEVERITY.HIGH,
  },
  SYS_MONGO_WRITE_FAIL: {
    code: 'SYS_030',
    message: '결과 저장 중 오류가 발생했습니다.',
    retryable: true,
    severity: ERROR_SEVERITY.HIGH,
  },

  // 분석 불가 에러 (재시도 x)
  AN_TOO_SHORT: {
    code: 'AN_002',
    message: '영상 길이가 너무 짧습니다.',
    retryable: false,
    severity: ERROR_SEVERITY.LOW,
  },
  AN_NO_PERSON: {
    code: 'AN_003',
    message: '영상에서 사람을 찾을 수 없습니다.',
    retryable: false,
    severity: ERROR_SEVERITY.LOW,
  },
  AN_VALIDATION_FAIL: {
    code: 'AN_010',
    message: '분석 요청이 올바르지 않습니다.',
    retryable: false,
    severity: ERROR_SEVERITY.HIGH,
  },

  SYS_UNKNOWN: {
    code: 'SYS_999',
    message: '알 수 없는 오류가 발생했습니다.',
    retryable: true,
    severity: ERROR_SEVERITY.HIGH,
  },
} as const satisfies Record<string, BaseJobError>;

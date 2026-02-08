import { Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import axios from 'axios';
import { BaseJobError, JOB_ERRORS } from '@common/constants/errors/job.errors';
import { isBaseJobError } from '@common/guards/job-error.guard';

/**
 * AI error_code → JOB_ERRORS 매핑 테이블
 *
 * AI Server ERROR_REGISTRY와 1:1 대응
 * 새 에러 추가 시: 1) JOB_ERRORS에 정의 → 2) 여기에 매핑 추가
 */
const AI_ERROR_MAP: Record<string, BaseJobError> = {
  // Analysis Errors (사용자 영상 문제 → 재시도 X)
  AN_001: JOB_ERRORS.AN_NO_KEYPOINTS,
  AN_002: JOB_ERRORS.AN_TOO_SHORT,
  AN_003: JOB_ERRORS.AN_NO_PERSON,
  AN_004: JOB_ERRORS.AN_INVALID_MOTION,
  AN_005: JOB_ERRORS.AN_UNSUPPORTED_SPORT,

  // System Errors (AI Server 내부)
  SYS_010: JOB_ERRORS.SYS_VIDEO_NOT_FOUND,
  SYS_011: JOB_ERRORS.SYS_VIDEO_DOWNLOAD,
  SYS_013: JOB_ERRORS.SYS_VIDEO_PROCESSING,
  SYS_021: JOB_ERRORS.SYS_TIMEOUT,
  SYS_999: JOB_ERRORS.SYS_UNKNOWN,

  // LLM Errors (GPT 호출 관련)
  LLM_001: JOB_ERRORS.LLM_TIMEOUT,
  LLM_002: JOB_ERRORS.LLM_PARSE_ERROR,
  LLM_003: JOB_ERRORS.LLM_GENERATION_ERROR,
  LLM_004: JOB_ERRORS.LLM_INVALID_RESPONSE,

  // Validation Errors
  VAL_000: JOB_ERRORS.AN_VALIDATION_FAIL,
};

const logger = new Logger('JobErrorMapper');

/**
 * Axios 에러 → BaseJobError 변환
 *
 * 우선순위:
 * 1. 이미 BaseJobError -> 그대로 반환
 * 2. Axios 타임아웃 -> SYS_TIMEOUT
 * 3. AI가 error_code 반환 -> AI_ERROR_MAP 조회
 * 4. HTTP 상태 코드 기반 fallback
 * 5. 알 수 없는 에러 -> SYS_UNKNOWN
 */
export function mapAxiosToJobError(e: unknown): BaseJobError {
  // 1. 이미 BaseJobError
  if (isBaseJobError(e)) {
    return e;
  }

  if (axios.isAxiosError(e)) {
    const err = e as AxiosError<{
      error_code?: string;
      message?: string;
      retryable?: boolean;
    }>;
    const status = err.response?.status;
    const data = err.response?.data;

    // 2. Timeout
    if (err.code === 'ECONNABORTED') {
      return JOB_ERRORS.SYS_TIMEOUT;
    }

    // 3. AI가 명시적으로 반환한 에러
    if (data?.error_code) {
      const mapped = AI_ERROR_MAP[data.error_code];

      if (mapped) {
        return mapped;
      }

      // 매핑에 없는 새 에러 코드
      logger.warn({
        event: 'unmapped_ai_error',
        errorCode: data.error_code,
        message: data.message,
        retryable: data.retryable,
      });
      return JOB_ERRORS.SYS_UNKNOWN;
    }

    // 4. 서버 연결 불가
    if (!status) {
      return JOB_ERRORS.SYS_ANALYZER_UNREACHABLE;
    }

    // 5. 5xx
    if (status >= 500) {
      return JOB_ERRORS.SYS_ANALYZER_5XX;
    }

    // 6. 4xx
    if (status >= 400) {
      return JOB_ERRORS.AN_VALIDATION_FAIL;
    }
  }

  // 7. 알 수 없는 에러
  return JOB_ERRORS.SYS_UNKNOWN;
}

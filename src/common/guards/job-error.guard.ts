import { BaseJobError } from '@common/constants/errors/job.errors';

/**
 * BaseJobError 타입 가드
 *
 * 에러 객체가 BaseJobError 인터페이스를 만족하는지 확인
 * Worker, AnalyzerClient 등 여러 곳에서 재사용
 */
export function isBaseJobError(err: unknown): err is BaseJobError {
  return (
    typeof err === 'object' && err !== null && 'code' in err && 'message' in err
  );
}

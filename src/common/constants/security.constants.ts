/**
 * 로그에서 마스킹할 민감 키워드
 * - 키 이름에 이 키워드가 포함되면 값을 *****로 마스킹
 */
export const SENSITIVE_KEYWORDS = [
  'password',
  'token',
  'secret',
  'key',
  'auth',
  'credential',
] as const;

/**
 * URL 마스킹 (로그 보안)
 */
export function maskUrlUtil(url: string): string {
  // 1. HTTP/HTTPS URL이 아니면 로컬 경로로 간주
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // 경로가 너무 길면 끝부분만 표시
    const maxLength = 50;
    if (url.length > maxLength) {
      return `[LOCAL] ...${url.slice(-maxLength)}`;
    }
    return `[LOCAL] ${url}`;
  }

  // 2. URL 파싱 시도
  try {
    const urlObj = new URL(url);

    // 쿼리 파라미터가 있으면 마스킹
    if (urlObj.search) {
      return `${urlObj.origin}${urlObj.pathname}?[MASKED]`;
    }

    // 쿼리 파라미터 없으면 그대로 반환
    return url;
  } catch {
    // URL 파싱 실패 시
    return '[INVALID_URL]';
  }
}

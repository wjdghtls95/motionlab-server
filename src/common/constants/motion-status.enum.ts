/**
 * Motion 분석 상태
 */
export enum MotionStatus {
  UPLOADED = 'uploaded', // 업로드 완료 (분석 대기)
  PROCESSING = 'processing', //분석 진행 중
  RETRYING = 'retrying', // 재시도 대기/예정
  COMPLETED = 'completed', // 분석 완료
  FAILED = 'failed', // 분석 실패
}

export const MOTION_CONSTANTS = {
  // 업로드 설정
  UPLOAD_DIR: './uploads/motions',
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
  ALLOWED_EXTENSIONS: ['mp4', 'mov', 'avi'],
  ALLOWED_MIMES: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],

  // Queue 설정
  QUEUE_NAME: 'motion-analysis-queue',
  JOB_NAME: 'analyze-motion',
  MAX_ATTEMPTS: 3,
  BACKOFF: {
    type: 'exponential' as const,
    delay: 3000, // 3초 -> 9초 -> 27초
  },

  // Job 보관 정책
  JOB_RETENTION: {
    COMPLETE: { count: 1000 }, // 완료 job은 적당히만
    FAIL: { count: 5000 }, // 실패 job은 좀 더 남김(디버깅)
  },

  // Soft Delete 설정(삭제 유효기간 설정 config)
  DELETION_GRACE_PERIOD_DAYS: 30,
  CLEANUP_CRON_SCHEDULE: '0 3 * * *', // 매일 새벽 3시
  CLEANUP_BATCH_SIZE: 100,

  // 분석 타임아웃
  ANALYZER_TIMEOUT: 60000,

  WORKER_LOCK_DURATION: 120000, // 2분: BullMQ job lock 유지
  WORKER_STALLED_INTERVAL: 120000, // 2분: stalled job 체크 간격
} as const;

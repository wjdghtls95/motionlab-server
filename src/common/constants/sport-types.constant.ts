export const SPORT_TYPES = {
  GOLF: 'golf',
  WEIGHT: 'weight',
  TENNIS: 'tennis',
  SOCCER: 'soccer',
  BASKETBALL: 'basketball',
  BASEBALL: 'baseball',
  RUNNING: 'running',
  PILATES: 'pilates',
} as const;

export type SportType = (typeof SPORT_TYPES)[keyof typeof SPORT_TYPES];

export const SUB_CATEGORY = {
  // 1. 공통 (없음)
  NONE: 'NONE',

  // 2. 종목별 상세 정의 (객체로 관리)
  [SPORT_TYPES.GOLF]: {
    DRIVER: 'DRIVER',
    IRON: 'IRON',
    PUTTER: 'PUTTER',
  },
  [SPORT_TYPES.WEIGHT]: {
    SQUAT: 'SQUAT',
    DEADLIFT: 'DEADLIFT',
    BENCH_PRESS: 'BENCH_PRESS',
  },
  [SPORT_TYPES.TENNIS]: {
    FOREHAND: 'FOREHAND',
    BACKHAND: 'BACKHAND',
    SERVE: 'SERVE',
  },
} as const;

export type SubCategoryType = (typeof SUB_CATEGORY)[keyof typeof SUB_CATEGORY];

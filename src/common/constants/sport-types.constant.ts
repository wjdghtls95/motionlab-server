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
    WEDGE: 'WEDGE',
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

// 1차 추출 (문자열 + 객체들이 섞여 나옴)
type TopLevel = (typeof SUB_CATEGORY)[keyof typeof SUB_CATEGORY];

// 최종 추출 (조건부 타입: 객체면 안으로 들어가고, 아니면 그냥 씀)
export type SubCategoryType = TopLevel extends object
  ? TopLevel[keyof TopLevel] // 객체(Golf, Weight)라면 -> 그 안의 값('DRIVER', 'SQUAT'...) 추출
  : TopLevel;

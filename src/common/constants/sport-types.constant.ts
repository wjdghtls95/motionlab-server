export const SPORT_TYPES = {
  GOLF: '골프',
  SOCCER: '축구',
  BASKETBALL: '농구',
  BASEBALL: '야구',
  TENNIS: '테니스',
  RUNNING: '달리기',
  CYCLING: '사이클',
  YOGA: '요가',
  PILATES: '필라테스',
} as const;

export type SportType = (typeof SPORT_TYPES)[keyof typeof SPORT_TYPES];

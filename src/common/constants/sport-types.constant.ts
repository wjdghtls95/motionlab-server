export const SPORT_TYPES = {
  GOLF: 'golf',
  SOCCER: 'soccer',
  BASKETBALL: 'basketball',
  BASEBALL: 'baseball',
  TENNIS: 'tennis',
  RUNNING: 'running',
  CYCLING: 'cycling',
  PILATES: 'pilates',
} as const;

export type SportType = (typeof SPORT_TYPES)[keyof typeof SPORT_TYPES];

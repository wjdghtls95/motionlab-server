import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  corsOrigin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) ?? [],
}));

export interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigin: string[];
}

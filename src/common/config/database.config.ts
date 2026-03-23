import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  name: 'default',
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  autoLoadEntities: true, // Entity 자동 로드
  // 프로덕션에서는 DB_SYNCHRONIZE 값과 무관하게 항상 false (스키마 자동 변경 방지)
  synchronize:
    process.env.NODE_ENV !== 'production' &&
    process.env.DB_SYNCHRONIZE === 'true',
}));

import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  name: 'default',
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [
    'dist/**/*.entity{.ts,.js}', // 배포/빌드 시 (dist 폴더)
    'src/**/*.entity{.ts,.js}', // 테스트/개발 시 (src 폴더)
  ],
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
}));

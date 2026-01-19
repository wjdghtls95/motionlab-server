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
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
}));

import { registerAs } from '@nestjs/config';

export default registerAs('s3', () => ({
  bucket: process.env.R2_BUCKET_NAME || '',
  region: process.env.AWS_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT || '',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
}));

export interface S3Config {
  bucket: string;
  region: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
}

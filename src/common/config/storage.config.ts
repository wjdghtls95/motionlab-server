import { registerAs } from '@nestjs/config';
import { StorageType } from '@common/constants/storage-type.enum';

export default registerAs('storage', () => ({
  type: (process.env.STORAGE_TYPE as StorageType) || StorageType.LOCAL,
  uploadDir: process.env.UPLOAD_DIR || './uploads/motions',
  publicUrl: process.env.APP_URL || 'http://localhost:3000',
}));

export interface StorageConfig {
  type: StorageType;
  uploadDir: string;
  publicUrl: string;
}

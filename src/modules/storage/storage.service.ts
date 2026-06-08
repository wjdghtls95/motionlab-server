import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import { dirname, join } from 'path';

import { StorageType } from '@common/constants/storage-type.enum';
import { StorageConfig } from '@common/config/storage.config';
import { S3Config } from '@common/config/s3.config';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  private readonly storageConfig: StorageConfig;
  private readonly s3Config: S3Config;
  private readonly s3Client?: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.storageConfig = this.configService.get<StorageConfig>('storage')!;
    this.s3Config = this.configService.get<S3Config>('s3')!;

    if (this.storageConfig.type === StorageType.S3) {
      if (!this.s3Config.bucket || !this.s3Config.accessKeyId) {
        throw new Error(
          'S3 storage requires s3.bucket and s3.accessKeyId configuration',
        );
      }

      this.s3Client = new S3Client({
        region: this.s3Config.region,
        endpoint: this.s3Config.endpoint || undefined,
        credentials: {
          accessKeyId: this.s3Config.accessKeyId,
          secretAccessKey: this.s3Config.secretAccessKey,
        },
      });

      this.logger.log(`S3 client initialized: ${this.s3Config.bucket}`);
    } else {
      this.logger.log(`Storage type: LOCAL`);
    }
  }

  // -------------------------
  // Controller/Service에서 호출하는 메서드 (CREATE/READ/DELETE 순)
  // -------------------------

  /**
   * D20: tmp(localPath) -> 최종 저장소 반영
   * - LOCAL: rename(move)로 uploads 아래로 이동
   * - S3: 업로드 후 tmp 파일 unlink
   * - 실패 시에도 tmp 정리 시도 (D20)
   */
  async storeUploadedFile(params: {
    localPath: string;
    videoKey: string;
    contentType: string;
  }): Promise<{ videoKey: string; storageType: StorageType }> {
    const { localPath, videoKey, contentType } = params;

    if (this.storageConfig.type === StorageType.LOCAL) {
      const dest = this.toLocalFullPath(videoKey); // ./uploads + videoKey
      await fs.mkdir(dirname(dest), { recursive: true });

      try {
        await fs.rename(localPath, dest);
      } catch (e: any) {
        if (e?.code !== 'EXDEV') {
          await fs.unlink(localPath).catch(() => undefined);
          throw e;
        }
        // EXDEV: cross-device rename (e.g. /tmp → Docker named volume)
        try {
          await fs.copyFile(localPath, dest);
          await fs.unlink(localPath).catch(() => undefined);
        } catch (copyErr) {
          await fs.unlink(localPath).catch(() => undefined);
          throw copyErr;
        }
      }
      this.logger.log(`Local file stored: ${videoKey}`);
      return { videoKey, storageType: StorageType.LOCAL };
    }

    // S3
    if (!this.s3Client) throw new Error('S3 client not initialized');

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.s3Config.bucket,
          Key: videoKey,
          Body: createReadStream(localPath),
          ContentType: contentType,
        }),
      );
    } catch (e) {
      // 실패 시 tmp 정리 시도 (D20)
      await fs.unlink(localPath).catch(() => undefined);
      throw e;
    }

    // 성공 시 tmp 정리 (D20)
    await fs
      .unlink(localPath)
      .catch((err) =>
        this.logger.warn(`Failed to cleanup temp file: ${err.message}`),
      );

    this.logger.log(`S3 upload completed: ${videoKey}`);
    return { videoKey, storageType: StorageType.S3 };
  }

  /**
   * D3/D4: Analyzer에는 절대경로가 아닌 videoUrl만 전달.
   * - LOCAL: /files 프리픽스로 접근 가능한 URL
   * - S3: Worker 실행 시 Signed URL 발급(D4)
   */
  async getVideoUrl(videoKey: string): Promise<string> {
    if (this.storageConfig.type === StorageType.LOCAL) {
      return `${this.storageConfig.publicUrl}/files/${this.toUrlPath(
        videoKey,
      )}`;
    }

    if (!this.s3Client) throw new Error('S3 client not initialized');

    const command = new GetObjectCommand({
      Bucket: this.s3Config.bucket,
      Key: videoKey,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: 60 * 10, // 10분
    });
  }

  /**
   * 하위 호환용(기존 호출부가 getDownloadUrl이면 깨지지 않게)
   */
  async getDownloadUrl(videoKey: string): Promise<string> {
    return this.getVideoUrl(videoKey);
  }

  /**
   * videoKey 기준 파일 삭제 (멱등)
   * - storageType을 넘기면 그 기준으로 삭제(권장: motion.storageType)
   */
  async deleteByKey(
    videoKey: string,
    storageType?: StorageType,
  ): Promise<void> {
    const type = storageType ?? this.currentStorageType;

    try {
      if (type === StorageType.LOCAL) {
        await this.deleteLocalFile(videoKey);
        return;
      }
      await this.deleteS3Object(videoKey);
    } catch (error: any) {
      this.logger.warn({
        event: 'storage_delete_failed',
        videoKey,
        storageType: type,
        message: error?.message,
      });
      throw error;
    }
  }

  // -------------------------
  // getters
  // -------------------------

  get currentStorageType(): StorageType {
    return this.storageConfig.type;
  }

  // -------------------------
  // private helpers
  // -------------------------

  private toLocalFullPath(videoKey: string): string {
    // 추천 정책:
    // - storage.uploadDir = './uploads'
    // - videoKey = 'motions/u{userId}/{sportCode}/{filename}' (D25)
    // => './uploads/motions/u1/golf/a.mp4'
    return join(process.cwd(), this.storageConfig.uploadDir, videoKey);
  }

  private async deleteLocalFile(videoKey: string): Promise<void> {
    const fullPath = this.toLocalFullPath(videoKey);

    try {
      await fs.unlink(fullPath);
      this.logger.log({ event: 'local_deleted', fullPath });
    } catch (error: any) {
      if (error?.code === 'ENOENT') return; // 멱등 성공
      throw error;
    }
  }

  private async deleteS3Object(videoKey: string): Promise<void> {
    if (!this.s3Client || !this.s3Config.bucket) {
      throw new Error('S3 is enabled but client/bucket is not configured');
    }

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.s3Config.bucket,
        Key: videoKey,
      }),
    );

    this.logger.log({
      event: 's3_deleted',
      bucket: this.s3Config.bucket,
      key: videoKey,
    });
  }

  /**
   * LOCAL URL에서 videoKey의 슬래시(/)는 경로 구분자로 유지해야 함
   * encodeURIComponent(videoKey) 쓰면 /까지 %2F로 바뀌어서 정적서빙이 깨질 수 있음
   */
  private toUrlPath(videoKey: string): string {
    return videoKey
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/');
  }
}

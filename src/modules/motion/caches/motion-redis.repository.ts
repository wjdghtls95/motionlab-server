import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { RedisFactory } from '@common/database/redis/redis.factory';
import { REDIS_DB_NUMBER } from '@common/constants/redis.constant';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MotionRedisRepository {
  private readonly logger = new Logger(MotionRedisRepository.name);
  private readonly redis: Redis;
  private readonly TTL = 86400;
  private readonly KEY_PREFIX = 'motion:checkpoint:';

  constructor(private readonly configService: ConfigService) {
    this.redis = RedisFactory.createRedisClient(
      REDIS_DB_NUMBER.CACHE,
      this.configService,
    );
  }

  async get(motionId: number): Promise<any | null> {
    const key = this.buildKey(motionId);

    try {
      const cached = await this.redis.get(key);

      if (cached) {
        this.logger.log({
          event: 'checkpoint_hit',
          motionId,
        });
        return JSON.parse(cached);
      }

      this.logger.log({
        event: 'checkpoint_miss',
        motionId,
      });
      return null;
    } catch (error) {
      this.logger.error({
        event: 'checkpoint_get_error',
        motionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async save(motionId: number, data: any): Promise<void> {
    const key = this.buildKey(motionId);

    try {
      const serialized = JSON.stringify(data);
      await this.redis.setex(key, this.TTL, serialized);

      this.logger.log({
        event: 'checkpoint_saved',
        motionId,
        sizeKB: (serialized.length / 1024).toFixed(2),
      });
    } catch (error) {
      this.logger.error({
        event: 'checkpoint_save_error',
        motionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async delete(motionId: number): Promise<void> {
    const key = this.buildKey(motionId);

    try {
      await this.redis.del(key);

      this.logger.log({
        event: 'checkpoint_deleted',
        motionId,
      });
    } catch (error) {
      this.logger.error({
        event: 'checkpoint_delete_error',
        motionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private buildKey(motionId: number): string {
    return `${this.KEY_PREFIX}${motionId}`;
  }
}

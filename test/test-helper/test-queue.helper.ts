import { TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export class TestQueueHelper {
  private static module: TestingModule;

  static initialize(module: TestingModule) {
    this.module = module;
  }

  // queue 1개 초기화
  static async clear(queueName: string): Promise<void> {
    if (!this.module) {
      throw new Error('TestQueueHelper is not initialized');
    }

    const queue = this.module.get<Queue>(getQueueToken(queueName));
    await queue.obliterate({ force: true });
  }

  // string 하나 또는 배열 모두 지원
  static async clearQueues(queueNameOrNames: string | string[]): Promise<void> {
    const names = Array.isArray(queueNameOrNames)
      ? queueNameOrNames
      : [queueNameOrNames];

    for (const name of names) {
      await this.clear(name);
    }
  }
}

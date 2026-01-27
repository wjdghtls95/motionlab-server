import { TestingModule } from '@nestjs/testing';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

export class TestMongoHelper {
  private static conn: Connection;

  static initialize(module: TestingModule): void {
    this.conn = module.get<Connection>(getConnectionToken());
  }

  static async clearAll(): Promise<void> {
    if (!this.conn) throw new Error('Mongo Connection is not initialized');
    await this.conn.dropDatabase();
  }
}

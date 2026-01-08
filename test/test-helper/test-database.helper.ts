import { DataSource } from 'typeorm';
import { TestingModule } from '@nestjs/testing';

export class TestDatabaseHelper {
  private static dataSource: DataSource;

  static async initialize(module: TestingModule): Promise<void> {
    this.dataSource = module.get<DataSource>(DataSource);
    await this.clearAll();
  }

  /**
   * 모든 테이블 데이터 삭제
   * FOREIGN_KEY_CHECKS를 0으로 설정하여 외래키 제약 임시 해제
   */
  static async clearAll(): Promise<void> {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      throw new Error('DataSource is not initialized');
    }

    const dbName = this.dataSource.options.database as string;
    if (!dbName.includes('test')) {
      throw new Error(
        `❌ DANGER: clearAll() can only be used with test database!\n` +
          `   Current DB: ${dbName}\n` +
          `   Expected: motionlab_test`,
      );
    }

    const entities = this.dataSource.entityMetadatas;

    // 외래키 제약 임시 해제 → TRUNCATE → 외래키 제약 복원
    await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const entity of entities) {
      await this.dataSource.query(`TRUNCATE TABLE ${entity.tableName}`);
    }

    await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  /**
   * 특정 테이블만 삭제
   */
  static async clearTable(entityClass: any): Promise<void> {
    const metadata = this.dataSource.getMetadata(entityClass);

    await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await this.dataSource.query(`TRUNCATE TABLE ${metadata.tableName}`);
    await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  static async close(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }

  static getDataSource(): DataSource {
    if (!this.dataSource) {
      throw new Error(
        'DataSource is not initialized. Call initialize() first.',
      );
    }
    return this.dataSource;
  }
}

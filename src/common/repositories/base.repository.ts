import {
  Repository,
  SelectQueryBuilder,
  EntityManager,
  FindManyOptions,
  InsertResult,
  UpdateResult,
  DeleteResult,
  SaveOptions,
  FindOptionsWhere,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { UpsertOptions } from 'typeorm/repository/UpsertOptions';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

export abstract class BaseRepository<Entity> extends Repository<Entity> {
  /**
   * 테이블 alias (QueryBuilder에서 사용)
   */
  protected get alias(): string {
    return this.metadata.tableName;
  }
  /**
   * EntityManager 반환 (QueryRunner 우선)
   */
  private get entityManager(): EntityManager {
    return this.manager;
  }

  /**
   * QueryBuilder 생성
   */
  protected getQueryBuilder(): SelectQueryBuilder<Entity> {
    return this.entityManager.createQueryBuilder(this.target, this.alias);
  }

  /**
   * ID로 단일 조회
   */
  async findById(id: number): Promise<Entity | null> {
    return await this.getQueryBuilder()
      .where(`${this.alias}.id = :id`, { id })
      .getOne();
  }

  /**
   * ID로 조회 (없으면 예외)
   */
  async findByIdOrFail(id: number): Promise<Entity> {
    const entity = await this.findById(id);

    if (!entity) {
      throw new NotFoundException(
        `${this.metadata.targetName} with id ${id} not found`,
      );
    }

    return entity;
  }

  /**
   * 여러 ID로 조회
   */
  async findByIdIn(ids: number[]): Promise<Entity[]> {
    if (!ids || ids.length === 0) return [];

    return await this.getQueryBuilder().whereInIds(ids).getMany();
  }

  /**
   * ID 존재 여부 확인
   */
  async existsById(id: number): Promise<boolean> {
    const count = await this.getQueryBuilder()
      .where(`${this.alias}.id = :id`, { id })
      .getCount();

    return count > 0;
  }

  /**
   * 단일/여러 엔티티 삽입
   */
  async insert(
    entityOrEntities:
      | QueryDeepPartialEntity<Entity>
      | QueryDeepPartialEntity<Entity>[],
  ): Promise<InsertResult> {
    return await this.getQueryBuilder()
      .insert()
      .values(entityOrEntities)
      .execute();
  }

  /**
   * 여러 엔티티 삽입 (엔티티 객체에 ID 자동 할당)
   */
  async insertMany(
    entityOrEntities:
      | QueryDeepPartialEntity<Entity>
      | QueryDeepPartialEntity<Entity>[],
  ): Promise<InsertResult> {
    const result = await this.getQueryBuilder()
      .insert()
      .values(entityOrEntities)
      .updateEntity(false)
      .execute();

    const firstInsertId = result.raw.insertId;
    const numberOfInsertedRows = result.raw.affectedRows;

    if (Array.isArray(entityOrEntities)) {
      const foundEntities = await this.findByIdIn(
        Array.from(
          { length: numberOfInsertedRows },
          (_, index) => firstInsertId + index,
        ),
      );

      entityOrEntities.forEach((entity, index) => {
        Object.assign(entity, foundEntities[index]);
      });
    } else {
      const foundEntity = await this.findById(firstInsertId);
      Object.assign(entityOrEntities, foundEntity);
    }

    return result;
  }

  /**
   * Upsert (INSERT OR UPDATE)
   */
  async upsert(
    entityOrEntities:
      | QueryDeepPartialEntity<Entity>
      | QueryDeepPartialEntity<Entity>[],
    conflictPathsOrOptions: string[] | UpsertOptions<Entity>,
  ): Promise<InsertResult> {
    return await this.entityManager.upsert(
      this.target,
      entityOrEntities,
      conflictPathsOrOptions,
    );
  }

  /**
   * 저장 (생성 또는 수정)
   */
  async save<T extends Entity>(entity: T, options?: SaveOptions): Promise<T>;
  async save<T extends Entity>(
    entities: T[],
    options?: SaveOptions,
  ): Promise<T[]>;
  async save<T extends Entity>(
    entityOrEntities: T | T[],
    options?: SaveOptions,
  ): Promise<T | T[]> {
    return await this.entityManager.save(entityOrEntities as any, options);
  }

  /**
   * ID로 업데이트
   */
  async updateById(
    id: number,
    values: QueryDeepPartialEntity<Entity>,
  ): Promise<UpdateResult> {
    const result = await this.getQueryBuilder()
      .update()
      .set(values)
      .where(`${this.alias}.id = :id`, { id })
      .execute();

    if (!result.affected || result.affected === 0) {
      throw new InternalServerErrorException(
        `Failed to update ${this.metadata.targetName} with id ${id}`,
      );
    }

    return result;
  }

  /**
   * 여러 ID로 업데이트
   */
  async updateByIdIn(
    ids: number[],
    values: QueryDeepPartialEntity<Entity>,
  ): Promise<UpdateResult> {
    if (!ids || ids.length === 0) {
      throw new Error('ids array cannot be empty');
    }

    const result = await this.getQueryBuilder()
      .update()
      .set(values)
      .whereInIds(ids)
      .execute();

    if (!result.affected || result.affected === 0) {
      throw new InternalServerErrorException(
        `Failed to update ${this.metadata.targetName}`,
      );
    }

    return result;
  }

  /**
   * ID로 삭제
   */
  async deleteById(id: number): Promise<DeleteResult> {
    return await this.getQueryBuilder()
      .delete()
      .where(`${this.alias}.id = :id`, { id })
      .execute();
  }

  /**
   * 여러 ID로 삭제
   */
  async deleteByIdIn(ids: number[]): Promise<DeleteResult> {
    if (!ids || ids.length === 0) {
      throw new Error('ids array cannot be empty');
    }

    return await this.getQueryBuilder().delete().whereInIds(ids).execute();
  }

  /**
   * 페이지네이션 조회
   */
  async findAllPaginated(options: FindManyOptions<Entity> = {}) {
    const take = options.take || 20;
    const skip = options.skip || 0;

    const queryBuilder = this.getQueryBuilder();

    if (options.where) {
      queryBuilder.where(options.where as FindOptionsWhere<Entity>);
    }

    if (options.order) {
      Object.entries(options.order).forEach(([key, value]) => {
        queryBuilder.addOrderBy(`${this.alias}.${key}`, value as any);
      });
    }

    const [items, total] = await queryBuilder
      .take(take)
      .skip(skip)
      .getManyAndCount();

    return {
      items,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      totalPages: Math.ceil(total / take),
    };
  }
}

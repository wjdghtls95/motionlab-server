import { DynamicModule, Provider } from '@nestjs/common';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TYPEORM_CUSTOM_REPOSITORY } from '@common/decorators/custom-repository.decorator';

export class TypeOrmExModule {
  public static forCustomRepository<T extends new (...args: any[]) => any>(
    repositories: T[],
    dataSourceName?: string,
  ): DynamicModule {
    const providers: Provider[] = [];
    const entities = [];

    for (const repository of repositories) {
      const entity = Reflect.getMetadata(TYPEORM_CUSTOM_REPOSITORY, repository);

      if (entity) {
        entities.push(entity);
      }

      providers.push({
        provide: repository,
        inject: [getDataSourceToken(dataSourceName)],
        useFactory: (dataSource: DataSource): typeof repository => {
          const entityManager = dataSource.createEntityManager();

          return new repository(entity, entityManager);
        },
      });
    }

    return {
      exports: providers,
      module: TypeOrmExModule,
      imports: [TypeOrmModule.forFeature(entities, dataSourceName)],
      providers,
    };
  }
}

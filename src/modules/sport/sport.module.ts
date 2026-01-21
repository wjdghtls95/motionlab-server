import { Module } from '@nestjs/common';
import { SportService } from './sport.service';
import { SportController } from './sport.controller';
import { TypeOrmExModule } from '@common/database/typeorm-ex.module';
import { SportRepository } from '@modules/sport/entities/sport.repository';

@Module({
  imports: [TypeOrmExModule.forCustomRepository([SportRepository])],
  controllers: [SportController],
  providers: [SportService],
  exports: [SportService, TypeOrmExModule],
})
export class SportModule {}

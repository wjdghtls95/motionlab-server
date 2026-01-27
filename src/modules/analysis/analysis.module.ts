import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AnalysisResult,
  AnalysisResultSchema,
} from './schemas/analysis-result.schema';
import { AnalysisService } from '@modules/analysis/analysis.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AnalysisResult.name, schema: AnalysisResultSchema },
    ]),
  ],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}

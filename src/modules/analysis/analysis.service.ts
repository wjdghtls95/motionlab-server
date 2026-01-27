import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalysisResult } from './schemas/analysis-result.schema';

export class AnalysisService {
  constructor(
    @InjectModel(AnalysisResult.name)
    private readonly model: Model<AnalysisResult>,
  ) {}

  /**
   * 분석 결과 저장
   */
  async upsertResult(params: {
    motionId: number;
    result: any;
    feedback: any;
    promptVersion: string;
  }) {
    const { motionId, result, feedback, promptVersion } = params;

    await this.model.updateOne(
      { motionId },
      { $set: { motionId, result, feedback, promptVersion } },
      { upsert: true },
    );
  }

  /**
   * motionId로 결과 조회
   */
  async findByMotionId(motionId: number) {
    return this.model.findOne({ motionId }).lean();
  }
}

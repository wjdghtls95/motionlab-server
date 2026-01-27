import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AnalysisResultDocument = HydratedDocument<AnalysisResult>;

@Schema({ collection: 'analysis_results', timestamps: true })
export class AnalysisResult {
  @Prop({ required: true, unique: true, index: true })
  motionId: number; // motion 도메인 pk

  @Prop({ type: Object, required: true })
  result: any;

  @Prop({ type: Object, required: true })
  feedback: any; // 피드백

  @Prop({ required: true })
  promptVersion: string; // 프롬프트 버전
}

export const AnalysisResultSchema =
  SchemaFactory.createForClass(AnalysisResult);

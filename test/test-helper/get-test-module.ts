import { Test } from '@nestjs/testing';
import { AppModule } from '@/app.module';

export const getTestModule = Test.createTestingModule({
  imports: [AppModule],
}).compile();

import { AppModule } from '@app/app.module';
import { Test } from '@nestjs/testing';

export const getTestModule = Test.createTestingModule({
  imports: [AppModule],
}).compile();

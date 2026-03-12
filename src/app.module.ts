import { Module } from '@nestjs/common';
import { CoreModule } from '@core/core.module';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';
import { SportModule } from '@modules/sport/sport.module';
import { MotionModule } from '@modules/motion/motion.module';
import { AdminModule } from '@modules/admin/admin.module';

@Module({
  imports: [
    // Core Module
    CoreModule,

    // Domain Modules
    UserModule,
    AuthModule,
    SportModule,
    MotionModule,
    AdminModule,
  ],
})
export class AppModule {}

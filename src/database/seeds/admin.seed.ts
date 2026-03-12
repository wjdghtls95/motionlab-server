import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '@modules/user/entities/user.repository';
import { UserRole } from '@common/enums/user-role.enum';

/**
 * 초기 어드민 계정 생성 Seeder
 *
 * 앱 부트스트랩 시 ADMIN_EMAIL / ADMIN_PASSWORD 환경변수를 읽어
 * 어드민 계정이 없을 경우에만 생성합니다.
 * 환경변수가 없으면 경고만 출력하고 건너뜁니다.
 */
@Injectable()
export class AdminSeed implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeed.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.configService.get<string>('ADMIN_EMAIL');
    const password = this.configService.get<string>('ADMIN_PASSWORD');

    if (!email || !password) {
      this.logger.warn(
        'ADMIN_EMAIL 또는 ADMIN_PASSWORD 환경변수가 없어 어드민 계정 생성을 건너뜁니다.',
      );
      return;
    }

    const existing = await this.userRepository.findByEmail(email);

    if (existing) {
      this.logger.log(`어드민 계정이 이미 존재합니다: ${email}`);
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const adminUser = this.userRepository.create({
      email,
      password: hashedPassword,
      name: 'Admin',
      role: UserRole.ADMIN,
    });

    await this.userRepository.save(adminUser);

    this.logger.log(`초기 어드민 계정이 생성되었습니다: ${email}`);
  }
}

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getTestModule } from '../test-helper/get-test-module';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { UserRepository } from '@modules/user/entities/user.repository';
import { TestDatabaseHelper } from '../test-helper/test-database.helper';
import { TestUserHelper } from '../test-helper/test-user.helper';
import { userMockData } from '../mock-data/user.mock';
import { authMockData } from '../mock-data/auth.mock';
import { AllExceptionFilter } from '@common/filters/all-exception.filter';
import { HttpAdapterHost } from '@nestjs/core';
import { UserRole } from '@common/enums/user-role.enum';

describe('Admin (E2E)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let userRepository: UserRepository;
  let accessToken: string;
  let adminToken: string;
  let targetUserId: number;

  beforeAll(async () => {
    module = await getTestModule;
    app = module.createNestApplication();

    const httpAdapterHost = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionFilter(httpAdapterHost));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    userRepository = module.get<UserRepository>(UserRepository);
    await TestDatabaseHelper.initialize(module);
    TestUserHelper.initialize(userRepository);
  });

  beforeEach(async () => {
    await TestDatabaseHelper.clearAll();
    TestUserHelper.resetCounter();

    // 일반 유저 생성 및 로그인
    const user = await TestUserHelper.createUser(userMockData.validUser);
    targetUserId = user.id;
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send(authMockData.validLogin);
    accessToken = loginRes.body.accessToken;

    // 관리자 유저 생성 및 로그인
    await TestUserHelper.createAdminUser(userMockData.adminUser);
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send(authMockData.adminLogin);
    adminToken = adminLoginRes.body.accessToken;
  });

  afterAll(async () => {
    await TestDatabaseHelper.close();
    await app.close();
  });

  // ==================== PATCH /admin/users/:id/role ====================
  describe('PATCH /admin/users/:id/role', () => {
    it('✅ 200 - 관리자: USER → ADMIN 역할 변경 성공', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${targetUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.ADMIN })
        .expect(200);

      expect(response.body.role).toBe(UserRole.ADMIN);
      expect(response.body.id).toBe(targetUserId);
    });

    it('✅ 200 - 관리자: ADMIN → USER 역할 강등 성공', async () => {
      // 먼저 ADMIN으로 승급
      await request(app.getHttpServer())
        .patch(`/admin/users/${targetUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.ADMIN })
        .expect(200);

      // ADMIN → USER 강등
      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${targetUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.USER })
        .expect(200);

      expect(response.body.role).toBe(UserRole.USER);
    });

    it('❌ 403 - 일반 유저: 역할 변경 권한 없음', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${targetUserId}/role`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: UserRole.ADMIN })
        .expect(403);

      expect(response.body.error.code).toBe('AUTH_008');
    });

    it('❌ 401 - 인증되지 않은 요청', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/users/${targetUserId}/role`)
        .send({ role: UserRole.ADMIN })
        .expect(401);
    });

    it('❌ 404 - 존재하지 않는 사용자', async () => {
      const response = await request(app.getHttpServer())
        .patch('/admin/users/999999/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.ADMIN })
        .expect(404);

      expect(response.body.error.code).toBe('USER_001');
    });

    it('❌ 400 - 유효하지 않은 role 값', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${targetUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'SUPERUSER' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('❌ 400 - role 필드 누락', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${targetUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('✅ 역할 변경 후 DB에 실제 반영 확인', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/users/${targetUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.ADMIN })
        .expect(200);

      const updatedUser = await userRepository.findById(targetUserId);
      expect(updatedUser.role).toBe(UserRole.ADMIN);
    });

    it('✅ 역할 변경 후 해당 유저가 어드민 권한으로 로그인 가능', async () => {
      // ADMIN으로 역할 변경
      await request(app.getHttpServer())
        .patch(`/admin/users/${targetUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.ADMIN })
        .expect(200);

      // 재로그인하여 새 토큰 발급
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send(authMockData.validLogin);
      const newToken = loginRes.body.accessToken;

      // 새 토큰으로 어드민 전용 엔드포인트 접근 가능 확인
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);
    });
  });
});

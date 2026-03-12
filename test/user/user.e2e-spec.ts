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

describe('User (E2E)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let userRepository: UserRepository;
  let accessToken: string;
  let adminToken: string;

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
    await TestUserHelper.createUser(userMockData.validUser);
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(authMockData.validLogin);
    accessToken = loginResponse.body.accessToken;

    // 관리자 유저 생성 및 로그인
    await TestUserHelper.createAdminUser(userMockData.adminUser);
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(authMockData.adminLogin);
    adminToken = adminLoginResponse.body.accessToken;
  });

  afterAll(async () => {
    await TestDatabaseHelper.close();
    await app.close();
  });

  // ==================== GET /users ====================
  describe('GET /users', () => {
    it('✅ 200 - 관리자: 전체 사용자 조회 성공', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('email');
      expect(response.body[0]).not.toHaveProperty('password');
    });

    it('❌ 403 - 일반 유저: GET /users 접근 차단', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('AUTH_008');
    });

    it('❌ 401 - 인증되지 않은 요청', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(401);

      expect(response.body.error.code).toBe('AUTH_004');
    });
  });

  // ==================== GET /users/:id ====================
  describe('GET /users/:id', () => {
    it('✅ 200 - 본인 조회 성공', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send(authMockData.validLogin);
      const selfId = loginRes.body.userId;

      const response = await request(app.getHttpServer())
        .get(`/users/${selfId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(selfId);
      expect(response.body.email).toBe(userMockData.validUser.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('✅ 200 - 관리자: 타인 사용자 조회 성공', async () => {
      const userLoginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send(authMockData.validLogin);
      const userId = userLoginRes.body.userId;

      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
    });

    it('❌ 403 - 타인 계정 조회 차단', async () => {
      const otherUser = await TestUserHelper.createUser({
        email: 'other@example.com',
        password: 'Password123!',
        name: 'Other User',
      });

      const response = await request(app.getHttpServer())
        .get(`/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('AUTH_008');
    });

    it('❌ 404 - 관리자: 존재하지 않는 사용자', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('USER_001');
    });

    it('❌ 401 - 인증되지 않은 요청', async () => {
      await request(app.getHttpServer()).get('/users/1').expect(401);
    });
  });

  // ==================== PUT /users/:id ====================
  describe('PUT /users/:id', () => {
    it('✅ 200 - 본인 정보 수정 성공', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send(authMockData.validLogin);
      const selfId = loginRes.body.userId;

      const response = await request(app.getHttpServer())
        .put(`/users/${selfId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
    });

    it('❌ 403 - 타인 계정 수정 차단', async () => {
      const otherUser = await TestUserHelper.createUser({
        email: 'other2@example.com',
        password: 'Password123!',
        name: 'Other User',
      });

      const response = await request(app.getHttpServer())
        .put(`/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Hacked Name' })
        .expect(403);

      expect(response.body.error.code).toBe('AUTH_008');
    });

    it('❌ 400 - DTO에 없는 필드 전송 시 차단 (forbidNonWhitelisted)', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send(authMockData.validLogin);
      const selfId = loginRes.body.userId;

      const response = await request(app.getHttpServer())
        .put(`/users/${selfId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Valid Name', role: 'ADMIN' }) // role 필드는 DTO에 없음
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==================== DELETE /users/:id ====================
  describe('DELETE /users/:id', () => {
    it('✅ 200 - 본인 계정 삭제 성공', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send(authMockData.validLogin);
      const selfId = loginRes.body.userId;

      await request(app.getHttpServer())
        .delete(`/users/${selfId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 삭제 후 관리자로 재조회 시 404
      await request(app.getHttpServer())
        .get(`/users/${selfId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('❌ 403 - 타인 계정 삭제 차단', async () => {
      const otherUser = await TestUserHelper.createUser({
        email: 'victim@example.com',
        password: 'Password123!',
        name: 'Victim',
      });

      const response = await request(app.getHttpServer())
        .delete(`/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('AUTH_008');
    });

    it('❌ 404 - 관리자: 존재하지 않는 사용자 삭제', async () => {
      const response = await request(app.getHttpServer())
        .delete('/users/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('USER_001');
    });
  });
});

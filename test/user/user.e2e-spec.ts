import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getTestModule } from '../test-helper/get-test-module';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { UserRepository } from '@modules/user/user.repository';
import { TestDatabaseHelper } from '../test-helper/test-database.helper';
import { TestUserHelper } from '../test-helper/test-user.helper';
import { userMockData } from '../mock-data/user.mock';
import { authMockData } from '../mock-data/auth.mock';

describe('User (E2E)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let userRepository: UserRepository;
  let accessToken: string;

  beforeAll(async () => {
    module = await getTestModule;
    app = module.createNestApplication();

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

    // 인증된 사용자 생성
    await TestUserHelper.createUser(userMockData.validUser);
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(authMockData.validLogin);

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await TestDatabaseHelper.close();
    await app.close();
  });

  // ==================== GET /users ====================
  describe('GET /users', () => {
    it('✅ 200 - 전체 사용자 조회 성공', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('email');
      expect(response.body[0]).not.toHaveProperty('password');
    });

    it('❌ 401 - 인증되지 않은 요청', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(401);

      expect(response.body.error.code).toBe('AUTH_TOKEN_INVALID');
    });
  });

  // ==================== GET /users/:id ====================
  describe('GET /users/:id', () => {
    it('✅ 200 - ID로 사용자 조회 성공', async () => {
      const user = await TestUserHelper.createUser({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      });

      const response = await request(app.getHttpServer())
        .get(`/users/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(user.id);
      expect(response.body.email).toBe('test@example.com');
      expect(response.body).not.toHaveProperty('password');
    });

    it('❌ 404 - 존재하지 않는 사용자', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('❌ 401 - 인증되지 않은 요청', async () => {
      await request(app.getHttpServer()).get('/users/1').expect(401);
    });
  });

  // ==================== PUT /users/:id ====================
  describe('PUT /users/:id', () => {
    it('✅ 200 - 사용자 정보 수정 성공', async () => {
      const user = await TestUserHelper.createUser({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      });

      const response = await request(app.getHttpServer())
        .put(`/users/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
      expect(response.body.email).toBe('test@example.com');
    });

    it('❌ 404 - 존재하지 않는 사용자', async () => {
      const response = await request(app.getHttpServer())
        .put('/users/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('❌ 400 - 잘못된 입력값', async () => {
      const user = await TestUserHelper.createUser(userMockData.validUser);

      const response = await request(app.getHttpServer())
        .put(`/users/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '' }) // 빈 이름
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==================== DELETE /users/:id ====================
  describe('DELETE /users/:id', () => {
    it('✅ 200 - 사용자 삭제 성공', async () => {
      const user = await TestUserHelper.createUser({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      });

      await request(app.getHttpServer())
        .delete(`/users/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 삭제 확인
      await request(app.getHttpServer())
        .get(`/users/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('❌ 404 - 존재하지 않는 사용자', async () => {
      const response = await request(app.getHttpServer())
        .delete('/users/999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });
});

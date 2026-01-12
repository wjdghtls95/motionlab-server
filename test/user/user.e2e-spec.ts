import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getTestModule } from '../test-helper/get-test-module';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { UserRepository } from '@modules/user/user.repository';
import { TestDatabaseHelper } from '../test-helper/test-database.helper';
import { TestUserHelper } from '../test-helper/test-user.helper';
import { authMockData } from '../mock-data/auth.mock';
import { userMockData } from '../mock-data/user.mock';
import { AllExceptionFilter } from '@common/filters/all-exception.filter';
import { HttpAdapterHost } from '@nestjs/core';
import { DOMAIN_ERRORS } from '@common/constants/errors/domain.errors';

describe('Auth (E2E)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let userRepository: UserRepository;

  beforeAll(async () => {
    module = await getTestModule;

    app = module.createNestApplication();

    // 글로벌 ValidationPipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // 글로벌 Exception Filter
    const httpAdapterHost = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionFilter(httpAdapterHost));

    await app.init();

    userRepository = module.get<UserRepository>(UserRepository);
    await TestDatabaseHelper.initialize(module);
    TestUserHelper.initialize(userRepository);
  });

  beforeEach(async () => {
    await TestDatabaseHelper.clearAll();
    TestUserHelper.resetCounter();
  });

  afterAll(async () => {
    await TestDatabaseHelper.clearAll();
    await TestDatabaseHelper.close();
    await app.close();
  });

  describe('POST /auth/register', () => {
    it(' 201 - 회원가입 성공', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(authMockData.validRegister)
        .expect(201);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.email).toBe(authMockData.validRegister.email);
    });

    it('❌ 409 - 중복 이메일', async () => {
      await TestUserHelper.createUser(userMockData.validUser);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userMockData.validUser)
        .expect(409);

      //  에러 응답 검증
      expect(response.body.error.code).toBe(
        DOMAIN_ERRORS.AUTH_EMAIL_ALREADY_EXISTS.code,
      );
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path');
    });

    it('❌ 400 - 잘못된 이메일 형식', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...authMockData.validRegister,
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/login', () => {
    it(' 200 - 로그인 성공', async () => {
      await TestUserHelper.createUser(userMockData.validUser);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(authMockData.validLogin)
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
    });

    it('❌ 401 - 잘못된 비밀번호', async () => {
      await TestUserHelper.createUser(userMockData.validUser);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(authMockData.invalidLogin)
        .expect(401);

      //  에러 응답 검증
      expect(response.body.error.code).toBe(
        DOMAIN_ERRORS.AUTH_INVALID_CREDENTIALS.code,
      );
    });

    it('❌ 401 - 존재하지 않는 이메일', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'notfound@test.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.error.code).toBe(
        DOMAIN_ERRORS.AUTH_INVALID_CREDENTIALS.code,
      );
    });
  });

  describe('GET /auth/profile', () => {
    it(' 200 - 프로필 조회 성공', async () => {
      await TestUserHelper.createUser(userMockData.validUser);
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(authMockData.validLogin);

      const accessToken = loginResponse.body.accessToken;

      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.email).toBe(userMockData.validUser.email);
    });

    it('❌ 401 - 인증되지 않은 요청', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);

      expect(response.body.error.code).toBe(
        DOMAIN_ERRORS.AUTH_TOKEN_INVALID.code,
      );
    });

    it('❌ 401 - 잘못된 토큰', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error.code).toBe(
        DOMAIN_ERRORS.AUTH_TOKEN_INVALID.code,
      );
    });
  });
});

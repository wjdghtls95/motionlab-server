import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getTestModule } from '../test-helper/get-test-module';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { UserRepository } from '@modules/user/user.repository';
import { TestDatabaseHelper } from '../test-helper/test-database.helper';
import { TestUserHelper } from '../test-helper/test-user.helper';
import { authMockData } from '../mock-data/auth.mock';
import { userMockData } from '../mock-data/user.mock';

describe('Auth (E2E)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let userRepository: UserRepository;

  beforeAll(async () => {
    // AuthOutDto 동일한 getTestModule 사용
    module = await getTestModule;

    app = module.createNestApplication();

    //AuthOutDto 글로벌 설정 (main.ts와 동일)
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
  });

  afterAll(async () => {
    await TestDatabaseHelper.close();
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('✅ 201 - 회원가입 성공', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(authMockData.validRegister)
        .expect(201);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.email).toBe(authMockData.validRegister.email);
    });

    it('❌ 409 - 중복 이메일', async () => {
      await TestUserHelper.createUser(userMockData.validUser);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userMockData.validUser)
        .expect(409);
    });
  });

  describe('POST /auth/login', () => {
    it('✅ 200 - 로그인 성공', async () => {
      await TestUserHelper.createUser(userMockData.validUser);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(authMockData.validLogin)
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
    });

    it('❌ 401 - 잘못된 비밀번호', async () => {
      await TestUserHelper.createUser(userMockData.validUser);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(authMockData.invalidLogin)
        .expect(401);
    });
  });

  describe('GET /auth/profile', () => {
    it('✅ 200 - 프로필 조회 성공', async () => {
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
      await request(app.getHttpServer()).get('/auth/profile').expect(401);
    });
  });
});

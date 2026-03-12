import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { getTestModule } from '../test-helper/get-test-module';
import { TestDatabaseHelper } from '../test-helper/test-database.helper';
import { TestUserHelper } from '../test-helper/test-user.helper';
import { TestSportHelper } from '../test-helper/test-sport.helper';
import { UserRepository } from '@modules/user/entities/user.repository';
import { sportMockData } from '../mock-data/sport.mock';
import { userMockData } from '../mock-data/user.mock';
import { authMockData } from '../mock-data/auth.mock';
import { SportRepository } from '@app/modules/sport/entities/sport.repository';
import { SPORT_TYPES } from '@common/constants/sport-types.constant';
import { AllExceptionFilter } from '@common/filters/all-exception.filter';
import { HttpAdapterHost } from '@nestjs/core';

describe('Sport (E2E)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let sportRepository: SportRepository;
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

    sportRepository = module.get<SportRepository>(SportRepository);
    userRepository = module.get<UserRepository>(UserRepository);

    await TestDatabaseHelper.initialize(module);
    TestSportHelper.initialize(sportRepository);
    TestUserHelper.initialize(userRepository);
  });

  beforeEach(async () => {
    await TestDatabaseHelper.clearAll();
    TestSportHelper.resetCounter();

    // 일반 유저 로그인
    await TestUserHelper.createUser(userMockData.validUser);
    const userRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send(authMockData.validLogin);
    accessToken = userRes.body.accessToken;

    // 관리자 유저 생성 및 로그인
    await TestUserHelper.createAdminUser(userMockData.adminUser);
    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send(authMockData.adminLogin);
    adminToken = adminRes.body.accessToken;
  });

  afterAll(async () => {
    await TestDatabaseHelper.close();
    await app.close();
  });

  // 기능 정상 작동 테스트 (Happy Path)
  describe('✅ Functional Scenario', () => {
    it('POST /sports - 관리자: 종목 생성 성공 (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/sports')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sportMockData.validSport)
        .expect(201);

      expect(res.body.sportType).toBe(sportMockData.validSport.sportType);
    });

    it('GET /sports - 일반 유저: 전체 조회 성공 (200)', async () => {
      await TestSportHelper.createSports(2);

      const res = await request(app.getHttpServer())
        .get('/sports')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveLength(2);
    });
  });

  // 권한 검사 테스트 (Authorization)
  describe('🔐 Authorization', () => {
    let validSportId: number;

    beforeEach(async () => {
      const sport = await TestSportHelper.createSport(sportMockData.validSport);
      validSportId = sport.id;
    });

    it('❌ 403 - 일반 유저 POST /sports 접근 차단', async () => {
      const res = await request(app.getHttpServer())
        .post('/sports')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(sportMockData.validSport)
        .expect(403);

      expect(res.body.error.code).toBe('AUTH_008');
    });

    it('❌ 403 - 일반 유저 PATCH /sports/:id 접근 차단', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/sports/${validSportId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ description: 'hack' })
        .expect(403);

      expect(res.body.error.code).toBe('AUTH_008');
    });

    it('❌ 403 - 일반 유저 DELETE /sports/:id 접근 차단', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/sports/${validSportId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(res.body.error.code).toBe('AUTH_008');
    });

    it('❌ 401 - 토큰 없이 POST /sports 접근 차단', async () => {
      await request(app.getHttpServer())
        .post('/sports')
        .send(sportMockData.validSport)
        .expect(401);
    });
  });

  // 보안 및 예외 변수 테스트 (Security & Edge Cases)
  describe('🛡️ Security & Edge Cases', () => {
    let validSportId: number;

    beforeEach(async () => {
      const sport = await TestSportHelper.createSport(sportMockData.validSport);
      validSportId = sport.id;
    });

    it('❌ 400 - DTO에 없는 필드 전송 시 차단 (forbidNonWhitelisted)', async () => {
      const garbagePayload = {
        ...sportMockData.validSport,
        isAdmin: true,
        hackSql: 'DROP TABLE',
      };

      await request(app.getHttpServer())
        .post('/sports')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(garbagePayload)
        .expect(400)
        .expect((res) => {
          expect(res.body.error.message.errors).toEqual(
            expect.arrayContaining([
              expect.stringMatching(/property .+ should not exist/),
            ]),
          );
        });
    });

    it('❌ 400 - Boolean 필드에 문자열 전송', async () => {
      await request(app.getHttpServer())
        .patch(`/sports/${validSportId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: 'true' })
        .expect(400);
    });

    it('✅ 201 - 특수문자/스크립트 저장 시 실행되지 않고 텍스트로 저장됨', async () => {
      const existingSports = await sportRepository.find();
      const existingTypes = existingSports.map((s) => s.sportType);
      const allTypes = Object.values(SPORT_TYPES);
      const availableType = allTypes.find(
        (type) => !existingTypes.includes(type),
      );

      expect(availableType).toBeDefined();

      const xssPayload = {
        sportType: availableType,
        description:
          '<script>alert("XSS 공격")</script><img src=x onerror=alert(1)>',
      };

      const res = await request(app.getHttpServer())
        .post('/sports')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(xssPayload)
        .expect(201);

      expect(res.body.description).toBe(xssPayload.description);

      const getRes = await request(app.getHttpServer())
        .get(`/sports/${res.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getRes.body.description).toBe(xssPayload.description);

      const dbSport = await sportRepository.findById(res.body.id);
      expect(dbSport.description).toBe(xssPayload.description);
    });

    it('✅ 201 - SQL Injection 공격: SQL 명령어가 실행되지 않고 텍스트로 저장됨', async () => {
      const existingSports = await sportRepository.find();
      const existingTypes = existingSports.map((s) => s.sportType);
      const allTypes = Object.values(SPORT_TYPES);
      const availableType = allTypes.find(
        (type) => !existingTypes.includes(type),
      );

      expect(availableType).toBeDefined();

      const sqlInjectionPayload = {
        sportType: availableType,
        description: "'; DELETE FROM sports; DROP TABLE users; --",
      };

      const createRes = await request(app.getHttpServer())
        .post('/sports')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sqlInjectionPayload)
        .expect(201);

      expect(createRes.body.description).toBe(sqlInjectionPayload.description);

      const allSports = await sportRepository.findAllSports();
      expect(allSports).toBeDefined();
      expect(Array.isArray(allSports)).toBe(true);

      const getRes = await request(app.getHttpServer())
        .get(`/sports/${createRes.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getRes.body.description).toBe(sqlInjectionPayload.description);
    });

    it('✅ 201 - 복합 공격: XSS + SQL Injection 동시 시도', async () => {
      const existingSports = await sportRepository.find();
      const existingTypes = existingSports.map((s) => s.sportType);
      const allTypes = Object.values(SPORT_TYPES);
      const availableType = allTypes.find(
        (type) => !existingTypes.includes(type),
      );

      expect(availableType).toBeDefined();

      const complexAttackPayload = {
        sportType: availableType,
        description: `<script>alert(1)</script>'; DELETE FROM users; --<img src=x onerror=alert(2)>`,
      };

      const res = await request(app.getHttpServer())
        .post('/sports')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(complexAttackPayload)
        .expect(201);

      expect(res.body.description).toBe(complexAttackPayload.description);

      const allSports = await sportRepository.findAllSports();
      expect(allSports.length).toBeGreaterThan(0);
    });

    it('❌ 400 - 필수값에 빈 문자열 전송', async () => {
      await request(app.getHttpServer())
        .post('/sports')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sportType: '', description: 'test' })
        .expect(400);
    });
  });
});

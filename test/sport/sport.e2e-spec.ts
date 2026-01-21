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

describe('Sport (E2E)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let sportRepository: SportRepository;
  let userRepository: UserRepository;
  let accessToken: string;

  beforeAll(async () => {
    module = await getTestModule;
    app = module.createNestApplication();

    // [중요] 실제 환경과 동일한 파이프 설정
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true, // DTO에 없는 값 오면 에러
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

    // 로그인 및 토큰 발급
    await TestUserHelper.createUser(userMockData.validUser);
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(authMockData.validLogin);
    accessToken = res.body.accessToken;
  });

  afterAll(async () => {
    await TestDatabaseHelper.close();
    await app.close();
  });

  // 기능 정상 작동 테스트 (Happy Path)
  // TODO.. 생성 과 같은 관리자 role 인 api 우선 주석처리
  describe('✅ Functional Scenario', () => {
    it('POST /sports - 종목 생성 성공 (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/sports')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(sportMockData.validSport)
        .expect(201);

      expect(res.body.sportType).toBe(sportMockData.validSport.sportType);
    });

    it('GET /sports - 전체 조회 성공 (200)', async () => {
      await TestSportHelper.createSports(2);

      const res = await request(app.getHttpServer())
        .get('/sports')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveLength(2);
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
        isAdmin: true, // 👈 해킹 의심 필드
        hackSql: 'DROP TABLE', // 👈 SQL Injection 의심
      };

      await request(app.getHttpServer())
        .post('/sports')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(garbagePayload)
        .expect(400)
        .expect((res) => {
          // 에러 메시지에 해당 필드가 허용되지 않음을 명시
          expect(res.body.message).toEqual(
            expect.arrayContaining([
              expect.stringMatching(/property .+ should not exist/),
            ]),
          );
        });
    });

    it('❌ 400 - Boolean 필드에 문자열 전송', async () => {
      await request(app.getHttpServer())
        .patch(`/sports/${validSportId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isActive: 'true' }) // true" 문자열 전송 (boolean이어야 함)
        .expect(400);
    });

    // [XSS / SQL Injection] 스크립트 공격
    it('✅ 201 - 특수문자/스크립트 저장 시 실행되지 않고 텍스트로 저장됨', async () => {
      const sportRepository = app.get<SportRepository>(SportRepository);
      const existingSports = await sportRepository.find();
      const existingTypes = existingSports.map((s) => s.sportType);
      const allTypes = Object.values(SPORT_TYPES);
      const availableType = allTypes.find(
        (type) => !existingTypes.includes(type),
      );

      // 사용 가능한 타입이 있는지 확인
      expect(availableType).toBeDefined();

      // XSS 공격 페이로드
      const xssPayload = {
        sportType: availableType,
        description:
          '<script>alert("XSS 공격")</script><img src=x onerror=alert(1)>',
      };

      const res = await request(app.getHttpServer())
        .post('/sports')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(xssPayload)
        .expect(201);

      // 내용이 실행되지 않고 그대로 저장되었는지 확인
      expect(res.body.description).toBe(xssPayload.description);

      const getRes = await request(app.getHttpServer())
        .get(`/sports/${res.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getRes.body.description).toBe(xssPayload.description);

      // DB에 저장된 값도 확인 (Repository 직접 조회)
      const dbSport = await sportRepository.findById(res.body.id);

      expect(dbSport.description).toBe(xssPayload.description);
    });

    it('✅ 201 - SQL Injection 공격: SQL 명령어가 실행되지 않고 텍스트로 저장됨', async () => {
      // 사용 가능한 종목 타입 찾기
      const sportRepository = app.get<SportRepository>(SportRepository);
      const existingSports = await sportRepository.find();
      const existingTypes = existingSports.map((s) => s.sportType);
      const allTypes = Object.values(SPORT_TYPES);
      const availableType = allTypes.find(
        (type) => !existingTypes.includes(type),
      );

      expect(availableType).toBeDefined();

      // SQL Injection 공격 페이로드
      const sqlInjectionPayload = {
        sportType: availableType,
        description: "'; DELETE FROM sports; DROP TABLE users; --",
      };

      // 요청 전송 (201 응답 기대)
      const createRes = await request(app.getHttpServer())
        .post('/sports')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(sqlInjectionPayload)
        .expect(201);

      // SQL이 실행되지 않고 문자열로 저장됨
      expect(createRes.body.description).toBe(sqlInjectionPayload.description);

      // 검증 2: sports 테이블이 여전히 존재하는지 확인
      const allSports = await sportRepository.findAllSports();
      expect(allSports).toBeDefined();
      expect(Array.isArray(allSports)).toBe(true);

      // 생성된 종목이 조회 가능한지 확인
      const getRes = await request(app.getHttpServer())
        .get(`/sports/${createRes.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getRes.body.description).toBe(sqlInjectionPayload.description);
    });

    it('✅ 201 - 복합 공격: XSS + SQL Injection 동시 시도', async () => {
      const sportRepository = app.get<SportRepository>(SportRepository);
      const existingSports = await sportRepository.find();
      const existingTypes = existingSports.map((s) => s.sportType);
      const allTypes = Object.values(SPORT_TYPES);
      const availableType = allTypes.find(
        (type) => !existingTypes.includes(type),
      );

      expect(availableType).toBeDefined();

      // XSS + SQL Injection 복합 공격
      const complexAttackPayload = {
        sportType: availableType,
        description: `<script>alert(1)</script>'; DELETE FROM users; --<img src=x onerror=alert(2)>`,
      };

      const res = await request(app.getHttpServer())
        .post('/sports')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(complexAttackPayload)
        .expect(201);

      // 공격 코드가 실행되지 않고 텍스트로 저장됨
      expect(res.body.description).toBe(complexAttackPayload.description);

      // DB 안전성 확인
      const allSports = await sportRepository.findAllSports();

      expect(allSports.length).toBeGreaterThan(0);
    });

    it('❌ 401 - 토큰 없이 접근 시 차단', async () => {
      await request(app.getHttpServer())
        .post('/sports')
        .send(sportMockData.validSport)
        .expect(401);
    });

    it('❌ 400 - 필수값에 빈 문자열 전송', async () => {
      await request(app.getHttpServer())
        .post('/sports')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ sportType: '', description: 'test' })
        .expect(400);
    });
  });
});

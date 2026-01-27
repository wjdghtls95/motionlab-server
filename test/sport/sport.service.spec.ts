import { TestingModule } from '@nestjs/testing';
import { getTestModule } from '../test-helper/get-test-module';
import { TestDatabaseHelper } from '../test-helper/test-database.helper';
import { TestSportHelper } from '../test-helper/test-sport.helper';
import { sportMockData } from '../mock-data/sport.mock';
import { DomainException } from '@common/exceptions/domain.exception';
import { SportService } from '@modules/sport/sport.service';
import { SportRepository } from '@app/modules/sport/entities/sport.repository';
import { SPORT_TYPES } from '@common/constants/sport-types.constant';

describe('SportService (Integration)', () => {
  let module: TestingModule;
  let sportService: SportService;
  let sportRepository: SportRepository;

  beforeAll(async () => {
    module = await getTestModule;

    sportService = module.get<SportService>(SportService);
    sportRepository = module.get<SportRepository>(SportRepository);

    await TestDatabaseHelper.initialize(module);
    TestSportHelper.initialize(sportRepository);
  });

  beforeEach(async () => {
    try {
      await TestDatabaseHelper.clearAll(); // QueryRunner 버전 사용 필수
      TestSportHelper.resetCounter();
    } catch (e) {
      console.error('청소 실패:', e);
      // 여기서 에러나면 테스트 진행 불가하므로 throw
      throw e;
    }
  });

  afterEach(async () => {
    try {
      await TestDatabaseHelper.clearAll();
    } catch (error) {
      console.error('afterEach 데이터 정리 실패:', error);
    }
  });

  afterAll(async () => {
    await TestDatabaseHelper.close();

    if (module) {
      await module.close();
    }
  });

  // ==================== 1. 생성 로직 검증 ====================
  describe('create', () => {
    it('✅ 정상적으로 종목이 생성되고 DB에 저장되어야 한다', async () => {
      const result = await sportService.create(sportMockData.validSport);

      expect(result.id).toBeDefined();
      expect(result.sportType).toBe(sportMockData.validSport.sportType);

      // DB 실제 조회 확인
      const saved = await sportRepository.findById(result.id);
      expect(saved).toBeDefined();
      expect(saved.isActive).toBe(true);
    });

    it('❌ 중복된 종목 타입 생성 시 DomainException(409) 발생', async () => {
      await sportService.create(sportMockData.validSport);

      await expect(
        sportService.create(sportMockData.validSport),
      ).rejects.toThrow(DomainException);
    });
  });

  // ==================== 2. 조회 로직 검증 ====================
  describe('findAll', () => {
    it('✅ 활성화(isActive=true)된 종목만 조회되어야 한다', async () => {
      await TestSportHelper.createSports(3);

      const deactivateSport = await TestSportHelper.createDeactivateSport();

      expect(deactivateSport.isActive).toBe(false);

      const result = await sportService.findAll();

      expect(result).toHaveLength(3);
      result.forEach((sport) => expect(sport.isActive).toBe(true));
    });
  });

  // ==================== 3. 수정 로직 검증 ====================
  describe('update', () => {
    it('✅ 부분 수정(Partial Update)이 정상 작동해야 한다', async () => {
      const sport = await TestSportHelper.createSport(sportMockData.validSport);

      // 설명만 변경
      const updateDto = { description: 'Changed' };
      const result = await sportService.update(sport.id, updateDto);

      expect(result.description).toBe('Changed');
      expect(result.sportType).toBe(sport.sportType); // 타입은 그대로
    });

    it('✅ 종목 타입 변경 시 기존 타입 유지되어야 한다', async () => {
      // 축구 생성
      const soccer = await TestSportHelper.createSportWithType(
        SPORT_TYPES.SOCCER,
      );

      const result = await sportService.update(soccer.id, {
        sportType: SPORT_TYPES.BASKETBALL,
        description: '설명만 바뀜',
      } as any);

      // 축구를 농구로 변경 시도 -> 타입 유지
      expect(result.sportType).toBe(SPORT_TYPES.SOCCER);
      expect(result.description).toBe('설명만 바뀜');
    });
  });

  // ==================== 4. 삭제 로직 검증 ====================
  describe('remove', () => {
    it('✅ isActive=false 가 수행되어야 한다', async () => {
      const sport = await TestSportHelper.createSport(sportMockData.validSport);

      await sportService.remove(sport.id);

      const deleted = await sportRepository.findById(sport.id);
      expect(deleted.isActive).toBe(false);
    });
  });
});

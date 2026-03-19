import { SportSeed } from '@app/database/seeds/sport.seed';
import { SportRepository } from '@modules/sport/entities/sport.repository';
import { Sport } from '@modules/sport/entities/sport.entity';
import {
  SPORT_TYPES,
  SUB_CATEGORY,
} from '@common/constants/sport-types.constant';

const mockSportRepository = () => ({
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('SportSeed', () => {
  let seed: SportSeed;
  let sportRepository: ReturnType<typeof mockSportRepository>;

  beforeEach(() => {
    sportRepository = mockSportRepository();
    sportRepository.create.mockImplementation((data) => ({ ...data } as Sport));
    seed = new SportSeed(sportRepository as unknown as SportRepository);
  });

  describe('onApplicationBootstrap', () => {
    it('✅ 테이블이 비어있으면 7개 종목을 삽입한다', async () => {
      sportRepository.count.mockResolvedValue(0);
      sportRepository.save.mockResolvedValue([]);

      await seed.onApplicationBootstrap();

      expect(sportRepository.count).toHaveBeenCalledTimes(1);
      expect(sportRepository.save).toHaveBeenCalledTimes(1);

      const savedSports: Sport[] = sportRepository.save.mock.calls[0][0];
      expect(savedSports).toHaveLength(7);
    });

    it('✅ Golf 4종목이 모두 포함된다', async () => {
      sportRepository.count.mockResolvedValue(0);
      sportRepository.save.mockResolvedValue([]);

      await seed.onApplicationBootstrap();

      const savedSports: Sport[] = sportRepository.save.mock.calls[0][0];
      const golfSports = savedSports.filter(
        (s) => s.sportType === SPORT_TYPES.GOLF,
      );

      expect(golfSports).toHaveLength(4);
      expect(golfSports.map((s) => s.subCategory)).toEqual(
        expect.arrayContaining([
          SUB_CATEGORY[SPORT_TYPES.GOLF].DRIVER,
          SUB_CATEGORY[SPORT_TYPES.GOLF].IRON,
          SUB_CATEGORY[SPORT_TYPES.GOLF].WEDGE,
          SUB_CATEGORY[SPORT_TYPES.GOLF].PUTTER,
        ]),
      );
    });

    it('✅ Weight 3종목이 모두 포함된다', async () => {
      sportRepository.count.mockResolvedValue(0);
      sportRepository.save.mockResolvedValue([]);

      await seed.onApplicationBootstrap();

      const savedSports: Sport[] = sportRepository.save.mock.calls[0][0];
      const weightSports = savedSports.filter(
        (s) => s.sportType === SPORT_TYPES.WEIGHT,
      );

      expect(weightSports).toHaveLength(3);
      expect(weightSports.map((s) => s.subCategory)).toEqual(
        expect.arrayContaining([
          SUB_CATEGORY[SPORT_TYPES.WEIGHT].SQUAT,
          SUB_CATEGORY[SPORT_TYPES.WEIGHT].DEADLIFT,
          SUB_CATEGORY[SPORT_TYPES.WEIGHT].BENCH_PRESS,
        ]),
      );
    });

    it('✅ 모든 종목이 isActive: true로 생성된다', async () => {
      sportRepository.count.mockResolvedValue(0);
      sportRepository.save.mockResolvedValue([]);

      await seed.onApplicationBootstrap();

      const savedSports: Sport[] = sportRepository.save.mock.calls[0][0];
      expect(savedSports.every((s) => s.isActive === true)).toBe(true);
    });

    it('✅ 테이블에 데이터가 이미 있으면 삽입하지 않는다', async () => {
      sportRepository.count.mockResolvedValue(7);

      await seed.onApplicationBootstrap();

      expect(sportRepository.save).not.toHaveBeenCalled();
    });
  });
});

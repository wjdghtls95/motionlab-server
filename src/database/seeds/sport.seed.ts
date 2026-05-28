import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SportRepository } from '@modules/sport/entities/sport.repository';
import {
  SPORT_TYPES,
  SUB_CATEGORY,
} from '@common/constants/sport-types.constant';

interface SportSeedEntry {
  sportType: string;
  subCategory: string;
  description: string;
}

const INITIAL_SPORTS: SportSeedEntry[] = [
  {
    sportType: SPORT_TYPES.GOLF,
    subCategory: SUB_CATEGORY[SPORT_TYPES.GOLF].DRIVER,
    description: '골프 드라이버 스윙 분석',
  },
  {
    sportType: SPORT_TYPES.GOLF,
    subCategory: SUB_CATEGORY[SPORT_TYPES.GOLF].IRON,
    description: '골프 아이언 스윙 분석',
  },
  {
    sportType: SPORT_TYPES.GOLF,
    subCategory: SUB_CATEGORY[SPORT_TYPES.GOLF].WEDGE,
    description: '골프 웨지 스윙 분석',
  },
  {
    sportType: SPORT_TYPES.GOLF,
    subCategory: SUB_CATEGORY[SPORT_TYPES.GOLF].PUTTER,
    description: '골프 퍼터 스윙 분석',
  },
  {
    sportType: SPORT_TYPES.WEIGHT,
    subCategory: SUB_CATEGORY[SPORT_TYPES.WEIGHT].SQUAT,
    description: '웨이트 스쿼트 자세 분석',
  },
  {
    sportType: SPORT_TYPES.WEIGHT,
    subCategory: SUB_CATEGORY[SPORT_TYPES.WEIGHT].DEADLIFT,
    description: '웨이트 데드리프트 자세 분석',
  },
  {
    sportType: SPORT_TYPES.WEIGHT,
    subCategory: SUB_CATEGORY[SPORT_TYPES.WEIGHT].BENCH_PRESS,
    description: '웨이트 벤치프레스 자세 분석',
  },
];

/**
 * 초기 운동 종목 데이터 Seeder
 *
 * 앱 부트스트랩 시 sports 테이블이 비어있으면
 * Golf(Driver/Iron/Wedge/Putter) + Weight(Squat/Deadlift/BenchPress) 7개를 삽입합니다.
 * 이미 데이터가 있으면 삽입을 건너뜁니다.
 * 항상 weight 종목을 비활성화합니다 (서비스 미지원 상태 유지).
 */
@Injectable()
export class SportSeed implements OnApplicationBootstrap {
  private readonly logger = new Logger(SportSeed.name);

  constructor(private readonly sportRepository: SportRepository) {}

  async onApplicationBootstrap(): Promise<void> {
    const count = await this.sportRepository.count();

    if (count === 0) {
      const sports = INITIAL_SPORTS.map((entry) =>
        this.sportRepository.create({
          sportType: entry.sportType as any,
          subCategory: entry.subCategory as any,
          description: entry.description,
          isActive: true,
        }),
      );

      await this.sportRepository.save(sports);
      this.logger.log(`초기 종목 데이터 ${sports.length}개가 생성되었습니다.`);
    } else {
      this.logger.log(
        `종목 데이터가 이미 존재합니다 (${count}개). 시딩을 건너뜁니다.`,
      );
    }

    // weight 종목은 서비스 미지원 — 항상 비활성화 (초기 시딩 여부와 무관)
    await this.sportRepository.update(
      { sportType: SPORT_TYPES.WEIGHT as any },
      { isActive: false },
    );
    this.logger.log('weight 종목 비활성화 완료.');
  }
}

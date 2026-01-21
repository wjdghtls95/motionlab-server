import { SportRepository } from '@modules/sport/entities/sport.repository';
import { CreateSportDto } from '@modules/sport/dto/create-sport.dto';
import { Sport } from '@modules/sport/entities/sport.entity';
import {
  SPORT_TYPES,
  SportType,
} from '@app/common/constants/sport-types.constant';

export class TestSportHelper {
  private static sportRepository: SportRepository;
  private static counter = 0;
  private static sportTypes = Object.values(SPORT_TYPES);

  static initialize(sportRepository: SportRepository) {
    this.sportRepository = sportRepository;
  }

  static resetCounter() {
    this.counter = 0;
  }

  /**
   * 단일 종목 생성
   */
  static async createSport(data?: Partial<CreateSportDto>): Promise<Sport> {
    const sportType = data?.sportType || this.getNextSportType();

    // 고유한 이름을 위해 카운터 사용 (중복 에러 방지)
    const testSportData = {
      sportType,
      description: data?.description || `테스트 종목 #${this.counter}`,
    };

    const sport = Sport.create(testSportData);

    return await this.sportRepository.save(sport);
  }

  /**
   * 대량 데이터 생성
   */
  static async createSports(count: number): Promise<Sport[]> {
    const sports: Sport[] = [];

    for (let i = 0; i < count; i++) {
      // 타입이 계속 순환되도록
      const sportType = this.getNextSportType();

      const sport = this.sportRepository.create({
        sportType: sportType,
        description: `Bulk Sport ${i + 1}`,
        isActive: true,
      });

      sports.push(sport);
    }

    return await this.sportRepository.save(sports);
  }

  /**
   * 특정 타입으로 바로 생성 (편의 메서드)
   */
  static async createSportWithType(sportType: SportType): Promise<Sport> {
    this.counter++;

    return await this.createSport({
      sportType: sportType,
      description: `${sportType} 테스트 종목`,
    });
  }

  /**
   * 비활성화된 종목 생성
   */
  static async createDeactivateSport(): Promise<Sport> {
    const sportType = this.getNextSportType();

    const data = {
      sportType: sportType,
      description: '비활성화된 테스트 종목',
    };

    const sport = await this.createSport(data);

    // 생성 후 비활성화
    sport.isActive = false;
    return await this.sportRepository.save(sport);
  }

  /**
   * 다음 순환 sportType 가져오기 (중복 방지 핵심 로직)
   * counter를 증가시키면서 sportTypes 배열을 순환
   * Ex. counter = 0 -> SOCCER, counter = 1 -> BASKETBALL, ...
   */
  private static getNextSportType(): SportType {
    const sportType = this.sportTypes[this.counter % this.sportTypes.length];

    this.counter++;

    return sportType;
  }
}

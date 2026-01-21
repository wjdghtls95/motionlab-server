import { Injectable } from '@nestjs/common';
import { CreateSportDto } from './dto/create-sport.dto';
import { UpdateSportDto } from './dto/update-sport.dto';
import { SportRepository } from '@modules/sport/entities/sport.repository';
import { DomainException } from '@common/exceptions/domain.exception';
import { DOMAIN_ERRORS } from '@common/constants/errors/domain.errors';
import { Sport } from '@modules/sport/entities/sport.entity';
import { SportOutDto } from '@modules/sport/dto/sport-out.dto';

@Injectable()
export class SportService {
  constructor(private readonly sportRepository: SportRepository) {}

  /**
   * 운동 종목 생성
   */
  async create(createSportDto: CreateSportDto): Promise<SportOutDto> {
    const { sportType, description } = createSportDto;

    // 중복 체크
    const isExistType = await this.sportRepository.findBySportType(sportType);

    if (isExistType) {
      throw new DomainException(DOMAIN_ERRORS.SPORT_ALREADY_EXISTS);
    }

    // 생성
    const sport = Sport.create({
      sportType: sportType,
      description: description,
    });

    await this.sportRepository.save(sport);

    return SportOutDto.of(sport);
  }

  /**
   * 활성화된 모든 운동 종목 조회
   */
  async findAll(): Promise<Sport[]> {
    const sports = await this.sportRepository.findAllSports();

    return sports;
  }

  /**
   * 특정 운동 종목 조회
   */
  async findOne(id: number): Promise<SportOutDto> {
    const sport = await this.sportRepository.findById(id);

    if (!sport || !sport.isActive) {
      throw new DomainException(DOMAIN_ERRORS.SPORT_NOT_FOUND);
    }

    return SportOutDto.of(sport);
  }

  /**
   * 운동 종목 수정
   */
  async update(id: number, updateSportDto: UpdateSportDto): Promise<Sport> {
    const sport = await this.sportRepository.findById(id);

    if (!sport) {
      throw new DomainException(DOMAIN_ERRORS.SPORT_NOT_FOUND);
    }

    // 운동 종목 타입 변경 시 중복 체크
    const { description } = updateSportDto;

    if (description) {
      await this.sportRepository.updateById(id, { description: description });

      sport.description = description;
    }

    return sport;
  }

  /**
   * 운동 종목 비활성화
   */
  async remove(id: number): Promise<SportOutDto> {
    const sport = await this.sportRepository.findById(id);

    sport.isActive = false;

    const updatedSport = await this.sportRepository.save(sport);

    return SportOutDto.of(updatedSport);
  }
}

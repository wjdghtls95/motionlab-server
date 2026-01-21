import { CreateSportDto } from '@modules/sport/dto/create-sport.dto';
import { UpdateSportDto } from '@modules/sport/dto/update-sport.dto';
import { SPORT_TYPES } from '@common/constants/sport-types.constant';

export const sportMockData = {
  // 정상 데이터
  validSport: {
    sportType: SPORT_TYPES.SOCCER,
    description: '11명이 하는 팀 스포츠',
  } as CreateSportDto,

  validSportBasketball: {
    sportType: SPORT_TYPES.BASKETBALL,
    description: '5명이 하는 실내 스포츠',
  } as CreateSportDto,

  // 설명 없는 종목 (Optional 필드 테스트용)
  sportWithoutDescription: {
    sportType: SPORT_TYPES.RUNNING,
  } as CreateSportDto,

  // 수정용 데이터
  updateDescription: {
    description: '설명이 수정되었습니다.',
  } as UpdateSportDto,

  updateType: {
    sportType: SPORT_TYPES.TENNIS,
  } as UpdateSportDto,

  // 경계값 및 유효성 오류 데이터
  // 1. 빈 값 (Empty String)
  invalidEmpty: {
    sportType: '',
    description: '타입이 비어있음',
  },

  // 2. 길이 초과 (MaxLength=50 가정)
  invalidTooLong: {
    sportType: 'A'.repeat(51), // 51자
    description: '이름이 너무 깁니다.',
  },

  // 3. 존재하지 않는 Enum 타입 (Validation에서 걸려야 함)
  invalidEnumType: {
    sportType: 'INVALID_SPORT',
    description: '존재하지 않는 스포츠',
  },

  // 보안 위협 데이터
  // 1. SQL Injection 시도 문자열
  sqlInjection: {
    sportType: "SOCCER'; DROP TABLE sports; --",
    description: 'DB 해킹 시도',
  },

  // 2. XSS (스크립트 삽입) 시도
  xssAttack: {
    sportType: 'HACKED',
    description: '<script>alert("Cookie Stealing")</script>',
  },

  // 3. Garbage Data (Whitelist 테스트용)
  garbageData: {
    sportType: SPORT_TYPES.SOCCER,
    description: '정상 데이터',
    isAdmin: true, // => 해킹 의심 필드
    deleteFlag: 'true', // => 시스템 필드 조작 시도
  },
};

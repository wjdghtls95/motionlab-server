import { LoggerService } from '@nestjs/common';
import { WinstonModule, utilities } from 'nest-winston';
import * as winston from 'winston';

/**
 * Winston 로거 설정
 *
 * NestJS 기본 Logger를 Winston으로 교체
 * - 기존 this.logger.log(), this.logger.error() 코드 변경 없이 동작
 * - production: JSON 포맷 (Loki에서 필드별 파싱 가능)
 * - development: 컬러 + prettyPrint 포맷 (터미널 가독성)
 *
 * Loki 연동 방식:
 *   Winston → stdout(JSON) → k8s Pod 로그 → Loki 자동 수집 → Grafana
 *   별도 transport 불필요 (k8s 환경에서 stdout을 Loki가 자동 수집)
 */
export class WinstonConfig {
  /**
   * NestJS에 주입할 Winston 로거 인스턴스 생성
   * 호출 시점: main.ts → NestFactory.create(AppModule, { logger: ... })
   */
  static createLogger(): LoggerService {
    const isProduction = process.env.NODE_ENV === 'production';

    return WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          // production: info 이상만 출력 (debug 로그 제외 → 로그 볼륨 절약)
          // development: debug 이상 전부 출력
          level: isProduction ? 'info' : 'debug',

          format: isProduction
            ? // === Production 포맷 ===
              // JSON 한 줄로 출력 → Loki가 파싱하여 필드별 검색 가능
              // 예: {"level":"error","message":"DB connection failed","timestamp":"2026-02-25T..."}
              winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
              )
            : // === Development 포맷 ===
              // NestJS 기본 로그와 동일한 스타일 (컬러 + 정렬)
              // 예: [MotionLab] INFO [MotionService] 2026-02-25 ... - motion_enqueued
              winston.format.combine(
                winston.format.timestamp(),
                utilities.format.nestLike('MotionLab', {
                  prettyPrint: true,
                  colors: true,
                }),
              ),
        }),
      ],
    });
  }
}

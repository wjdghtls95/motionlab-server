import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Nginx 리버스 프록시 환경에서 실제 클라이언트 IP를 추출하는 ThrottlerGuard
 *
 * 문제: NestJS가 Nginx 뒤에 있으면 모든 요청이 127.0.0.1로 인식되어
 *       Throttler가 전체 트래픽을 단일 클라이언트로 취급함
 * 해결: Nginx가 설정한 X-Real-IP 헤더에서 실제 IP를 추출
 *
 * nginx.conf에서 설정 필요:
 *   proxy_set_header X-Real-IP $remote_addr;
 *   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
 */
@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // X-Real-IP (Nginx 단일 프록시) 우선, 없으면 X-Forwarded-For 첫 번째 IP, 최후에 req.ip
    const realIp =
      req.headers['x-real-ip'] ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();

    return realIp ?? req.ip;
  }
}

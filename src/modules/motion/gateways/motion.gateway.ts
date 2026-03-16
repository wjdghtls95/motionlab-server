import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

/**
 * TODO(v2.0): WebSocket 실시간 분석 진행 알림 게이트웨이 — 미구현
 *
 * 구현 전 완료 조건:
 *   1. WsJwtGuard: WebSocket 연결 시 JWT 검증
 *   2. Room join/leave: 클라이언트가 `motion:{id}` room 구독
 *   3. MotionModule에 MotionGateway 등록 + @nestjs/platform-socket.io 어댑터 설정
 *   4. MotionWorker에서 Redis PubSub 또는 직접 emit 방식 결정 후 연결
 *
 * emit 이벤트 예시:
 *   motion:progress  — 분석 진행률
 *   motion:completed — 분석 완료 (resultId 포함)
 *   motion:failed    — 분석 실패 (errorCode 포함)
 *
 * 현재 상태: MotionModule 미등록. 런타임 영향 없음.
 */
@WebSocketGateway({ namespace: '/motions', cors: true })
export class MotionGateway {
  @WebSocketServer()
  server: Server;

  emitProgress(_motionId: number, _payload: unknown) {
    // TODO(v2.0): this.server.to(`motion:${_motionId}`).emit('motion:progress', _payload);
  }

  emitCompleted(_motionId: number, _payload: unknown) {
    // TODO(v2.0): this.server.to(`motion:${_motionId}`).emit('motion:completed', _payload);
  }

  emitFailed(_motionId: number, _payload: unknown) {
    // TODO(v2.0): this.server.to(`motion:${_motionId}`).emit('motion:failed', _payload);
  }
}

import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: '/motions', cors: true })
export class MotionGateway {
  @WebSocketServer()
  server: Server;

  // TODO(WS): 인증(WsJwtGuard) + room join(subscribe) 구현
  // TODO(WS): emit payload 표준화(예: motion:progress, motion:completed, motion:failed)

  emitProgress(motionId: number, payload: any) {
    // TODO(WS): this.server.to(`motion:${motionId}`).emit('motion:progress', payload);
  }

  emitCompleted(motionId: number, payload: any) {
    // TODO(WS): this.server.to(`motion:${motionId}`).emit('motion:completed', payload);
  }

  emitFailed(motionId: number, payload: any) {
    // TODO(WS): this.server.to(`motion:${motionId}`).emit('motion:failed', payload);
  }
}

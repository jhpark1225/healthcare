import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@WebSocketGateway({ namespace: '/health-ws', cors: { origin: '*' } })
export class HealthGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn('WS rejected: no token', { context: 'HealthGateway' });
        client.disconnect();
        return;
      }

      // AccessToken 키로 검증
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      (client as any).user = payload;
      this.logger.info(`WS connected: ${payload.userid}`, { context: 'HealthGateway' });
    } catch {
      this.logger.warn('WS rejected: invalid/expired token', { context: 'HealthGateway' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = (client as any).user;
    this.logger.info(
      `WS disconnected: ${user?.userid || client.id}`,
      { context: 'HealthGateway' },
    );
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { memberId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as any).user;
    if (!user) { client.disconnect(); return; }

    const { memberId } = data;

    // 환자는 본인 채널만 구독 가능
    if (user.member_type === 'PATI' && user.userid !== memberId) {
      this.logger.warn(
        `WS subscribe denied: ${user.userid} → ${memberId}`,
        { context: 'HealthGateway' },
      );
      return;
    }

    const room = `member:${memberId}`;
    client.join(room);
    this.logger.info(`WS ${user.userid} subscribed to ${room}`, { context: 'HealthGateway' });
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: { memberId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `member:${data.memberId}`;
    client.leave(room);
    const user = (client as any).user;
    this.logger.info(
      `WS ${user?.userid} unsubscribed from ${room}`,
      { context: 'HealthGateway' },
    );
  }

  /** SimulatorService에서 호출 — 구독 중인 클라이언트에 이벤트 push */
  pushToClients(memberId: string, event: string, data: any) {
    this.server.to(`member:${memberId}`).emit(event, data);
  }
}

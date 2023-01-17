import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(readonly gameService: GameService) {}

  @SubscribeMessage('game:create')
  createRoom(@MessageBody() data: { clientId: string }) {
    const gameId = this.gameService.create();
    this.server.to(data.clientId).emit('game:created', gameId);
  }

  @SubscribeMessage('game:player-joined')
  joinRoom(@MessageBody() data: { gameId: string; clientId: string }) {
    if (this.gameService.getNumberOfPlayers(data.gameId) === 2) {
      return this.server.to(data.clientId).emit('game:full');
    }
    this.gameService.addPlayerToGame(data.gameId, data.clientId);
    this.server.socketsJoin(data.gameId);
    if (this.gameService.getNumberOfPlayers(data.gameId) > 1) {
      return this.server
        .to(data.gameId)
        .emit('game:started', this.gameService.getScore(data.gameId));
    }
    this.server.to(data.gameId).emit('game:waiting-for-player');
  }

  @SubscribeMessage('game:choice')
  choice(
    @MessageBody()
    data: {
      gameId: string;
      clientId: string;
      choice: 'rock' | 'paper' | 'scissors';
    },
  ) {
    this.gameService.addChoice(data.gameId, data.clientId, data.choice);
    const winner = this.gameService.determineWinner(data.gameId);
    const score = this.gameService.getScore(data.gameId);
    if (winner) {
      this.server.to(data.gameId).emit('game:over', {
        winner,
        score,
      });
    }
    const rivalId = this.gameService.getRivalId(data.gameId, data.clientId);
    this.server.to(rivalId).emit('game:waiting-for-move');
  }

  @SubscribeMessage('game:play-again')
  restart(@MessageBody() data: { gameId: string }) {
    this.gameService.resetChoices(data.gameId);
    this.server
      .to(data.gameId)
      .emit('game:started', this.gameService.getScore(data.gameId));
  }

  handleDisconnect(client: Socket) {
    const gameId = this.gameService.getGameIdFromClientId(client.id);
    this.gameService.removePlayerFromGame(client.id, gameId);
    this.server.to(gameId).emit('game:waiting-for-player');
  }
}

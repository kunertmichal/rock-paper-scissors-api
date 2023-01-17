import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';

interface Choice {
  clientId: string;
  choice: 'rock' | 'paper' | 'scissors';
}

type Game = {
  [key: string]: {
    players: string[];
    choices: Choice[];
    score: {
      [key: string]: number;
    };
  };
};

@Injectable()
export class GameService {
  games: Game = {};

  create() {
    const gameId = nanoid(10);
    this.games[gameId] = { players: [], choices: [], score: {} };
    return { gameId };
  }

  read(gameId: string) {
    if (!(gameId in this.games)) {
      return null;
    }
    return this.games[gameId];
  }

  getGameIdFromClientId(clientId: string) {
    return Object.keys(this.games).find((gameId) =>
      this.games[gameId].players.includes(clientId),
    );
  }
  removePlayerFromGame(clientId: string, gameId: string) {
    this.games[gameId].players = this.games[gameId].players.filter(
      (player) => player !== clientId,
    );
    if (this.games[gameId].players.length === 0) {
      delete this.games[gameId];
    }
  }

  getScore(gameId: string) {
    return this.games[gameId].score;
  }

  getNumberOfPlayers(gameId: string) {
    return this.games[gameId]?.players.length;
  }

  addPlayerToGame(gameId: string, clientId: string) {
    this.games[gameId].players.push(clientId);
    if (this.games[gameId].players.length === 2) {
      this.initializeScore(gameId);
    }
  }

  initializeScore(gameId: string) {
    return (this.games[gameId].score = {
      [this.games[gameId].players[0]]: 0,
      [this.games[gameId].players[1]]: 0,
    });
  }

  addChoice(
    gameId: string,
    clientId: string,
    choice: 'rock' | 'paper' | 'scissors',
  ) {
    if (this.games[gameId].choices.length === 2) {
      throw new Error('Cannot add more choices');
    }
    this.games[gameId].choices.push({ clientId, choice });
  }

  resetChoices(gameId: string) {
    this.games[gameId].choices = [];
  }

  getRivalId(gameId: string, clientId: string) {
    return this.games[gameId].players[0] === clientId
      ? this.games[gameId].players[1]
      : this.games[gameId].players[0];
  }

  determineWinner(gameId: string) {
    const { choices } = this.games[gameId];
    if (choices.length !== 2) {
      return null;
    }
    const possibleChoices = ['rock', 'paper', 'scissors'] as const;
    const player1 = choices[0];
    const player2 = choices[1];

    if (player1.choice === player2.choice) {
      return { winner: 'tie' };
    }
    if (
      possibleChoices.indexOf(player1.choice) ===
      (possibleChoices.indexOf(player2.choice) + 1) % 3
    ) {
      this.games[gameId].score[player1.clientId] += 1;
      return {
        winner: player1.clientId,
        score: this.games[gameId].score,
      };
    } else {
      this.games[gameId].score[player2.clientId] += 1;
      return {
        winner: player2.clientId,
        score: this.games[gameId].score,
      };
    }
  }
}

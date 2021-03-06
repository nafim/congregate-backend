import { Socket } from 'socket.io';
import winston from 'winston';
import Game from '../congregate-redis/Game';
import GameModel, { IGameModel } from '../models/Game';
import { ISocketAuthenticated } from './authenticate';
import { addToMatchmaking } from './matchmaking';
import { io } from '../app';
import Player from '../congregate-redis/Player';
import { GameServer } from '../congregate-redis/Server';
import { ServerLogger } from '../logger';
import { Cities } from '../cities/randomLocation';

require('../logger');
const logger = winston.loggers.get('server');

interface ISocketQuery {
  gameID: string;
}

export interface IGameSocket extends ISocketAuthenticated {
  gameID?: string;
  game?: Game;
  player?: Player;
}

export const joinRoom = (
  socket: IGameSocket,
  gameID: string,
  gameCity?: Cities
) => {
  logger.info('Joining room', { socket: socket.id, gameID });
  socket.join(gameID);
  socket.gameID = gameID;
  // emit join message to other game clients
  socket.to(gameID).emit('playerConnected', { player: socket.user.name });

  var game = GameServer.getGame(gameID);

  if (!game) {
    game = new Game(gameID, gameCity, (game) => {
      io.to(gameID).emit('gameStatus', game.getGameStatusData());
    });
    GameServer.addGame(game);
  }

  // check if player has already joined previously
  const existingPlayer = game
    .getPlayers()
    .find((player) => player.email === socket.user.sub);
  var player: Player;

  if (existingPlayer) {
    player = existingPlayer;
    // fail if the existing player is still connected
    if (player.socket?.connected) {
      return false;
    }
  } else {
    // create new player
    player = new Player(socket.user.name, socket.user.sub);
  }
  // register onInitialPosition
  player.registerOnInitialPosition(() => {
    // specify actions when the player gets an initial position
    logger.info('Sending position', { pos: player.pos, socket: socket.id });
    socket.emit('initialPosition', { pos: player.pos });
  });
  player.registerSocket(socket);
  // register player with game
  game.addPlayer(player);
  // if this player is rejoining, send initial position
  if (existingPlayer) {
    logger.info('Rejoin: sending position', {
      pos: player.pos,
      socket: socket.id,
    });
    player.sendPosition();
  }
  socket.game = game;
  socket.player = player;
  game.tick();
  return true;
};

export const matchPlayer = (socket: Socket, next: any) => {
  const gameSocket = <IGameSocket>socket;
  gameSocket.gameID = undefined;

  if (!('gameID' in gameSocket.handshake.query)) {
    // if room isn't specified, enter matchmaking
    logger.info('No room name specified, starting matchmaking.', {
      socket: socket.id,
    });
    addToMatchmaking(gameSocket);
    next();
  } else {
    const gameID = (<ISocketQuery>gameSocket.handshake.query).gameID;
    logger.info('Joining room', {
      socket: socket.id,
      gameID,
    });
    // try to read game from database
    if (process.env.NODE_ENV !== 'test') {
      GameModel.findOne({ gameID }, (err: any, gameDoc: IGameModel) => {
        if (err) return ServerLogger.error(err);
        var gameCity = undefined;
        if (gameDoc) {
          gameCity = gameDoc.city;
        }
        if (!joinRoom(gameSocket, gameID, gameCity)) {
          const err = new Error(
            'You are connecting to a game that is open in another tab.'
          );
          return next(err);
        }
        next();
      });
    } else {
      if (!joinRoom(gameSocket, gameID)) {
        console.log('failed')
        const err = new Error(
          'You are connecting to a game that is open in another tab.'
        );
        return next(err);
      }
      next();
    }
  }
};

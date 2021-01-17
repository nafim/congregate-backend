import { Socket } from 'socket.io';
import { registerPingHandler } from './ping';

/**
 * Registers the event handlers for an incoming client Socket.IO connection
 *
 * @param socket A connected Socket.IO socket connection to register
 * handlers for
 */
export const registerRealtimeHandlers = (socket: Socket) => {
  registerPingHandler(socket);
};

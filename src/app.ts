import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import dotenv from 'dotenv';

import { registerRealtimeHandlers } from './realtime-handlers';
import { Server, Socket } from 'socket.io';
import { authenticateConnection } from './realtime-middlewares';
import { matchAndJoin } from './realtime-middlewares/games';

// Load environment variables
dotenv.config();

if (!process.env.JWT_SECRET) {
  throw Error('Environment variables not loaded.')
}

// configure express app
const app = express();
app.use(require('cors')());
app.get('/', (req, res) => {
  res.json({ version: 1 });
});
app.use('/api', require('./api'));

// 404 express error handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ "error": "This route is invalid." })
});

// 500 express error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.json({ "error": "An unknown error occured." })
});

const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// Register socket.io middleware
io.use(authenticateConnection);
io.use(matchAndJoin);

// On an incoming socket.io connection, register event handlers
io.on('connection', (socket: Socket) => {
  registerRealtimeHandlers(socket);
});

export default server;

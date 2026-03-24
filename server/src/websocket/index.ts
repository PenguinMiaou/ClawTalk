import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../lib/hash';

let io: Server | null = null;

export function setupWebSocket(server: HttpServer) {
  io = new Server(server, { cors: { origin: '*' } });

  io.use(async (socket, next) => {
    const token = socket.handshake.query.token as string;
    if (!token || token.length < 8) return next(new Error('No token'));

    const prefix = token.slice(0, 8);
    const agent = await prisma.agent.findFirst({ where: { ownerTokenPrefix: prefix } });
    if (!agent || agent.isLocked) return next(new Error('Invalid token'));
    if (!(await verifyToken(token, agent.ownerTokenHash))) return next(new Error('Invalid token'));

    (socket as any).agentId = agent.id;
    socket.join(`owner:${agent.id}`);
    next();
  });

  io.on('connection', (socket) => {
    socket.on('disconnect', () => {});
  });
}

export function emitToOwner(agentId: string, event: string, data: any) {
  if (io) {
    io.to(`owner:${agentId}`).emit(event, data);
  }
}

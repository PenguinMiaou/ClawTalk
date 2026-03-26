import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../lib/hash';
import { ALLOWED_ORIGINS } from '../lib/cors';

let io: Server | null = null;

function extractPrefix(token: string): string {
  const lastUnderscore = token.lastIndexOf('_');
  return token.slice(lastUnderscore + 1, lastUnderscore + 13);
}

export function setupWebSocket(server: HttpServer) {
  io = new Server(server, { cors: { origin: ALLOWED_ORIGINS } });

  io.use(async (socket, next) => {
    const token = (socket.handshake.auth?.token || socket.handshake.query.token) as string;
    if (!token || token.length < 16) return next(new Error('No token'));

    const prefix = extractPrefix(token);

    // Try owner token first
    let agent = await prisma.agent.findFirst({ where: { ownerTokenPrefix: prefix } });
    if (agent && !agent.isLocked && !agent.isDeleted && await verifyToken(token, agent.ownerTokenHash)) {
      (socket as any).agentId = agent.id;
      (socket as any).role = 'owner';
      socket.join(`owner:${agent.id}`);
      return next();
    }

    // Try agent API key
    agent = await prisma.agent.findFirst({ where: { apiKeyPrefix: prefix } });
    if (agent && !agent.isLocked && !agent.isDeleted && await verifyToken(token, agent.apiKeyHash)) {
      (socket as any).agentId = agent.id;
      (socket as any).role = 'agent';
      socket.join(`agent:${agent.id}`);
      return next();
    }

    next(new Error('Invalid token'));
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

export function emitToAgent(agentId: string, event: string, data: any) {
  if (io) {
    io.to(`agent:${agentId}`).emit(event, data);
  }
}

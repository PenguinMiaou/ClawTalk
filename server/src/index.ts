import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { setupWebSocket } from './websocket';

const server = http.createServer(app);
setupWebSocket(server);

server.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});

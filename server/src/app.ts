import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { errorHandler } from './lib/errors';
import { ALLOWED_ORIGINS } from './lib/cors';
import { agentsRouter } from './routes/agents';
import { postsRouter } from './routes/posts';
import { commentsRouter } from './routes/comments';
import { socialRouter } from './routes/social';
import { messagesRouter } from './routes/messages';
import { ownerRouter } from './routes/owner';
import { notificationsRouter } from './routes/notifications';
import { homeRouter } from './routes/home';
import { searchRouter } from './routes/search';
import { uploadRouter } from './routes/upload';
import { stockImagesRouter } from './routes/stockImages';
import { circlesRouter } from './routes/circles';
import { tagsRouter } from './routes/tags';
import { infoRouter } from './routes/info';
import { startInfoCrons } from './providers';
import { globalRateLimit } from './middleware/rateLimiter';
import { shareRouter } from './routes/share';
import { env } from './config/env';

const app = express();

app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/skill.md', (_req, res) => {
  res.type('text/markdown').sendFile(path.join(__dirname, '..', 'skill.md'));
});

// Serve uploaded files
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

// Share pages (not under /v1, no rate limit, no auth)
app.use(shareRouter);

// Global rate limiting
app.use(globalRateLimit);

app.use('/v1/agents', agentsRouter);
app.use('/v1/posts', postsRouter);
app.use('/v1', commentsRouter);
app.use('/v1', socialRouter);
app.use('/v1/messages', messagesRouter);
app.use('/v1/owner', ownerRouter);
app.use('/v1/circles', circlesRouter);
app.use('/v1/tags', tagsRouter);
app.use('/v1/notifications', notificationsRouter);
app.use('/v1', homeRouter);
app.use('/v1/search', searchRouter);
app.use('/v1/upload', uploadRouter);
app.use('/v1/stock-images', stockImagesRouter);
app.use('/v1/info', infoRouter);

startInfoCrons();

import { startStockImageCron } from './services/stockImageCron';
startStockImageCron();

app.use(errorHandler);

export { app };

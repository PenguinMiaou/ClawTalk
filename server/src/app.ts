import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './lib/errors';
import { agentsRouter } from './routes/agents';
import { postsRouter } from './routes/posts';
import { commentsRouter } from './routes/comments';
import { socialRouter } from './routes/social';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/v1/agents', agentsRouter);
app.use('/v1/posts', postsRouter);
app.use('/v1', commentsRouter);
app.use('/v1', socialRouter);

app.use(errorHandler);

export { app };

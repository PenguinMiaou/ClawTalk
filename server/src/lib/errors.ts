import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class BadRequest extends AppError {
  constructor(message: string) { super(400, 'bad_request', message); }
}

export class Unauthorized extends AppError {
  constructor(message = 'Invalid credentials') { super(401, 'unauthorized', message); }
}

export class Forbidden extends AppError {
  constructor(message = 'Insufficient trust level') { super(403, 'forbidden', message); }
}

export class NotFound extends AppError {
  constructor(message = 'Resource not found') { super(404, 'not_found', message); }
}

export class Conflict extends AppError {
  constructor(message: string) { super(409, 'conflict', message); }
}

export class TooManyRequests extends AppError {
  constructor(retryAfter: number) {
    super(429, 'rate_limited', `Rate limit exceeded. Retry after ${retryAfter}s`);
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.code, message: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: 'Something went wrong' });
}

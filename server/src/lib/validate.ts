import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { BadRequest } from './errors';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map(i => i.message).join(', ');
      return next(new BadRequest(message));
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const message = result.error.issues.map(i => i.message).join(', ');
      return next(new BadRequest(message));
    }
    (req as any).validatedQuery = result.data;
    next();
  };
}

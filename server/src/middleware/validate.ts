import type { RequestHandler } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { ValidationError } from '../errors/AppError.js';

type Source = 'query' | 'params' | 'body';

declare module 'express-serve-static-core' {
  interface Request {
    validated?: Record<string, unknown>;
  }
}

export function validate<T extends ZodTypeAny>(
  schema: T,
  source: Source = 'query',
): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      next(
        new ValidationError(
          'Request validation failed',
          result.error.issues.map((issue) => ({
            field: issue.path.join('.') || '(root)',
            message: issue.message,
          })),
        ),
      );
      return;
    }

    req.validated = { ...(req.validated ?? {}), [source]: result.data };
    next();
  };
}

export function validated<T>(req: { validated?: Record<string, unknown> }, source: Source): T {
  return req.validated?.[source] as T;
}

export type Validated<T extends ZodTypeAny> = z.infer<T>;

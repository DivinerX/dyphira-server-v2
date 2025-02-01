import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { fromError } from 'zod-validation-error';

interface CustomError extends Error {
  statusCode?: number;
  isCustomError?: boolean;
  stack?: string;
}

const handleSyntaxError = (err: Error): CustomError | null => {
  if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
    return {
      name: err.name,
      statusCode: 400,
      message: 'Invalid JSON payload',
    };
  }
  return null;
};

export function isZodError(err: unknown): err is ZodError {
  return Boolean(
    err && (err instanceof ZodError || (err as ZodError).name === 'ZodError'),
  );
}

const handleValidationError = (err: Error): CustomError | null => {
  if (isZodError(err)) {
    const zodError = fromError(err);
    return {
      name: zodError.name,
      statusCode: 400,
      message: zodError.message,
      stack: zodError.stack as string,
    };
  }
  return null;
};

const handleMongooseError = (err: Error): CustomError | null => {
  if (err.name === 'ValidationError') {
    return {
      name: err.name,
      statusCode: 400,
      message: err.message,
    };
  } else if (err.name === 'CastError') {
    return {
      name: err.name,
      statusCode: 400,
      message: 'Invalid ID format',
    };
  }
  return null;
};

const handleCustomErrors = (err: Error): CustomError | null => {
  // if ('isCustomError' in err && (err as CustomError).isCustomError) {
  if (err.name === 'CustomError') {
    const customError = err as CustomError;
    return {
      name: customError.name,
      statusCode: customError.statusCode || 500,
      message: customError.message || 'Internal Server Error',
      isCustomError: true,
    };
  }
  return null;
};

const handleAuthorizationErrors = (err: Error): CustomError | null => {
  if (err.name === 'UnauthorizedError') {
    return {
      name: err.name,
      statusCode: 401,
      message: 'Unauthorized: Invalid token',
    };
  } else if (err.name === 'ForbiddenError') {
    return {
      name: err.name,
      statusCode: 403,
      message: 'Forbidden: Insufficient permissions',
    };
  } else if (err.name === 'NotFoundError') {
    return {
      name: err.name,
      statusCode: 404,
      message: 'Resource not found',
    };
  }
  return null;
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);

  let statusCode = 500;
  let message = 'Internal Server Error';
  let name = 'InternalServerError';

  const customError =
    handleSyntaxError(err) ||
    handleValidationError(err) ||
    handleMongooseError(err) ||
    handleCustomErrors(err) ||
    handleAuthorizationErrors(err);

  if (customError) {
    statusCode = customError.statusCode ?? 500;
    message = customError.message;
    name = customError.name;
  } else {
    name = err.name || 'UnknownError';
  }

  const errorResponse = {
    error: {
      name,
      message,
      status: statusCode,
      stack:
        process.env.NODE_ENV === 'development'
          ? (customError?.stack ?? err.stack)
          : undefined,
    },
  };

  res.status(statusCode).json(errorResponse);
};

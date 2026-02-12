/**
 * API error format: consistent across all endpoints.
 * 400 validation, 403 forbidden, 404 not found, 409 conflict, 500 server.
 */

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export interface ValidationDetail {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  details?: ValidationDetail[];
}

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: ValidationDetail[]
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJson(): ApiErrorBody {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && this.details.length > 0 && { details: this.details }),
    };
  }
}

export function validationError(message: string, details?: ValidationDetail[]): AppError {
  return new AppError(400, 'VALIDATION_ERROR', message, details);
}

export function unauthorized(message = 'Unauthorized'): AppError {
  return new AppError(401, 'UNAUTHORIZED', message);
}

export function forbidden(message = 'Forbidden'): AppError {
  return new AppError(403, 'FORBIDDEN', message);
}

export function notFound(message = 'Resource not found'): AppError {
  return new AppError(404, 'NOT_FOUND', message);
}

export function conflict(message: string): AppError {
  return new AppError(409, 'CONFLICT', message);
}

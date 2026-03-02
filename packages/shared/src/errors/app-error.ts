/**
 * Application-level error with structured fields
 */
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public retryable: boolean = false,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      retryable: this.retryable,
      details: this.details,
    };
  }

  static invalidApiKey(): AppError {
    return new AppError('INVALID_API_KEY', 'Invalid or revoked API key', 401);
  }

  static rateLimitExceeded(): AppError {
    return new AppError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', 429, true);
  }

  static insufficientBalance(): AppError {
    return new AppError('INSUFFICIENT_BALANCE', 'Insufficient wallet balance', 402);
  }

  static invalidRequest(details?: Record<string, unknown>): AppError {
    return new AppError('INVALID_REQUEST', 'Invalid request', 400, false, details);
  }

  static tenantNotFound(): AppError {
    return new AppError('TENANT_NOT_FOUND', 'Tenant not found', 404);
  }

  static internalError(details?: Record<string, unknown>): AppError {
    return new AppError('INTERNAL_ERROR', 'Internal server error', 500, false, details);
  }

  static providerError(details?: Record<string, unknown>): AppError {
    return new AppError('PROVIDER_ERROR', 'Provider error', 502, true, details);
  }
}

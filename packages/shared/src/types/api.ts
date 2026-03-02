/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Standard API error
 */
export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
  retryable?: boolean;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pages: number;
    hasMore: boolean;
  };
}

/**
 * Send message API request payload
 */
export interface SendMessageRequest {
  to: string;
  from?: string;
  content?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
  scheduledAt?: string; // ISO 8601
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Send message API response
 */
export interface SendMessageResponse {
  messageId: string;
  status: string;
  createdAt: string;
}

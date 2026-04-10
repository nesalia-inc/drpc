/**
 * Maps error codes to HTTP status codes
 */
export const errorToStatusMap: Record<string, number> = {
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  ROUTE_NOT_FOUND: 404,
  INVALID_ARGS: 400,
};

/**
 * Get HTTP status code from error code string
 */
export function getHTTPStatus(errorCode: string | undefined): number {
  if (!errorCode) return 500;
  return errorToStatusMap[errorCode] ?? 500;
}

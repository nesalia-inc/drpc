// @deessejs/core - Functional Programming Patterns for TypeScript

/**
 * Result type for error handling
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }

/**
 * Creates a successful result
 */
export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

/**
 * Creates an error result
 */
export function err<E = Error>(error: E): Result<never, E> {
  return { ok: false, error }
}

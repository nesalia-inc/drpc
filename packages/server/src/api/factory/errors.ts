import type { Result } from "@deessejs/fp";
import { error as errorFn } from "@deessejs/fp";
import { internalError, serverError } from "../errors.js";

// ============================================================
// L1: Error Creation
// ============================================================

export const createInternalErrorResult = (message: string, route: string): Result<never> =>
  internalError(message).mapErr((e) =>
    e
      .addNotes(`Error in route: ${route}`)
      .from(
        errorFn({ name: "INTERNAL_ERROR", message: (_: unknown) => message })({
          message,
        })
      )
  );

export const createServerErrorResult = (
  code: string,
  message: string,
  route: string
): Result<never> =>
  serverError(code, message).mapErr((e) =>
    e
      .addNotes(`Route: ${route}`)
      .from(errorFn({ name: code, message: (_: unknown) => message })({ message }))
  );

import  { type Router, type Procedure } from "../types.js";
import { type Maybe, none, fromNullable } from "@deessejs/fp";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function flattenRouter<Ctx, R extends Router<Ctx, any>>(
  router: R,
  prefix: string[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Array<{ path: string; procedure: Procedure<any, any, any> }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Array<{ path: string; procedure: Procedure<any, any, any> }> = [];

  for (const key in router) {
    const value = (router as any)[key];
    const path = [...prefix, key];

    if (isProcedure(value)) {
      result.push({ path: path.join("."), procedure: value });
    } else if (isRouter(value)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result.push(...flattenRouter(value as any, path));
    }
  }

  return result;
}

export function getPublicRoutes<Ctx, R extends Router<Ctx, any>>(
  router: R
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Array<{ path: string; procedure: Procedure<any, any, any> }> {
  return flattenRouter(router).filter(
    (item) => item.procedure.type === "query" || item.procedure.type === "mutation"
  );
}

export function getInternalRoutes<Ctx, R extends Router<Ctx, any>>(
  router: R
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Array<{ path: string; procedure: Procedure<any, any, any> }> {
  return flattenRouter(router).filter(
    (item) => item.procedure.type === "internalQuery" || item.procedure.type === "internalMutation"
  );
}

/* eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types -- Type guard must accept any type */
export function isRouter(obj: any): obj is Router<any, any> {
  if (!obj || typeof obj !== "object") return false;

  // A router is an object whose properties are either:
  // 1. Procedures (has 'type' property with procedure value)
  // 2. Other routers (nested structure)
  // If it has ANY property that is a procedure, it's still a router (just not empty)
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;

  // Check if at least one property exists (we don't check type here anymore)
  // The distinction between procedure and nested router is made at filter time
  return true;
}

/* eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types -- Type guard must accept any type */
export function isProcedure(obj: any): obj is Procedure<any, any, any> {
  return (
    obj &&
    typeof obj === "object" &&
    "type" in obj &&
    ["query", "mutation", "internalQuery", "internalMutation"].includes(obj.type)
  );
}

export function resolvePath<Ctx, Routes extends Record<string, any>>(
  router: Router<Ctx, Routes>,
  path: string
): Maybe<Procedure<Ctx, any, any> | Router<Ctx, Routes>> {
  let current: any = router;
  const parts = path.split(".");
  for (const part of parts) {
    if (current === null || current === undefined) {
      return none();
    }
    current = current[part];
  }
  return fromNullable(current);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

import  { type ValidationResult } from "./types.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function validateRouter<Ctx, R extends Router<Ctx, any>>(
  router: R
): ValidationResult {
  const errors: string[] = [];

  const validate = (current: any, path: string[]): void => {
    for (const key of Object.keys(current)) {
      const value = current[key];
      const currentPath = [...path, key];

      if (isProcedure(value)) {
        if (!value.handler) {
          errors.push(`Procedure at "${currentPath.join(".")}" missing handler`);
        }
      } else if (isRouter(value)) {
        validate(value, currentPath);
      } else if (typeof value === "object" && value !== null) {
        validate(value, currentPath);
      }
    }
  };

  validate(router, []);
  return { valid: errors.length === 0, errors };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

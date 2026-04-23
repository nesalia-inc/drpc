/* eslint-disable @typescript-eslint/consistent-return */
import { none } from "@deessejs/fp";
import { type Router, type Procedure } from "../../types.js";
import { isProcedure } from "../../router/index.js";

// ============================================================
// L1: Atomic Operations
// ============================================================

export const splitRoutePath = (route: string): readonly string[] => route.split(".");

// eslint-disable-next-line @typescript-eslint/consistent-return
export const getProcedureFromPath = (
  router: Router<unknown>,
  pathParts: readonly string[]
): Procedure<unknown, unknown, unknown> | undefined => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: Record<string, unknown> = router as any;
  for (let i = 0; i < pathParts.length - 1; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    current = current[pathParts[i]] as any;
    if (!current) {
      return undefined;
    }
  }
  const procedure = current[pathParts.at(-1)!];
  const procIsProcedure = isProcedure(procedure);
  if (!procIsProcedure) {
    // eslint-disable-next-line @typescript-eslint/consistent-return
    return undefined;
  }
  return procedure;
};

// Invalid symbols that Proxy's get trap will be called with
const INVALID_SYMBOLS = new Set([
  Symbol.toStringTag,
  Symbol.iterator,
  Symbol.toPrimitive,
]);

export const isValidSymbol = (prop: string | symbol): boolean => {
  // String properties are always valid
  if (typeof prop === "string") return true;
  // Symbol properties are valid except for special internal ones
  return !INVALID_SYMBOLS.has(prop);
};

export const getSymbolProperty = (_prop: string | symbol): unknown => {
  // eslint-disable-next-line @typescript-eslint/consistent-return -- all branches return
  return none();
};

export const buildFullPath = (path: readonly string[], prop: string): string => {
  return [...path, prop].join(".");
};

export const isNoArgsProcedure = (procedure: unknown): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !(procedure as any).argsSchema;
};

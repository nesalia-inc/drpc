import type { Router, Procedure } from "../types.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouterConfig<Ctx> = Record<string, Procedure<Ctx, any, any> | Router<Ctx>>;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

import type { Result } from "@deessejs/fp";
import type { Router } from "../../types.js";
import type { ExecuteRouteContext, ExecuteProcedureContext } from "./context.js";
import { splitRoutePath, getProcedureFromPath } from "./utils.js";
import { routeNotFound } from "../errors.js";
import { executeProcedure } from "./procedure.js";

// ============================================================
// Route Execution
// ============================================================

export const executeRoute = async <Ctx>(
  route: string,
  args: unknown,
  routeCtx: ExecuteRouteContext<Ctx>
): Promise<Result<unknown>> => {
  const { router, ctx, globalMiddleware, eventEmitter, queue, plugins } = routeCtx;
  const pathParts = splitRoutePath(route);
  const procedure = getProcedureFromPath(router, pathParts);

  if (!procedure) {
    return routeNotFound(route);
  }

  const procedureCtx: ExecuteProcedureContext<Ctx, unknown, unknown> = {
    procedure,
    ctx,
    args,
    middleware: globalMiddleware,
    eventEmitter,
    queue,
    route,
    plugins,
  };

  return executeProcedure(procedureCtx);
};

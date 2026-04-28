import { type Result } from "@deessejs/fp";
import { type Procedure } from "../../types.js";
import { type ExecuteRouteContext, type ExecuteProcedureContext } from "../types/internal.js";
import { splitRoutePath, getProcedureFromPath } from "./utils.js";
import { routeNotFound } from "../errors.js";
import { executeProcedure } from "./procedure.js";

// ============================================================
// Route Execution (Performance Rule - Route Memoization)
// ============================================================

export const executeRoute = async <Ctx>(
  route: string,
  args: unknown,
  routeCtx: ExecuteRouteContext<Ctx>
): Promise<Result<unknown>> => {
  const { router, ctx, globalMiddleware, eventEmitter, queue, plugins, routeCache } = routeCtx;

  // L2: Check cache first (O(1) lookup after first resolution)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let procedure: Procedure<any, any, any> | undefined;
  if (routeCache) {
    procedure = routeCache.get(route);
  }

  // L2: Resolve and cache if not found
  if (!procedure) {
    const pathParts = splitRoutePath(route);
    procedure = getProcedureFromPath(router, pathParts);

    if (procedure) {
      // L2: Cache on first resolution (lazy caching per API instance)
      routeCache?.set(route, procedure);
    }
  }

  if (!procedure) {
    return routeNotFound(route);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const procedureCtx: ExecuteProcedureContext<any, unknown, unknown> = {
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

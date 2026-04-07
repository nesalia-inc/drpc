/**
 * @deessejs/drpc-next
 *
 * Next.js integration for DRPC (Distributed Remote Procedure Call)
 *
 * Usage:
 * ```typescript
 * import { drpc } from "@/server/drpc"
 * import { toNextJsHandler } from "@deessejs/drpc-next"
 *
 * export const { POST, GET } = toNextJsHandler(drpc)
 * ```
 */

import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

type DRPCClient = Record<string, unknown>

/**
 * Recursively resolves a procedure from the DRPC client by traversing
 * nested router objects using the procedure name parts.
 *
 * @example
 * // For "users.get" with slug ["users", "get"]
 * // Resolves to client.users.get
 */
function getProcedure(
  api: unknown,
  parts: string[]
): unknown {
  if (parts.length === 0) return undefined
  let current: unknown = api
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/**
 * Creates Next.js route handlers (POST and GET) for the DRPC client.
 *
 * POST handler:
 * - Receives requests with procedure name in URL path (e.g., /api/users.get)
 * - Receives args in request body as { args: {...} }
 * - Calls the appropriate procedure via local execution
 * - Returns JSON response { ok: true, value } or { ok: false, error }
 * - Only exposes public operations (query/mutation), not internalQuery/internalMutation
 *
 * GET handler:
 * - Returns 405 Method Not Allowed
 *
 * @param api - The DRPC client (created via createPublicAPI)
 * @returns Object with POST and GET route handlers
 */
export function toNextJsHandler(api: DRPCClient): {
  POST: (request: NextRequest) => Promise<NextResponse>
  GET: () => NextResponse
} {
  const POST = async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Extract procedure name from URL path
      // URL format: /api/procedure.name (captured as [...slug])
      const url = new URL(request.url)
      const pathname = url.pathname
      const slugStr = pathname.replace(/^\//, "") // Remove leading slash

      if (!slugStr) {
        return NextResponse.json(
          { ok: false, error: { message: "Procedure name required" } },
          { status: 400 }
        )
      }

      const slugParts = slugStr.split(".")
      const procedure = getProcedure(api, slugParts)

      if (!procedure) {
        return NextResponse.json(
          { ok: false, error: { message: `Procedure not found: ${slugStr}` } },
          { status: 404 }
        )
      }

      // Parse request body
      let body: { args?: unknown } | null = null
      try {
        body = await request.json()
      } catch {
        return NextResponse.json(
          { ok: false, error: { message: "Invalid JSON body" } },
          { status: 400 }
        )
      }

      const args = body?.args ?? {}

      // Execute procedure
      // The procedure is a function that accepts args and returns a result
      const procedureFn = procedure as (args: unknown) => Promise<unknown>
      const result = await procedureFn(args)

      return NextResponse.json({ ok: true, value: result })
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: error instanceof Error ? error.message : "Unknown error",
          },
        },
        { status: 500 }
      )
    }
  }

  const GET = (): NextResponse => {
    return NextResponse.json(
      { ok: false, error: { message: "Method not allowed" } },
      { status: 405 }
    )
  }

  return { POST, GET }
}

/**
 * @deprecated Use `toNextJsHandler` instead.
 *
 * Creates a Next.js route handler for the DRPC client.
 * This is a compatibility alias for the POST handler only.
 *
 * @param client - The DRPC client (created via createPublicAPI)
 * @returns POST route handler
 */
export function createRouteHandler(
  client: DRPCClient
): (request: NextRequest) => Promise<NextResponse> {
  return (request) => toNextJsHandler(client).POST(request)
}

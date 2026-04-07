/**
 * @deessejs/drpc-next
 *
 * Next.js integration for DRPC (Distributed Remote Procedure Call)
 *
 * Usage:
 * ```typescript
 * // app/api/drpc/[...slug]/route.ts
 * import { client } from "@/server/drpc"
 * import { toNextJsHandler } from "@deessejs/drpc-next"
 *
 * export const { GET, POST, PUT, PATCH, DELETE } = toNextJsHandler(client)
 * ```
 */

import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

type DRPCClient = Record<string, unknown>

interface DRPCResult {
  ok: boolean
  value?: unknown
  error?: {
    code?: string
    message: string
  }
}

/**
 * Recursively resolves a procedure from the DRPC client by traversing
 * nested router objects using the procedure name parts.
 *
 * Supports:
 * - Slash notation: ["users", "get"] → api.users.get
 * - Dot notation: ["users.get"] → api.users.get
 * - Snake_case: ["users", "get_profile"] → api.users.get_profile
 */
function getProcedure(
  api: unknown,
  parts: string[]
): unknown {
  if (parts.length === 0) return undefined
  let current: unknown = api

  for (const part of parts) {
    if (current === null || current === undefined) return undefined

    // Convert part notation: "get_profile" → "getProfile" for camelCase lookup
    // But first try exact match
    current = (current as Record<string, unknown>)[part]

    // If not found, try camelCase conversion (get_profile → getProfile)
    if (current === undefined && part.includes("_")) {
      const camelPart = part.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      current = (current as Record<string, unknown>)[camelPart]
    }

    // Protect against prototype pollution
    if (current !== undefined && typeof current === "object") {
      if (part === "constructor" || part === "__proto__" || part === "prototype") {
        return undefined
      }
    }
  }

  return current
}

/**
 * Execute a procedure and format the HTTP response.
 * Handles DRPC Result type correctly: ok=true returns value, ok=false returns error.
 */
async function executeProcedure(
  procedure: unknown,
  args: unknown
): Promise<NextResponse> {
  if (!procedure) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Procedure not found" } },
      { status: 404 }
    )
  }

  try {
    const procedureFn = procedure as (args: unknown) => Promise<DRPCResult>
    const result = await procedureFn(args)

    // Handle DRPC Result - check if it's a Result object with ok/error
    if (result && typeof result === "object") {
      if ("ok" in result && result.ok === false) {
        // DRPC error result
        const error = result.error || { code: "ERROR", message: "Unknown error" }
        return NextResponse.json(
          { ok: false, error },
          { status: 400 }
        )
      }

      if ("ok" in result && result.ok === true) {
        // DRPC success result - extract value
        return NextResponse.json({ ok: true, value: result.value })
      }
    }

    // If result is not a DRPC Result, wrap it directly
    return NextResponse.json({ ok: true, value: result })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    )
  }
}

/**
 * Strip the base path from pathname to get the procedure path.
 * Handles Next.js route prefixes like /api/drpc/users/get → users/get
 */
function stripBasePath(pathname: string, basePath: string = ""): string {
  // Normalize: remove leading/trailing slashes
  const normalizedPath = pathname.replace(/^\//, "").replace(/\/$/, "")
  const normalizedBase = basePath.replace(/^\//, "").replace(/\/$/, "")

  if (!normalizedBase) {
    // No base path configured, return as-is
    return normalizedPath
  }

  // Remove base path if present
  if (normalizedPath.startsWith(normalizedBase + "/")) {
    return normalizedPath.slice(normalizedBase.length + 1)
  }

  // If base path doesn't match, return as-is (might be running at root)
  return normalizedPath
}

/**
 * Creates Next.js route handlers for all HTTP methods.
 *
 * | Method | Description |
 * |--------|-------------|
 * | GET | Query operations (list, get, search) |
 * | POST | Mutation operations (create) |
 * | PUT | Mutation operations (update/replace) |
 * | PATCH | Mutation operations (partial update) |
 * | DELETE | Mutation operations (delete) |
 *
 * URL format (with catch-all route):
 * - GET /api/drpc/users/list?args={"limit":10} → users.list procedure
 * - POST /api/drpc/users/create → users.create procedure
 *
 * Also supports dot notation in URL:
 * - GET /api/drpc/users.list → users.list procedure
 *
 * @param api - The DRPC client (created via createClient)
 * @param options - Optional configuration
 * @param options.basePath - Base path to strip from URL (e.g., "api/drpc")
 * @returns Object with GET, POST, PUT, PATCH, DELETE route handlers
 */
export function toNextJsHandler(
  api: DRPCClient,
  options?: { basePath?: string }
): {
  GET: (request: NextRequest) => Promise<NextResponse>
  POST: (request: NextRequest) => Promise<NextResponse>
  PUT: (request: NextRequest) => Promise<NextResponse>
  PATCH: (request: NextRequest) => Promise<NextResponse>
  DELETE: (request: NextRequest) => Promise<NextResponse>
} {
  const basePath = options?.basePath ?? "api/drpc"

  /**
   * Extract procedure name and args from request.
   */
  async function parseRequest(request: NextRequest): Promise<{
    procedure: unknown
    args: unknown
  }> {
    const url = new URL(request.url)
    const pathname = url.pathname

    // Strip base path to get procedure identifier
    const procedurePath = stripBasePath(pathname, basePath)

    if (!procedurePath) {
      return {
        procedure: null,
        args: {},
      }
    }

    // Support both slash notation (users/get) and dot notation (users.get)
    // Split by "/" first, then each part can be "users.get" format
    const segments = procedurePath.split("/")
    const slugParts: string[] = []

    for (const segment of segments) {
      if (segment.includes(".")) {
        // Dot notation: "users.get" → ["users", "get"]
        slugParts.push(...segment.split("."))
      } else {
        slugParts.push(segment)
      }
    }

    const procedure = getProcedure(api, slugParts)

    let args = {}
    if (request.method !== "GET") {
      try {
        const body = await request.json()
        args = body?.args ?? {}
      } catch {
        // Invalid JSON, use empty args
      }
    } else {
      // For GET, try to get args from searchParams
      const argsStr = url.searchParams.get("args")
      if (argsStr) {
        try {
          args = JSON.parse(argsStr)
        } catch {
          // Invalid JSON, use empty args
        }
      }
    }

    return { procedure, args }
  }

  const GET = async (request: NextRequest): Promise<NextResponse> => {
    const { procedure, args } = await parseRequest(request)
    return executeProcedure(procedure, args)
  }

  const POST = async (request: NextRequest): Promise<NextResponse> => {
    const { procedure, args } = await parseRequest(request)
    return executeProcedure(procedure, args)
  }

  const PUT = async (request: NextRequest): Promise<NextResponse> => {
    const { procedure, args } = await parseRequest(request)
    return executeProcedure(procedure, args)
  }

  const PATCH = async (request: NextRequest): Promise<NextResponse> => {
    const { procedure, args } = await parseRequest(request)
    return executeProcedure(procedure, args)
  }

  const DELETE = async (request: NextRequest): Promise<NextResponse> => {
    const { procedure, args } = await parseRequest(request)
    return executeProcedure(procedure, args)
  }

  return { GET, POST, PUT, PATCH, DELETE }
}

/**
 * @deprecated Use `toNextJsHandler` instead.
 *
 * Creates a Next.js route handler for the DRPC client.
 * This is a compatibility alias for the POST handler only.
 *
 * @param client - The DRPC client (created via createClient)
 * @returns POST route handler
 */
export function createRouteHandler(
  client: DRPCClient
): (request: NextRequest) => Promise<NextResponse> {
  return (request) => toNextJsHandler(client).POST(request)
}

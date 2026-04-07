import { describe, it, expect } from "vitest"
import { ok, err, Result } from "./index"

describe("@deessejs/core", () => {
  describe("ok", () => {
    it("should create a successful result", () => {
      const result = ok({ name: "test" })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toEqual({ name: "test" })
      }
    })

    it("should work with primitive values", () => {
      expect(ok(42).ok).toBe(true)
      expect(ok("hello").ok).toBe(true)
      expect(ok(null).ok).toBe(true)
    })
  })

  describe("err", () => {
    it("should create an error result", () => {
      const error = { code: "TEST_ERROR", message: "Test error" }
      const result = err(error)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toEqual(error)
      }
    })

    it("should work with string errors", () => {
      const result = err("Something went wrong")
      expect(result.ok).toBe(false)
    })
  })

  describe("Result type", () => {
    it("should narrow correctly with ok result", () => {
      const result: Result<number> = ok(42)
      if (result.ok) {
        expect(typeof result.value).toBe("number")
      }
    })

    it("should narrow correctly with error result", () => {
      const result: Result<number, { code: string }> = err({ code: "ERR" })
      if (!result.ok) {
        expect(result.error.code).toBe("ERR")
      }
    })
  })
})

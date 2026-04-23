# Implementation Phases

## 8. Implementation Phases

### Phase 1: Core Handler (1-2 days)
- [ ] Create `packages/server-next/`
- [ ] Implement `toNextJsHandler()`
- [ ] Handle all HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS)
- [ ] Extract slug from params
- [ ] Parse args from URL or body
- [ ] Return JSON responses with proper status codes

### Phase 2: Error Handling (0.5 day)
- [ ] Map error codes to HTTP statuses
- [ ] Handle unexpected errors (500)
- [ ] CORS preflight (OPTIONS)

### Phase 3: Options & Polish (0.5 day)
- [ ] CORS configuration option
- [ ] Custom error handler option
- [ ] Next.js 15 async params support

### Phase 4: Tests (1 day)
- [ ] Test all HTTP methods
- [ ] Test error cases
- [ ] Test CORS
- [ ] Test with actual Next.js app

## Related Files

- [File Structure](./file-structure.md) - See project structure
- [Next Steps](./next-steps.md) - See next steps
export function withQuery(queryOrFn, middlewareOrFn) {
    // Curried form: withQuery((q) => q.use(admin))
    if (typeof queryOrFn === "function" && middlewareOrFn === undefined) {
        return queryOrFn;
    }
    // Middleware function transformer: withQuery(query, (q) => q.use(admin))
    if (typeof middlewareOrFn === "function") {
        return middlewareOrFn(queryOrFn);
    }
    // Middleware: withQuery(query, adminMiddleware)
    if (middlewareOrFn) {
        return queryOrFn.use(middlewareOrFn);
    }
    return queryOrFn;
}
export function withMutation(mutationOrFn, middlewareOrFn) {
    // Curried form: withMutation((m) => m.use(admin))
    if (typeof mutationOrFn === "function" && middlewareOrFn === undefined) {
        return mutationOrFn;
    }
    // Middleware function transformer: withMutation(mutation, (m) => m.use(admin))
    if (typeof middlewareOrFn === "function") {
        return middlewareOrFn(mutationOrFn);
    }
    // Middleware: withMutation(mutation, adminMiddleware)
    if (middlewareOrFn) {
        return mutationOrFn.use(middlewareOrFn);
    }
    return mutationOrFn;
}
//# sourceMappingURL=helpers.js.map
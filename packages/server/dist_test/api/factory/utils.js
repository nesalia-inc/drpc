import { none } from "@deessejs/fp";
import { isProcedure } from "../../router/index.js";
// ============================================================
// L1: Atomic Operations
// ============================================================
export const splitRoutePath = (route) => route.split(".");
export const getProcedureFromPath = (router, pathParts) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current = router;
    for (let i = 0; i < pathParts.length - 1; i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        current = current[pathParts[i]];
        if (!current)
            return undefined;
    }
    const procedure = current[pathParts.at(-1)];
    return isProcedure(procedure) ? procedure : undefined;
};
// Invalid symbols that Proxy's get trap will be called with
const INVALID_SYMBOLS = new Set([
    Symbol.toStringTag,
    Symbol.iterator,
    Symbol.toPrimitive,
]);
export const isValidSymbol = (prop) => {
    // String properties are always valid
    if (typeof prop === "string")
        return true;
    // Symbol properties are valid except for special internal ones
    return !INVALID_SYMBOLS.has(prop);
};
export const getSymbolProperty = (prop) => {
    if (typeof prop !== "string")
        return none();
    return none();
};
export const buildFullPath = (path, prop) => [...path, prop].join(".");
export const isNoArgsProcedure = (procedure) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !procedure.argsSchema;
};
//# sourceMappingURL=utils.js.map
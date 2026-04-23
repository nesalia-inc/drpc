import { none, fromNullable } from "@deessejs/fp";
/* eslint-disable @typescript-eslint/no-explicit-any */
export function flattenRouter(router, prefix = []) {
    const result = [];
    for (const key in router) {
        const value = router[key];
        const path = [...prefix, key];
        if (isProcedure(value)) {
            result.push({ path: path.join("."), procedure: value });
        }
        else if (isRouter(value)) {
            result.push(...flattenRouter(value, path));
        }
    }
    return result;
}
export function getPublicRoutes(router) {
    return flattenRouter(router).filter((item) => item.procedure.type === "query" || item.procedure.type === "mutation");
}
export function getInternalRoutes(router) {
    return flattenRouter(router).filter((item) => item.procedure.type === "internalQuery" || item.procedure.type === "internalMutation");
}
/* eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types -- Type guard must accept any type */
export function isRouter(obj) {
    if (!obj || typeof obj !== "object")
        return false;
    for (const key of Object.keys(obj)) {
        if (isProcedure(obj[key])) {
            return false;
        }
    }
    return true;
}
/* eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types -- Type guard must accept any type */
export function isProcedure(obj) {
    return (obj &&
        typeof obj === "object" &&
        "type" in obj &&
        ["query", "mutation", "internalQuery", "internalMutation"].includes(obj.type));
}
export function resolvePath(router, path) {
    let current = router;
    const parts = path.split(".");
    for (const part of parts) {
        if (current === null || current === undefined) {
            return none();
        }
        current = current[part];
    }
    return fromNullable(current);
}
/* eslint-disable @typescript-eslint/no-explicit-any */
export function validateRouter(router) {
    const errors = [];
    const validate = (current, path) => {
        for (const key of Object.keys(current)) {
            const value = current[key];
            const currentPath = [...path, key];
            if (isProcedure(value)) {
                if (!value.handler) {
                    errors.push(`Procedure at "${currentPath.join(".")}" missing handler`);
                }
            }
            else if (isRouter(value)) {
                validate(value, currentPath);
            }
            else if (typeof value === "object" && value !== null) {
                validate(value, currentPath);
            }
        }
    };
    validate(router, []);
    return { valid: errors.length === 0, errors };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
//# sourceMappingURL=builder.js.map
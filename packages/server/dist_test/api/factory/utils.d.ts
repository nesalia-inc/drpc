import type { Router, Procedure } from "../../types.js";
export declare const splitRoutePath: (route: string) => readonly string[];
export declare const getProcedureFromPath: (router: Router<unknown>, pathParts: readonly string[]) => Procedure<unknown, unknown, unknown> | undefined;
export declare const isValidSymbol: (prop: string | symbol) => boolean;
export declare const getSymbolProperty: (prop: string | symbol) => unknown;
export declare const buildFullPath: (path: readonly string[], prop: string) => string;
export declare const isNoArgsProcedure: (procedure: unknown) => boolean;
//# sourceMappingURL=utils.d.ts.map
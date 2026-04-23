import { type Router, type Procedure } from "../types.js";
import { type Maybe } from "@deessejs/fp";
export declare function flattenRouter<Ctx, R extends Router<Ctx, any>>(router: R, prefix?: string[]): Array<{
    path: string;
    procedure: Procedure<Ctx, any, any>;
}>;
export declare function getPublicRoutes<Ctx, R extends Router<Ctx, any>>(router: R): Array<{
    path: string;
    procedure: Procedure<Ctx, any, any>;
}>;
export declare function getInternalRoutes<Ctx, R extends Router<Ctx, any>>(router: R): Array<{
    path: string;
    procedure: Procedure<Ctx, any, any>;
}>;
export declare function isRouter(obj: any): obj is Router<any, any>;
export declare function isProcedure(obj: any): obj is Procedure<any, any, any>;
export declare function resolvePath<Ctx, Routes extends Record<string, any>>(router: Router<Ctx, Routes>, path: string): Maybe<Procedure<Ctx, any, any> | Router<Ctx, Routes>>;
import { type ValidationResult } from "./types.js";
export declare function validateRouter<Ctx, R extends Router<Ctx, any>>(router: R): ValidationResult;
//# sourceMappingURL=builder.d.ts.map
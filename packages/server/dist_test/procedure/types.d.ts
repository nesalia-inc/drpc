export interface Metadata {
    keys?: string[];
    invalidate?: string[];
}
export declare function withMetadata<Output>(value: Output, metadata: Metadata): Output & Metadata;
//# sourceMappingURL=types.d.ts.map
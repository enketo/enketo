/*
 * Note: both types imported from `libxmljs` use the unusual `import()` syntax
 * because ESLint does not seem to be aware of .d.ts types
 */
declare module 'libxslt' {
    type XMLJSDocument = import('libxmljs').Document;

    export const libxmljs: typeof import('libxmljs');

    type ResultCallback<T> = ((error?: unknown, result?: T) => void) &
        (
            | ((error: unknown, result: never) => void)
            | ((error: null, result: T) => void)
        );

    interface XSLTStylesheet {
        apply(doc: XMLJSDocument, params: Record<string, any>): XMLJSDocument;

        apply(
            doc: XMLJSDocument,
            params: Record<string, any>,
            callback: ResultCallback<XMLJSDocument>
        ): void;
    }

    interface Parse {
        (xsl: string, callback: ResultCallback<XSLTStylesheet>): void;
        (xsl: XMLJSDocument): XSLTStylesheet;
    }

    export const parse: Parse;
}

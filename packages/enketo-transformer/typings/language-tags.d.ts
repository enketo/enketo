/**
 * Note: there is an actual `@types/language-tags` package available. Trying to
 * use it led to a lot of frustration. The types aren't wrong per se, but
 * currently `language.ts` depends on types which aren't declared, and the way
 * the types *are* declared is challenging to augment because of its (correct)
 * use of a namespace exported as the (CommonJS) default. So while we do depend
 * on this package, these manual typings are intended to document existing usage
 * and ensure safety if/when we ever migrate to a different solution.
 */
declare module 'language-tags' {
    interface BaseTag {
        data: {
            type: string;
        };

        descriptions(): string[];
    }

    export interface Tag extends BaseTag {
        data: {
            type: string;
            subtag?: string;
        };
    }

    export interface Subtag extends BaseTag {
        data: {
            type: string;
            subtag: string;
        };
    }

    export const search: (description: string) => Array<Tag | Subtag>;

    export const subtags: (tag: string) => Subtag[];
}

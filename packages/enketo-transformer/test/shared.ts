import { DOMParser } from 'linkedom';
import type { Attr } from 'linkedom/types/interface/attr';
import type { Element as BaseElement } from 'linkedom/types/interface/element';
import type { Node } from 'linkedom/types/interface/node';
import type { Page } from 'playwright';
import { port } from '../config/config.json';
import firefoxUserPrefs from '../config/firefox.json';
import type { Survey, Transform, TransformedSurvey } from '../src/transformer';
import { fixtures } from './fixtures';

export { fixtures };

// eslint-disable-next-line import/no-mutable-exports
let reload: () => Promise<Page | void>;

// eslint-disable-next-line import/no-mutable-exports
let transform: Transform;

if (ENV === 'node') {
    reload = () => Promise.resolve();
    transform = (await import('../src/transformer')).transform;
} else {
    const playwright = await import('playwright');
    const browserType = playwright[BROWSER];

    const browser = await browserType.launch({
        firefoxUserPrefs: BROWSER === 'firefox' ? firefoxUserPrefs : undefined,
    });

    const url = `http://localhost:${port}`;

    interface EnketoGlobal {
        transformer: {
            transform: Transform;
        };
    }

    let enketo!: EnketoGlobal;

    let page: Page | null = null;
    let isLoading = false;

    const load = async () => {
        isLoading = true;

        const [context] = await Promise.all([
            browser.newContext(),
            page?.close(),
        ]);

        page = await context.newPage();

        page.on('console', async (message) => {
            // This basically just suppresses useless built-in Vite logging
            if (!isLoading) {
                let type = message.type();

                if (type === 'warning') {
                    type = 'warn';
                }

                const args = await Promise.all(
                    message.args().map((arg) => arg.jsonValue())
                );

                if (type === 'trace') {
                    type = 'log';
                    args.push(message.location());
                }

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore - even if the return type for `message.type` were more
                // accurate, this would still fail because some console methods are
                // not variadic. We just have to trust that Playwright is passing
                // the correct arguments for whichever console method was called.
                console[type](...args);
            }
        });

        await page.goto(url);
        await page.waitForFunction(() => typeof enketo !== 'undefined');

        isLoading = false;

        return page;
    };

    page = await load();

    reload = load;

    transform = async <T extends Survey>(
        survey: T
    ): Promise<TransformedSurvey<T>> => {
        delete survey.preprocess;

        const { error, result } = await page!.evaluate(
            async ([input]) => {
                try {
                    const result = await enketo.transformer.transform(input);

                    return { result };
                } catch (error) {
                    const { message, stack } =
                        error instanceof Error
                            ? error
                            : new Error(String(error));

                    return { error: { message, stack } };
                }
            },
            [survey]
        );

        if (error == null) {
            Object.keys(survey).forEach((key) => {
                if (!Object.prototype.hasOwnProperty.call(result, key)) {
                    delete survey[key as keyof Survey];
                }
            });

            return Object.assign(survey, result);
        }

        throw error;
    };
}

export { reload, transform };

const xformsByPath = Object.fromEntries(
    fixtures.flatMap(({ fileName, fixturePath, xform }) => [
        [fileName, xform],
        [fixturePath, xform],
    ])
);

export const getXForm = async (fixturePath: string) =>
    xformsByPath[fixturePath];

type GetTransformedFormOptions = Omit<Survey, 'xform'>;

export const getTransformedForm = async (
    fixturePath: string,
    options?: GetTransformedFormOptions
) => {
    const xform = await getXForm(fixturePath);

    return transform({
        ...options,
        xform,
    });
};

export const parser = new DOMParser();

export const getTransformedFormDocument = async (
    fixturePath: string,
    options?: GetTransformedFormOptions
) => {
    const { form } = await getTransformedForm(fixturePath, options);

    return parser.parseFromString(form, 'text/html');
};

export const getTransformedModelDocument = async (
    fixturePath: string,
    options?: GetTransformedFormOptions
) => {
    const { model } = await getTransformedForm(fixturePath, options);

    return parser.parseFromString(model, 'text/xml');
};

export const XMLDocument = parser.parseFromString(
    '<a/>',
    'text/xml'
).constructor;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type XMLDocument = import('linkedom/types/xml/document').XMLDocument;

export const HTMLDocument = parser.parseFromString(
    '<p></p>',
    'text/html'
).constructor;

export type DOMMimeType = 'text/xml' | 'text/html';

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type HTMLDocument = import('linkedom/types/html/document').HTMLDocument;

export type Document = XMLDocument | HTMLDocument;

declare module 'linkedom/types/interface/attr' {
    interface Attr {
        namespaceURI: string;
    }
}

declare module 'linkedom/types/interface/node' {
    interface Node {
        cloneNode<T extends Omit<Node, '_getParent'>>(
            this: T,
            deep?: boolean
        ): T;
    }
}

interface TypedNodeList<T extends Node = Node> extends Iterable<T> {
    item(i: number): T | void;
}

export interface Element extends Omit<BaseElement, 'attributes'> {
    get attributes(): TypedNodeList<Attr>;
}

/* The `linkedom` library does not provide an `XMLSerializer`. This is roughly
 * its API equivalent. */
export const serializer = {
    serializeToString(node?: Node | null) {
        if (node == null) {
            throw new Error('Serialization failed.');
        }

        return node.toString();
    },
};

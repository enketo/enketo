/**
 * The intent of this test suite is to identify (as a strong best effort) when
 * changes we make introduce unintential changes to transformed output. There
 * are some serialization complexities below which are meant to eliminate
 * _insignificant_ changes. Their reasoning is discussed in JSDoc attached to
 * each function used in serialization.
 */
import { describe, expect, it } from 'vitest';
import { basename } from 'path';
import prettier from '@prettier/sync';
import { format as prettyFormat } from 'pretty-format';
import type { Options as PrettierOptions } from 'prettier';
import { NAMESPACES } from '../src/shared';
import type { TransformedSurvey } from '../src/transformer';
import {
    DOMMimeType,
    Element,
    getTransformedForm,
    parser,
    serializer,
    transform,
} from './shared';

describe('Snapshots', () => {
    /**
     * Weird implementation detail, not even our own implementation detail! The `linkedom` library serializes its linked list structures in reverse order. This just ensures stable sorting when serializing parts of a snapshot whose order isn't important (e.g. attributes).
     */
    const sortReverseAlpha = (strings: string[]) =>
        strings.slice().sort((a, b) => {
            if (b > a) {
                return 1;
            }

            if (a > b) {
                return -1;
            }

            return 0;
        });

    /**
     * - Normalizes the order of attributes.
     * - Ensures known boolean attributes are serialized consistently.
     * @see {@link sortReverseAlpha}
     */
    const normalizeAttributes = (element: Element, mimeType: DOMMimeType) => {
        const attributes = Array.from(element.attributes).map((attr) =>
            attr.cloneNode(true)
        );

        attributes.forEach(({ name, namespaceURI }) => {
            element.removeAttributeNS(namespaceURI, name);
        });

        const sortedAttributes = sortReverseAlpha(
            attributes.map(({ name, namespaceURI, value }) =>
                JSON.stringify({ name, namespaceURI, value })
            )
        );

        const booleanAttributes = [
            'controls',
            'novalidate',
            'multiple',
            'readonly',
        ];

        sortedAttributes.forEach((item) => {
            const { name, namespaceURI, value } = JSON.parse(item);

            if (
                mimeType === 'text/html' &&
                booleanAttributes.includes(name) &&
                (value === name || value === undefined)
            ) {
                element.setAttribute(name, undefined);
            } else {
                element.setAttributeNS(namespaceURI, name, value);
            }
        });

        element.children.forEach((child) => {
            normalizeAttributes(child, mimeType);
        });
    };

    /**
     * 1. Normalizes attributes @see {normalizeAttributes}
     * 2. Removes substrings which are insignificant in actual usage.
     * 3. Pretty prints using the `prettier` library, which should be consistent
     *    enough for normalizing whitespace.
     */
    const serializeDocument = (documentStr: string, mimeType: DOMMimeType) => {
        const document = parser.parseFromString(documentStr, mimeType);
        const { documentElement } = document;

        normalizeAttributes(documentElement, mimeType);

        const serialized = serializer.serializeToString(document);
        const basePrettierOptions: PrettierOptions = {
            bracketSameLine: true,
            printWidth: 80,
            singleAttributePerLine: true,
            tabWidth: 2,
        };

        // Neither of these can be removed before string serialization, but have
        // no meaningful impact on intended usage.
        if (mimeType === 'text/html') {
            // Namespaces have no meaning when rendered as HTML DOM (outside a
            // nested XML context like SVG).
            const html = document
                .toString()
                .replace(
                    /(<form[^>]+) xmlns="http:\/\/www.w3.org\/1999\/xhtml">/,
                    '$1>'
                );

            return prettier.format(html, {
                ...basePrettierOptions,
                parser: 'html',
            });
        }

        // Processing instructions have no impact when parsing XML using `DOMParser`.
        const xml = serialized.replace(/^<\?xml .*?\?>/, '');

        return (
            prettier
                .format(xml, {
                    ...basePrettierOptions,
                    parser: 'xml',
                    plugins: ['@prettier/plugin-xml'],
                    xmlSelfClosingSpace: true,
                    xmlWhitespaceSensitivity: 'ignore',
                })
                // Reverses a change released in `@prettier/plugin-xml` 3.0.0. In prior
                // versions, self-closing tags spanning multiple lines would place their
                // self-closing `/>` characters outdented on the following line. With the
                // newer change, those characters are placed on the same line as the
                // tag's last attribute, with a preceding space.
                //
                // These formats are semantically equivalent, so we could theoretically
                // just update the snapshots and move on. Unfortunately, Vitest does not
                // preserve snapshot order in this case, producing an update diff which
                // would not be easily reviewed for such a change. Instead, this ghastly
                // regex is used to reproduce the old behavior.
                .replace(/\n  ( +)([^< ].*?) \/>/g, '\n$1  $2\n$1/>')
        );
    };

    const serialize = (transformed: TransformedSurvey) => {
        const form = serializeDocument(transformed.form, 'text/html');
        const model = serializeDocument(transformed.model, 'text/xml');
        const { languageMap, transformerVersion } = transformed;
        const transformerVersionMatchesCurrent =
            transformerVersion === PACKAGE_VERSION;

        return prettyFormat(
            {
                form,
                model,
                languageMap,
                transformerVersionMatchesCurrent,
            },
            {
                printBasicPrototype: false,
            }
        );
    };

    expect.addSnapshotSerializer({
        serialize(transformed: TransformedSurvey) {
            return serialize(transformed);
        },

        test(value: any): value is TransformedSurvey {
            return (
                typeof value === 'object' &&
                value != null &&
                typeof value.form === 'string' &&
                typeof value.languageMap === 'object' &&
                value.languageMap != null &&
                typeof value.model === 'string' &&
                typeof value.transformerVersion === 'string'
            );
        },
    });

    describe('serialization', () => {
        const xform = /* xml */ `
            <?xml version="1.0" encoding="utf-8"?>
            <h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
                <h:head>
                    <h:title>normalize spaces</h:title>
                    <model>
                        <instance>
                            <normalize-spaces id="normalize-spaces" >
                                <txt/>
                                <meta>
                                    <instanceID/>
                                </meta>
                            </normalize-spaces>
                        </instance>
                        <bind nodeset="/normalize-spaces/txt" type="string"/>
                    </model>
                </h:head>
                <h:body class="whatever">
                    <input ref="/normalize-spaces/txt" />
                </h:body>
            </h:html>
        `.trim();

        it('normalizes spaces', async () => {
            const result1 = await transform({ xform });
            const result2 = {
                ...result1,
                form: result1.form
                    .replace(/(<form[^>]*>)/, '$1  \n   ')
                    .replace(/class="([^"]+)"/, 'class=" $1  "'),
            };

            expect(serialize(result1)).to.equal(serialize(result2));
        });
    });

    const forms = import.meta.glob('./**/*.xml');

    interface Fixture {
        fileName: string;
        formPath: string;
        origin: string;
    }

    const fixtures = Object.keys(forms)
        .map((formPath) => ({
            fileName: basename(formPath),
            formPath,
            origin:
                formPath.match(/\/external-fixtures\/([^/]+)/)?.[1] ??
                'enketo-transformer',
        }))
        .reduce<Map<string, Fixture[]>>((acc, fixture) => {
            const { origin } = fixture;
            let group = acc.get(origin);

            if (group == null) {
                group = [];
                acc.set(origin, group);
            }

            group.push(fixture);

            return acc;
        }, new Map<string, Fixture[]>())
        .entries();

    describe.each([...fixtures])('%s', (_origin, cases) => {
        describe.each(cases)('$fileName', ({ fileName, formPath }) => {
            it(`transforms ${fileName} consistently with no options`, async () => {
                const result = await getTransformedForm(formPath);

                expect(result).toMatchSnapshot();
            }, 60_000);

            it(`transforms ${fileName} consistently with markdown: false`, async () => {
                const result = await getTransformedForm(formPath, {
                    markdown: false,
                });

                expect(result).toMatchSnapshot();
            }, 60_000);

            it(`transforms ${fileName} consistently with markdown: true`, async () => {
                const result = await getTransformedForm(formPath, {
                    markdown: true,
                });

                expect(result).toMatchSnapshot();
            }, 60_000);

            it(`transforms ${fileName} consistently with media`, async () => {
                const result = await getTransformedForm(formPath, {
                    media: {
                        'jr://audio/a song.mp3': 'transformed:audio/a song.mp3',
                        'jr://audio/a%20song.mp3':
                            'transformed:audio/a%20song.mp3',
                        'jr://audio/goldeneagle.mp3':
                            'transformed:audio/goldeneagle.mp3',
                        'jr://file-csv/a spreadsheet.csv':
                            'transformed:file-csv/a spreadsheet.csv',
                        'jr://file-csv/a%20spreadsheet.csv':
                            'transformed:file-csv/a%20spreadsheet.csv',
                        'jr://file-csv/neighborhoods.csv':
                            'transformed:file-csv/neighborhoods.csv',
                        'jr://file/a link.xml)': 'transformed:file/a link.xml)',
                        'jr://file/a%20link.xml':
                            'transformed:file/a%20link.xml',
                        'jr://file/an instance.xml':
                            'transformed:file/an instance.xml',
                        'jr://file/an%20instance.xml':
                            'transformed:file/an%20instance.xml',
                        'jr://file/cities.xml': 'transformed:file/cities.xml',
                        'jr://file/existing.xml':
                            'transformed:file/existing.xml',
                        'jr://file/users.xml': 'transformed:file/users.xml',
                        'jr://images/a.jpg': 'transformed:images/a.jpg',
                        'jr://images/another image.png':
                            'transformed:images/another image.png',
                        'jr://images/another%20image.png':
                            'transformed:images/another%20image.png',
                        'jr://images/b.jpg': 'transformed:images/b.jpg',
                        'jr://images/first image.jpg':
                            'transformed:images/first image.jpg',
                        'jr://images/first%20image.jpg':
                            'transformed:images/first%20image.jpg',
                        'jr://images/happy.jpg': 'transformed:images/happy.jpg',
                        'jr://images/indifferent.png':
                            'transformed:images/indifferent.png',
                        'jr://images/kingfisher.png':
                            'transformed:images/kingfisher.png',
                        'jr://images/nuthatch.png':
                            'transformed:images/nuthatch.png',
                        'jr://images/pigeon.png':
                            'transformed:images/pigeon.png',
                        'jr://images/sad.jpg': 'transformed:images/sad.jpg',
                        'jr://images/unhappy.jpg':
                            'transformed:images/unhappy.jpg',
                        'jr://images/very-happy.jpg':
                            'transformed:images/very-happy.jpg',
                        'jr://video/some video.mp4':
                            'transformed:video/some video.mp4',
                        'jr://video/some%20video.mp4':
                            'transformed:video/some%20video.mp4',
                    },
                });

                expect(result).toMatchSnapshot();
            }, 60_000);

            it(`transforms ${fileName} consistently with openclinica: 0`, async () => {
                const result = await getTransformedForm(formPath, {
                    openclinica: 0,
                });

                expect(result).toMatchSnapshot();
            }, 60_000);

            it(`transforms ${fileName} consistently with openclinica: 1`, async () => {
                const result = await getTransformedForm(formPath, {
                    openclinica: 1,
                });

                expect(result).toMatchSnapshot();
            }, 60_000);

            it(`transforms ${fileName} consistently with openclinica: false`, async () => {
                const result = await getTransformedForm(formPath, {
                    openclinica: false,
                });

                expect(result).toMatchSnapshot();
            }, 60_000);

            it(`transforms ${fileName} consistently with openclinica: true`, async () => {
                const result = await getTransformedForm(formPath, {
                    openclinica: true,
                });

                expect(result).toMatchSnapshot();
            }, 60_000);

            it(`transforms ${fileName} consistently with openclinica: null`, async () => {
                const result = await getTransformedForm(formPath, {
                    // @ts-expect-error: this was never part of the type contract, but it's checked in the implementation and shouldn't regress
                    openclinica: null,
                });

                expect(result).toMatchSnapshot();
            }, 60_000);

            it.runIf(ENV === 'node')(
                `transforms ${fileName} consistently with a preprocess function`,
                async () => {
                    const result = await getTransformedForm(formPath, {
                        preprocess: (document) => {
                            const body = document.get(
                                '/h:html/h:body',
                                NAMESPACES
                            );

                            body!.attr('snapshot', 'snapshot value');

                            return document;
                        },
                    });

                    expect(result).toMatchSnapshot();
                },
                60_000
            );

            it.runIf(ENV === 'node')(
                `transforms ${fileName} consistently with a preprocess method referencing libxmljs as the 'this' variable`,
                async () => {
                    const result = await getTransformedForm(formPath, {
                        preprocess(document) {
                            const model = document.get(
                                '/h:html/h:head/xmlns:model',
                                NAMESPACES
                            );
                            const instance = new this.Element(
                                document,
                                'instance'
                            )
                                .namespace(NAMESPACES.xmlns)
                                .attr({
                                    id: 'snapshot',
                                });

                            model?.addChild(instance);

                            return document;
                        },
                    });

                    expect(result).toMatchSnapshot();
                },
                60_000
            );

            it(`transforms ${fileName} consistently with a theme`, async () => {
                const result = await getTransformedForm(formPath, {
                    theme: 'mytheme',
                });

                expect(result).toMatchSnapshot();
            }, 60_000);
        });
    });
});

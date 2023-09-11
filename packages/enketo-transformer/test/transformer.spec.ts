import { beforeAll, describe, expect, it } from 'vitest';
import type { Survey, TransformedSurvey } from '../src/transformer';
import {
    getTransformedForm,
    getTransformedFormDocument,
    getXForm,
    parser,
    transform,
} from './shared';

import type { Document } from './shared';

function findElementByName(
    htmlDoc: Document,
    tagName: string,
    nameAttributeValue: string
) {
    const elements = Array.prototype.slice.call(
        htmlDoc.getElementsByTagName(tagName)
    );
    const target = elements.find(
        (el) => el.getAttribute('name') === nameAttributeValue
    );

    return target || null;
}

function findElementsByName(
    htmlDoc: Document,
    tagName: string,
    nameAttributeValue: string
) {
    const elements = Array.prototype.slice.call(
        htmlDoc.getElementsByTagName(tagName)
    );

    return elements.filter(
        (el) => el.getAttribute('name') === nameAttributeValue
    );
}

describe('transformer', () => {
    let advancedRequired: TransformedSurvey;
    let autocomplete: TransformedSurvey;
    let autocompleteDoc: Document;
    let externalXForm: string;
    let external: TransformedSurvey;
    let formattedOutput: TransformedSurvey;
    let itemsetDoc: Document;
    let modelNamespace: TransformedSurvey;
    let widgetsXForm: string;
    let widgets: TransformedSurvey;

    beforeAll(async () => {
        advancedRequired = await getTransformedForm('advanced-required.xml');
        autocomplete = await getTransformedForm('autocomplete.xml');
        autocompleteDoc = parser.parseFromString(
            autocomplete.form,
            'text/html'
        );
        externalXForm = await getXForm('external.xml');
        external = await getTransformedForm('external.xml');
        formattedOutput = await getTransformedForm('formatted-output.xml');
        itemsetDoc = await getTransformedFormDocument('itemset.xml');
        modelNamespace = await getTransformedForm('model-namespace.xml');
        widgetsXForm = await getXForm('widgets.xml');
        widgets = await getTransformedForm('widgets.xml');
    });

    // These tests ensure the API of `transform` remains consistent, out of an
    // abundance of caution after breaking compatibility in previous attempts to
    // refactor it.
    describe('API stability', () => {
        interface ExtraneousProperty {
            extraneous: 'property';
        }

        let survey: ExtraneousProperty & Survey;
        let transformed: TransformedSurvey<ExtraneousProperty>;

        beforeAll(async () => {
            survey = {
                xform: widgetsXForm,
                media: { 'form_logo.png': 'http://example.com/form_logo.png' },
                preprocess(doc) {
                    return doc;
                },
                markdown: true,
                openclinica: 1,
                extraneous: 'property',
            };
            transformed = await transform(survey);
        });

        it('does not return properties of the explicit `Survey` type', () => {
            const keys = [
                'xform',
                'media',
                'preprocess',
                'markdown',
                'openclinica',
            ];

            expect(keys.every((key) => !(key in transformed))).to.be.true;

            keys.forEach((key) => {
                expect(key in transformed).to.be.false;

                // @ts-expect-error - This checks that the return type matches the runtime value
                expect(transformed[key]).to.be.undefined;
            });
        });

        it('preserves properties not explicitly on the `Survey` type', () => {
            expect(transformed.extraneous).to.equal('property');
        });

        it('returns a reference to the `survey` input object', () => {
            // @ts-expect-error - TypeScript rightly does not agree that these types are assignable
            expect(transformed === survey).to.be.true;
        });
    });

    describe('transforms valid XForms', () => {
        it('without an error', () => {
            expect(widgets).to.be.an('object');
            expect(widgets.form).to.not.be.empty;
            expect(widgets.model).to.not.be.empty;
            expect(widgets.transformerVersion).to.not.be.empty;
        });

        it('does not include the xform in the response', () => {
            expect(widgets).to.not.have.property('xform');
        });
    });

    describe('transforms invalid XForms', () => {
        const invalidXForms = [undefined, null, '', '<data>'];

        invalidXForms.forEach((xform) => {
            it.fails('with a parse error', async () => {
                await transform({
                    // @ts-expect-error: this is specifically testing invalid values
                    xform,
                });
            });
        });
    });

    describe('puts attributes on root', () => {
        it('copies the formId', async () => {
            expect(widgets.form).to.contain('data-form-id="widgets"');
        });

        it('copies the formId with accents', async () => {
            const result = await getTransformedForm('form-id-with-accent.xml');

            expect(result.form).to.contain('data-form-id="Éphémère"');
        });

        // https://github.com/enketo/enketo-transformer/issues/100
        it('copies the formId with spaces', async () => {
            const result = await getTransformedForm('form-id-with-space.xml');

            expect(result.form).to.contain('data-form-id="FormId with spaces"');
        });
    });

    describe('copies attributes on the `<model>`', () => {
        it('copies the odk:xforms-version attribute', () => {
            expect(autocomplete.model).to.contain('odk:xforms-version="1.0.0"');
        });
    });

    describe('manipulates themes and', () => {
        it('adds a provided theme if none is defined in the XForm', async () => {
            const result = await getTransformedForm('widgets.xml', {
                theme: 'mytheme',
            });

            expect(result.form).to.contain('theme-mytheme');
        });

        it('leaves the XForm-defined theme unchanged if the theme value provided is falsy', async () => {
            const newXform = widgetsXForm.replace(
                '<h:body>',
                '<h:body class="theme-one">'
            );
            const result1 = await transform({
                xform: newXform,
            });
            const result2 = await transform({
                xform: newXform,
                theme: '',
            });
            const result3 = await transform({
                xform: newXform,
                // @ts-expect-error: this is specifically testing non-theme values
                theme: null,
            });
            const result4 = await transform({
                xform: newXform,
                // @ts-expect-error: this is specifically testing non-theme values
                theme: false,
            });

            expect(result1.form).to.contain('theme-one');
            expect(result2.form).to.contain('theme-one');
            expect(result3.form).to.contain('theme-one');
            expect(result4.form).to.contain('theme-one');
        });

        it('replaces a theme defined in the XForm with a provided one', async () => {
            const newXform = widgetsXForm.replace(
                '<h:body>',
                '<h:body class="theme-one">'
            );
            const result = await transform({
                xform: newXform,
                theme: 'mytheme',
            });

            expect(result.form).to.not.contain('theme-one');
            expect(result.form).to.contain('theme-mytheme');
        });
    });

    describe('manipulates languages and', () => {
        it('provides a languageMap as output property', () => {
            expect(advancedRequired.languageMap).to.deep.equal({
                dutch: 'nl',
                english: 'en',
            });
        });

        it('provides an empty languageMap as output property if nothing was changed', () => {
            expect(widgets.languageMap).to.deep.equal({});
        });
    });

    describe('renders markdown', () => {
        it('takes into account that libxmljs Element.text() converts html entities', async () => {
            expect(external.form).to.not.contain(
                '&lt;span style="color:pink;"&gt;Intro&lt;/span&gt;'
            );
            expect(external.form).to.contain(
                '<span style="color:pink;">Intro</span>'
            );
        });

        it('and picks up formatting of <output>s', () => {
            expect(formattedOutput.form).to.contain(
                'formatted: <em><span class="or-output" data-value="/output/txt"> </span></em> and'
            );
        });

        it('preserves text containing special string replacement sequences', async () => {
            const result = await getTransformedForm('md-str-replace-chars.xml');

            expect(result.form).to.contain(
                "<em>$' is $` this $&amp; the $$ real $0 $&lt;life&gt;?</em>"
            );
        });
    });

    describe('does not render markdown', () => {
        it('when `markdown: false` is provided as option', async () => {
            const result = await getTransformedForm('formatted-output.xml', {
                markdown: false,
            });

            expect(result.form).to.contain(
                'formatted: *<span class="or-output" data-value="/output/txt"> </span>* and _normal_ text'
            );
        });
    });

    describe('arbitrary HTML', () => {
        it('strips arbitrary HTML in labels but preserves text', async () => {
            const result = await getTransformedForm('arbitrary-html.xml');

            expect(result.form).to.not.contain('<div class="arbitrary-html">');

            expect(result.form).to.contain('Label text');
        });
    });

    describe('manipulates media sources', () => {
        it('in the View by replacing media elements according to a provided map', async () => {
            const media = {
                'happy.jpg': '/i/am/happy.jpg',
                'pigeon.png': '/a/b/pigeon.png',
            };
            const result1 = widgets;
            const result2 = await transform({
                xform: widgetsXForm,
                media,
            });

            expect(result1.form).to.contain('jr://images/happy.jpg');
            expect(result1.form).to.contain('jr://images/pigeon.png');
            expect(result1.form).to.not.contain('/i/am/happy.jpg');
            expect(result1.form).to.not.contain('/a/b/pigeon.png');

            expect(result2.form).to.not.contain('jr://images/happy.jpg');
            expect(result2.form).to.not.contain('jr://images/pigeon.png');
            expect(result2.form).to.contain('/i/am/happy.jpg');
            expect(result2.form).to.contain('/a/b/pigeon.png');
        });

        it('in the View by replacing big-image link hrefs according to a provided map', async () => {
            const img = '<value form="image">jr://images/happy.jpg</value>';
            const xform = widgetsXForm.replace(
                img,
                `${img}\n<value form="big-image">jr://images/very-happy.jpg</value>`
            );
            const media = {
                'happy.jpg': '/i/am/happy.jpg',
                'very-happy.jpg': '/i/am/very-happy.jpg',
            };
            const result = await transform({
                xform,
                media,
            });

            expect(result.form).not.to.contain('jr://images/happy.jpg');
            expect(result.form).not.to.contain('jr://images/very-happy.jpg');
            expect(result.form).to.contain('/i/am/happy.jpg');
            expect(result.form).to.contain('/i/am/very-happy.jpg');
        });

        it('in the Model by replacing them according to a provided map', async () => {
            const media = {
                'neighborhoods.csv': '/path/to/neighborhoods.csv',
                'cities.xml': '/path/to/cities.xml',
            };
            const result1 = external;
            const result2 = await transform({
                xform: externalXForm,
                media,
            });

            expect(result1.model).to.contain('jr://file-csv/neighborhoods.csv');
            expect(result1.model).to.contain('jr://file/cities.xml');
            expect(result1.model).to.not.contain('/path/to/neighborhoods.csv');
            expect(result1.model).to.not.contain('/path/to/cities.xml');

            expect(result2.model).to.not.contain(
                'jr://file-csv/neighborhoods.csv'
            );
            expect(result2.model).to.not.contain('jr://file/cities.xml');
            expect(result2.model).to.contain('/path/to/neighborhoods.csv');
            expect(result2.model).to.contain('/path/to/cities.xml');
        });

        it(`in the model for binary questions that contain a default value by copying to a
            src attribute and resolving the URL according to a provided map`, async () => {
            const media = {
                'happy.jpg': 'https://feelings/happy.jpg',
                'unhappy.jpg': 'https://feelings/unhappy.jpg',
                'indifferent.png': 'https://feelings/indifferent.png',
            };

            const result = await getTransformedForm('image-default.xml', {
                media,
            });

            expect(result.model).to.contain(
                '<ann src="https://feelings/unhappy.jpg">jr://images/unhappy.jpg</ann>'
            );
            expect(result.model).to.contain(
                '<dra src="https://feelings/indifferent.png">jr://images/indifferent.png</dra>'
            );
        });

        it('by adding a form logo <img> if needed', async () => {
            const media = {
                'form_logo.png': '/i/am/logo.png',
            };
            const result1 = widgets;
            const result2 = await transform({
                xform: widgetsXForm,
                media,
            });

            expect(result1.form).to.not.contain('<img src="/i/am/logo.png"');
            expect(result2.form).to.contain('<img src="/i/am/logo.png"');
        });

        // bug https://github.com/enketo/enketo-transformer/issues/149
        it('without mangling markdown-created HTML elements', async () => {
            const media = {
                'users.xml': '/path/to/users.xml',
            };
            const result = await getTransformedForm('bold-media.xml', {
                media,
            });

            expect(result.form).to.contain(
                '<strong>Note with bold</strong> nnnn'
            );
        });

        describe('spaces in jr: media URLs', () => {
            let xform: string;

            let results: TransformedSurvey[];

            interface MediaMapTestParams {
                description: string;
                media: Record<string, string>;
            }

            const mediaMaps: MediaMapTestParams[] = [
                {
                    description: 'unescaped',
                    media: {
                        'first image.jpg':
                            'hallo spaceboy/spiders from mars.jpg',
                        'a song.mp3': 'hallo spaceboy/space oddity.mp3',
                        'some video.mp4':
                            'hallo spaceboy/a small plot of land.mp4',
                        'another image.png':
                            'hallo spaceboy/under pressure.png',
                        'an instance.xml': 'hallo spaceboy/golden years.xml',
                        'a spreadsheet.csv': 'hallo spaceboy/little wonder.csv',
                        'a link.xml': 'hallo spaceboy/wishful beginnings.xml',
                    },
                },
                {
                    description: 'escaped keys',
                    media: {
                        'first%20image.jpg':
                            'hallo spaceboy/spiders from mars.jpg',
                        'a%20song.mp3': 'hallo spaceboy/space oddity.mp3',
                        'some%20video.mp4':
                            'hallo spaceboy/a small plot of land.mp4',
                        'another%20image.png':
                            'hallo spaceboy/under pressure.png',
                        'an%20instance.xml': 'hallo spaceboy/golden years.xml',
                        'a%20spreadsheet.csv':
                            'hallo spaceboy/little wonder.csv',
                        'a%20link.xml': 'hallo spaceboy/wishful beginnings.xml',
                    },
                },
                {
                    description: 'escaped values',
                    media: {
                        'first image.jpg':
                            'hallo%20spaceboy/spiders%20from%20mars.jpg',
                        'a song.mp3': 'hallo%20spaceboy/space%20oddity.mp3',
                        'some video.mp4':
                            'hallo%20spaceboy/a%20small%20plot%20of%20land.mp4',
                        'another image.png':
                            'hallo%20spaceboy/under%20pressure.png',
                        'an instance.xml':
                            'hallo%20spaceboy/golden%20years.xml',
                        'a spreadsheet.csv':
                            'hallo%20spaceboy/little%20wonder.csv',
                        'a link.xml':
                            'hallo%20spaceboy/wishful%20beginnings.xml',
                    },
                },
                {
                    description: 'escaped keys and values',
                    media: {
                        'first%20image.jpg':
                            'hallo%20spaceboy/spiders%20from%20mars.jpg',
                        'a%20song.mp3': 'hallo%20spaceboy/space%20oddity.mp3',
                        'some%20video.mp4':
                            'hallo%20spaceboy/a%20small%20plot%20of%20land.mp4',
                        'another%20image.png':
                            'hallo%20spaceboy/under%20pressure.png',
                        'an%20instance.xml':
                            'hallo%20spaceboy/golden%20years.xml',
                        'a%20spreadsheet.csv':
                            'hallo%20spaceboy/little%20wonder.csv',
                        'a%20link.xml':
                            'hallo%20spaceboy/wishful%20beginnings.xml',
                    },
                },
            ];

            beforeAll(async () => {
                xform = await getXForm('jr-url-space.xml');
                results = await Promise.all(
                    mediaMaps.map(({ media }) =>
                        transform({
                            xform,
                            media,
                        })
                    )
                );
            });

            mediaMaps.forEach(({ description }, index) => {
                describe(description, () => {
                    it('escapes media in labels', () => {
                        const result = results[index];

                        expect(result.form).to.not.contain(
                            'jr://images/first image.jpg'
                        );
                        expect(result.form).to.not.contain(
                            'jr://audio/a song.mp3'
                        );
                        expect(result.form).to.not.contain(
                            'jr://video/some video.mp4'
                        );

                        expect(result.form).to.contain(
                            'hallo%20spaceboy/spiders%20from%20mars.jpg'
                        );
                        expect(result.form).to.contain(
                            'hallo%20spaceboy/space%20oddity.mp3'
                        );
                        expect(result.form).to.contain(
                            'hallo%20spaceboy/a%20small%20plot%20of%20land.mp4'
                        );
                    });

                    it('escapes binary defaults', () => {
                        const result = results[index];

                        expect(result.model).to.not.contain(
                            'jr://images/another image.png'
                        );

                        expect(result.model).to.contain(
                            'hallo%20spaceboy/under%20pressure.png'
                        );
                    });

                    it('escapes external instance URLs', () => {
                        const result = results[index];

                        expect(result.model).to.not.contain(
                            'jr://file/an instance.xml'
                        );
                        expect(result.model).to.not.contain(
                            'jr://file-csv/a spreadsheet.csv'
                        );

                        expect(result.model).to.contain(
                            'hallo%20spaceboy/golden%20years.xml'
                        );
                        expect(result.model).to.contain(
                            'hallo%20spaceboy/little%20wonder.csv'
                        );
                    });

                    it('escapes media URLs in markdown linkes', () => {
                        const result = results[index];

                        expect(result.form).to.not.contain(
                            'jr://file/a link.xml'
                        );

                        expect(result.form).to.contain(
                            'hallo%20spaceboy/wishful%20beginnings.xml'
                        );

                        // issue https://github.com/enketo/enketo-transformer/issues/149
                        expect(result.form).to.contain('markdown</a><br>');
                    });
                });
            });

            it('preserves query parameters', async () => {
                const media = {
                    'first image.jpg':
                        '/hallo spaceboy/spiders from mars.jpg?a=b',
                    'a song.mp3': 'hallo spaceboy/space oddity.mp3?c=d%20e',
                    'some video.mp4':
                        '/hallo spaceboy/a small plot of land.mp4?f%20g=h',
                    'another image.png':
                        'hallo spaceboy/under pressure.png?i=j&k=l',
                    'an instance.xml': '/hallo spaceboy/golden years.xml?m',
                    'a spreadsheet.csv': 'hallo spaceboy/little wonder.csv?n&o',
                    'a link.xml':
                        '/hallo spaceboy/wishful beginnings.xml?p=q&r',
                };

                const result = await transform({
                    xform,
                    media,
                });

                expect(result.form).to.contain(
                    '/hallo%20spaceboy/spiders%20from%20mars.jpg?a=b'
                );
                expect(result.form).to.contain(
                    'hallo%20spaceboy/space%20oddity.mp3?c=d%20e'
                );
                expect(result.form).to.contain(
                    '/hallo%20spaceboy/a%20small%20plot%20of%20land.mp4?f%20g=h'
                );
                expect(result.model).to.contain(
                    'hallo%20spaceboy/under%20pressure.png?i=j&amp;k=l'
                );
                expect(result.model).to.contain(
                    '/hallo%20spaceboy/golden%20years.xml?m'
                );
                expect(result.model).to.contain(
                    'hallo%20spaceboy/little%20wonder.csv?n&amp;o'
                );
                expect(result.form).to.contain(
                    '/hallo%20spaceboy/wishful%20beginnings.xml?p=q&amp;r'
                );
            });

            // Regression in https://github.com/enketo/enketo-transformer/pull/150.
            // Before that change, omitting a media mapping would fall back to an empty object
            // as a default.
            it('returns an empty media map when none was provided at the call site', async () => {
                const result = await transform({ xform });

                expect(result.form).to.contain('jr://images/first%20image.jpg');
                expect(result.form).to.contain('jr://audio/a%20song.mp3');
                expect(result.form).to.contain('jr://video/some%20video.mp4');
                expect(result.model).to.contain(
                    'jr://images/another%20image.png'
                );
                expect(result.model).to.contain('jr://file/an%20instance.xml');
                expect(result.model).to.contain(
                    'jr://file-csv/a%20spreadsheet.csv'
                );
                expect(result.form).to.contain('jr://file/a%20link.xml');
            });
        });
    });

    describe('processes questions with constraints', () => {
        it('and adds the correct number of constraint-msg elements', async () => {
            const count = (result: TransformedSurvey) => {
                const matches = result.form.match(/class="or-constraint-msg/g);

                return matches ? matches.length : 0;
            };

            const count1 = count(widgets);
            const count2 = count(advancedRequired);

            expect(count1).to.equal(4);
            expect(count2).to.equal(0);
        });
    });

    describe('processes required questions', () => {
        it('and adds the data-required HTML attribute for required XForm attributes keeping the value unchanged', () => {
            expect(widgets.form).to.contain('data-required="true()"');
            expect(widgets.form).to.not.contain(' required="required"');
        });

        it('and does not add the data-required attribute if the value is false()', async () => {
            const xform = widgetsXForm.replace(
                'required="true()"',
                'required="false()"'
            );
            const result = await transform({
                xform,
            });

            expect(result.form).to.not.contain('data-required');
        });

        it('and adds the correct number of required-msg elements', async () => {
            const count = (result: TransformedSurvey) =>
                result.form.match(/class="or-required-msg/g)!.length;

            const count1 = count(widgets);
            const count2 = count(advancedRequired);

            expect(count1).to.equal(1);
            expect(count2).to.equal(2);
        });

        it('and adds a default requiredMsg if no custom is provided', () => {
            expect(widgets.form).to.contain('data-i18n="constraint.required"');
        });

        it('and adds a custom requiredMsg if provided', () => {
            expect(advancedRequired.form).to.not.contain('data-i18n');
            expect(advancedRequired.form).to.contain(
                'custom verplicht bericht'
            );
            expect(advancedRequired.form).to.contain('custom required message');
        });
    });

    describe('processes readonly questions', () => {
        it('and outputs a disabled attribute for readonly select-minimal questions with itemsets', async () => {
            const doc = await getTransformedFormDocument(
                'select-dynamic-readonly.xml'
            );

            expect(
                doc.getElementsByTagName('option')[0].hasAttribute('disabled')
            ).to.equal(true);
        });
    });

    describe('processes multiline questions', () => {
        it('and outputs a textarea for appearance="multiline" on text input', () => {
            expect(widgets.form).to.contain('<textarea');
        });

        it('and outputs a textarea for appearance="multi-line" on text input', () => {
            expect(widgets.form).to.contain('<textarea');
        });

        it('and outputs a textarea for appearance="textarea" on text input', () => {
            expect(widgets.form).to.contain('<textarea');
        });

        it('and outputs a textarea for appearance="text-area" on text input', () => {
            expect(widgets.form).to.contain('<textarea');
        });

        it('and outputs a textarea for rows="x" attribute on text input, with a rows appearance', async () => {
            const xform = widgetsXForm.replace(
                'appearance="multiline"',
                'rows="5"'
            );
            const result = await transform({ xform });

            expect(result.form).to.contain('<textarea');
            expect(result.form).to.contain('or-appearance-rows-5');
        });
    });

    describe('processes autocomplete questions by producing <datalist> elements', () => {
        it('and outputs <datalist> elements', () => {
            expect(autocompleteDoc).to.be.an('object');
            expect(
                autocompleteDoc.getElementsByTagName('select')
            ).to.have.length(4);
            expect(
                autocompleteDoc.getElementsByTagName('datalist')
            ).to.have.length(2);
            expect(
                autocompleteDoc
                    .getElementById('selectoneautocompletethree')!
                    .nodeName.toLowerCase()
            ).to.equal('datalist');
            expect(
                autocompleteDoc
                    .getElementsByTagName('input')[0]
                    .getAttribute('list')
            ).to.equal('selectoneautocompletethree');
            expect(
                autocompleteDoc
                    .getElementsByTagName('input')[0]
                    .getAttribute('type')
            ).to.equal('text');
            expect(
                autocompleteDoc
                    .getElementById('selectoneautocompletefour')!
                    .nodeName.toLowerCase()
            ).to.equal('datalist');
            expect(
                autocompleteDoc
                    .getElementsByTagName('input')[1]
                    .getAttribute('list')
            ).to.equal('selectoneautocompletefour');
        });
    });

    describe('processes a model with namespaces', () => {
        it('leaves namespace prefixes and declarations intact on nodes', () => {
            expect(modelNamespace.model).to.contain('<orx:instanceID');
            expect(modelNamespace.model).to.contain(
                'xmlns:orx="http://openrosa.org/xforms"'
            );
            expect(modelNamespace.form).to.contain(
                'name="/data/orx:meta/orx:instanceID'
            );
        });

        it('leaves namespace prefixes and declarations intact on node attributes', () => {
            expect(modelNamespace.model).to.contain(
                '<a orx:comment="/data/a_comment"/>'
            );
        });
    });

    describe('for backwards compatibility of forms without a /meta/instanceID node', () => {
        let result1: TransformedSurvey;

        beforeAll(async () => {
            result1 = await getTransformedForm('no-instance-id.xml');
        });
        it('adds a /meta/instanceID node', () =>
            expect(result1.model).to.contain('<meta><instanceID/></meta>'));

        it('does not add it if it contains /meta/instanceID in the OpenRosa namespace', () =>
            expect(modelNamespace.model).to.not.contain('<instanceID/>'));
    });

    describe('converts deprecated', () => {
        it('method="form-data-post" to "post" in submission element', async () => {
            const result = await getTransformedForm('deprecated.xml');

            expect(result.form).to.contain('method="post"');
        });
    });

    describe('itext ids for itemsets are extracted', () => {
        const MATCH = /itemset-labels.+Mexico.+USA.+The Netherlands/;
        const REPLACE = /randomize\(.+\)/;

        let xform: string;

        beforeAll(async () => {
            xform = await getXForm('rank.xml');
        });

        it('works for itemset nodesets using a simple randomize()', async () => {
            const result = await transform({ xform });

            expect(result.form).to.match(MATCH);
        });

        it('works for itemset nodesets using a randomize() with static seed', async () => {
            const result = await transform({
                xform: xform.replace(
                    REPLACE,
                    "randomize(instance('holiday')/root/item, 34)"
                ),
            });

            expect(result.form).to.match(MATCH);
        });

        it.skip('works for itemset nodesets using a simple randomize() with complex multi-parameter predicate function', async () => {
            const result = await transform({
                xform: xform.replace(
                    REPLACE,
                    'randomize(instance(\'holiday\')/root/item[value=concat("a", "b")]/name)'
                ),
            });

            expect(result.form).to.match(MATCH);
        });

        it.skip('works for itemset nodesets using a randomize() with a static seed and with a complex multi-parameter predicate function', async () => {
            const result = await transform({
                xform: xform.replace(
                    REPLACE,
                    'randomize(instance(\'holiday\')/root/item[value=concat("a", "b")]/name, 34)'
                ),
            });

            expect(result.form).to.match(MATCH);
        });
    });

    describe('range questions', () => {
        it('with "picker" appearance, have the same HTML form output as the equivalent select-one-minimal question', async () => {
            const results = await Promise.all([
                getTransformedForm('select-one-numbers.xml'),
                getTransformedForm('range-picker.xml'),
            ]);

            // eliminate some acceptable differences:
            const modifiedSelectMinimalResult = results[0].form
                .replace('or-appearance-minimal', '')
                .replace(/data-type-xml=".+"[ >]/, '')
                .replace(/data-name=".+"[ >]/, '');
            const modifiedRangePickerResult = results[1].form
                .replace('or-appearance-picker', '')
                .replace(/data-type-xml=".+"[ >]/, '')
                .replace(/min=".+"[ >]/, '')
                .replace(/max=".+"[ >]/, '')
                .replace(/step=".+"[ >]/, '');

            expect(modifiedSelectMinimalResult).to.equal(
                modifiedRangePickerResult
            );
        });
    });

    describe('setvalue actions', () => {
        let xform: string;
        let doc: Document;

        beforeAll(async () => {
            xform = await getXForm('setvalue.xml');
            doc = await getTransformedFormDocument('setvalue.xml');
        });

        it('included in XForm body', () => {
            const target = findElementByName(doc, 'input', '/data/b');
            expect(target).to.not.equal(null);
            expect(target.getAttribute('data-event')).to.equal(
                'odk-instance-first-load'
            );
            expect(target.getAttribute('data-setvalue')).to.equal(
                'string-length(/data/c)'
            );
            expect(target.getAttribute('data-type-xml')).to.equal('string');
        });

        it('included as XForm <bind> sibling ', () => {
            const target = findElementByName(doc, 'input', '/data/a');
            expect(target).to.not.equal(null);
            expect(target.getAttribute('data-event')).to.equal(
                'odk-instance-first-load'
            );
            expect(target.getAttribute('data-setvalue')).to.equal('"ab"');
            expect(target.getAttribute('data-type-xml')).to.equal('int');
        });

        it('with odk-new-repeat included inside a repeat ', () => {
            const targets = findElementsByName(
                doc,
                'input',
                '/data/person/age'
            );
            // Duplicates added by xsl sheet are merged.
            expect(targets.length).to.equal(1);
            // The empty .setvalue label is removed.
            expect(doc.getElementsByTagName('label').length).to.equal(5);
            const target = targets[0];
            expect(target).to.not.equal(null);
            expect(target.getAttribute('data-event')).to.equal(
                'odk-new-repeat odk-instance-first-load'
            );
            expect(target.getAttribute('data-setvalue')).to.equal(
                '../../my_age + 2'
            );
            expect(target.getAttribute('data-type-xml')).to.equal('decimal');
        });

        it('with xforms-value-changed included inside an input form control', () => {
            const target = findElementByName(
                doc,
                'input',
                '/data/person/age_changed'
            );
            expect(target).to.not.equal(null);
            // The nested labels are removed
            expect(doc.getElementsByTagName('label').length).to.equal(5);
            expect(target.getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(target.getAttribute('data-setvalue')).to.equal(
                '"Age changed!"'
            );
            expect(target.getAttribute('data-type-xml')).to.equal('string');
            // Check location as sibling of /data/person/age
            const sibling = target.parentNode.getElementsByTagName('input')[0];
            expect(sibling.getAttribute('name')).to.equal('/data/person/age');
        });

        it('with xforms-value-changed included inside a select1 form control with minimal appearance', () => {
            const target = findElementByName(
                doc,
                'input',
                '/data/my_age_changed'
            );
            expect(target).to.not.equal(null);
            // The nested labels are removed
            expect(doc.getElementsByTagName('label').length).to.equal(5);
            expect(target.getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(target.getAttribute('data-setvalue')).to.equal('3+3');
            expect(target.getAttribute('data-type-xml')).to.equal('int');
            // check location of target as sibling <select>
            const sibling = target.parentNode.getElementsByTagName('select')[0];
            expect(sibling.getAttribute('name')).to.equal('/data/my_age');
        });

        it('with xforms-value-changed included inside a select form control', async () => {
            const xform2 = xform.replace('appearance="minimal"', '');
            const { form } = await transform({
                xform: xform2,
            });
            const doc = parser.parseFromString(form, 'text/html');
            const target = findElementByName(
                doc,
                'input',
                '/data/my_age_changed'
            );

            expect(target).to.not.equal(null);
            // The nested labels are removed
            expect(doc.getElementsByTagName('label').length).to.equal(6);
            expect(target.getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(target.getAttribute('data-setvalue')).to.equal('3+3');
            expect(target.getAttribute('data-type-xml')).to.equal('int');

            // check location of target inside same label as input[name="/data/my_age"]
            const radio = target.parentNode.getElementsByTagName('input')[0];

            expect(radio.getAttribute('name')).to.equal('/data/my_age');
        });

        it('with xforms-value-changed included inside a rank form control', async () => {
            const xform2 = xform
                .replace('appearance="minimal"', '')
                .replace(/select1/g, 'odk:rank');
            const { form } = await transform({
                xform: xform2,
            });
            const doc = parser.parseFromString(form, 'text/html');
            const target = findElementByName(
                doc,
                'input',
                '/data/my_age_changed'
            );
            expect(target).to.not.equal(null);
            // The nested labels are removed
            expect(doc.getElementsByTagName('label').length).to.equal(6);
            expect(target.getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(target.getAttribute('data-setvalue')).to.equal('3+3');
            expect(target.getAttribute('data-type-xml')).to.equal('int');
            // check location of target inside same label as input[name="/data/my_age"]
            const radio = target.parentNode.getElementsByTagName('input')[0];
            expect(radio.getAttribute('name')).to.equal('/data/my_age');
        });

        it('with xforms-value-changed included inside a range form control', async () => {
            const xform2 = xform.replace(
                /<input ref="\/data\/person\/age">(.*)<\/input>/gm,
                '<range ref="/data/person/age">$1</range>'
            );
            const { form } = await transform({
                xform: xform2,
            });
            const doc = parser.parseFromString(form, 'text/html');
            const target = findElementByName(
                doc,
                'input',
                '/data/person/age_changed'
            );

            expect(target).to.not.equal(null);
            // The nested labels are removed
            expect(doc.getElementsByTagName('label').length).to.equal(5);
            expect(target.getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(target.getAttribute('data-setvalue')).to.equal(
                '"Age changed!"'
            );
            expect(target.getAttribute('data-type-xml')).to.equal('string');

            // Check location as sibling of /data/person/age
            const sibling = target.parentNode.getElementsByTagName('input')[0];

            expect(sibling.getAttribute('name')).to.equal('/data/person/age');
        });

        it('with xforms-value-changed included inside a select form control with an itemset', async () => {
            const target = findElementByName(
                itemsetDoc,
                'input',
                '/data/state_changed'
            );

            expect(target).to.not.equal(null);
            // The nested labels are removed
            expect(target.getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(target.getAttribute('data-setvalue')).to.equal('3+3');
            expect(target.getAttribute('data-type-xml')).to.equal('string');

            // check location of target inside same label as input[name="/data/state"]
            const parent = target.parentNode;

            expect(parent.nodeName).to.equal('FIELDSET');
            expect(
                parent.getElementsByTagName('input')[0].getAttribute('name')
            ).to.equal('/data/state');
        });

        it('with multiple xforms-value-changed inside a single text input', async () => {
            const doc = await getTransformedFormDocument(
                'setvalue-value-changed-multiple.xml'
            );
            const target = findElementByName(doc, 'input', '/data/a');

            expect(target).to.not.equal(null);
            expect(target.hasAttribute('data-event')).to.equal(false);
            expect(target.hasAttribute('data-setvalue')).to.equal(false);
            expect(target.getAttribute('data-type-xml')).to.equal('string');

            // check for 4 setvalue siblings
            const parent = target.parentNode;
            const sibs = Array.prototype.slice
                .call(parent.getElementsByTagName('input'))
                .slice(1);

            // data/b
            expect(sibs[0].getAttribute('name')).to.equal('/data/b');
            expect(sibs[0].getAttribute('data-setvalue')).to.equal('1 + 1');
            expect(sibs[0].getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(sibs[0].getAttribute('type')).to.equal('hidden');

            // data/c
            expect(sibs[1].getAttribute('name')).to.equal('/data/c');
            expect(sibs[1].getAttribute('data-setvalue')).to.equal('now()');
            expect(sibs[1].getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(sibs[1].getAttribute('type')).to.equal('hidden');

            // data/d
            expect(sibs[2].getAttribute('name')).to.equal('/data/d');
            expect(sibs[2].hasAttribute('data-setvalue')).to.equal(true);
            expect(sibs[2].getAttribute('data-setvalue')).to.equal('');
            expect(sibs[2].getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(sibs[2].getAttribute('type')).to.equal('hidden');

            // data/e
            expect(sibs[3].getAttribute('name')).to.equal('/data/e');
            expect(sibs[3].hasAttribute('data-setvalue')).to.equal(true);
            expect(sibs[3].getAttribute('data-setvalue')).to.equal('');
            expect(sibs[3].getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(sibs[3].getAttribute('type')).to.equal('hidden');

            // other form controls
            const questions = Array.prototype.slice
                .call(doc.getElementsByTagName('label'))
                .filter((question) =>
                    question.getAttribute('class').includes('question')
                );
            expect(questions.length).to.equal(3);

            const c = questions[1].getElementsByTagName('input');
            expect(c.length).to.equal(1);
            expect(c[0].getAttribute('name')).to.equal('/data/c');
            expect(c[0].hasAttribute('data-event')).to.equal(false);
            expect(c[0].hasAttribute('data-setvalue')).to.equal(false);

            const d = questions[2].getElementsByTagName('input');
            expect(d.length).to.equal(1);
            expect(d[0].getAttribute('name')).to.equal('/data/d');
            expect(d[0].hasAttribute('data-event')).to.equal(false);
            expect(d[0].hasAttribute('data-setvalue')).to.equal(false);
        });

        it('with a dynamic default set on a radiobutton question', async () => {
            const doc = await getTransformedFormDocument(
                'setvalue-radiobuttons-default.xml'
            );
            const sel1 = findElementsByName(doc, 'input', '/data/sel1');

            expect(sel1.length).to.equal(2);
            expect(sel1[0].getAttribute('data-event')).to.equal(
                'odk-instance-first-load'
            );
            // It probably wouldn't be an issue if the events and setvalue attributes were added to all radiobuttons (or checkboxes)
            // but this test is to show it is deliberately/lazily only added to the first.
            expect(sel1[1].getAttribute('data-event')).to.equal(null);
        });

        it('with a dynamic default repeat question, that also gets its value set by a trigger', async () => {
            const doc = await getTransformedFormDocument(
                'setvalue-repeat-tricky.xml'
            );
            const ages = findElementsByName(
                doc,
                'input',
                '/data/person/group/age'
            );

            expect(ages.length).to.equal(2);

            const agePrimary = ages[1]; // actual form control shown in form
            const ageHidden = ages[0]; // hidden setvalue/xforms-value-changed directive

            expect(agePrimary.getAttribute('data-event')).to.equal(
                'odk-new-repeat odk-instance-first-load'
            );
            expect(agePrimary.getAttribute('data-setvalue')).to.equal('100');

            expect(ageHidden.getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(ageHidden.getAttribute('data-setvalue')).to.equal('15');
        });
    });

    describe('setgeopoint actions', () => {
        let xform: string;
        let doc: Document;

        beforeAll(async () => {
            xform = await getXForm('setgeopoint.xml');
            doc = await getTransformedFormDocument('setgeopoint.xml');
        });

        it('included in XForm body', () => {
            const target = findElementByName(
                doc,
                'input',
                '/data/visible_first_load'
            );
            expect(target).to.not.equal(null);
            expect(target.getAttribute('data-event')).to.equal(
                'odk-instance-first-load'
            );
            expect(target.hasAttribute('data-setgeopoint')).to.equal(true);
            expect(target.getAttribute('data-type-xml')).to.equal('geopoint');
        });

        it('included as XForm <bind> sibling ', () => {
            const target = findElementByName(
                doc,
                'input',
                '/data/hidden_first_load'
            );
            expect(target).to.not.equal(null);
            expect(target.getAttribute('data-event')).to.equal(
                'odk-instance-first-load'
            );
            expect(target.hasAttribute('data-setgeopoint')).to.equal(true);
            expect(target.getAttribute('data-type-xml')).to.equal('geopoint');
        });

        it('with odk-new-repeat included inside a repeat ', () => {
            const targets = findElementsByName(
                doc,
                'input',
                '/data/repeats/first_load'
            );

            // Duplicates added by xsl sheet are merged.
            expect(targets.length).to.equal(1);
            // The empty .setgeopoint label is removed.
            expect(doc.getElementsByTagName('label').length).to.equal(5);

            const target = targets[0];

            expect(target).to.not.equal(null);
            expect(target.getAttribute('data-event')).to.equal(
                'odk-new-repeat odk-instance-first-load'
            );
            expect(target.hasAttribute('data-setgeopoint')).to.equal(true);
            expect(target.getAttribute('data-type-xml')).to.equal('geopoint');
        });

        it('with xforms-value-changed included inside an input form control', () => {
            const target = findElementByName(
                doc,
                'input',
                '/data/repeats/changed_location'
            );

            expect(target).to.not.equal(null);
            // The nested labels are removed
            expect(doc.getElementsByTagName('label').length).to.equal(5);
            expect(target.getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(target.hasAttribute('data-setgeopoint')).to.equal(true);
            expect(target.getAttribute('data-type-xml')).to.equal('geopoint');

            // Check location as sibling of /data/repeats/changed_location
            const sibling = target.parentNode.getElementsByTagName('input')[0];

            expect(sibling.getAttribute('name')).to.equal(
                '/data/repeats/changes'
            );
        });

        it('with xforms-value-changed included inside a select1 form control with minimal appearance', () => {
            const target = findElementByName(
                doc,
                'input',
                '/data/changed_location'
            );

            expect(target).to.not.equal(null);
            // The nested labels are removed
            expect(doc.getElementsByTagName('label').length).to.equal(5);
            expect(target.getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(target.hasAttribute('data-setgeopoint')).to.equal(true);
            expect(target.getAttribute('data-type-xml')).to.equal('geopoint');

            // check location of target as sibling <select>
            const sibling = target.parentNode.getElementsByTagName('select')[0];

            expect(sibling.getAttribute('name')).to.equal('/data/changes');
        });

        it('with xforms-value-changed included inside a select form control', async () => {
            const xform2 = xform.replace('appearance="minimal"', '');
            const { form } = await transform({
                xform: xform2,
            });
            const doc = parser.parseFromString(form, 'text/html');
            const target = findElementByName(
                doc,
                'input',
                '/data/changed_location'
            );

            expect(target).to.not.equal(null);
            // The nested labels are removed
            expect(doc.getElementsByTagName('label').length).to.equal(6);
            expect(target.getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(target.hasAttribute('data-setgeopoint')).to.equal(true);
            expect(target.getAttribute('data-type-xml')).to.equal('geopoint');

            // check location of target inside same label as input[name="/data/my_age"]
            const radio = target.parentNode.getElementsByTagName('input')[0];

            expect(radio.getAttribute('name')).to.equal('/data/changes');
        });

        it('with xforms-value-changed included inside a rank form control', async () => {
            const xform2 = xform
                .replace('appearance="minimal"', '')
                .replace(/select1/g, 'odk:rank');
            const { form } = await transform({
                xform: xform2,
            });
            const doc = parser.parseFromString(form, 'text/html');
            const target = findElementByName(
                doc,
                'input',
                '/data/changed_location'
            );

            expect(target).to.not.equal(null);
            // The nested labels are removed
            expect(doc.getElementsByTagName('label').length).to.equal(6);
            expect(target.getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(target.hasAttribute('data-setgeopoint')).to.equal(true);
            expect(target.getAttribute('data-type-xml')).to.equal('geopoint');

            // check location of target inside same label as input[name="/data/my_age"]
            const radio = target.parentNode.getElementsByTagName('input')[0];
            expect(radio.getAttribute('name')).to.equal('/data/changes');
        });

        it('with xforms-value-changed included inside a range form control', async () => {
            const xform2 = xform.replace(
                /<input ref="\/data\/person\/age">(.*)<\/input>/gm,
                '<range ref="/data/repeats/changes">$1</range>'
            );
            const { form } = await transform({
                xform: xform2,
            });
            const doc = parser.parseFromString(form, 'text/html');
            const target = findElementByName(
                doc,
                'input',
                '/data/repeats/changed_location'
            );

            expect(target).to.not.equal(null);
            // The nested labels are removed
            expect(doc.getElementsByTagName('label').length).to.equal(5);
            expect(target.getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(target.hasAttribute('data-setgeopoint')).to.equal(true);
            expect(target.getAttribute('data-type-xml')).to.equal('geopoint');

            // Check location as sibling of /data/person/age
            const sibling = target.parentNode.getElementsByTagName('input')[0];
            expect(sibling.getAttribute('name')).to.equal(
                '/data/repeats/changes'
            );
        });

        it('with xforms-value-changed included inside a select form control with an itemset', async () => {
            const target = findElementByName(
                itemsetDoc,
                'input',
                '/data/location_changed'
            );

            expect(target).to.not.equal(null);
            // The nested labels are removed
            expect(target.getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(target.hasAttribute('data-setgeopoint')).to.equal(true);
            expect(target.getAttribute('data-type-xml')).to.equal('geopoint');

            // check location of target inside same label as input[name="/data/state"]
            const parent = target.parentNode;
            expect(parent.nodeName).to.equal('FIELDSET');
            expect(
                parent.getElementsByTagName('input')[0].getAttribute('name')
            ).to.equal('/data/state');
        });

        it('with multiple xforms-value-changed inside a single text input', async () => {
            const doc = await getTransformedFormDocument(
                'setgeopoint-value-changed-multiple.xml'
            );
            const target = findElementByName(doc, 'input', '/data/a');

            expect(target).to.not.equal(null);
            expect(target.hasAttribute('data-event')).to.equal(false);
            expect(target.hasAttribute('data-setgeopoint')).to.equal(false);
            expect(target.getAttribute('data-type-xml')).to.equal('string');

            // check for 4 setgeopoint siblings
            const parent = target.parentNode;
            const sibs = Array.prototype.slice
                .call(parent.getElementsByTagName('input'))
                .slice(1);

            // data/b
            expect(sibs[0].getAttribute('name')).to.equal('/data/b');
            expect(sibs[0].hasAttribute('data-setgeopoint')).to.equal(true);
            expect(sibs[0].getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(sibs[0].getAttribute('type')).to.equal('hidden');

            // data/c
            expect(sibs[1].getAttribute('name')).to.equal('/data/c');
            expect(sibs[1].hasAttribute('data-setgeopoint')).to.equal(true);
            expect(sibs[1].getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(sibs[1].getAttribute('type')).to.equal('hidden');

            // data/d
            expect(sibs[2].getAttribute('name')).to.equal('/data/d');
            expect(sibs[2].hasAttribute('data-setgeopoint')).to.equal(true);
            expect(sibs[2].getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(sibs[2].getAttribute('type')).to.equal('hidden');

            // data/e
            expect(sibs[3].getAttribute('name')).to.equal('/data/e');
            expect(sibs[3].hasAttribute('data-setgeopoint')).to.equal(true);
            expect(sibs[3].getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(sibs[3].getAttribute('type')).to.equal('hidden');

            // other form controls
            const questions = Array.prototype.slice
                .call(doc.getElementsByTagName('label'))
                .filter((question) =>
                    question.getAttribute('class').includes('question')
                );
            expect(questions.length).to.equal(3);

            const c = questions[1].getElementsByTagName('input');

            expect(c.length).to.equal(1);
            expect(c[0].getAttribute('name')).to.equal('/data/c');
            expect(c[0].hasAttribute('data-event')).to.equal(false);
            expect(c[0].hasAttribute('data-setgeopoint')).to.equal(false);

            const d = questions[2].getElementsByTagName('input');

            expect(d.length).to.equal(1);
            expect(d[0].getAttribute('name')).to.equal('/data/d');
            expect(d[0].hasAttribute('data-event')).to.equal(false);
            expect(d[0].hasAttribute('data-setgeopoint')).to.equal(false);
        });

        it('with a dynamic default repeat question, that also gets its value set by a trigger', async () => {
            const doc = await getTransformedFormDocument(
                'setgeopoint-repeat-tricky.xml'
            );
            const ages = findElementsByName(
                doc,
                'input',
                '/data/person/group/age'
            );

            expect(ages.length).to.equal(2);

            const agePrimary = ages[1]; // actual form control shown in form
            const ageHidden = ages[0]; // hidden setgeopoint/xforms-value-changed directive

            expect(agePrimary.getAttribute('data-event')).to.equal(
                'odk-new-repeat odk-instance-first-load'
            );
            expect(agePrimary.hasAttribute('data-setgeopoint')).to.equal(true);

            expect(ageHidden.getAttribute('data-event')).to.equal(
                'xforms-value-changed'
            );
            expect(ageHidden.hasAttribute('data-setgeopoint')).to.equal(true);
        });
    });
});

describe('custom stuff', () => {
    describe('supports the enk:for attribute', () => {
        it('by turning it into the data-for attribute', async () => {
            const result = await getTransformedForm('for.xml');

            expect(result.form).to.contain('data-for="../a"');
        });
    });

    describe('supports the oc:external attribute if openclinica=1', () => {
        it('by turning it into the data-oc-external attribute', async () => {
            const result = await getTransformedForm('oc-external.xml', {
                openclinica: 1,
            });

            expect(result.form).to.contain('data-oc-external="clinicaldata"');
        });

        it('for setvalue/odk-instance-first-load actions by turning it into the data-oc-external attribute', async () => {
            const result = await getTransformedForm('oc-438-setvalue.xml', {
                openclinica: 1,
            });

            expect(result.form).to.contain('data-oc-external="clinicaldata"');
        });

        it('for setgeopoint/odk-instance-first-load actions by turning it into the data-oc-external attribute', async () => {
            const result = await getTransformedForm('oc-438-setgeopoint.xml', {
                openclinica: 1,
            });

            expect(result.form).to.contain('data-oc-external="clinicaldata"');
        });
    });

    describe('oc:relevantMsg binding attributes', () => {
        it('if openclinica=1, are copied to or-relevant-msg elements or a default is added for relevant expressions', async () => {
            const result = await getTransformedForm(
                'relevant_constraint_required.xml',
                {
                    openclinica: 1,
                }
            );

            expect(result.form).to.satisfy(
                (form: string) => form.match(/or-relevant-msg/g)!.length === 4
            );
        });

        it('are ignored by default', async () => {
            const result = await getTransformedForm(
                'relevant_constraint_required.xml'
            );

            expect(result.form).not.to.contain('or-relevant-msg');
        });
    });

    describe('multiple OC constraints', () => {
        describe('if openclinica=1', () => {
            let result: TransformedSurvey;

            beforeAll(async () => {
                result = await getTransformedForm(
                    'oc-custom-multiple-constraints.xml',
                    {
                        openclinica: 1,
                    }
                );
            });

            describe('are added via oc:constraint[N] attribute', () => {
                it('works for N=1', () =>
                    expect(result.form).to.contain(
                        'data-oc-constraint1=". != \'a\'"'
                    ));

                it('works for N=20', () =>
                    expect(result.form).to.contain(
                        'data-oc-constraint20=". != \'c\'"'
                    ));

                it('ignores oc:constraint without a number', () => {
                    expect(result.form).to.not.contain(
                        'constraint to be ignored'
                    );
                });

                it('does not add constraint messages in this manner', () =>
                    expect(result.form).to.not.contain(
                        'data-oc-constraint20Msg="'
                    ));
            });

            describe('can get individual constraint messages with the oc:constraint[N]Msg attribute', () => {
                it('works for N=1', () =>
                    expect(result.form).to.contain(
                        'class="or-constraint1-msg'
                    ));

                it('works for N=20', () =>
                    expect(result.form).to.contain(
                        'class="or-constraint20-msg'
                    ));

                it('ignores constraint messages without a number', () =>
                    // The text "msg to be ignored is actually part of the result but is not present in a .or-constraint-msg span elmement
                    expect(result.form).not.to.match(
                        /or-constraint-msg [^>]+>msg to be ignored/
                    ));
            });
        });

        describe('are ignored by default', () => {
            let result: TransformedSurvey;

            beforeAll(async () => {
                result = await getTransformedForm(
                    'oc-custom-multiple-constraints.xml'
                );
            });

            it('for N=1 (attribute)', () =>
                expect(result.form).not.to.contain(
                    'data-oc-constraint1=". != \'a\'"'
                ));

            it('for N=20 (attribute)', () =>
                expect(result.form).not.to.contain(
                    'data-oc-constraint20=". != \'c\'"'
                ));

            it('for N=1 (message)', () =>
                expect(result.form).not.to.contain(
                    'class="or-constraint1-msg'
                ));

            it('for N=20 (message', () =>
                expect(result.form).not.to.contain(
                    'class="or-constraint20-msg'
                ));
        });

        it('with different ways of specify a "value" for setvalue', async () => {
            const doc = await getTransformedFormDocument('setvalue-values.xml');
            const a = findElementByName(doc, 'input', '/data/a');
            expect(a.getAttribute('data-setvalue')).to.equal('"ab"');
            const b = findElementByName(doc, 'input', '/data/b');

            expect(b.getAttribute('data-setvalue')).to.equal('"not ignored"');

            const c = findElementByName(doc, 'input', '/data/c');

            expect(c.getAttribute('data-setvalue')).to.equal(
                "string-length('two')"
            );

            const f = findElementByName(doc, 'input', '/data/f');

            expect(f.getAttribute('data-setvalue')).to.equal('');

            const hs = findElementsByName(doc, 'input', '/data/h');
            const h = hs.filter((el) => el.getAttribute('data-event'))[0];

            expect(h.getAttribute('data-setvalue')).to.equal('');
        });
    });
});

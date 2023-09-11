import { beforeAll, describe, expect, it } from 'vitest';
import { NAMESPACES } from '../src/shared';
import {
    Document,
    HTMLDocument,
    getTransformedForm,
    getTransformedModelDocument,
    parser,
    XMLDocument,
} from './shared';

import type {
    TransformedSurvey,
    TransformPreprocess,
} from '../src/transformer';
import type { Element } from './shared';

describe.runIf(ENV === 'node')(
    'for incompatible forms that require preprocessing',
    () => {
        let preprocessed: TransformedSurvey;
        let preprocessedForm: Document;

        const preprocess: TransformPreprocess = function (doc) {
            const model = doc.get('/h:html/h:head/xmlns:model', NAMESPACES);

            if (!model) {
                return doc;
            }

            doc.find('/h:html/h:body//xmlns:input[@query]', NAMESPACES).forEach(
                (input) => {
                    const q = input.attr('query');
                    const r = input.attr('ref');

                    if (!q || !r) {
                        return;
                    }

                    const query = q.value()!;
                    const ref = r.value();

                    /**
                     * Preprocess Model
                     * - add instances
                     */
                    const match = query?.match(/^instance\('([^)]+)'\)/);
                    const id = match?.length ? match[1] : null;

                    if (
                        id &&
                        !model.get(`//xmlns:instance[@id="${id}"]`, NAMESPACES)
                    ) {
                        model
                            .node('instance')
                            .namespace(NAMESPACES.xmlns)
                            .attr({
                                id,
                                src: `esri://file-csv/list_name/${id}/itemsets.csv`,
                            });
                    }

                    /**
                     * Preprocess Bind
                     * - correct type
                     */
                    const bind = doc.get(
                        `/h:html/h:head/xmlns:model/xmlns:bind[@nodeset="${ref}"]`,
                        NAMESPACES
                    );
                    if (bind) {
                        bind.attr({
                            type: 'select1',
                        });
                    }

                    /**
                     * Preprocess Body
                     * - convert <input> to <select1> + <itemset>
                     */
                    const children = input.childNodes();
                    const attrs = input.attrs();
                    const select1 = new this.Element(doc, 'select1').namespace(
                        NAMESPACES.xmlns
                    );

                    // add all attributes including unknowns, except the query attribute
                    attrs.forEach((attr) => {
                        const name = attr.name();

                        if (name !== 'query') {
                            const value = attr.value();

                            select1.attr(name, value!);
                        }
                    });

                    // add all existing children
                    children.forEach((child) => {
                        select1.addChild(child);
                    });

                    // add the itemset with fixed label and value references
                    const itemset = select1
                        .node('itemset')
                        .namespace(NAMESPACES.xmlns)
                        .attr({
                            nodeset: query,
                        });
                    itemset.node('value').namespace(NAMESPACES.xmlns).attr({
                        ref: 'name',
                    });
                    itemset.node('label').namespace(NAMESPACES.xmlns).attr({
                        ref: 'translate(label)',
                    });

                    input.replace(select1);
                }
            );

            return doc;
        };

        beforeAll(async () => {
            if (ENV === 'node') {
                preprocessed = await getTransformedForm('bad-external.xml', {
                    preprocess,
                });
                preprocessedForm = parser.parseFromString(
                    preprocessed.form,
                    'text/html'
                );
            }
        });

        it('preprocess fn does nothing if not provided...', async () => {
            const doc = await getTransformedModelDocument('bad-external.xml');

            expect(doc).to.be.an.instanceOf(XMLDocument);
            expect(doc.getElementsByTagName('instance')).to.have.length(2);
            expect(doc.getElementById('existing')).to.not.be.null;
            expect(
                doc.getElementById('existing')!.getAttribute('src')
            ).to.equal('jr://file/existing.xml');
            expect(doc.getElementById('counties')).to.be.null;
            expect(doc.getElementById('cities')).to.be.null;
        });

        it('preprocess fn corrects instances if necessary', async () => {
            const preprocessedModel = parser.parseFromString(
                preprocessed.model,
                'text/xml'
            );

            expect(preprocessedModel).to.be.an.instanceOf(XMLDocument);
            expect(
                preprocessedModel.getElementsByTagName('instance')
            ).to.have.length(4);
            expect(preprocessedModel.getElementById('existing')).to.not.be.null;
            expect(
                preprocessedModel
                    .getElementById('existing')!
                    .getAttribute('src')
            ).to.equal('jr://file/existing.xml');
            expect(preprocessedModel.getElementById('counties')).to.not.be.null;
            expect(
                preprocessedModel
                    .getElementById('counties')!
                    .getAttribute('src')
            ).to.equal('esri://file-csv/list_name/counties/itemsets.csv');
            expect(preprocessedModel.getElementById('cities')).to.not.be.null;
            expect(
                preprocessedModel.getElementById('cities')!.getAttribute('src')
            ).to.equal('esri://file-csv/list_name/cities/itemsets.csv');
        });

        it('fn corrects body elements if necessary', () => {
            const selects = preprocessedForm.getElementsByTagName('select');

            return Promise.all([
                expect(selects).to.have.length(2), // language selector and the one with appearance=minimal
                expect(selects[1].getAttribute('name')).to.equal(
                    '/select_one_external/city2'
                ),
                expect(selects[1].getAttribute('data-type-xml')).to.equal(
                    'select1'
                ),
                expect(
                    selects[1]
                        .getElementsByTagName('option')[0]
                        .getAttribute('class')
                ).to.equal('itemset-template'),
                expect(
                    selects[1]
                        .getElementsByTagName('option')[0]
                        .getAttribute('data-items-path')
                ).to.equal(
                    "instance('cities')/root/item[state= /select_one_external/state  and county= /select_one_external/county ]"
                ),
                expect(
                    (
                        selects[1].nextSibling!.nextSibling! as Element
                    ).getAttribute('class')
                ).to.equal('itemset-labels'),
                expect(
                    (
                        selects[1].nextSibling!.nextSibling! as Element
                    ).getAttribute('data-label-ref')
                ).to.equal('translate(label)'),
                expect(
                    (
                        selects[1].nextSibling!.nextSibling! as Element
                    ).getAttribute('data-value-ref')
                ).to.equal('name'),
            ]);
        });

        it('fn does not correct instances if not necessary', async () =>
            Promise.all([
                expect(preprocessedForm).to.be.an.instanceOf(HTMLDocument),
                expect(preprocessedForm.getElementById('counties')).to.be.null,
            ]));
    }
);

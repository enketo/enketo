import { DOMParser, XPathResult, XSLTProcessor } from 'enketo-transformer/dom';
import type LibXMLJS from 'libxmljs';
import type { DOM } from './dom/abstract';
import { NodeTypes } from './dom/shared';
import xslForm from './xsl/openrosa2html5form.xsl?raw';
import xslModel from './xsl/openrosa2xmlmodel.xsl?raw';
import { parseLanguage } from './language';
import { markdownToHTML } from './markdown';
import { NAMESPACES } from './shared';
import { escapeURLPath, getMediaPath } from './url';

export type TransformPreprocess = (
    this: typeof LibXMLJS,
    doc: LibXMLJS.Document
) => LibXMLJS.Document;

type NodeOnly<T> = [typeof ENV] extends ['web'] ? undefined : T;

export interface Survey {
    xform: string;
    markdown?: boolean;
    media?: Record<string, string>;
    openclinica?: boolean | number;

    /**
     * @deprecated
     *
     * Only supported in Node environments.
     */
    preprocess?: NodeOnly<TransformPreprocess>;

    theme?: string;
}

export type TransformedSurvey<T = unknown> = Omit<T, keyof Survey> & {
    form: string;
    languageMap: Record<string, string>;
    model: string;
    transformerVersion: string;
};

export type Transform = <T extends Survey>(
    survey: T
) => Promise<TransformedSurvey<T>>;

const getPreprocess = (
    survey: Survey
): typeof ENV extends 'web' ? void : TransformPreprocess | void => {
    if (String(ENV) === 'node' && typeof survey.preprocess === 'function') {
        return survey.preprocess;
    }
};

/**
 * Performs XSLT transformation on XForm and process the result.
 */
export const transform: Transform = async (survey) => {
    const { xform, markdown, media, openclinica, theme } = survey;

    const xsltParams = openclinica
        ? {
              openclinica: 1,
          }
        : {};

    const mediaMap = Object.fromEntries(
        Object.entries(media || {}).map((entry) => entry.map(escapeURLPath))
    );
    const domParser = new DOMParser();
    const xslFormDoc = domParser.parseFromString(xslForm, 'text/xml');

    let xformDoc: DOM.Document = domParser.parseFromString(xform, 'text/xml');

    const preprocess = getPreprocess(survey);

    if (typeof preprocess === 'function') {
        const { libxmljs } = await import('libxslt');

        // This passes with the Node and test configs, but now fails with the
        // web config... where it is never used. Ignoring the error after
        // several futile, probably pointless, attempts to appease the compiler.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- ^
        // @ts-ignore
        xformDoc = preprocess.call(libxmljs, xformDoc as LibXMLJS.Document);
    }

    processBinaryDefaults(xformDoc, mediaMap);
    processItemsets(xformDoc);

    const htmlDoc = xslTransform(xslFormDoc, xformDoc, xsltParams);

    correctHTMLDocHierarchy(htmlDoc);
    correctAction(htmlDoc, 'setgeopoint');
    correctAction(htmlDoc, 'setvalue');
    transformAppearances(htmlDoc);
    replaceTheme(htmlDoc, theme);
    replaceMediaSources(htmlDoc, mediaMap);

    const languageMap = replaceLanguageTags(htmlDoc);
    const form =
        markdown !== false
            ? renderMarkdown(htmlDoc, mediaMap)
            : docToString(htmlDoc);
    const xslModelDoc = domParser.parseFromString(xslModel, 'text/xml');
    const xmlDoc = xslTransform(xslModelDoc, xformDoc);

    correctModelNamespaces(xslModelDoc, xformDoc, xmlDoc);
    replaceMediaSources(xmlDoc, mediaMap);
    addInstanceIdNodeIfMissing(xmlDoc);

    const model = docToString(xmlDoc);

    // @ts-expect-error - This fails because `xform` is not optional, but this is API-consistent behavior.
    delete survey.xform;
    delete survey.media;
    delete survey.preprocess;
    delete survey.markdown;
    delete survey.openclinica;

    return Object.assign(survey, {
        form,
        model,
        languageMap,
        transformerVersion: PACKAGE_VERSION,
    });
};

interface XSLTParams {
    openclinica?: number;
}

const xslTransform = (
    xslDoc: DOM.Document,
    xmlDoc: DOM.Document,
    xsltParams: XSLTParams = {} as XSLTParams
) => {
    const xsltProcessor = new XSLTProcessor();

    xsltProcessor.importStylesheet(xslDoc);

    Object.entries(xsltParams).forEach(([key, value]) => {
        xsltProcessor.setParameter(null, key, value);
    });

    return xsltProcessor.transformToDocument(xmlDoc);
};

const getNamespaceResolver = (namespaces: Record<string, string>) => ({
    lookupNamespaceURI: (prefix: string) => namespaces[prefix] ?? null,
});

const isDocument = (node: DOM.Node | DOM.Document): node is DOM.Document =>
    node.nodeType === NodeTypes.DOCUMENT_NODE;

const evaluateXPathExpression = (
    context: DOM.Document | DOM.Element,
    expression: string,
    resultType: DOM.XPathResultType,
    namespaces?: Record<string, string>
) => {
    const namespaceResolver =
        namespaces == null ? null : getNamespaceResolver(namespaces);
    const doc = isDocument(context) ? context : context.ownerDocument;

    if (doc == null) {
        throw new Error('Could not find owner document');
    }

    return doc.evaluate(expression, context, namespaceResolver, resultType);
};

const getNodesByXPathExpression = <
    T extends DOM.Element | DOM.Attr = DOM.Element,
>(
    context: DOM.Document | DOM.Element,
    expression: string,
    namespaces?: Record<string, string>
) => {
    const results: T[] = [];
    const result = evaluateXPathExpression(
        context,
        expression,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        namespaces
    );

    for (let i = 0; i < (result.snapshotLength ?? 0); i += 1) {
        results.push(result.snapshotItem?.(i) as DOM.Node as T);
    }

    return results;
};

const getNodeByXPathExpression = <
    T extends DOM.Element | DOM.Attr = DOM.Element,
>(
    context: DOM.Document | DOM.Element,
    expression: string,
    namespaces?: Record<string, string>
) => {
    const { singleNodeValue } = evaluateXPathExpression(
        context,
        expression,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        namespaces
    );

    return singleNodeValue as T | null;
};

const processBinaryDefaults = (
    doc: DOM.Document,
    mediaMap: Record<string, string>
) => {
    getNodesByXPathExpression(
        doc,
        '/h:html/h:head/xmlns:model/xmlns:bind[@type="binary"]',
        NAMESPACES
    ).forEach((bind) => {
        const nodeset = bind.getAttribute('nodeset');

        if (nodeset) {
            const path = `/h:html/h:head/xmlns:model/xmlns:instance${nodeset.replace(
                /\//g,
                '/xmlns:'
            )}`;
            const dataNode = getNodeByXPathExpression(doc, path, NAMESPACES);

            if (dataNode) {
                const text = dataNode.textContent ?? '';

                // Very crude URL checker which is fine for now,
                // because at this point we don't expect anything other than jr://
                if (/^[a-zA-Z]+:\/\//.test(text)) {
                    const value = getMediaPath(mediaMap, text);
                    const escapedText = escapeURLPath(text);

                    dataNode.setAttribute('src', value);
                    dataNode.textContent = escapedText;
                }
            }
        }
    });
};

/**
 * Correct some <setvalue>/<odk:setgeopoint> issues in the XSL stylesheets.
 * This is much easier to correct in javascript than in XSLT
 */
const correctAction = (
    doc: DOM.Document,
    localName: 'setvalue' | 'setgeopoint' = 'setvalue'
) => {
    /*
     * See setvalue.xml (/data/person/age_changed). A <setvalue> inside a form control results
     * in one label.question with a nested label.setvalue which is weird syntax (and possibly invalid HTML).
     */
    getNodesByXPathExpression(
        doc,
        `//*[contains(@class, "question")]//label/input[@data-${localName}]`
    ).forEach((setValueEl) => {
        const { parentElement } = setValueEl;

        if (parentElement != null) {
            const clone = setValueEl.cloneNode(true);

            parentElement.replaceWith(clone);
        }
    });

    /*
     * See setvalue.xml (/data/person/age). A <setvalue> inside a repeat to set a default value that also has a question with the same name, results
     * in one .question and .setvalue with the same name, which will leads to all kinds of problems in enketo-core
     * as name is presumed to be unique.
     *
     * Note that a label.setvalue is always to set a default value (with odk-new-repeat, odk-instance-first-load), never
     * a value change directive (with xforms-value-changed)
     */
    getNodesByXPathExpression(
        doc,
        `//label[contains(@class, "${localName}")]/input[@data-${localName}]`
    ).forEach((setValueEl) => {
        const name = setValueEl.getAttribute('name');
        const questionSameName = getNodeByXPathExpression(
            doc,
            `//*[@name="${name}" and ( contains(../@class, 'question') or contains(../../@class, 'option-wrapper')) and not(@type='hidden')]`
        );
        if (questionSameName) {
            // Note that if the question has radiobuttons or checkboxes only the first of those gets the setvalue attributes.
            [`data-${localName}`, 'data-event'].forEach((name) => {
                questionSameName.setAttribute(
                    name,
                    setValueEl.getAttribute(name) ?? name
                );
            });
            setValueEl.parentElement?.remove();
        }
    });
};

const replaceTheme = (doc: DOM.Document, theme?: string) => {
    const HAS_THEME = /(theme-)[^"'\s]+/;

    if (!theme) {
        return;
    }

    const form = getNodeByXPathExpression(doc.documentElement, '/root/form');

    if (form == null) {
        throw new Error('Form is missing');
    }

    const formClass = form.getAttribute('class');

    if (formClass != null && HAS_THEME.test(formClass)) {
        form.setAttribute('class', formClass.replace(HAS_THEME, `$1${theme}`));
    } else {
        form.setAttribute('class', `${formClass ?? ''} theme-${theme}`);
    }
};

const replaceMediaSources = (
    root: DOM.Document,
    mediaMap?: Record<string, string>
) => {
    if (!mediaMap) {
        return;
    }

    // iterate through each element with a src attribute
    getNodesByXPathExpression(root, '//*[@src] | //a[@href]').forEach(
        (mediaEl) => {
            const attribute =
                mediaEl.nodeName.toLowerCase() === 'a' ? 'href' : 'src';
            const src = mediaEl.getAttribute(attribute);

            if (src == null) {
                return;
            }

            const replacement = getMediaPath(mediaMap, src);

            if (replacement) {
                mediaEl.setAttribute(attribute, replacement);
            }
        }
    );

    // add form logo <img> element if applicable
    const formLogo = mediaMap['form_logo.png'];
    const formLogoEl = getNodeByXPathExpression(
        root,
        '//*[@class="form-logo"]'
    );
    if (formLogo && formLogoEl) {
        const formLogoImg = root.createElement('img');

        formLogoImg.setAttribute('src', formLogo);
        formLogoImg.setAttribute('alt', 'form logo');

        formLogoEl.append(formLogoImg);
    }
};

/**
 * Replaces all lang attributes to the valid IANA tag if found.
 * Also add the dir attribute to the languages in the language selector.
 *
 * @see http://www.w3.org/International/questions/qa-choosing-language-tags
 */
const replaceLanguageTags = (doc: DOM.Document) => {
    const languageMap: Record<string, string> = {};

    const languageElements = getNodesByXPathExpression(
        doc,
        '/root/form/select[@id="form-languages"]/option'
    );

    // List of parsed language objects
    const languages = languageElements.map((el) => {
        const lang = el.textContent ?? '';

        return parseLanguage(lang, getLanguageSampleText(doc, lang));
    });

    // forms without itext and only one language, still need directionality info
    if (languages.length === 0) {
        languages.push(parseLanguage('', getLanguageSampleText(doc, '')));
    }

    // add or correct dir and value attributes, and amend textcontent of options in language selector
    languageElements.forEach((el, index) => {
        const val = el.getAttribute('value');

        if (val && val !== languages[index].tag) {
            languageMap[val] = languages[index].tag;
        }

        el.setAttribute('data-dir', languages[index].directionality);
        el.setAttribute('value', languages[index].tag);
        el.textContent = languages[index].description;
    });

    // correct lang attributes
    languages.forEach(({ sourceLanguage, tag }) => {
        if (sourceLanguage === tag) {
            return;
        }
        getNodesByXPathExpression(
            doc,
            `/root/form//*[@lang="${sourceLanguage}"]`
        ).forEach((el) => {
            el.setAttribute('lang', tag);
        });
    });

    // correct default lang attribute
    const langSelectorElement = getNodeByXPathExpression(
        doc,
        '/root/form/*[@data-default-lang]'
    );
    if (langSelectorElement) {
        const defaultLang =
            langSelectorElement.getAttribute('data-default-lang');

        languages.some(({ sourceLanguage, tag }) => {
            if (sourceLanguage === defaultLang) {
                langSelectorElement.setAttribute('data-default-lang', tag);

                return true;
            }

            return false;
        });
    }

    return languageMap;
};

/**
 * Obtains a non-empty hint text or other text sample of a particular form language.
 */
const getLanguageSampleText = (doc: DOM.Document, language: string) => {
    // First find non-empty text content of a hint with that lang attribute.
    // If not found, find any span with that lang attribute.
    const langSampleEl =
        getNodeByXPathExpression(
            doc,
            `/root/form//span[contains(@class, "or-hint") and @lang="${language}" and normalize-space() and not(./text() = '-')]`
        ) ||
        getNodeByXPathExpression(
            doc,
            `/root/form//span[@lang="${language}" and normalize-space() and not(./text() = '-')]`
        );

    return langSampleEl?.textContent?.trim() || 'nothing';
};

/**
 * Temporary function to add a /meta/instanceID node if this is missing.
 * This used to be done in enketo-xslt but was removed when support for namespaces was added.
 */
const addInstanceIdNodeIfMissing = (doc: DOM.Document) => {
    const xformsPath =
        '/xmlns:root/xmlns:model/xmlns:instance/*/xmlns:meta/xmlns:instanceID';
    const openrosaPath =
        '/xmlns:root/xmlns:model/xmlns:instance/*/orx:meta/orx:instanceID';
    const instanceIdEl = getNodeByXPathExpression(
        doc,
        `${xformsPath} | ${openrosaPath}`,
        NAMESPACES
    );

    if (!instanceIdEl) {
        const rootEl = getNodeByXPathExpression(
            doc,
            '/xmlns:root/xmlns:model/xmlns:instance/*',
            NAMESPACES
        );
        const metaEl = getNodeByXPathExpression(
            doc,
            '/xmlns:root/xmlns:model/xmlns:instance/*/xmlns:meta',
            NAMESPACES
        );

        const instanceID = doc.createElementNS(NAMESPACES.xmlns, 'instanceID');

        if (metaEl) {
            metaEl.append(instanceID);
        } else if (rootEl) {
            const meta = doc.createElementNS(NAMESPACES.xmlns, 'meta');

            rootEl.append(meta);
            meta.append(instanceID);
        }
    }
};

/**
 * Converts a subset of Markdown in all textnode children of labels and hints into HTML
 */
const renderMarkdown = (
    htmlDoc: DOM.Document,
    mediaMap: Record<string, string>
) => {
    const replacements: Record<string, string> = {};

    // First turn all outputs into text so *<span class="or-output></span>* can be detected
    getNodesByXPathExpression(
        htmlDoc,
        '/root/form//span[contains(@class, "or-output")]'
    ).forEach((el, index) => {
        const key = `---output-${index}`;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const textNode = el.firstChild!.cloneNode(true);
        replacements[key] = el.outerHTML;
        textNode.textContent = key;
        el.replaceWith(textNode);
        // Note that we end up in a situation where we likely have sibling text nodes...
    });

    const domParser = new DOMParser();

    // Now render markdown
    getNodesByXPathExpression(
        htmlDoc,
        '/root/form//span[contains(@class, "question-label") or contains(@class, "or-hint")]'
    ).forEach((el, index) => {
        let key;
        /**
         * Using text() is done because:
         * a) We are certain that these <span>s do not contain other elements, other than formatting/markdown <span>s.
         * b) This avoids the need to merge any sibling text nodes that could have been created in the previous step.
         *
         * Note that text() will convert &gt; to >
         */
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const original = el
            .textContent!.replace('<', '&lt;')
            .replace('>', '&gt;');
        let rendered = markdownToHTML(original);

        if (original !== rendered) {
            const tempDoc = domParser.parseFromString(
                `<root class="temporary-root">${rendered}</root>`,
                'text/html'
            );

            correctHTMLDocHierarchy(tempDoc);
            replaceMediaSources(tempDoc, mediaMap);

            rendered = docToString(tempDoc);
            key = `$$$${index}`;
            replacements[key] = rendered;
            el.textContent = key;
        }
    });

    let htmlStr = docToString(htmlDoc);

    // Now replace the placeholders with the rendered HTML
    // in reverse order so outputs are done last
    Object.keys(replacements)
        .reverse()
        .forEach((key) => {
            const replacement = replacements[key];
            if (replacement) {
                /**
                 * The replacement is called as a function here so special string
                 * replacement sequences are preserved if they appear within Markdown.
                 *  @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement}
                 */
                htmlStr = htmlStr.replace(key, () => replacement);
            }
        });

    return htmlStr;
};

const docToString = (doc: DOM.Document) => {
    const { outerHTML } = doc.documentElement;

    // It would be tempting to use `innerHTML`, as this is semantically
    // equivalent. But removing the open and closing tags from `outerHTML`
    // produces consistent namespace declarations across environments.
    return outerHTML.replace(/^<[^>]+>/, '').replace(/<\/[^>]+>(?!.|\n)$/, '');
};

export const version = VERSION;

export const sheets = {
    xslForm,
    xslModel,
};

export { escapeURLPath, NAMESPACES };

/**
 * Exported for backwards compatibility, prefer named imports from enketo-transformer's index module.
 */
export default {
    transform,
    version: VERSION,
    NAMESPACES,
    sheets,
    escapeURLPath,
};

const correctHTMLDocHierarchy = (doc: DOM.Document) => {
    const { documentElement } = doc;

    if (documentElement.nodeName.toLowerCase() === 'html') {
        const root = getNodeByXPathExpression(doc, '/html/body/root');

        if (root == null) {
            throw new Error('Missing root node.');
        }

        documentElement.replaceWith(root);
    }
};

/** @see {@link processItemsets} */
const substringBefore = (haystack: string, needle: string) =>
    haystack.split(needle, 1)[0];

/** @see {@link processItemsets} */
const substringAfter = (haystack: string, needle: string) =>
    haystack.substring(haystack.indexOf(needle) + needle.length);

/**
 * This is a replacement for the XSL template named `strip-filter`. The original
 * XSL commentary follows:
 *
 * ----------------------------------------------------------------------------
 * turns: /path/to/node[value=/some/other/node] into: /path/to/node this
 * function is probably way too aggressive but will work for xls-form generated
 * forms to do this properly a regexp:replace is required, but not supported in
 * libXML kept the recursion in, even though it is not being used right now
 * ----------------------------------------------------------------------------
 *
 * Contrary to the JSDoc comment for @see {@link processItemsets},
 * this implementation deviates from the original XSL logic, which uses
 * substrings and recursion, because it's (hopefully) much easier to understand
 * this way.
 *
 * It is *also* worth noting that in the process of migrating to browser DOM,
 * the original commentary was found to be wrong! The recursion was certainly in
 * use, and without it some snapshot tests failed.
 */
const stripFilter = (expression: string) => expression.replace(/\[.*?\]/g, '');

/**
 * This is a replacement for the dynamic logic in the XSL template
 * `match="xf:itemset" mode="labels"`. Moving it to DOM code allows us to drop
 * our reliance on the unsupported `dyn` extension. The intent is to match the
 * naming and semantics of the original XSL logic to ensure there is no
 * potential for regressions.
 */
const processItemsets = (xformDoc: DOM.Document) => {
    const itemsets = getNodesByXPathExpression(
        xformDoc,
        '//xmlns:itemset',
        NAMESPACES
    );

    itemsets.forEach((itemset) => {
        const valueEl = getNodeByXPathExpression(
            itemset,
            './xmlns:value',
            NAMESPACES
        );
        const valueRef = valueEl?.getAttribute('ref') ?? '';
        const labelEl = getNodeByXPathExpression(
            itemset,
            './xmlns:label',
            NAMESPACES
        );
        const labelRef = labelEl?.getAttribute('ref') ?? '';
        const nodeset = itemset.getAttribute('nodeset') ?? '';
        const iwq = substringBefore(substringAfter(nodeset, 'instance('), ')');

        // TODO (2023-01-15): The following comment is directly from the
        // previous XSL implementation. But because we *do* now implement this
        // in a general purpose language, we can address these limitations.

        // Needs to also deal with randomize(instance("id")/path/to/node), randomize(instance("id")/path/to/node, 3)
        // Super inelegant and not robust without regexp:match
        let instancePathTemp: string;

        const nodesetIncludesRandomize = nodeset.includes('randomize(');

        if (nodesetIncludesRandomize && nodeset.includes(',')) {
            instancePathTemp = substringBefore(
                substringAfter(nodeset, ')'),
                ','
            );
        } else if (nodesetIncludesRandomize) {
            instancePathTemp = substringBefore(
                substringAfter(nodeset, ')'),
                ')'
            );
        } else {
            instancePathTemp = substringAfter(nodeset, ')');
        }

        const instancePath = instancePathTemp.replace(/\//g, '/xf:');
        const instancePathNoFilter = stripFilter(instancePath);
        const instanceId = iwq.substring(1, iwq.length - 1);
        const itextPath = `/h:html/h:head/xf:model/xf:instance[@id="${instanceId}"]${instancePathNoFilter}`;

        itemset.setAttribute('valueRef', valueRef);
        itemset.setAttribute('labelRef', labelRef);
        itemset.setAttribute('itextPath', `${itextPath}`);

        const [, labelNodeName] = labelRef.match(/itext\((.*)\)/) ?? [];

        if (labelNodeName != null) {
            const labelPath = `${itextPath.replace(
                /\/xf:/g,
                '/xmlns:'
            )}/*[name() = "${labelNodeName}"]`;
            const items = getNodesByXPathExpression(
                xformDoc,
                labelPath,
                NAMESPACES
            );

            itemset.append(...items.map((item) => item.cloneNode(true)));
        }
    });
};

/**
 * This is a replacement for the logic previously implemented in the
 * `appearance` template in `openrosa2html5form.xsl`. That template now
 * transforms existing appearance values directly to a `data-appearance`
 * attribute, and the previous logic is applied here based on those values.
 */
const transformAppearances = (doc: DOM.Document) => {
    const appearanceElements = getNodesByXPathExpression(
        doc,
        '//*[@data-appearances]'
    );

    appearanceElements.forEach((element) => {
        const selectType = element.hasAttribute('data-appearances-select-type');

        if (selectType) {
            element.removeAttribute('data-appearances-select-type');
        }

        const appearances =
            element
                .getAttribute('data-appearances')
                ?.trim()
                .toLowerCase()
                .split(/\s+/) ?? [];

        const appearanceClasses = appearances.flatMap((appearance) => {
            const results = [`or-appearance-${appearance}`];

            // Convert deprecated appearances, but leave the deprecated ones.
            if (selectType) {
                if (appearance === 'horizontal') {
                    results.push('or-appearance-columns');
                }

                if (appearance === 'horizontal-compact') {
                    results.push('or-appearance-columns-pack');
                }

                if (appearance === 'compact') {
                    results.push(
                        'or-appearance-columns-pack',
                        'or-appearance-no-buttons'
                    );
                }

                if (appearance.startsWith('compact-')) {
                    results.push(
                        appearance.replace('compact-', ''),
                        'or-appearance-no-buttons'
                    );
                }
            }

            return results;
        });

        const classes =
            element.getAttribute('class')?.trim()?.split(/\s+/) ?? [];

        const className = classes
            .flatMap((className) =>
                className === 'or-appearances-placeholder'
                    ? appearanceClasses
                    : className
            )
            .join(' ');

        element.setAttribute('class', className);
        element.removeAttribute('data-appearances');
    });
};

const XMLNS_URI = 'http://www.w3.org/2000/xmlns/';

declare const document: DOM.Document | undefined;

/**
 * This addresses a difference in how Firefox treats XML namespace declarations
 * versus other browsers, as well as `libxslt`. In `openrosa2xmlmodel.xsl`, it's
 * expected that `xmlns` and `xmlns:*` are treated as attributes, but evidently
 * this is not the case in Firefox. So for consistency we copy the namespace
 * declarations in the browser DOM.
 *
 * An important note: understanding what the actual behavior originally was
 * turned out to be rather difficult, so this is the current behavior (which may
 * not exactly be *expected* e.g. by Enketo Core):
 *
 * For each namespace declaration defined on the XForm's root `html` element,
 * assign them to the transformed model's primary `instance` element, **except if**:
 *
 * - The namespace is also defined on the `model`.
 * - The namespace prefix is used on any of the `model`'s attributes.
 * - The namespace is also defined in `openrosa2xmlmodel.xsl`.
 *
 * TODO (2023-01-16):
 *
 * - All of the exceptions described above are either known bugs or likely to be.
 *
 * - This leaves very little remaining responsibilities of
 *   `openrosa2xmlmodel.xsl`. We should seriously consider moving the remainder
 *   to DOM code.
 */
const correctModelNamespaces = (
    xslDoc: DOM.Document,
    xformDoc: DOM.Document,
    modelDoc: DOM.Document
) => {
    if (typeof document === 'undefined') {
        return;
    }

    const { documentElement: xslRoot } = xslDoc;
    const instanceRoots = getNodesByXPathExpression(
        modelDoc,
        '/xmlns:root/xmlns:model/xmlns:instance/*',
        NAMESPACES
    );
    const model = instanceRoots[0].parentElement?.parentElement;
    const xformModel = getNodeByXPathExpression(
        xformDoc,
        '/h:html/h:head/xmlns:model',
        NAMESPACES
    );

    if (model == null || xformModel == null) {
        throw new Error('XForm is missing a model element.');
    }

    instanceRoots.forEach((instanceRoot) => {
        const xformModelAttrNamespaces = [...xformModel.attributes]
            .filter(
                ({ name }) => name !== 'xmlns' && !name.startsWith('xmlns:')
            )
            .map(({ namespaceURI }) => namespaceURI);

        const missingNamespaceAttrs = [
            ...xformDoc.documentElement.attributes,
        ].filter(
            ({ name, value }) =>
                (name === 'xmlns' || name.startsWith('xmlns:')) &&
                !xslRoot.hasAttribute(name) &&
                !xformModelAttrNamespaces.includes(value) &&
                !instanceRoot.hasAttribute(name)
        );

        missingNamespaceAttrs.forEach(({ name, value }) => {
            instanceRoot.setAttributeNS(XMLNS_URI, name, value);
        });
    });
};

import DOMPurify from 'dompurify';
import * as csstree from 'css-tree';

const ALLOWED_SVG_STYLE_PROPERTIES = new Set([
    'fill',
    'fill-opacity',
    'fill-rule',
    'stroke',
    'stroke-opacity',
    'stroke-width',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-miterlimit',
    'stroke-dasharray',
    'stroke-dashoffset',
    'opacity',
    'color',
    'font-family',
    'font-size',
    'font-style',
    'font-weight',
    'text-anchor',
    'letter-spacing',
    'word-spacing',
    'shape-rendering',
    'text-rendering',
    'image-rendering',
    'transform',
    'transform-origin',
]);

const ALLOWED_SVG_SELECTOR_TAGS = new Set([
    'a',
    'animate',
    'animatemotion',
    'animatetransform',
    'circle',
    'clippath',
    'defs',
    'desc',
    'ellipse',
    'feblend',
    'fecolormatrix',
    'fecomponenttransfer',
    'fecomposite',
    'feconvolvematrix',
    'fediffuselighting',
    'fedisplacementmap',
    'fedistantlight',
    'fedropshadow',
    'feflood',
    'fefunca',
    'fefuncb',
    'fefuncg',
    'fefuncr',
    'fegaussianblur',
    'feimage',
    'femerge',
    'femergenode',
    'femorphology',
    'feoffset',
    'fepointlight',
    'fespecularlighting',
    'fespotlight',
    'fetile',
    'feturbulence',
    'filter',
    'foreignobject',
    'g',
    'image',
    'line',
    'lineargradient',
    'marker',
    'mask',
    'metadata',
    'mpath',
    'path',
    'pattern',
    'polygon',
    'polyline',
    'radialgradient',
    'rect',
    'set',
    'stop',
    'svg',
    'switch',
    'symbol',
    'text',
    'textpath',
    'title',
    'tspan',
    'use',
    'view',
]);

const FORBIDDEN_SELECTOR_PSEUDO_CLASSES = new Set([
    'root',
    'host',
    'host-context',
    'global',
]);

const BLOCKED_STYLE_VALUE =
    /\b(url|var|expression)\s*\(|@import|javascript:|data:|vbscript:/i;

const SAFE_TRANSFORM_VALUE =
    /^(matrix|translate|scale|rotate|skewX|skewY)\([0-9eE+\-.,\s%deg]+\)(\s+(matrix|translate|scale|rotate|skewX|skewY)\([0-9eE+\-.,\s%deg]+\))*$/;

function normalizeCssEscapes(input) {
    if (!input) return input;

    return (
        input
            // Hex escapes like \72 or \000072 (optional trailing whitespace)
            .replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex) =>
                String.fromCodePoint(parseInt(hex, 16))
            )
            // Simple escapes like \u or \(
            .replace(/\\(.)/g, '$1')
            .toLowerCase()
    );
}

function hasBlockedCssValueNodes(valueAst) {
    let blocked = false;

    if (!valueAst) {
        return blocked;
    }

    csstree.walk(valueAst, (node) => {
        if (blocked) {
            return;
        }

        if (node.type === 'Url') {
            blocked = true;

            return;
        }

        if (node.type === 'Function') {
            const functionName = node.name.toLowerCase();

            if (
                functionName === 'url' ||
                functionName === 'var' ||
                functionName === 'expression'
            ) {
                blocked = true;
            }
        }
    });

    return blocked;
}

function sanitizeStyleProp(propName, value, valueAst) {
    const normalizedPropName = propName.trim().toLowerCase();
    const normalizedValue = value.trim();
    const normalizedBlockedCheckValue = normalizeCssEscapes(normalizedValue);

    if (!ALLOWED_SVG_STYLE_PROPERTIES.has(normalizedPropName)) {
        return null;
    }

    if (
        !normalizedValue ||
        BLOCKED_STYLE_VALUE.test(normalizedBlockedCheckValue) ||
        hasBlockedCssValueNodes(valueAst)
    ) {
        return null;
    }

    if (
        normalizedPropName === 'transform' &&
        !SAFE_TRANSFORM_VALUE.test(normalizedValue)
    ) {
        return null;
    }

    return {
        propName: normalizedPropName,
        value: normalizedValue,
    };
}

function normalizeTypeSelectorName(name) {
    const unprefixedName = name.includes('|') ? name.split('|').pop() : name;

    return unprefixedName.toLowerCase();
}

function isAllowedSvgSelector(prelude) {
    if (!prelude || prelude.type !== 'SelectorList' || !prelude.children) {
        return false;
    }

    let isAllowed = true;

    prelude.children.forEach((selector) => {
        if (!isAllowed || selector.type !== 'Selector') {
            isAllowed = false;

            return;
        }

        let selectorAllowed = true;

        csstree.walk(selector, (node) => {
            if (!selectorAllowed) {
                return;
            }

            if (node.type === 'TypeSelector') {
                const normalizedTypeName = normalizeTypeSelectorName(node.name);

                if (!ALLOWED_SVG_SELECTOR_TAGS.has(normalizedTypeName)) {
                    selectorAllowed = false;

                    return;
                }
            }

            if (node.type === 'UniversalSelector') {
                selectorAllowed = false;

                return;
            }

            if (node.type === 'PseudoClassSelector') {
                const pseudoClassName = node.name.toLowerCase();

                if (FORBIDDEN_SELECTOR_PSEUDO_CLASSES.has(pseudoClassName)) {
                    selectorAllowed = false;
                }
            }
        });

        if (!selectorAllowed) {
            isAllowed = false;
        }
    });

    return isAllowed;
}

function selectorHasTypeSelector(selector) {
    let hasTypeSelector = false;

    csstree.walk(selector, (node) => {
        if (node.type === 'TypeSelector') {
            hasTypeSelector = true;
        }
    });

    return hasTypeSelector;
}

function getSvgScopedSelector(prelude) {
    const scopedSelectors = [];

    prelude.children.forEach((selector) => {
        const selectorText = csstree.generate(selector).trim();

        if (!selectorText) {
            return;
        }

        if (selectorHasTypeSelector(selector)) {
            scopedSelectors.push(selectorText);
        } else {
            scopedSelectors.push(`svg ${selectorText}`);
        }
    });

    return scopedSelectors.join(',');
}

function stringifySanitizedStyleMap(output) {
    return Object.entries(output)
        .map(([propName, value]) => `${propName}:${value};`)
        .join('');
}

function sanitizeStyleDeclarations(declarationNodes) {
    const output = {};

    declarationNodes.forEach((declaration) => {
        if (
            declaration.type !== 'Declaration' ||
            !declaration.property ||
            !declaration.value
        ) {
            return;
        }

        // Fail closed when css-tree could not produce a structured value AST.
        if (declaration.value.type === 'Raw') {
            return;
        }

        const value = csstree.generate(declaration.value).trim();
        const sanitizedProp = sanitizeStyleProp(
            declaration.property,
            value,
            declaration.value
        );

        if (sanitizedProp) {
            output[sanitizedProp.propName] = sanitizedProp.value;
        }
    });

    return stringifySanitizedStyleMap(output);
}

function sanitizeInlineStyleText(styleText) {
    if (!styleText) {
        return '';
    }

    try {
        const declarationList = csstree.parse(styleText, {
            context: 'declarationList',
        });

        return sanitizeStyleDeclarations(declarationList.children);
    } catch {
        return '';
    }
}

// Parses and separates the text content of a <style> element
// into individual rules and declarations to sanitize them.
function sanitizeStyleElementText(node) {
    if (!node || !node.textContent) {
        return '';
    }

    const output = [];

    try {
        const stylesheet = csstree.parse(node.textContent, {
            context: 'stylesheet',
        });

        stylesheet.children.forEach((rule) => {
            // Keep selector rules only; drop @import, @font-face, @media and others.
            if (
                rule.type === 'Rule' &&
                rule.prelude &&
                rule.block &&
                rule.block.children &&
                isAllowedSvgSelector(rule.prelude)
            ) {
                const declarations = sanitizeStyleDeclarations(
                    rule.block.children
                );

                if (declarations) {
                    const selector = getSvgScopedSelector(rule.prelude);

                    if (selector) {
                        output.push(`${selector}{${declarations}}`);
                    }
                }
            }
        });
    } catch {
        return '';
    }

    return output.join('\n');
}

// Tags that are forbidden when DOMPurify sanitizes SVG content.
const DOMPURIFY_SVG_CONFIG = {
    USE_PROFILES: { svg: true, svgFilters: true },
    IN_PLACE: true,
    WHOLE_DOCUMENT: false,
    ADD_TAGS: ['text', 'tspan'],
    FORBID_TAGS: [
        'foreignObject',
        'iframe',
        'object',
        'embed',
        'link',
        'meta',
        'script',
    ],
};

/**
 * Sanitizes an SVG element using DOMPurify, removing potentially dangerous
 * elements and attributes (scripts, event handlers, javascript: URLs, etc.).
 * @param {SVGElement} svgElement - The SVG element to sanitize
 * @return {SVGElement|null|undefined} The sanitized SVG element
 */
function sanitizeSvg(svgElement) {
    if (!svgElement) {
        return svgElement;
    }

    // Strip <foreignObject> subtrees at the XML level before any HTML parsing
    // occurs. The onerror payload is dispatched during DOMPurify's internal
    // HTML parse step.
    // Doing this pre-strip here ensures dangerous HTML descendants from
    // foreignObject never reach that parse step.
    // This should not happen since we're using an inert document, but we are keeping
    // this as a safeguard to avoid any potential code execution from foreingObject descendants.
    Array.from(
        svgElement.getElementsByTagNameNS(
            'http://www.w3.org/2000/svg',
            'foreignObject'
        )
    ).forEach((el) => el.remove());

    // Use an inert document to prevent any potential code execution on live document during the sanitization process.
    const inertDoc = document.implementation.createHTMLDocument('');
    const sanitizedSvg = inertDoc.importNode(svgElement, true);

    // Hooks to sanitize style elements and style attributes.
    // Implementation reference:
    // https://github.com/cure53/DOMPurify/blob/main/demos/hooks-sanitize-css-demo.html
    DOMPurify.addHook('uponSanitizeElement', (node, data) => {
        if (data.tagName === 'style') {
            node.textContent = sanitizeStyleElementText(node);
        }
    });

    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
        if (node.hasAttribute && node.hasAttribute('style')) {
            const sanitizedStyle = sanitizeInlineStyleText(
                node.getAttribute('style')
            );

            if (sanitizedStyle) {
                node.setAttribute('style', sanitizedStyle);
            } else {
                node.removeAttribute('style');
            }
        }
    });

    try {
        DOMPurify.sanitize(sanitizedSvg, DOMPURIFY_SVG_CONFIG);
    } finally {
        DOMPurify.removeHook('uponSanitizeElement');
        DOMPurify.removeHook('afterSanitizeAttributes');
    }

    return sanitizedSvg;
}

export { sanitizeSvg };

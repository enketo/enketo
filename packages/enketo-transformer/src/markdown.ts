/**
 * @package
 *
 * Transforms XForm label and hint textnode content with a subset of Markdown into HTML
 *
 * Supported:
 * - `_`, `__`, `*`, `**`, `[]()`, `#`, `##`, `###`, `####`, `#####`,
 * - span tags and html-encoded span tags,
 * - single-level unordered markdown lists and single-level ordered markdown lists
 * - newline characters
 *
 * Also HTML encodes any unsupported HTML tags for safe use inside web-based clients
 */
export const markdownToHTML = (text: string): string => {
    // note: in JS $ matches end of line as well as end of string, and ^ both beginning of line and string
    const html = text
        // html encoding of < because libXMLJs Element.text() converts html entities
        .replace(/</gm, '&lt;')
        // html encoding of < because libXMLJs Element.text() converts html entities
        .replace(/>/gm, '&gt;')
        // span
        .replace(
            /&lt;\s?span([^/\n]*)&gt;((?:(?!&lt;\/).)+)&lt;\/\s?span\s?&gt;/gm,
            createSpan
        )
        // sup
        .replace(
            /&lt;\s?sup(?:[^/\n]*)&gt;((?:(?!&lt;\/).)+)&lt;\/\s?sup\s?&gt;/gm,
            createSup
        )
        // sub
        .replace(
            /&lt;\s?sub(?:[^/\n]*)&gt;((?:(?!&lt;\/).)+)&lt;\/\s?sub\s?&gt;/gm,
            createSub
        )
        // "\" will be used as escape character for *, _
        .replace(/&/gm, '&amp;')
        .replace(/\\\\/gm, '&92;')
        .replace(/\\\*/gm, '&42;')
        .replace(/\\_/gm, '&95;')
        .replace(/\\#/gm, '&35;')
        // strong
        .replace(/__(.*?)__/gm, '<strong>$1</strong>')
        .replace(/\*\*(.*?)\*\*/gm, '<strong>$1</strong>')
        // emphasis
        .replace(/_([^\s][^_\n]*)_/gm, '<em>$1</em>')
        .replace(/\*([^\s][^*\n]*)\*/gm, '<em>$1</em>')
        // links
        .replace(/\[([^\]]*)\]\(([^)]+)\)/gm, createAnchor)
        // headers
        .replace(/^\s*(#{1,6})\s?([^#][^\n]*)(\n|$)/gm, createHeader)
        // unordered lists
        .replace(/^((\*|\+|-) (.*)(\n|$))+/gm, createUnorderedList)
        // ordered lists, which have to be preceded by a newline since numbered labels are common
        .replace(/(\n([0-9]+\.) (.*))+$/gm, createOrderedList)
        // newline characters followed by <ul> tag
        .replace(/\n(<ul>)/gm, '$1')
        // reverting escape of special characters
        .replace(/&35;/gm, '#')
        .replace(/&95;/gm, '_')
        .replace(/&92;/gm, '\\')
        .replace(/&42;/gm, '*')
        .replace(/&amp;/gm, '&')
        // paragraphs
        .replace(/([^\n]+)\n{2,}/gm, createParagraph)
        // any remaining newline characters
        .replace(/([^\n]+)\n/gm, '$1<br>');

    return html;
};

type Matches = [string, ...string[]];

type Replacer<M extends Matches> = (...args: M) => string;

/* eslint-disable -- the default formatting of this was unreadable */
const ignoreMatch = <M extends Matches>(fn: Replacer<M>) => {
    return (_match: string, ...args: M) => fn(...args);
};
/* eslint-enable */

const createAnchor = ignoreMatch((label: string, href: string) => {
    return `<a href="${encodeURI(href)}" rel="noopener" target="_blank">${label}</a>`;
});

/**
 * @param hashtags - Before header text. `#` gives `<h1>`, `####` gives `<h4>`.
 * @param content - Header text.
 */
const createHeader = ignoreMatch((hashtags: string, content: string) => {
    const level = hashtags.length;

    return `<h${level}>${content.replace(/#+$/, '')}</h${level}>`;
});

const createUnorderedList = (match: string) => {
    const items = match.replace(/(?:\*|\+|-)(.*)\n?/gm, createItem);

    return `<ul>${items}</ul>`;
};

const createOrderedList = (match: string) => {
    const startMatches = match.match(/^\n?(?<start>[0-9]+)\./);
    const start =
        startMatches && startMatches.groups && startMatches.groups.start !== '1'
            ? ` start="${startMatches.groups.start}"`
            : '';
    const items = match.replace(/\n?(?:[0-9]+\.)(.*)/gm, createItem);

    return `<ol${start}>${items}</ol>`;
};

const createItem = ignoreMatch(
    (content: string) => `<li>${content.trim()}</li>`
);

const createParagraph = ignoreMatch((line: string) => {
    const trimmed = line.trim();
    if (/^<\/?(ul|ol|li|h|p|bl)/i.test(trimmed)) {
        return line;
    }

    return `<p>${trimmed}</p>`;
});

const createSpan = ignoreMatch((attributes: string, content: string) => {
    const sanitizedAttributes = sanitizeAttributes(attributes);

    return `<span${sanitizedAttributes}>${content}</span>`;
});

const createSup = ignoreMatch((content: string) => `<sup>${content}</sup>`);

const createSub = ignoreMatch((content: string) => `<sub>${content}</sub>`);

const sanitizeAttributes = (attributes: string) => {
    const styleMatches = attributes.match(/( style=(["'])[^"']*\2)/);
    const style = styleMatches && styleMatches.length ? styleMatches[0] : '';

    return style;
};

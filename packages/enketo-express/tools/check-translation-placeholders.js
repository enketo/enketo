/* eslint no-console: 0 */
/**
 * @module check-translation-placeholders
 */

/**
 * Checks that every translation uses the same i18next placeholders (`__name__`)
 * as the English source.
 *
 * Translations pulled from Transifex sometimes drop a placeholder, translate its
 * name (`__recurso__`) or break its delimiters (`_emailLink_`). i18next then shows
 * an empty value or the literal text. This tool blanks those strings so they fall
 * back to English (`returnEmptyString: false`), and lists them so they can be fixed
 * in Transifex.
 *
 * Usage: node tools/check-translation-placeholders.js [--report <markdown file>]
 *
 * It rewrites the affected `locales/src/<lang>/translation.json` files in place and
 * always exits with 0: a mismatch is reported, not treated as a failure.
 */
const fs = require('fs');
const path = require('path');

const SOURCE_LANGUAGE = 'en';
// The same pattern i18next uses with Enketo's `__` prefix and suffix
const PLACEHOLDER = /__(.+?)__/g;
// Left after removing the valid placeholders: one written with single
// underscores (`_emailLink_`) or with an unclosed `__` (`__value'`)
const BROKEN_PLACEHOLDER = /(?<![_\w])_[^_\s]+_(?![_\w])|__/;
// Keeps the report well under GitHub's 65536 character limit for PR bodies
const MAX_REPORT_ROWS = 150;
const MAX_CELL_LENGTH = 100;

// Report sections, from the most to the least visible problem
const PROBLEMS = {
    broken: {
        title: 'Broken placeholders',
        description:
            'A placeholder is written with single underscores (e.g. `_emailLink_`) or is never closed, so users would see it as literal text.',
    },
    wrong: {
        title: 'Wrong placeholders',
        description:
            "The translation uses a placeholder the English text doesn't have, usually a translated name (e.g. `__recurso__` for `__resource__`), so users would see an empty value.",
    },
    missing: {
        title: 'Missing placeholders',
        description:
            "The translation leaves a placeholder out, so users wouldn't see that value (e.g. the support email or the error code).",
    },
};

/**
 * @param {string|string[]} value - a translation (arrays are joined by i18next)
 * @return {string[]} the sorted, distinct placeholder names in the value
 */
function getPlaceholders(value) {
    const text = Array.isArray(value) ? value.join('\n') : String(value);
    // i18next trims the names, so `__ code __` works like `__code__`
    const names = [...text.matchAll(PLACEHOLDER)]
        .map((match) => match[1].trim())
        .filter(Boolean);

    return [...new Set(names)].sort();
}

/**
 * @param {string|string[]} value - a translation
 * @return {boolean} whether the translation is empty
 */
function isEmpty(value) {
    return Array.isArray(value)
        ? value.every((item) => !String(item).trim())
        : !String(value).trim();
}

/**
 * @typedef {object} Mismatch
 * @property {string} key - the dotted translation key
 * @property {string|string[]} source - the English text
 * @property {string|string[]} translation - the rejected translation
 * @property {string[]} missing - placeholders the translation leaves out
 * @property {string[]} unexpected - placeholders that aren't in the English text
 * @property {'broken'|'wrong'|'missing'} problem - the report section it goes in
 */

/**
 * @param {string|string[]} value - the rejected translation
 * @param {string[]} unexpected - placeholders that aren't in the English text
 * @return {'broken'|'wrong'|'missing'} what users would see wrong
 */
function getProblem(value, unexpected) {
    const text = Array.isArray(value) ? value.join('\n') : String(value);

    if (BROKEN_PLACEHOLDER.test(text.replace(PLACEHOLDER, ''))) {
        return 'broken';
    }

    return unexpected.length ? 'wrong' : 'missing';
}

/**
 * Blanks the translations whose placeholders differ from the source.
 *
 * @param {object} source - the English translation object
 * @param {object} translation - a translation object, modified in place
 * @param {string} [prefix] - the dotted key of the objects
 * @return {Mismatch[]} the blanked translations
 */
function blankMismatchedTranslations(source, translation, prefix = '') {
    const mismatches = [];

    Object.entries(translation).forEach(([name, value]) => {
        const key = prefix ? `${prefix}.${name}` : name;
        const sourceValue =
            source && typeof source === 'object' && !Array.isArray(source)
                ? source[name]
                : undefined;

        if (value && typeof value === 'object' && !Array.isArray(value)) {
            mismatches.push(
                ...blankMismatchedTranslations(sourceValue, value, key)
            );

            return;
        }

        // Keys that aren't in the source aren't used, so there is nothing to compare
        if (
            sourceValue == null ||
            (typeof sourceValue === 'object' && !Array.isArray(sourceValue)) ||
            isEmpty(value)
        ) {
            return;
        }

        const expected = getPlaceholders(sourceValue);
        const actual = getPlaceholders(value);
        const missing = expected.filter((item) => !actual.includes(item));
        const unexpected = actual.filter((item) => !expected.includes(item));

        if (missing.length || unexpected.length) {
            mismatches.push({
                key,
                source: sourceValue,
                translation: value,
                missing,
                unexpected,
                problem: getProblem(value, unexpected),
            });
            translation[name] = '';
        }
    });

    return mismatches;
}

/**
 * @param {string|string[]} value - a translation
 * @return {string} the value as a code span in a markdown table cell, so that
 * `__name__` isn't rendered as bold text
 */
function toCell(value) {
    let text = (Array.isArray(value) ? value.join(' ') : String(value))
        .replace(/`/g, "'")
        .replace(/\s+/g, ' ')
        .trim();

    if (text.length > MAX_CELL_LENGTH) {
        text = `${text.slice(0, MAX_CELL_LENGTH)}…`;
    }

    return `\`${text.replace(/\|/g, '\\|')}\``;
}

/**
 * @param {Object<string, Mismatch[]>} mismatchesByLanguage - mismatches per language
 * @return {string} a markdown report, empty when there are no mismatches
 */
function formatReport(mismatchesByLanguage) {
    const languages = Object.keys(mismatchesByLanguage).filter(
        (language) => mismatchesByLanguage[language].length
    );

    if (!languages.length) {
        return '';
    }

    const mismatches = languages.flatMap((language) =>
        mismatchesByLanguage[language].map((mismatch) => ({
            language,
            ...mismatch,
        }))
    );
    const placeholders = (names) =>
        names.map((name) => toCell(`__${name}__`)).join(', ');
    const lines = [
        `### Translations left out (${mismatches.length})`,
        '',
        "These translations don't use the same placeholders as the English text, so they were blanked and English is shown instead. Please fix them in Transifex, or they'll be left out again on the next pull.",
        '',
    ];
    let rowsLeft = MAX_REPORT_ROWS;

    Object.entries(PROBLEMS).forEach(([problem, { title, description }]) => {
        const rows = mismatches.filter((item) => item.problem === problem);

        if (!rows.length) {
            return;
        }

        lines.push(
            `#### ${title} (${rows.length})`,
            '',
            description,
            '',
            '| Language | Key | Expected | Found | English | Translation |',
            '| --- | --- | --- | --- | --- | --- |'
        );
        rows.slice(0, Math.max(rowsLeft, 0)).forEach((item) => {
            const expected = getPlaceholders(item.source);
            const found = getPlaceholders(item.translation);

            lines.push(
                `| ${item.language} | \`${item.key}\` | ${
                    placeholders(expected) || '-'
                } | ${placeholders(found) || '-'} | ${toCell(
                    item.source
                )} | ${toCell(item.translation)} |`
            );
        });
        rowsLeft -= rows.length;
        lines.push('');
    });

    if (rowsLeft < 0) {
        lines.push(
            `${-rowsLeft} more are listed in the log of the workflow run.`,
            ''
        );
    }

    return lines.join('\n');
}

/**
 * Checks and fixes every translation file in a locales directory.
 *
 * @param {string} localesDir - the directory with one folder per language
 * @return {Object<string, Mismatch[]>} the blanked translations per language
 */
function checkLocales(localesDir) {
    const localePath = (language) =>
        path.join(localesDir, language, 'translation.json');
    const source = JSON.parse(
        fs.readFileSync(localePath(SOURCE_LANGUAGE), 'utf8')
    );
    const mismatchesByLanguage = {};

    fs.readdirSync(localesDir)
        .filter(
            (language) =>
                language !== SOURCE_LANGUAGE &&
                fs.existsSync(localePath(language))
        )
        .sort()
        .forEach((language) => {
            const text = fs.readFileSync(localePath(language), 'utf8');
            const translation = JSON.parse(text);
            const mismatches = blankMismatchedTranslations(source, translation);

            if (mismatches.length) {
                // Keep Transifex's formatting so the diff only shows the blanked strings
                const newline = text.endsWith('\n') ? '\n' : '';

                fs.writeFileSync(
                    localePath(language),
                    `${JSON.stringify(translation, null, 4)}${newline}`
                );
                mismatchesByLanguage[language] = mismatches;
            }
        });

    return mismatchesByLanguage;
}

if (require.main === module) {
    const reportIndex = process.argv.indexOf('--report');
    const reportFile =
        reportIndex === -1 ? null : process.argv[reportIndex + 1];

    // Fail before touching the locales, rather than after
    if (reportIndex !== -1 && !reportFile) {
        console.error(
            'Usage: check-translation-placeholders.js [--report <file>]'
        );
        process.exit(1);
    }

    const mismatchesByLanguage = checkLocales(
        path.resolve(__dirname, '../locales/src')
    );
    const report = formatReport(mismatchesByLanguage);

    if (reportFile) {
        fs.writeFileSync(reportFile, report);
    }

    if (report) {
        // The full list, in case the report was cut short
        Object.entries(mismatchesByLanguage).forEach(([language, mismatches]) =>
            mismatches.forEach(({ key, missing, unexpected, problem }) =>
                console.log(
                    `${problem} ${language} ${key}: missing [${missing}] unexpected [${unexpected}]`
                )
            )
        );
    } else {
        console.log('All translation placeholders match the English source.');
    }
}

module.exports = {
    getPlaceholders,
    blankMismatchedTranslations,
    formatReport,
    checkLocales,
};

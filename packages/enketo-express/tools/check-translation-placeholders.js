/* eslint no-console: 0 */
/**
 * @module check-translation-placeholders
 */

/**
 * Checks that every translation uses the same i18next placeholders (`__name__`)
 * as the English source, and reports the ones that don't.
 *
 * Translations pulled from Transifex sometimes break a placeholder's delimiters
 * (`_emailLink_`), translate its name (`__recurso__`) or leave it out. i18next then
 * shows the literal text, an empty value or no value. The report explains how to fix
 * them and send the fixes back to Transifex.
 *
 * Usage: node tools/check-translation-placeholders.js [--report <markdown file>]
 *
 * It doesn't change any file, and placeholder problems don't make it fail.
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
const MAX_REPORT_LENGTH = 55000;
const MAX_CELL_LENGTH = 100;

// Report sections, from the most to the least visible problem
const PROBLEMS = {
    broken: {
        title: 'Broken placeholders',
        description:
            'a placeholder is written with single underscores (e.g. `_emailLink_`) or is never closed, so users see it as literal text',
    },
    wrong: {
        title: 'Wrong placeholders',
        description:
            "the translation uses a placeholder the English text doesn't have, usually a translated name (e.g. `__recurso__` for `__resource__`), so users see an empty value",
    },
    missing: {
        title: 'Missing placeholders',
        description:
            "the translation leaves a placeholder out, so users don't see that value (e.g. the support email or the error code)",
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
 * @property {string|string[]} translation - the translation
 * @property {string[]} missing - placeholders the translation leaves out
 * @property {string[]} unexpected - placeholders that aren't in the English text
 * @property {'broken'|'wrong'|'missing'} problem - the report section it goes in
 */

/**
 * @param {string|string[]} value - the translation
 * @param {string[]} unexpected - placeholders that aren't in the English text
 * @return {'broken'|'wrong'|'missing'} what users see wrong
 */
function getProblem(value, unexpected) {
    const text = Array.isArray(value) ? value.join('\n') : String(value);

    if (BROKEN_PLACEHOLDER.test(text.replace(PLACEHOLDER, ''))) {
        return 'broken';
    }

    return unexpected.length ? 'wrong' : 'missing';
}

/**
 * Finds the translations whose placeholders differ from the source.
 *
 * @param {object} source - the English translation object
 * @param {object} translation - a translation object
 * @param {string} [prefix] - the dotted key of the objects
 * @return {Mismatch[]} the mismatched translations
 */
function findMismatches(source, translation, prefix = '') {
    const mismatches = [];

    Object.entries(translation).forEach(([name, value]) => {
        const key = prefix ? `${prefix}.${name}` : name;
        const sourceValue =
            source && typeof source === 'object' && !Array.isArray(source)
                ? source[name]
                : undefined;

        if (value && typeof value === 'object' && !Array.isArray(value)) {
            mismatches.push(...findMismatches(sourceValue, value, key));

            return;
        }

        // Keys that aren't in the source aren't used, and empty ones fall back to English
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
 * @param {Object<string, string>} [unreadable] - the error per language whose file
 * couldn't be read
 * @return {string} a markdown report, empty when there is nothing to report
 */
function formatReport(mismatchesByLanguage, unreadable = {}) {
    const mismatches = Object.entries(mismatchesByLanguage).flatMap(
        ([language, items]) => items.map((item) => ({ language, ...item }))
    );
    const lines = Object.entries(unreadable).length
        ? [
              '### ⚠️ Some translation files could not be read',
              '',
              ...Object.entries(unreadable).map(
                  ([language, error]) => `- **${language}**: ${toCell(error)}`
              ),
              '',
          ]
        : [];

    if (!mismatches.length) {
        return lines.join('\n');
    }

    const count = (problem) =>
        mismatches.filter((item) => item.problem === problem).length;
    const placeholders = (names) =>
        names.map((name) => toCell(`__${name}__`)).join(', ') || '-';

    lines.push(
        `### ⚠️ ${mismatches.length} translations have placeholder problems`,
        '',
        "They don't use the same placeholders (`__name__`) as the English text:",
        '',
        ...Object.entries(PROBLEMS)
            .filter(([problem]) => count(problem))
            .map(
                ([problem, { description }]) =>
                    `- **${count(problem)} ${problem}**: ${description}.`
            ),
        '',
        '**To fix them:**',
        '',
        '1. In this PR, edit `packages/enketo-express/locales/src/<language>/translation.json` and give each string below the placeholders in the "Expected" column.',
        '2. Merge this PR before the next weekly pull, which rebuilds this branch and drops the fixes.',
        '3. Run the "Transifex - push ALL translations" workflow, so Transifex gets the fixes and the next pull doesn\'t bring the broken strings back.',
        ''
    );

    let shown = 0;
    let reportLength = lines.join('\n').length;

    Object.entries(PROBLEMS).forEach(([problem, { title }]) => {
        const rows = mismatches
            .filter((item) => item.problem === problem)
            .map(
                (item) =>
                    `| ${item.language} | \`${item.key}\` | ${placeholders(
                        getPlaceholders(item.source)
                    )} | ${placeholders(
                        getPlaceholders(item.translation)
                    )} | ${toCell(item.source)} | ${toCell(item.translation)} |`
            );
        const section = [
            `#### ${title} (${rows.length})`,
            '',
            '| Language | Key | Expected | Found | English | Translation |',
            '| --- | --- | --- | --- | --- | --- |',
        ];

        rows.forEach((row) => {
            if (
                shown < MAX_REPORT_ROWS &&
                reportLength + row.length + 1 < MAX_REPORT_LENGTH
            ) {
                // The section's heading, counted with its first row
                if (section.length === 4) {
                    reportLength += section.join('\n').length + 1;
                }
                section.push(row);
                shown += 1;
                reportLength += row.length + 1;
            }
        });

        if (section.length > 4) {
            lines.push(...section, '');
        }
    });

    if (shown < mismatches.length) {
        lines.push(
            `${
                mismatches.length - shown
            } more are listed in the log of the workflow run.`,
            ''
        );
    }

    return lines.join('\n');
}

/**
 * Checks every translation file in a locales directory.
 *
 * @param {string} localesDir - the directory with one folder per language
 * @return {{mismatchesByLanguage: Object<string, Mismatch[]>, unreadable: Object<string, string>}}
 * the mismatched translations per language, and the error per file that couldn't be read
 */
function checkLocales(localesDir) {
    const readLocale = (language) =>
        JSON.parse(
            fs.readFileSync(
                path.join(localesDir, language, 'translation.json'),
                'utf8'
            )
        );
    const source = readLocale(SOURCE_LANGUAGE);
    const mismatchesByLanguage = {};
    const unreadable = {};

    fs.readdirSync(localesDir)
        .filter(
            (language) =>
                language !== SOURCE_LANGUAGE &&
                fs.existsSync(
                    path.join(localesDir, language, 'translation.json')
                )
        )
        .sort()
        .forEach((language) => {
            let translation;

            // A malformed file shouldn't stop the pull PR from being opened
            try {
                translation = readLocale(language);
            } catch (error) {
                unreadable[language] = error.message;

                return;
            }

            const mismatches = findMismatches(source, translation);

            if (mismatches.length) {
                mismatchesByLanguage[language] = mismatches;
            }
        });

    return { mismatchesByLanguage, unreadable };
}

if (require.main === module) {
    const reportIndex = process.argv.indexOf('--report');
    const reportFile =
        reportIndex === -1 ? null : process.argv[reportIndex + 1];

    if (reportIndex !== -1 && !reportFile) {
        console.error(
            'Usage: check-translation-placeholders.js [--report <file>]'
        );
        process.exit(1);
    }

    const { mismatchesByLanguage, unreadable } = checkLocales(
        path.resolve(__dirname, '../locales/src')
    );
    const report = formatReport(mismatchesByLanguage, unreadable);

    Object.entries(unreadable).forEach(([language, error]) =>
        console.error(`Could not read ${language}: ${error}`)
    );

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
    isEmpty,
    toCell,
    findMismatches,
    formatReport,
    checkLocales,
};

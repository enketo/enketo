/* eslint no-console: 0 */
/**
 * @module compare-translations
 */

/**
 * Lists the translations in main that differ from the ones in Transifex, i.e. what pushing
 * the translations would change there. Empty strings are left out, as Transifex ignores them.
 *
 * Usage: node tools/compare-translations.js <main locales dir> <Transifex locales dir>
 *            --report <markdown file> --languages <file>
 *
 * The languages file gets the comma-separated languages that have changes.
 */
const fs = require('fs');
const path = require('path');
const { isEmpty, toCell } = require('./check-translation-placeholders');

const SOURCE_LANGUAGE = 'en';
const LANGUAGE_CODE = /^[A-Za-z]{2,3}([_-][A-Za-z0-9]+)*$/;
// Keeps the run summary readable
const MAX_REPORT_ROWS = 300;

/**
 * @param {object} translation - a translation object
 * @param {string} [prefix] - the dotted key of the object
 * @return {Object<string, string|string[]>} the translations by dotted key
 */
function flatten(translation, prefix = '') {
    return Object.entries(translation).reduce((flat, [name, value]) => {
        const key = prefix ? `${prefix}.${name}` : name;

        return value && typeof value === 'object' && !Array.isArray(value)
            ? { ...flat, ...flatten(value, key) }
            : { ...flat, [key]: value };
    }, {});
}

/**
 * @param {string} dir - a locales directory
 * @param {string} language - a language code
 * @return {Object<string, string|string[]>} its translations by dotted key, or none
 */
function readLocale(dir, language) {
    const file = path.join(dir, language, 'translation.json');

    return fs.existsSync(file)
        ? flatten(JSON.parse(fs.readFileSync(file, 'utf8')))
        : {};
}

/**
 * @typedef {object} Change
 * @property {string} key - the dotted translation key
 * @property {string|string[]|undefined} from - the translation in Transifex
 * @property {string|string[]} to - the translation in main
 */

/**
 * @param {string} mainDir - the locales directory of main
 * @param {string} transifexDir - the locales directory pulled from Transifex
 * @return {Object<string, Change[]>} the changes per language
 */
function compareLocales(mainDir, transifexDir) {
    const sourceKeys = Object.keys(readLocale(mainDir, SOURCE_LANGUAGE));
    const changesByLanguage = {};

    fs.readdirSync(mainDir)
        .filter(
            (language) =>
                language !== SOURCE_LANGUAGE && LANGUAGE_CODE.test(language)
        )
        .sort()
        .forEach((language) => {
            const main = readLocale(mainDir, language);
            const transifex = readLocale(transifexDir, language);
            // Only the source's keys exist in Transifex
            const changes = sourceKeys
                .filter(
                    (key) =>
                        main[key] != null &&
                        !isEmpty(main[key]) &&
                        JSON.stringify(main[key]) !==
                            JSON.stringify(transifex[key])
                )
                .map((key) => ({ key, from: transifex[key], to: main[key] }));

            if (changes.length) {
                changesByLanguage[language] = changes;
            }
        });

    return changesByLanguage;
}

/**
 * @param {Object<string, Change[]>} changesByLanguage - the changes per language
 * @return {string} a markdown list of the changes
 */
function formatReport(changesByLanguage) {
    const changes = Object.entries(changesByLanguage).flatMap(
        ([language, items]) => items.map((item) => ({ language, ...item }))
    );

    if (!changes.length) {
        return 'No differences: the translations in `main` match the ones in Transifex.\n';
    }

    const languages = Object.keys(changesByLanguage);
    const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
    const lines = [
        `${plural(changes.length, 'string')} in ${plural(
            languages.length,
            'language'
        )} differ from Transifex (${languages.join(', ')}):`,
        '',
        '| Language | Key | Transifex | main |',
        '| --- | --- | --- | --- |',
        ...changes
            .slice(0, MAX_REPORT_ROWS)
            .map(
                ({ language, key, from, to }) =>
                    `| ${language} | \`${key}\` | ${
                        from == null || isEmpty(from)
                            ? '_untranslated_'
                            : toCell(from)
                    } | ${toCell(to)} |`
            ),
        '',
    ];

    if (changes.length > MAX_REPORT_ROWS) {
        lines.push(
            `${
                changes.length - MAX_REPORT_ROWS
            } more are listed in the log of the workflow run.`,
            ''
        );
    }

    return lines.join('\n');
}

if (require.main === module) {
    const [mainDir, transifexDir] = process.argv.slice(2);
    const option = (name) => {
        const index = process.argv.indexOf(name);

        return index === -1 ? null : process.argv[index + 1];
    };
    const reportFile = option('--report');
    const languagesFile = option('--languages');

    if (!mainDir || !transifexDir || !reportFile || !languagesFile) {
        console.error(
            'Usage: compare-translations.js <main locales dir> <Transifex locales dir> --report <file> --languages <file>'
        );
        process.exit(1);
    }

    const changesByLanguage = compareLocales(mainDir, transifexDir);

    fs.writeFileSync(reportFile, formatReport(changesByLanguage));
    fs.writeFileSync(languagesFile, Object.keys(changesByLanguage).join(','));

    Object.entries(changesByLanguage).forEach(([language, changes]) =>
        changes.forEach(({ key }) => console.log(`${language} ${key}`))
    );
}

module.exports = { compareLocales, formatReport };

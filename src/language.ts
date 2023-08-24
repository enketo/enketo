import tags from 'language-tags';
import stringDirection from 'string-direction';

import type { Tag, Subtag } from 'language-tags';

/** @package */
export class Language {
    constructor(
        readonly sourceLanguage: string,
        readonly description: string,
        readonly tag: string,
        readonly directionality: string
    ) {}
}

/**
 * @package
 *
 * Parses a language string into a {@link Language}. Guesses missing properties.
 * TODO: this should be refactored (more than it has been since this comment was
 * initially written).
 *
 * @see
 * {http://www.iana.org/assignments/language-subtag-registry/language-subtag-registry}
 */
export const parseLanguage = (
    sourceLanguage: string,
    sample: string
): Language => {
    const directionality = getDirectionality(sample);

    let description = sourceLanguage.trim();
    let tag = description;

    const parts = sourceLanguage.match(/^([^(]+)\((.*)\)\s*$/);

    if (parts && parts.length >= 2) {
        return new Language(
            sourceLanguage,
            parts[1].trim(),
            parts[2].trim(),
            directionality
        );
    }
    // First check whether `sourceLanguage` is a known IANA subtag like 'en' or 'en-GB'
    const languageFromTag = getLanguageFromSubtag(sourceLanguage.split('-')[0]);

    if (languageFromTag == null) {
        const language = getLanguageFromDescription(description);

        if (typeof language === 'object' && language.data.subtag != null) {
            tag = language.data.subtag;
        }
    } else {
        description = languageFromTag.descriptions()[0];
    }

    return new Language(sourceLanguage, description, tag, directionality);
};

/**
 * Performs IANA search to find language object with provided description.
 */
const getLanguageFromDescription = (description: string) =>
    description.trim() === ''
        ? ''
        : tags.search(description).find(isLanguage) ?? '';

/**
 * Performs IANA search to find language object with provided subtag.
 */
const getLanguageFromSubtag = (subtag: string) =>
    subtag.trim() === '' ? null : tags.subtags(subtag).find(isLanguage) ?? null;

const isLanguage = (object: Tag | Subtag) => object.data.type === 'language';

enum Directionality {
    /**
     * @default (?)
     * @see {@link getDirectionality}
     */
    LTR = 'ltr',
    RTL = 'rtl',
}

/**
 * Obtains the directionality of a text sample.
 *
 * TODO: According to the prior JSDoc, the default is supposed to be
 * {@link Directionality.LTR}, but the logic suggests the opposite.
 */
const getDirectionality = (sample: string) => {
    const direction = stringDirection.getDirection(sample);

    if (direction !== Directionality.LTR) {
        return Directionality.RTL;
    }

    return direction;
};

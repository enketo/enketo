const TEMPORARY_HOST = 'http://example.com';

/**
 * @package
 *
 * @param value - a fully qualified URL, or a relative path
 */
export const escapeURLPath = (value: string): string => {
    const [scheme] = value.match(/^[a-z]+:/) ?? [];
    const isFullyQualified = scheme != null;

    /**
     * Browser implementations of `URL` do not escape URLs with unknown schemes
     * like `jr:, nor do they escape known URLs without a domain like `file:`.
     * To work around this limitation, we use a temporary HTTP host to escape
     * `jr:` URL paths.
     */
    const urlString = isFullyQualified
        ? value.replace(/^jr:\/*/, 'http://')
        : `${TEMPORARY_HOST}/${value.replace(/^\//, '')}`;

    const url = new URL(urlString);

    if (isFullyQualified) {
        return url.href.replace('http:', scheme);
    }

    const { pathname, search } = url;
    const path = value.startsWith('/') ? pathname : pathname.replace(/^\//, '');

    return `${path}${search}`;
};

/** @package */
export const getMediaPath = (
    mediaMap: Record<string, string>,
    mediaURL: string
) => {
    const mediaPath = mediaURL.match(/jr:\/\/[\w-]+\/(.+)/);

    if (mediaPath == null) {
        return escapeURLPath(mediaURL);
    }

    const path = escapeURLPath(mediaPath[1]);
    const value = mediaMap[path];

    return value || escapeURLPath(mediaURL);
};

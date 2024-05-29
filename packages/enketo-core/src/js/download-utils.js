/**
 * Update a HTML anchor to serve as a download or reset it if an empty objectUrl is provided.
 *
 * @static
 * @param {HTMLElement} anchor - The anchor element
 * @param {string} objectUrl - The objectUrl to download
 * @param {string} fileName - The filename of the file
 */
function updateDownloadLink(anchor, objectUrl, fileName) {
    anchor.setAttribute('href', objectUrl || '');
    anchor.setAttribute('download', fileName || '');
    anchor.setAttribute(
        'title',
        'Right click and select "Save link as..." to download'
    );
}

// Export as default to facilitate overriding this function.
export default {
    updateDownloadLink,
};

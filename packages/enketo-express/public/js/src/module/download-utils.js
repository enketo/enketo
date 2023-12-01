import downloadUtils from 'enketo-core/src/js/download-utils';

const originalUpdateDownloadLink = downloadUtils.updateDownloadLink;

downloadUtils.updateDownloadLink = (anchor, ...args) => {
    originalUpdateDownloadLink(anchor, ...args);
    anchor.setAttribute(
        'title',
        'Right click and select "Save link as..." to download'
    );
};

const path = require('path');

const getSubmissionUrlAPI1 = (server, type) => {
    const lastPathPart = type === 'field' || !type ? '' : `/${type}`;

    return server.lastIndexOf('/') === server.length - 1
        ? `${server}fieldsubmission${lastPathPart}`
        : `${server}/fieldsubmission${lastPathPart}`;
};

const getSubmissionUrlAPI2 = (server, pth) => {
    const baseUrl = new URL(server);
    const basePath = baseUrl.pathname;
    pth = path.join(
        basePath,
        pth.replace(
            /^(\/fieldsubmission)(\/[A-z0-9]+)(\/ecid\/.+)$/,
            (match, p1, p2, p3) => `${p1}${p3}`
        )
    );

    return new URL(pth, baseUrl.origin).href;
};

module.exports = {
    getSubmissionUrlAPI1,
    getSubmissionUrlAPI2,
};

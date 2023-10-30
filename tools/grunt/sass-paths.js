const fs = require('fs');
const path = require('path');

const MONOREPO_ROOT_PATH = path.resolve(__dirname, '../..');

const sassFilePrefixes = ['', '_'];
const resolvableSassExtensions = ['.scss', '.sass', '.css'];

/**
 * Resolves any Sass imports from dependencies, referenced by an "absolute" path,
 * where "absolute" is actually relative to the monorepo root. This simplifies
 * and stabilizes those imports, and preserves navigation in supporting editors.
 *
 * @param {string} imported
 */
const resolveSassPackageImport = (imported) => {
    if (!imported.startsWith('/')) {
        return null;
    }

    const packageRelativePath = imported.replace('/', './');
    const absolutePath = path.resolve(MONOREPO_ROOT_PATH, packageRelativePath);
    const extension = path.extname(absolutePath);

    if (extension !== '') {
        return {
            file: absolutePath,
        };
    }

    const dirName = path.dirname(absolutePath);
    const fileName = path.basename(absolutePath);

    const sassPaths = sassFilePrefixes.flatMap((prefix) =>
        resolvableSassExtensions.map((suffix) =>
            path.resolve(dirName, `${prefix}${fileName}${suffix}`)
        )
    );

    const sassPath = sassPaths.find((item) => fs.existsSync(item));

    if (sassPath == null) {
        return null;
    }

    return {
        file: sassPath,
    };
};

module.exports = {
    resolveSassPackageImport,
};

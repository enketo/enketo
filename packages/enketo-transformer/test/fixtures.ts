const basename = (path: string) => path.replace(/.*[\\/]([^\\/]+)/, '$1');

interface Fixture {
    fileName: string;
    origin: string;
    fixturePath: string;
    xform: string;
}

/** @package */
export const fixtures = (
    await Promise.all(
        Object.entries(
            import.meta.glob('./**/*.xml', {
                as: 'raw',
                eager: false,
            })
        ).map(async ([fixturePath, importXForm]): Promise<Fixture> => {
            const xform = await importXForm();
            const origin =
                fixturePath.match(/\/external-fixtures\/([^/]+)/)?.[1] ??
                'enketo-transformer';
            const fileName = basename(fixturePath);

            return {
                fileName,
                origin,
                fixturePath,
                xform,
            };
        })
    )
).sort((A, B) => {
    const a = A.fileName.toLowerCase().replace(/.*\/([^/]+)$/, '$1');
    const b = B.fileName.toLowerCase().replace(/.*\/([^/]+)$/, '$1');

    if (a > b) {
        return 1;
    }

    return b > a ? -1 : 0;
});

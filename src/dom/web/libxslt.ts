/** @package */
export const libxmljs = new Proxy(
    {},
    {
        get() {
            throw new Error('Not supported');
        },
    }
);

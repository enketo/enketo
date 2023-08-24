import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'vite';
import { define } from '../../config/build.shared';

export const setup = async () => {
    const root = fileURLToPath(new URL('../..', import.meta.url));
    const configFile = resolve(root, './vite.config.ts');

    const server = await createServer({
        configFile,
        define,
        root,
    });

    await server.listen();
};

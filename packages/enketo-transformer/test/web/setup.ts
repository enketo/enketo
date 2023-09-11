import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { type ViteDevServer, createServer } from 'vite';
import { define } from '../../config/build.shared';

let server!: ViteDevServer;

export const setup = async () => {
    const root = fileURLToPath(new URL('../..', import.meta.url));
    const configFile = resolve(root, './vite.config.ts');

    server = await createServer({
        configFile,
        define,
        root,
    });

    await server.listen();
};

export const teardown = async () => {
    await server.close();
};

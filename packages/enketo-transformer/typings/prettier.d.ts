import 'prettier';

declare module 'prettier' {
    import type { PrettierPluginXMLOptions } from '@prettier/plugin-xml';

    interface Options extends PrettierPluginXMLOptions {}
}

import 'prettier';
declare module 'prettier' {
    import { format } from '../node_modules/prettier/index';
    import type { PrettierPluginXMLOptions } from '@prettier/plugin-xml';

    interface Options extends PrettierPluginXMLOptions {}
}

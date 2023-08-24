declare module '@prettier/plugin-xml' {
    import type { Plugin as PrettierPlugin, SupportLanguage } from 'prettier';

    export interface PrettierPluginXMLOptions {
        xmlSelfClosingSpace?: boolean;
        xmlWhitespaceSensitivity?: 'ignore' | 'strict';
    }

    interface PrettierPluginXMLSupportLanguage extends SupportLanguage {
        parsers: ['xml'];
    }

    export interface PrettierPluginXML extends PrettierPlugin {
        languages: PrettierPluginXMLSupportLanguage;
    }

    declare const prettierPluginXML: PrettierPluginXML;

    export default prettierPluginXML;
}

declare module '@prettier/plugin-xml' {
    export interface PrettierPluginXMLOptions {
        xmlSelfClosingSpace?: boolean;
        xmlWhitespaceSensitivity?: 'ignore' | 'preserve' | 'strict';
    }
}

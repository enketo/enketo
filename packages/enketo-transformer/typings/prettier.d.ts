import basePrettier, { Plugin, RequiredOptions } from 'prettier';

declare module 'prettier' {
    import type {
        PrettierPluginXML,
        PrettierPluginXMLOptions,
    } from '@prettier/plugin-xml';

    import prettier from '@types/prettier';

    interface BaseXMLOptions
        extends RequiredOptions,
            PrettierPluginXMLOptions {}

    type PrettierOptions = Partial<RequiredOptions>;

    interface XMLOptions extends Partial<BaseXMLOptions> {
        parser: 'xml';
        plugins: [PrettierPluginXML, ...Plugin[]];
    }

    namespace prettier {
        export = basePrettier;

        export function format(
            source: string,
            options?: PrettierOptions
        ): string;

        export function format(source: string, options?: XMLOptions): string;
    }

    export default prettier;
}

![coverage-shield-badge-1](https://img.shields.io/badge/coverage-96.09%25-brightgreen.svg)
[![npm version](https://badge.fury.io/js/enketo-transformer.svg)](http://badge.fury.io/js/enketo-transformer)

# Enketo Transformer

NodeJS library that transforms [ODK forms](https://docs.getodk.org/form-design-intro/) for use by [Enketo Core](https://github.com/enketo/enketo-core). Both Transformer and Core are most commonly used as part of [Enketo Express](https://github.com/enketo/enketo-express). Transformer can also be embedded into different backend web applications (e.g. a form server) or wrapped by a robust API to make a standalone service. A simple testing server API is provided in this repository.

## Project status

Enketo Transformer is maintained by [the ODK team](https://getodk.org/about/team.html) (primarily [Trevor Schmidt](https://github.com/eyelidlessness/)). Broader context is available in [the Enketo Express repository](https://github.com/enketo/enketo-express#project-status).

ODK XForms are based off of [W3C XForms](https://en.wikipedia.org/wiki/XForms) which were originally intended to be supported natively by web browsers. Browser support did not happen and the ODK standard drifted too far from the W3C standard to have used it anyway. Enketo chose to transform XForms to HTML5 forms before rendering them. Enketo Transformer performs this work by applying an XSL transform followed by a few post-processing steps in Javascript. This was time-consuming for forms with certain characteristics so the transformation was designed to happen on the backend so it could be cached across client requests.

Historically, forms with many questions or many translations were prohibitively slow to transform. Starting in Enketo Transformer v2.2.1 (Feb 2023), they are much faster.

In v2.3.0 (Mar 2023), a web compatibility layer was introduced so that Enketo Transformer can be run in either a web browser using native DOM/web APIs, or in Node using a partial DOM compatibility layer wrapping equivalent `libxmljs` APIs/behavior. Each respective implementation is aliased as `enketo-transformer/dom`, resolved at build time to `src/dom/web/index.ts` or `src/dom/node/index.ts` respectively. Interfaces for the subset of DOM APIs in use are defined in `src/dom/abstract`, which ensures the Node compatibility layer conforms to the same browser-native interfaces.

Our current primary goals are:

-   Rethink transformation to be as minimal as possible, ideally without XSLT, and moving most (or all) of Enketo Transformer's current responsibilities to other parts of the Enketo stack.
-   Identifying and addressing remaining performance bottlenecks to remove the need for server-side caching.

## How Enketo Transformer is used by other Enketo projects

Enketo Core uses the `transform` function directly to transform XForm fixtures used in development and test modes. It also currently uses the test/dev server in development mode to transform external XForms. It does not currently use any transformation functionality in production.

Enketo Express uses the `transform` function to serve requests to its server-side transformation API endpoints, and caches transformed XForms in Redis. It also uses the `escapeURLPath` function (implemented in `url.ts`).

Neither project currently uses the following functionality:

-   Media URL mapping. Enketo Express has its own implementation of this functionality, so that dynamic media replacements are not cached. This functionality is maintained for backwards compatibility.

-   The `openclinica` flag. This functionality is used by OpenClinica's fork of Enketo Express.

-   The deprecated `preprocess` option. This functionality _may_ be used to update XForms before the standard transform, but its use is discouraged as users can achieve the same thing by preprocessing their XForms with entirely custom code before calling `transform`.

## Prerequisites

-   Node.js 20 and Yarn 1 (Node.js 16 and 18 are also supported)
-   [Volta](https://volta.sh/) is recommended for development
-   For Node/server-side transforms:
    -   Python (at least 3.7, but less than 3.11)
    -   An appropriate [C++ build toolchain for your machine](https://github.com/nodejs/node-gyp#on-unix)
    -   The `libxslt` library is now a peer dependency, and must be installed alongside `enketo-transformer`

## Interactive web demo

Enketo Transformer provides a simple web demo which allows you to select any of the XForms used as fixtures in its test suites to view their transformed output, as well as toggling several of the available transform options to see how they affect the transform. To run the demo:

```sh
cd ./demo
yarn install
yarn run demo
```

This will print out the demo URL (typically `http://localhost:3000`, unless that port is already in use).

## Use as module

Install Enketo Transformer with:

```sh
npm install enketo-transformer
```

_If you face issues during installation:_ Verify that [these requirements](https://github.com/nodejs/node-gyp#on-unix) are met. We depend on upstream XSLT and XML C++ libraries that require compilation upon installation using [node-gyp](https://github.com/nodejs/node-gyp).

### Node

```ts
import { transform } from 'enketo-transformer';

const xform = fs.readFileSync('path/to/xform.xml');
const result = await transform({
    // required string of XForm
    xform: xform,

    // optional string, to add theme if no theme is defined in the XForm
    theme: 'sometheme',

    // optional map, to replace jr://..../myfile.png URLs
    media: {
        'myfile.png': '/path/to/somefile.png',
        'myfile.mp3': '/another/path/to/2.mp3',
    },

    // optional ability to disable markdown rendering (default is true)
    markdown: false,

    // optional preprocess function that transforms the XForm (as libXMLJs object) to
    // e.g. correct incompatible XForm syntax before Enketo's transformation takes place
    preprocess: (doc) => doc,
});

// ... do something with result
```

### Web

Enketo Transformer may also be used on the web as an ESM module. It is exported as `enketo-transformer/web`:

```ts
import { transform } from 'enketo-transformer/web';

const xformResponse = await fetch('https://url/to/xform.xml');
const xform = await xformResponse.text();
const result = await transform({
    xform,
    // ...
});
```

**Note:** because `preprocess` depends on `libxmljs` which is only available for Node, `preprocess` is also not supported on the web. If you must preprocess an XForm before it is transformed, you may do that before calling `transform`.

## Development/local usage

### Install

```sh
yarn install
```

### Test/dev server

Enketo Transformer provides a simple server API. It may be used for testing locally, but isn't a robust or secure server implementation so it should not be used in production. You can start it in a local dev environment by running:

```sh
yarn start
```

It provides two endpoints:

-   limited use with `GET /transform` with xform parameter (required, **xform URL**), or
-   full-featured use with: `POST /transform` with URL-encoded body including `xform` (required, **full XForm as a string**), `theme` (optional, string), and `media` (optional, map) parameters

sample GET request:

```
curl http://localhost:8085/transform?xform=https://example.com/forms/78372/form.xml
```

sample POST request:

```bash
curl -d "xform=<xform>x</xform>&theme=plain&media[myfile.png]=/path/to/somefile.png&media[this]=that" http://localhost:8085/transform
```

**Response format:**

```json
{
    "form": "<form>.....</form>",
    "model": "<model>...</model>",
    "transformerVersion": "1.13.0",
    "languageMap": { "Français": "fr", "English": "en" }
}
```

### Develop

The script `yarn run develop` runs the app on port 8085 and also serves test/forms on port 8081. You could test the transformation output by placing an XForm in test/forms and running
http://localhost:8085/transform?xform=http://localhost:8081/autocomplete.xml

There is also a helpful **GET /transform/htmlform** endpoint to easily inspect the HTML form output in the developer console. Example:
http://localhost:8085/transform/htmlform?xform=http://localhost:8081/autocomplete.xml

You may use the `DEBUG` environment variable to see debug terminal output, e.g.:

```bash
DEBUG=api,transformer,markdown,language node app.js
```

### Test

-   run tests with `yarn test`
-   Tests can be run in watch mode for [TDD](https://en.wikipedia.org/wiki/Test-driven_development) workflows with `yarn run test:watch`, and support for debugging in [VSCode](https://code.visualstudio.com/) is provided. For instructions see [./#debugging-test-watch-mode-in-vscode](Debugging test watch mode in VSCode) below

#### Debugging test watch mode in VSCode

Basic usage:

1. Go to VSCode's "Run and Debug" panel
2. Select "Test (watch + debug)"
3. Click the play button

Optionally, you can add a keyboard shortcut to select launch tasks:

1. Open the keyboard shortcuts settings (cmd+k cmd+s on Mac, ctrl+k ctrl+s on other OSes)
2. Search for `workbench.action.debug.selectandstart`
3. Click the + button to add your preferred keybinding keybinding

## Release

Releases are done each time a dependent tool needs an `enketo-transformer` change.

1. Create release PR
1. Update `CHANGELOG.md`
1. Update version in `package.json`
    - Bump to major version if downstream has to make changes.
1. Check [Dependabot](https://github.com/enketo/enketo-transformer/security/dependabot) for alerts
1. Run `yarn upgrade`
    - Check if `node-libxslt` has been updated because it has caused problems in the past
1. Run `yarn audit`
1. Run `yarn install`
1. Run `yarn test`
1. Merge PR with all changes
1. Create GitHub release
1. Tag and publish the release
    - GitHub Action will publish it to npm

## License

See [license document](./LICENSE).

In addition, any product that uses enketo-transformer or parts thereof is required to have a "Powered by Enketo" footer, according to the specifications below, on all screens in which the output of enketo-transformer, or parts thereof, are used, unless explicity exempted from this requirement by Enketo LLC in writing. Partners and sponsors of the Enketo Project, listed on [https://enketo.org/#about](https://enketo.org/#about) and on [https://github.com/enketo/enketo-core#sponsors](https://github.com/enketo/enketo-core#sponsors) are exempted from this requirements and so are contributors listed in [package.json](./package.json).

The aim of this requirement is to force adopters to give something back to the Enketo project, by at least spreading the word and thereby encouraging further adoption.

Specifications:

1. The word "Enketo" is displayed using Enketo's logo.
2. The minimum font-size of "Powered by" is 12 points.
3. The minimum height of the Enketo logo matches the font-size used.
4. The Enketo logo is hyperlinked to https://enketo.org

Example:

Powered by <a href="https://enketo.org"><img height="16" style="height: 16px;" src="https://enketo.org/media/images/logos/enketo_bare_150x56.png" /></a>

## Change Log

See [change log](https://github.com/enketo/enketo-transformer/blob/master/CHANGELOG.md)

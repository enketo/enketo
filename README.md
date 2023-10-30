# Enketo

This is the Enketo web forms monorepo. Enketo is an open source project that produces web form software for the [ODK ecosystem](https://getodk.org).

## Packages

-   [Enketo Core](./packages/enketo-core): Enketo's web form engine, intended for embedding in a web application
-   [Enketo Express](./packages/enketo-express): Enketo's integrated web application, embedding Enketo Core and providing integration with OpenRosa form servers
-   [Enketo Transformer](./packages/enketo-transformer): used by Enketo to transform [XForms](https://getodk.github.io/xforms-spec/) into the format consumed by Enketo Core
-   [OpenRosa XPath Evaluator](./packages/openrosa-xpath-evaluator): Enketo's implementation of the OpenRosa XPath extensions, used in Enketo Core
-   [Enketo Transformer Web (example)](./examples/enketo-transformer-web): example app demonstrating client-side usage of Enketo Transformer

## Project status

Enketo was initiated in 2009 by Martijn van de Rijdt as a web-based alternative or complement to [ODK Collect](https://docs.getodk.org/collect-intro/). It has become a core component of the ODK ecosystem and been adopted by several organizations beyond that ecosystem.

Since 2021, Enketo has been maintained by the [ODK team](https://getodk.org/about/team.html) (primarily [Trevor Schmidt](https://github.com/eyelidlessness/)). Martijn continues to provide advice and continuity. The ODK project sets priorities in collaboration with its [Technical Advisory Board](https://getodk.org/about/ecosystem.html).

Our current primary goals are:

-   Increasing alignment with ODK Collect, particularly in service of submission edits.
-   Improving error messages so that users can get out of bad states.
-   Improving long-term maintainability by modernizing code bases, removing code duplication, and simplifying state mutation.

Feature requests and project discussion are welcome on the [ODK forum](https://forum.getodk.org/).

## Using Enketo in your system

There are two major ways to use Enketo: embedding the client-side [Enketo Core](./packages/enketo-core) library in a broader frontend or using the [Enketo Express](./packages/enketo-express) service through [its APIs](https://enketo.org/develop/api/). Which you choose depends on the functionality you what to implement in your host app (for example, Enketo Core doesn't provide offline caching of in-progress submissions, form transformation, or form URL management) and whether or not you already implement the OpenRosa APIs.

### Using Enketo Core

To use Enketo Core, see [its README](./packages/enketo-core#usage-as-a-library).

### Using Enketo Express

The recommended way to run Enketo Express is using Docker. We publish a [minimal image](https://github.com/enketo/enketo/pkgs/container/enketo) which builds Enketo Express using the default configuration and then launches it. You will need to supply a configuration appropriate for your environment which must set at least the "linked form and data server", "api key", and secrets. You will also need to run `redis` and make sure that Enketo Express can talk to both the `redis` database(s) and a form server. See a simple example `docker-compose` file for running a full platform on a single host with [ODK Central](https://github.com/getodk/central/blob/master/docker-compose.yml). Another common configuration is to run Enketo Express on a separate host. Learn more about configuring Enketo Express [in its README](./packages/enketo-express).

> [!IMPORTANT]
> If you used the Enketo Express Docker image [from before the monorepo migration](https://github.com/enketo/enketo-express/blob/master/Dockerfile), you will need to make adjustments:
>
> -   Paths have changed. The working directory was previously the Enketo Express root so you would put your config at `config/config.json`. Now it is the Enketo monorepo root so your config must go to `packages/enketo-express/config/config.json`.
> -   Previous versions generated and templated in secrets using a Python script. If you need a templated configuration, you need to manage that yourself in your deployment infrastructure.
> -   Previous versions installed `pm2` and started Enketo Express with it.

## Development setup and local usage

### Prerequisites

-   **Node:** Enketo supports the current [Node LTS](https://nodejs.dev/en/about/releases/) environments (presently versions 18 and 20). Local development targets the latest LTS release (20).
-   **Yarn:** Package management and monorepo tasks use [Yarn 1 ("classic")](https://classic.yarnpkg.com/lang/en/).
-   **Volta:** It is highly recommended to use [Volta](https://volta.sh/) to manage Node and Yarn versions automatically while working in Enketo.

For running Enketo Express:

-   **redis**
-   An OpenRosa form server (ODK Central, Ona, Kobo, etc)

### Install

```sh
yarn install
```

### Running development tasks

**Important:** While many tasks you'll use during development are still package-specific, all tasks should be run from the **project root** (not within individual packages).

Current project-wide tasks:

-   **Build** all packages

    ```sh
    yarn build
    ```

-   **Lint** is performed project-wide, checking code quality of all top level and package files.

    ```sh
    yarn lint
    ```

Package-specific tasks are run with `yarn workspace [package-name] ...`, e.g.

```sh
yarn workspace enketo-core test
yarn workspace enketo-express start
```

You can see additional tasks in each respective package's README and/or `package.json`.

If you're coming form one of Enketo's pre-monorepo packages, you can generally continue to use the same tasks you used previously, with the aforementioned `yarn worskpace [package-name]` prefix.

If you've previously used `grunt` commands, you can now use `yarn workspace [package-name] grunt ...`. This will use the local `grunt` dependency, rather than whatever version you may have installed globally.

## Releases

Some release preparation steps should be performed "bottom up", i.e. up the package dependency chain. This order is currently:

1. `packages/openrosa-xpath-evaluator`
2. `packages/enketo-transformer`
3. `examples/enketo-transformer-web`:
    - Update the `enketo-transformer` dependency version if it will be released.
    - This is an internal package, and will not be "released", so its version should not be updated.
4. `packages/enketo-core`:
    - Update the respective `openrosa-xpath-evaluator` and `enketo-transformer` dependency versions if either will be released.
    - Update `Form.requiredTransformerVersion` in `packages/enketo-core/src/form.js`, if Enketo Transformer will be released.
5. `packages/enketo-express`
    - Update the respective `enketo-transformer` and `enketo-core` dependency versions if either will be released.
    - This package is not published to the NPM registry, but a Docker image is published with its version, so that should be updated as well.

In each dependent package, if its dependencies are updated it should also be prepared for release (even if it has no other changes).

### Prepare to release

1. Update all dependencies: `yarn upgrade` (this will honor semver version ranges in each respective `package.json`). Pay special attention to updates to these dependencies:
    - `node-libxslt`, `node1-libxmljsmt-myh`, `nan`: updating these may cause issues with particular versions of Node.
    - `node-forge`: if updated, you should also manually verify encrypted submissions end-to-end.
1. Resolve any remaining dependency vulnerabilities:
    - `yarn audit`, and update affected dependencies. Pay particularly close attention to non-dev dependencies.
    - Check [Dependabot](https://github.com/enketo/enketo/security/dependabot) for any vulnerabilities which may have been missed by Yarn (like `npm audit`, these sometimes differ). You may have to check `yarn.lock` for subdependencies.
1. Update the `CHANGELOG.md` for each package which will be released, with its new version/date and any released changes. Breaking changes should be noted explicitly.
1. Update package versions, "bottom up" (see above):
    - For each package which has updates pending release, update its version in `packages/$PACKAGE_NAME/package.json`. We follow
    - For each package which depends on that package, update its `package.json` to reference the new version. If
    - If `enketo-transformer` has been updated, also update `Form.requiredTransformerVersion` in `packages/enketo-core/src/js/form.js`.
1. Ensure all updates are installed and applied in `yarn.lock`: `yarn install`. This will also verify that each package's main build process succeeds.
1. Test all packages with updates applied: `yarn test`.
1. Create a release PR with all of these changes.
1. Once merged, create GitHub releases for each package with a pending release.
1. Tag and publish each release, "bottom up". GitHub Actions will publish each to the appropriate registry (e.g. NPM, GHRC, Docker Hub).

## License

See each package for its licence.

Additionally, any product that uses enketo-core is required to have a "Powered by Enketo" footer, according to the specifications below, on all screens in which enketo-core or parts thereof, are used, unless explicity exempted from this requirement by Enketo LLC in writing. Partners and sponsors of the Enketo Project, listed on [https://enketo.org/about/sponsors/](https://enketo.org/about/sponsors/) are exempted from this requirements and so are contributors listed in [package.json](https://github.com/enketo/enketo-core/blob/master/package.json).

The aim of this requirement is to force adopters to give something back to the Enketo project, by at least spreading the word and thereby encouraging further adoption.

Specifications:

1. The word "Enketo" is displayed using Enketo's logo.
2. The minimum font-size of "Powered by" is 12 points.
3. The minimum height of the Enketo logo matches the font-size used.
4. The Enketo logo is hyperlinked to https://enketo.org

Example:

Powered by <a href="https://enketo.org"><img height="16" style="height: 16px;" src="https://enketo.org/media/images/logos/enketo_bare_150x56.png" /></a>

The Enketo logo and Icons are trademarked by [Enketo LLC](https://www.linkedin.com/company/enketo-llc) and should only be used for the 'Powered by Enketo' requirement mentioned above (if applicable). To prevent infringement simply replace the logo images in [/public/images](https://github.com/enketo/enketo-express/blob/master/public/images) with your own or contact [Enketo LLC](mailto:info@enketo.org) to discuss the use inside your app.

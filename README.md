# Enketo

This is the Enketo web forms monorepo.

## Packages

-   [Enketo Core](./packages/enketo-core): Enketo's web form engine, intended for embedding in a web application
-   [Enketo Express](./packages/enketo-express): Enketo's integrated web application, embedding Enketo Core and providing integration with OpenRosa form servers
-   [Enketo Transformer](./packages/enketo-transformer): used by Enketo to transform [XForms](https://getodk.github.io/xforms-spec/) into the format consumed by Enketo Core
-   [OpenRosa XPath Evaluator](./packages/openrosa-xpath-evaluator): Enketo's implementation of the OpenRosa XPath extensions, used in Enketo Core
-   [Enketo Transformer Web (example)](./examples/enketo-transformer-web): example app demonstrating client-side usage of Enketo Transformer

## Development setup and local usage

### Prerequisites

-   **Node:** Enketo supports the current [Node LTS](https://nodejs.dev/en/about/releases/) environments (presently versions 18 and 20). Local development targets the latest LTS release (20).
-   **Yarn:** Package management and monorepo tasks use [Yarn 1 ("classic")](https://classic.yarnpkg.com/lang/en/).
-   **Volta:** It is highly recommended to use [Volta](https://volta.sh/) to manage Node and Yarn versions automatically while working in Enketo.

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
2. Resolve any remaining dependency vulnerabilities:
    - `yarn audit`, and update affected dependencies. Pay particularly close attention to non-dev dependencies.
    - Check [Dependabot](https://github.com/enketo/enketo/security/dependabot) for any vulnerabilities which may have been missed by Yarn (like `npm audit`, these sometimes differ). You may have to check `yarn.lock` for subdependencies.
3. Update the `CHANGELOG.md` for each package which will be released, with its new version/date and any released changes. Breaking changes should be noted explicitly.
4. Update package versions, "bottom up" (see above):
    - For each package which has updates pending release, update its version in `packages/$PACKAGE_NAME/package.json`. We follow
    - For each package which depends on that package, update its `package.json` to reference the new version. If
    - If `enketo-transformer` has been updated, also update `Form.requiredTransformerVersion` in `packages/enketo-core/src/js/form.js`.
5. Ensure all updates are installed and applied in `yarn.lock`: `yarn install`. This will also verify that each package's main build process succeeds.
6. Test all packages with updates applied: `yarn test`.
7. If Enketo Express will be released, update its auto-generated documentation: `yarn workspace enketo-express build-docs`.
8. Create a release PR with all of these changes.
9. Once merged, create GitHub releases for each package with a pending release.
10. Tag and publish each release, "bottom up". GitHub Actions will publish each to the appropriate registry (e.g. NPM, GHRC, Docker Hub).

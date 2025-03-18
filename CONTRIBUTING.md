## Enketo Development

### Local environment

-   **[Node LTS](https://nodejs.dev/en/a2bout/releases/) (v22)**: Enketo targets current and active Node versions, development targets the current.
-   **[Yarn v1 (classic)](https://classic.yarnpkg.com/lang/en/)**: Package management and monorepo tasks use [Yarn 1 ("classic")]().
-   **docker**: Enketo is a docker container, but also Enketo uses redis that documentation provides examples from docker for convenience.

### Accounts

To submit forms to Enketo Express you will need an account at an OpenRosa form server (ODK Central, Ona, Kobo, etc.).

### Install

Run yarn on the first time and when external dependencies change:

```sh
yarn install
cp packages/enketo-express/config/default-config.json packages/enketo-express/config/config.json
```

### Launch and watch changes on everything at once:

All monorepo packages are already symlinked into `node_modules` by `yarn` workspaces.
The top entry point is Enketo Express that depends on all other packages.

-   enketo-core source is used directly in develop and watched by enketo-express
-   enketo-transformer dist is watched by enketo-express, so need another watch to rebuild it on changes
-   openrosa-xpath-evaluator src and dist is the same, and watched by enketo-express

Here's how to watch every package and rebuild on it's own or dependency changes:

```sh
## 1. Start docker redis. No action required if redis is installed on host.
docker run --rm -dit --name enketo-redis --publish 6379:6379 --publish 6380:6379 redis
export TEST_REDIS_MAIN_PORT=6379

## 2. Watch everything (from root)
yarn watch # see http://localhost:8005/preview?xform=http://localhost:3000/all-widgets.xml
```

### Other tasks

See each `package.json` respectively. Current project-wide tasks:

```sh
yarn build # build all packages.
yarn lint # lint all packages.
```

Package-specific tasks can be run either from package's folder or from root. If you're coming form one of Enketo's pre-monorepo packages, you can generally continue to use the same tasks you used previously, with the aforementioned `yarn worskpace [package-name]` prefix. For example, these two are equal:

```sh
cd packages/enketo-core
yarn test
# or
yarn workspace enketo-core test
```

If you've previously used `grunt` commands, please use `yarn workspace [package-name] grunt ...`. This will use the local `grunt` dependency, rather than whatever version you may have installed globally.

## Enketo Releases

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
    - For each package which has updates pending release, update its version in `packages/$PACKAGE_NAME/package.json`. We follow semantic versioning.
    - For each package which depends on that package, update its `package.json` to reference the new version.
    - If `enketo-transformer` has been updated, also update `Form.requiredTransformerVersion` in `packages/enketo-core/src/js/form.js`.
1. Ensure all updates are installed and applied in `yarn.lock`: `yarn install`. This will also verify that each package's main build process succeeds.
1. Test all packages with updates applied: `yarn test`.
1. Create a release PR with all of these changes.
1. Once merged, create GitHub releases for each package with a pending release.
1. Tag and publish each release, "bottom up". GitHub Actions will publish each to the appropriate registry (e.g. NPM, GHRC, Docker Hub).

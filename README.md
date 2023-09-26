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

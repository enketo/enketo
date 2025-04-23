# Enketo Web Forms

_Web forms evolved. Deploy and conduct surveys that work without a connection, on any device._

Enketo is an open source project that produces web form software based on open-source standards. Used by [ODK](https://getodk.org), [KoboToolbox](https://kobotoolbox.org), [OpenClinica](https://www.openclinica.com/) and [others](https://enketo.org/about/adoption/).

## Using Enketo in your system

There are two major ways to use Enketo:

-   embedding the client-side [Enketo Core](./packages/enketo-core) library in a broader frontend,
-   using the [Enketo Express](./packages/enketo-express) service through [its APIs](https://enketo.org/develop/api/).

Which you choose depends on the functionality you what to implement in your host app (for example, Enketo Core doesn't provide offline caching of in-progress submissions, form transformation, or form URL management) and whether or not you already implement the OpenRosa APIs.

### Using Enketo Express

The recommended way to run Enketo Express is using Docker.

We publish a [minimal docker image](https://github.com/enketo/enketo/pkgs/container/enketo) which builds Enketo Express using the default configuration and then launches it. You will need to supply a configuration appropriate for your environment which must set at least the "linked form and data server", "api key", and secrets. You will also need to run `redis` and make sure that Enketo Express can talk to both the `redis` database(s) and a form server. See a simple example `docker-compose` file for running a full platform on a single host with [ODK Central](https://github.com/getodk/central/blob/master/docker-compose.yml). Another common configuration is to run Enketo Express on a separate host. Learn more about configuring Enketo Express [in its README](./packages/enketo-express).

> [!IMPORTANT]
> If you used the Enketo Express Docker image [from before the monorepo migration](https://github.com/enketo/enketo-express/blob/master/Dockerfile), you will need to make adjustments:
>
> -   Paths have changed. The working directory was previously the Enketo Express root so you would put your config at `config/config.json`. Now it is the Enketo monorepo root so your config must go to `packages/enketo-express/config/config.json`.
> -   Previous versions generated and templated in secrets using a Python script. If you need a templated configuration, you need to manage that yourself in your deployment infrastructure.
> -   Previous versions installed `pm2` and started Enketo Express with it.

### Using Enketo Core

To use Enketo Core, see [its README](./packages/enketo-core#usage-as-a-library).

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md), but in short:

```sh
## Install & copy config
yarn install
cp packages/enketo-express/config/default-config.json packages/enketo-express/config/config.json

## Optionally, start docker redis. No action required if redis is installed on host.
docker run --rm -dit --name enketo-redis --publish 6379:6379 --publish 6380:6379 redis
export TEST_REDIS_MAIN_PORT=6379

## Watch everything (from workspace's root)
yarn watch # see http://localhost:8005/preview?xform=http://localhost:3000/all-widgets.xml
```

This is a monorepo, see for details on each package see their README:

-   [Enketo Express](./packages/enketo-express/README.md): Enketo's integrated web application, embedding Enketo Core and providing integration with OpenRosa form servers
-   [Enketo Core](./packages/enketo-core/README.md): Enketo's web form engine, intended for embedding in a web application
-   [Enketo Transformer](./packages/enketo-transformer/README.md): used by Enketo to transform [XForms](https://getodk.github.io/xforms-spec/README.md) into the format consumed by Enketo Core
-   [OpenRosa XPath Evaluator](./packages/openrosa-xpath-evaluator/README.md): Enketo's implementation of the OpenRosa XPath extensions, used in Enketo Core

And also an [Enketo Transformer Web (example)](./examples/enketo-transformer-web): example app demonstrating client-side usage of Enketo Transformer

## History

-   March 2025 - [Kobo team](https://www.kobotoolbox.org/about-us/meet-the-team/) takes over maintainership ([#1392](https://github.com/enketo/enketo/issues/1392)) in response to ODK's annoucement ([#1317](https://github.com/enketo/enketo/pull/1317/files)) about stepping away from maintainership in May 2024.
-   c.a. 2021 - [ODK team](https://getodk.org/about/team) takes over maintainership. The ODK team's goals have been to increase alignment with ODK Collect, improve error messages to help users get out of bad states and improve long-term maintainability by modernizing the code base, removing code duplication, and simplifying state mutation.
-   c.a. 2009 - Enketo was initiated by Martijn van de Rijdt as a web-based alternative or complement to [ODK Collect](https://docs.getodk.org/collect-intro/). It has become a core component of the ODK ecosystem and been adopted by several organizations beyond that ecosystem.

## License

See each package for its Apache v2 licence.

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

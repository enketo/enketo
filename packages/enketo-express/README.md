# Enketo Express

_The [Enketo Smart Paper](https://enketo.org) web application._ It can be used directly by form servers or used as inspiration for building applications that wrap [Enketo Core](https://github.com/enketo/enketo/packages/enketo-core). See [this diagram](https://enketo.org/develop/) for a summary of how the different Enketo components are related.

## Browser support

See [this faq](https://enketo.org/faq/#browsers).

**Enketo endeavors to show a helpful (multi-lingual) error message on unsupported browsers when the form is loaded to avoid serious issues.**

## Configuring Enketo Express

To run Enketo Express, you will first need to configure it. Read about all configuration options [here](./tutorials/10-configure.md)

All configuration is normally done in `config/config.json`. This file only has to contain the [default properties](./config/default-config.json) that you'd like to override. For some it may be preferable to include all properties, to avoid surprises when the default configuration changes. Others may want to reduce hassle and keep the `config.json` as small as possible to automatically deploy configuration changes (e.g. new widgets). The application needs to be rebuilt when the `widget` configuration is changed but otherwise a restart should be sufficient.

You can use environment variables instead of a `config/config.json` file. If the `config/config.json` file is missing Enketo will assume configuration is done with environment variables. A combination of both options is not supported. See [config/sample.env](./config/sample.env) for more information on equivalent environment variable names.

**Always leave config/default-config.json unchanged.**

The default production configuration includes 2 redis instances: one for caching form transformations (see [Enketo Transformer](../../packages/enketo-transformer)) and one for persistent data like associations between form server URLs and Enketo form IDs. You can **greatly simplify installation by using 1 redis instance** instead (for development usage). To do this set the redis.cache.port to 6379 (same as redis.main.port).

For development usages, it is helpful to set "linked form and data server" -> "server url" to `""`, so you can use any OpenRosa server with your local Enketo Express.

For detailed guidance on each configuration item, see [the configuration tutorial](./tutorials/10-configure.md).

To configure your own custom external authentication also see [this document](./tutorials/60-authentication-and-security.md).

## Using Enketo Express

Enketo Express is generally used as a service which is part of a broader platform including at minimum an [OpenRosa form server](https://docs.getodk.org/openrosa/). If you would like to embed web forms directly in an existing application, consider using [Enketo Core](https://github.com/enketo/enketo/packages/enketo-core) and looking at the Enketo Express codebase to understand how the host application can interact with Enketo Core.

We generally recommend deploying Enketo Express using Docker. See [the toplevel README](../../#using-enketo-express).

## Development

Enketo Express is the top entry point of all other packages, therefore see [CONTRIBUTING.md](../../CONTRIBUTING.md) on how to launch everything together.

### Testing

Testing is done with Mocha and Karma:

-   all: `yarn workspace enketo-express run test`
-   headless: `yarn workspace enketo-express run test-headless`
-   browsers: `yarn workspace enketo-express run test-browsers`

Tests can be run in watch mode for [TDD](https://en.wikipedia.org/wiki/Test-driven_development) workflows with:

-   client: `yarn workspace enketo-express run test-watch-client`
-   server: `yarn workspace enketo-express run test-watch-server`

#### Debugging test watch mode in VSCode

Basic usage:

1. Go to VSCode's "Run and Debug" panel
2. Select "Test client (watch + debug)" or "Test server (watch + debug)"
3. Click the play button

Optionally, you can add a keyboard shortcut to select launch tasks:

1. Open the keyboard shortcuts settings (cmd+k cmd+s on Mac, ctrl+k ctrl+s on other OSes)
2. Search for `workbench.action.debug.selectandstart`
3. Click the + button to add your preferred keybinding keybinding

### How to enable debug logs

Enketo uses the npm `debug` module. All debug statements are prefixed with `enketo:` and will not appear unless the environment variable is set. To enable debugging logs for enketo specifically, set `DEBUG` as follows:

```bash
export DEBUG=enketo*
```

## Customizing Enketo Express

Enketo Express includes a number of customization and extension points. See [tutorials](./tutorials) for details, especially on themes and widgets.

## Credits

### Translation

The user interface was translated by: Oleg Zhyliak (Ukrainian), Karol Kozyra (Swedish), Badisches Rotes Kreuz (German), Serkan Tümbaş (Turkish), Hélène Martin (French), Gurjot Sidhu (Hindi, Panjabi), "Abcmen" (Turkish), Otto Saldadze, Makhare Atchaidze, David Sichinava, Elene Ergeshidze (Georgian), Nancy Shapsough (Arabic), Noel O'Boyle (French), Miguel Moreno (Spanish), Tortue Torche (French), Bekim Kajtazi (Albanian), Marc Kreidler (German), Darío Hereñú (Spanish), Viktor S. (Russian), Alexander Torrado Leon (Spanish), Peter Smith (Portugese, Spanish), Przemysław Gumułka (Polish), Niklas Ljungkvist, Sid Patel (Swedish), Katri Jalava (Finnish), Francesc Garre (Spanish), Sounay Phothisane (Lao), Linxin Guo (Chinese), Emmanuel Jean, Renaud Gaudin (French), Trần Quý Phi (Vietnamese), Reza Doosti, Hossein Azad, Davood Mottalee (Persian), Tomas Skripcak (Slovak, Czech, German), Daniela Baldova (Czech), Robert Michael Lundin (Norwegian), Margaret Ndisha, Charles Mutisya (Swahili), Panzero Mauro (Italian), Gabriel Kreindler (Romanian), Jason Reeder, Omar Nazar, Sara Sameer, David Gessel (Arabic), Tino Kreutzer (German), Wasilis Mandratzis-Walz (German, Greek), Luis Molina (Spanish), Martijn van de Rijdt (Dutch).

_Join the project on [Transifex](https://explore.transifex.com/enketo/enketo-express/) to contribute!_

### Funding

The development of this application is now led by [ODK](https://getodk.org) and funded by customers of the ODK Cloud hosted service.

Past funders include [KoBo Toolbox (Harvard Humanitarian Initiative)](http://www.kobotoolbox.org), [iMMAP](http://immap.org), [OpenClinica](https://openclinica.com), [London School of Hygiene and Tropical Medicine](https://opendatakit.lshtm.ac.uk/), [DIAL Open Source Center](https://www.osc.dial.community/) and [Enketo LLC](https://www.linkedin.com/company/enketo-llc). Also see [Enketo Core sponsors](https://github.com/enketo/enketo-core#sponsors).

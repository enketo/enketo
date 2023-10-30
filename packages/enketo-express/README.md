# Enketo Express

_The [Enketo Smart Paper](https://enketo.org) web application._ It can be used directly by form servers or used as inspiration for building applications that wrap [Enketo Core](https://github.com/enketo/enketo/packages/enketo-core). See [this diagram](https://enketo.org/develop/) for a summary of how the different Enketo components are related.

## Configuring Enketo Express

To run Enketo Express, you will first need to configure it. Read about all configuration options [here](./blob/master/tutorials/10-configure.md)

All configuration is normally done in `config/config.json`. This file only has to contain the [default properties](./blob/master/config/default-config.json) that you'd like to override. For some it may be preferable to include all properties, to avoid surprises when the default configuration changes. Others may want to reduce hassle and keep the `config.json` as small as possible to automatically deploy configuration changes (e.g. new widgets). The application needs to be rebuilt when the `widget` configuration is changed but otherwise a restart should be sufficient.

You can use environment variables instead of a `config/config.json` file. If the `config/config.json` file is missing Enketo will assume configuration is done with environment variables. A combination of both options is not supported. See [config/sample.env](./blob/master/config/sample.env) for more information on equivalent environment variable names.

**Always leave config/default-config.json unchanged.**

The default production configuration includes 2 redis instances: one for caching form transformations (see [Enketo Transformer](../../packages/enketo-transformer)) and one for persistent data like associations between form server URLs and Enketo form IDs. You can **greatly simplify installation by using 1 redis instance** instead (for development usage). To do this set the redis.cache.port to 6379 (same as redis.main.port).

For development usages, it is helpful to set "linked form and data server" -> "server url" to `""`, so you can use any OpenRosa server with your local Enketo Express.

For detailed guidance on each configuration item, see {@tutorial 10-configuration}.

To configure your own custom external authentication also see [this document](https://github.com/enketo/enketo-express/blob/master/tutorials/30-authentication-and-security.md).

## Using Enketo Express

Enketo Express is generally used as a service which is part of a broader platform including at minimum an [OpenRosa form server](https://docs.getodk.org/openrosa/). If you would like to embed web forms directly in an existing application, consider using [Enketo Core](https://github.com/enketo/enketo/packages/enketo-core) and looking at the Enketo Express codebase to understand how the host application can interact with Enketo Core.

We generally recommend deploying Enketo Express using Docker. See [the toplevel README](../../#using-enketo-express).

## Development setup and local usage

First, make sure `redis` is running and available at the port(s) configured in `config/config.json`. You should also read the section on [configuring Enketo Express](./#configuring-enketo-express) above. You will also need to have an OpenRosa server running and accessible to Enketo Express.

As described in the [the toplevel README](./#using-enketo-express), all tasks should be run from the project root. To build and start Enketo Express:

```sh
yarn build
yarn workspace enketo-express start
```

You can now check that the app is running by going to e.g. http://localhost:8005 (depending on your server and port set in `config/config.json`)

### How to enable debug logs

Enketo uses the npm `debug` module. All debug statements are prefixed with `enketo:` and will not appear unless the environment variable is set. To enable debugging logs for enketo specifically, set `DEBUG` as follows:

```bash
export DEBUG=enketo*
```

## Credits

### Translation

The user interface was translated by: Oleg Zhyliak (Ukrainian), Karol Kozyra (Swedish), Badisches Rotes Kreuz (German), Serkan Tümbaş (Turkish), Hélène Martin (French), Gurjot Sidhu (Hindi, Panjabi), "Abcmen" (Turkish), Otto Saldadze, Makhare Atchaidze, David Sichinava, Elene Ergeshidze (Georgian), Nancy Shapsough (Arabic), Noel O'Boyle (French), Miguel Moreno (Spanish), Tortue Torche (French), Bekim Kajtazi (Albanian), Marc Kreidler (German), Darío Hereñú (Spanish), Viktor S. (Russian), Alexander Torrado Leon (Spanish), Peter Smith (Portugese, Spanish), Przemysław Gumułka (Polish), Niklas Ljungkvist, Sid Patel (Swedish), Katri Jalava (Finnish), Francesc Garre (Spanish), Sounay Phothisane (Lao), Linxin Guo (Chinese), Emmanuel Jean, Renaud Gaudin (French), Trần Quý Phi (Vietnamese), Reza Doosti, Hossein Azad, Davood Mottalee (Persian), Tomas Skripcak (Slovak, Czech, German), Daniela Baldova (Czech), Robert Michael Lundin (Norwegian), Margaret Ndisha, Charles Mutisya (Swahili), Panzero Mauro (Italian), Gabriel Kreindler (Romanian), Jason Reeder, Omar Nazar, Sara Sameer, David Gessel (Arabic), Tino Kreutzer (German), Wasilis Mandratzis-Walz (German, Greek), Luis Molina (Spanish), Martijn van de Rijdt (Dutch).

_Join the project on [Transifex](https://www.transifex.com/projects/p/enketo-express/) to contribute!_

### Funding

The development of this application is now led by [ODK](https://getodk.org) and funded by customers of the ODK Cloud hosted service.

Past funders include [KoBo Toolbox (Harvard Humanitarian Initiative)](http://www.kobotoolbox.org), [iMMAP](http://immap.org), [OpenClinica](https://openclinica.com), [London School of Hygiene and Tropical Medicine](https://opendatakit.lshtm.ac.uk/), [DIAL Open Source Center](https://www.osc.dial.community/) and [Enketo LLC](https://www.linkedin.com/company/enketo-llc). Also see [Enketo Core sponsors](https://github.com/enketo/enketo-core#sponsors).

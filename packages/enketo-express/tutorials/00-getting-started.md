### How to install a test/development server

#### Manually:

1. Install JS prerequisites: [Node.js](https://github.com/nodesource/distributions) (12.x LTS), [Grunt Client](http://gruntjs.com).
2. Install [Redis](https://redis.io/topics/quickstart)
3. Probably already installed but otherwise, install build-essential, curl and git with `(sudo) apt-get install build-essential git curl`
4. Install dependencies for [Puppeteer](https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-unix) (for PDF creation only)
5. Clone this repository
6. Create config/config.json. See [How To configure](#how-to-configure).
7. Install dependencies and build with `npm install` from the project root

### How to install a production server

See [this tutorial](http://blog.enketo.org/install-enketo-production-ubuntu/) for detailed instructions.

### How to configure

All configuration is normally done in config/config.json. This file only has to contain the [default properties](https://github.com/enketo/enketo-express/blob/master/config/default-config.json) that you'd like to override. For some it may be preferable to include all properties, to avoid surprises when the default configuration changes. Others may want to reduce hassle and keep the config.json as small as possible to automatically deploy configuration changes (e.g. new widgets). After editing the configuration, the app will need to be restarted.

As an alternative, there is an option to use environment variables instead of a config/config.json file. If the config/config.json file is missing Enketo will assume configuration is done with environment variables. A combination of both options is not supported. See [config/sample.env](https://github.com/enketo/enketo-express/blob/master/config/sample.env) for more information on equivalent environment variable names.

The default production configuration includes 2 redis instances. You can **greatly simplify installation by using 1 redis instance** instead (for development usage). To do this set the redis.cache.port to 6379 (same as redis.main.port).

For development usages, it is helpful to set "linked form and data server" -> "server url" to `""`, so you can use any OpenRosa server with your local Enketo Express.

For detailed guidance on each configuration item, see {@tutorial 10-configuration}.

To configure your own custom external authentication also see [this document](https://github.com/enketo/enketo-express/blob/master/tutorials/30-authentication-and-security.md).

### How to run

Run with `npm start` from project root.

You can now check that the app is running by going to e.g. http://localhost:8005 (depending on your server and port set in config/config.json)

### How to enable debug logs

Enketo uses the npm `debug` module. All debug statements are prefixed with `enketo:` and will not appear unless the environment variable is set. To enable debugging logs for enketo specifically, set `DEBUG` as follows:

```bash
export DEBUG=enketo*
```

# Developing Enketo with KoboToolbox

This document provides a step-by-step guide to create a testing and development environment for Enketo using KoboToolbox's development environment as the connected OpenRosa server.

This environment leverages the existing setup of `kobo-install` with its configurations as a base for connecting the local Enketo instance to KoboToolbox as a replacement for its existing Enketo instance.

## Prerequisites

-   Docker and Docker Compose installed
-   Node.js and Yarn (versions specified in `package.json`)
-   Git
-   `make` utility (`sudo apt install build-essential` on Linux)

## Step 1: Setup KoboToolbox Development Environment

1. Follow the [kobo-install documentation](https://github.com/kobotoolbox/kobo-install) to set up a local instance of KoboToolbox
    - :warning: Be sure to select `yes` when asked `Do you want to expose back-end container ports`, or else the local Enketo instance won't be able to access the Redis server.
    - :warning: Be sure to select `yes` when asked `Do you want to add additional settings to the front-end`, or else you won't be able to add the needed custom settings to the KoboToolbox frontend.
2. Take note of the Redis password set during the KoboToolbox installation, as it will be needed for Enketo configuration.
3. Ensure KoboToolbox is running and accessible

## Step 2: Setup Enketo Development Environment

```bash
git clone https://github.com/enketo/enketo.git
cd enketo
node -v # should be 20.x.x or 22.x.x, see package.json
yarn -v # should be >= 1.22.22 but not 2.x.x, see package.json
yarn install
```

## Step 3: Configure Enketo

1. Create the configuration file:

    ```bash
    cp ./packages/enketo-express/config/default-config.json ./packages/enketo-express/config/config.json
    ```

2. Edit `./packages/enketo-express/config/config.json` and update the following sections:
    - `app name`: will be displayed in Enketo's homepage and is useful to verify if the running version accessible through `ee.kobo.local` is the correct one.
    - `server url`: empty value allows Enketo to connect to the local server without specifying a URL.
    - set redis `password` to match your KoboToolbox Redis settings. You can find the password set during KoboToolbox setup by running in `kobo-install` folder:
    ```bash
        cat .run.conf | grep redis_password
    ```
    - example:
        ```json
        {
            "app name": "Enketo KoboToolbox Development Environment",
            ...
            "linked form and data server": {
                "name": "KoboToolbox",
                "api key": "enketorules",
                "server url": "",
                "legacy formhub": false,
                "authentication": {
                    "type": "basic",
                    "allow insecure transport": "false"
                }
            },
            ...
            "redis": {
                "main": {
                    "host": "127.0.0.1",
                    "port": "6379",
                    "password": "<REDIS_PASSWORD>",
                },
                "cache": {
                    "host": "127.0.0.1",
                    "port": "6380",
                    "password": "<REDIS_PASSWORD>",
                }
            },
            ...
        }
        ```

## Step 4: Configure KoboToolbox

1.  Navigate to your KoboToolbox's docker setup directory:

    ```bash
    cd kobo-docker
    ```

2.  Create or edit `docker-compose.frontend.custom.yml`:

    > _Note:_ This file is preferred over `docker-compose.frontend.override.yml` since the latter is managed by `kobo-install` and will be overwritten. Using the former allows you to customize the frontend configuration without losing changes during updates.

    ```yml
    services:
        kpi:
            environment:
                - ENKETO_API_KEY=enketorules

        nginx:
            extra_hosts:
                - enketo_express:<YOUR_LOCAL_IP_ADDRESS>
    ```

    > **Note:** This configuration remaps `ee.kobo.local` from the Enketo instance setup by kobo-install to your local Enketo development instance.

3.  Replace `<YOUR_LOCAL_IP_ADDRESS>` with your actual local IP address:

    -   **Linux/macOS:** `ip addr` or `ifconfig`
    -   **Windows:** `ipconfig`

    > **Important:** Use your local IP address instead of `localhost` to ensure proper communication between KoboToolbox containers and your Enketo running locally. If you change your network and your IP changes, you'll need to update this configuration.

4.  Ensure the `ENKETO_API_KEY` matches the API key in your Enketo configuration (`enketorules`).

5.  Recreate the nginx container:
    ```bash
    ./run.py -cf up -d --force-recreate nginx
    ```

## Step 5: Start the Development Environment

The order of starting the services is important to ensure that services are available before connections are made.

1.  Start KoboToolbox Backend:

    ```bash
    cd kobo-install
    ./run.py -cb up -d
    ```

    > Note: This will start the _redis_ service as well, which is needed by Enketo.

2.  Start Enketo development environment:

    ```bash
    cd enketo
    yarn watch
    ```

    > Note: This will make Enketo server available, which is needed when getting KoboToolbox frontend up.

3.  Start KoboToolbox Frontend:

    ```bash
    cd kobo-install
    ./run.py -cf up -d
    ```

Optionally, you can follow the logs for KoboToolbox:

```bash
./run.py -cf logs -f
```

## Step 6: Access and Test

### URLs:

-   **KoboToolbox:** `http://kf.kobo.local` (or your configured address)
-   **Enketo:** `http://localhost:8005` and `http://ee.kobo.local`: Enketo's homepage should display the configured app name.

### Testing the Integration:

1. **Login to KoboToolbox** (Create a user account if needed. Refer to KoboToolbox documentation for details)
2. **Create a new project**
3. **Deploy your project**
4. **Navigate to:** Project → Form section
5. **Click "Preview" (the eye icon)** To open a preview of the form inside of KoboToolbox
6. **Click "Open"** to launch the form in your local Enketo instance ready to send submissions

The form should now be displayed by your local Enketo instance, allowing you to test and develop features.

## Troubleshooting

### Common Issues:

-   **Access denied for audio/video:** For local development, you may need to set specific permissions on Chrome (or your browser of choice) to allow access to audio/video from the unsafe development source. You can do that on Chrome by navigating to [`chrome://flags/#unsafely-treat-insecure-origin-as-secure`](chrome://flags/#unsafely-treat-insecure-origin-as-secure) and adding your local KoboToolbox and Enketo URL (e.g., `http://kf.kobo.local, http://ee.kobo.local`).
-   **Connection refused:** Verify that both services are running and the IP address is correct
-   **API key mismatch:** Ensure the `ENKETO_API_KEY` matches in both configurations
-   **Port conflicts:** Check that port 8005 is available for Enketo
-   **Enketo not starting:** Ensure that KoboToolbox backend is running and that the `docker-compose.frontend.custom.yml` is correctly configured
-   **KoboToolbox not starting:** Verify that Enketo is running and the sequence of starting services is followed correctly
-   **Redis connection issues:** Ensure the Redis password in Enketo matches the one set during KoboToolbox installation. See the command to retrieve it in [Step 3](#step-3-configure-enketo).
-   **Local Enketo not loading on KoboToolbox:** If you see the default Enketo instance instead of your local one, ensure that the `extra_hosts` in `docker-compose.frontend.custom.yml` is correctly set to map `ee.kobo.local` to your **current** local IP address, you may need to set the IP again if you change networks. Also ensure that you selected `yes` when asked about adding additional settings to the front-end during KoboToolbox setup. See the questions and answers in [Step 1](#step-1-setup-kobotoolbox-development-environment).

**Happy developing!**

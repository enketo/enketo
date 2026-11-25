Self-signed certificate for `localhost`, **for tests only**. It lets the server tests run a real HTTPS server (e.g. `test/server/media-controller.spec.js`). It isn't used or trusted anywhere else.

Regenerate with:

```sh
openssl req -x509 -newkey rsa:2048 -nodes -keyout localhost.key -out localhost.crt -days 36500 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

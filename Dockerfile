# Builds and launches Enketo Express.
#
# Requirements for use:
#   - A main Redis database instance
#   - A cache Redis database instance
#   - An OpenRosa form server
#   - Configuration that at minimum indicates where to find the redis instances and form server
#
# You can configure Enketo Express using an orchestration tool like Docker Compose or Kubernetes or
# by adding additional build stages. There are several approaches to configuration:
#   - set environment variables (see https://github.com/enketo/enketo/blob/main/packages/enketo-express/config/sample.env)
#   - write a config.json file to ${ENKETO_SRC_DIR}/packages/enketo-express/config/config.json
#   - write a template config.json file to the folder above and use python, envsubt, etc to fill in the template based on environment variables
#
# Note that adding new widgets or themes requires Enketo Express to be rebuilt.

FROM node:20.12.2-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        build-essential \
        git

ENV ENKETO_SRC_DIR=/srv/src/enketo
WORKDIR ${ENKETO_SRC_DIR}

COPY . ${ENKETO_SRC_DIR}

# Install and build, leaving dev dependencies (yarn 1 has no prune)
RUN yarn install --frozen-lockfile \
    && yarn cache clean

EXPOSE 8005

CMD ["yarn", "workspace", "enketo-express", "start"]

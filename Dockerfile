FROM node:20.15.1-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        build-essential \
        git \
        gettext-base

ENV ENKETO_SRC_DIR=/srv/src/enketo
WORKDIR ${ENKETO_SRC_DIR}

COPY . ${ENKETO_SRC_DIR}

# Install and build, leaving dev dependencies (yarn 1 has no prune)
RUN yarn install --frozen-lockfile \
    && yarn cache clean

EXPOSE 8005

CMD ["yarn", "workspace", "enketo-express", "start"]

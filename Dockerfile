FROM node:20.12.2-slim

RUN apt-get update || : && apt-get install -y \
    python3 \
    build-essential

ENV ENKETO_SRC_DIR=/srv/src/enketo
WORKDIR ${ENKETO_SRC_DIR}

COPY . ${ENKETO_SRC_DIR}

# Install and build, first with dev dependencies, then with production only (yarn 1 has no prune)
RUN yarn install --frozen-lockfile \
    && rm -rf node_modules \
    && yarn install --production --frozen-lockfile --ignore-scripts \
    && yarn cache clean

EXPOSE 8005

CMD ["yarn", "workspace", "enketo-express", "start"]

FROM node:20.12

ENV ENKETO_SRC_DIR=/srv/src/enketo
WORKDIR ${ENKETO_SRC_DIR}

COPY . ${ENKETO_SRC_DIR}

# Install (including dev dependencies) and build
RUN yarn install --frozen-lockfile

# Remove dev dependencies after build
RUN yarn install --production --frozen-lockfile --ignore-scripts

EXPOSE 8005

CMD ["yarn", "workspace", "enketo-express", "start"]

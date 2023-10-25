FROM node:20

ENV ENKETO_SRC_DIR=/srv/src/enketo_express
WORKDIR ${ENKETO_SRC_DIR}

COPY . ${ENKETO_SRC_DIR}

RUN yarn install --frozen-lockfile && yarn grunt && yarn install --production

# Persist the `secrets` directory so the encryption key remains consistent.
RUN mkdir -p ${ENKETO_SRC_DIR}/setup/docker/secrets
VOLUME ${ENKETO_SRC_DIR}/setup/docker/secrets

EXPOSE 8005

CMD ["$ENKETO_SRC_DIR/setup/docker/start.sh"]

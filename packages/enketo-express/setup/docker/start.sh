#!/bin/bash
set -e

source /etc/profile

cd ${ENKETO_SRC_DIR}/

# Create a config file if necessary.
node setup/docker/create-config.js

node app.js -n enketo

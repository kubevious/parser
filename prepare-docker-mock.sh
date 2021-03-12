#!/bin/bash
MY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
MY_DIR="$(dirname $MY_PATH)"
cd $MY_DIR

source configuration.sh

docker build \
    -f Dockerfile.mock \
    -t ${IMAGE_NAME}-mock \
    .

echo "*** RUN WITH:"
echo "    $ ./run-docker-mock.sh"


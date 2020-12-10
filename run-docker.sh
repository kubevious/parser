#!/bin/bash
MY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
MY_DIR="$(dirname $MY_PATH)"
cd $MY_DIR

source configuration.sh

docker run \
    -it \
    --rm \
    --name "${CONTAINER_NAME}" \
    -p ${SERVER_PORT}:${SERVER_PORT} \
    --network ${NETWORK_NAME} \
    -e KUBEVIOUS_COLLECTOR=http://kubevious-backend:4001/api/v1/collect \
    ${${CONTAINER_NAME}}
    # --entrypoint="node" \

    
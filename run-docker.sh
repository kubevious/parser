#!/bin/bash
MY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
MY_DIR="$(dirname $MY_PATH)"
cd $MY_DIR

source configuration.sh

docker run \
    -it \
    --rm \
    --name "${CONTAINER_NAME}" \
    -h ${CONTAINER_NAME} \
    -p ${SERVER_PORT}:${SERVER_PORT} \
    --network ${NETWORK_NAME} \
    -e SERVER_PORT=${SERVER_PORT} \
    -e KUBEVIOUS_COLLECTOR=http://kubevious-collector:4003/api/v1/collect \
    ${IMAGE_NAME}
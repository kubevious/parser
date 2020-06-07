#!/bin/bash
MY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
MY_DIR="$(dirname $MY_PATH)"
cd $MY_DIR

docker run \
    -it \
    --rm \
    --name 'kubevious-parser' \
    -p 4002:4000 \
    --network kubevious \
    -e KUBEVIOUS_COLLECTOR=http://kubevious-backend:4001/api/v1/collect \
    -v ${MY_DIR}/src:/src \
    -v ${MY_DIR}/mock:/mock \
    --entrypoint="node" \
    node:12-alpine "/mock/index-mock" "data-big"
#!/bin/bash
MY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
MY_DIR="$(dirname $MY_PATH)"
cd $MY_DIR

docker run \
    -it \
    --rm \
    --name 'kubevious-parser' \
    -p 4002:4002 \
    --network kubevious \
    -e KUBEVIOUS_COLLECTOR=http://kubevious-backend:4001/api/v1/collect \
    --entrypoint="node" \
    kubevious-parser

    
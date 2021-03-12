#!/bin/bash
MY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
MY_DIR="$(dirname $MY_PATH)"
cd $MY_DIR

rm -rf node_modules/

npm install
npm update k8s-super-client the-lodash the-logger the-promise @kubevious/helpers  @kubevious/worldvious-client @kubevious/helper-backend @kubevious/helper-logic-processor @kubevious/http-client
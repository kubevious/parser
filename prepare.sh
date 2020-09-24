#!/bin/bash
MY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
MY_DIR="$(dirname $MY_PATH)"
cd $MY_DIR

cd mock
rm -rf node_modules/
npm install
cd ..

cd src
rm -rf node_modules/
npm install
npm update kubevious-helpers k8s-super-client the-lodash the-logger the-promise kubevious-worldvious-client
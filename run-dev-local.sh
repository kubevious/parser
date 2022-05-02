#!/bin/bash
MY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
MY_DIR="$(dirname $MY_PATH)"
cd $MY_DIR

source configuration.sh

export LOG_TO_FILE=true
export NODE_ENV=development
export KUBEVIOUS_COLLECTOR=http://localhost:4003/api/v1/collect

./build.sh
RESULT=$?
if [ $RESULT -ne 0 ]; then
  echo "Build failed"
  exit 1;
fi

# export KUBECONFIG=kube-config.yaml
# export KUBE_CONTEXT_NAME=minikube

node dist/mock/index-remote
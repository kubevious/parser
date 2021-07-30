#!/bin/bash
MY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
MY_DIR="$(dirname $MY_PATH)"
cd $MY_DIR

source configuration.sh

export GKE_CREDENTIALS_PATH=credentials.json
export GKE_REGION=us-central1-a
export GKE_K8S_CLUSTER=kubevious-samples
export KUBEVIOUS_COLLECTOR=http://localhost:4001/api/v1/collect

./build.sh
RESULT=$?
if [ $RESULT -ne 0 ]; then
  echo "Build failed"
  exit 1;
fi

node dist/mock/index-gke


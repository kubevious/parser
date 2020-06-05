#!/bin/bash
MY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
MY_DIR="$(dirname $MY_PATH)"
cd $MY_DIR

export LOG_TO_FILE=true
export NODE_ENV=development
export GKE_CREDENTIALS_PATH=credentials.json
export GKE_REGION=us-central1-a
export GKE_K8S_CLUSTER=kubevious-samples
export KUBEVIOUS_COLLECTOR=http://localhost:4000/api/v1/collect
node mock/index-gke
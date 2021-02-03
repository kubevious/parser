#!/bin/bash
MY_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
MY_DIR="$(dirname $MY_PATH)"
cd $MY_DIR

export LOG_TO_FILE=true
export NODE_ENV=development
export KUBEVIOUS_COLLECTOR=http://localhost:4102/api/v1/collect
export KUBEVIOUS_COLLECTOR_AUTH=http://localhost:4505/api/v1/auth/collector/login
export KUBEVIOUS_COLLECTOR_KEY_PATH=$MY_DIR/runtime/auth-data.json

export WORLDVIOUS_URL=http://localhost:4501/api/v1/oss
export WORLDVIOUS_ID=123e4567-e89b-12d3-a456-426614174000

# export WORLDVIOUS_VERSION_CHECK_TIMEOUT=5
# export WORLDVIOUS_COUNTERS_REPORT_TIMEOUT=6
# export WORLDVIOUS_METRICS_REPORT_TIMEOUT=6
# export WORLDVIOUS_ERROR_REPORT_TIMEOUT=7

./build.sh
RESULT=$?
if [ $RESULT -ne 0 ]; then
  echo "Build failed"
  exit 1;
fi

node dist/mock/index-mock
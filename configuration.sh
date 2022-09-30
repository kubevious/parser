export SERVER_PORT=4004
export CONTAINER_NAME=kubevious-parser
export NETWORK_NAME=kubevious
export IMAGE_NAME=kubevious-parser
export IMAGE_NAME_UBI=${IMAGE_NAME}-ubi
export MOCK_IMAGE_NAME=${IMAGE_NAME}-mock

export KUBEVIOUS_API_SKIP_EVENTS=true
export KUBEVIOUS_API_SKIP=discovery.k8s.io/v1:EndpointSlice,apps/v1:ControllerRevision
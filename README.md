# Kubevious Backend
**Kubevious** brings clarity and safety to Kubernetes. Kubevious renders all configurations relevant to the application in one place. That saves a lot of time from operators, enforcing best practices, eliminating the need for looking up settings and digging within selectors and labels.

**Parser** is only one of the components required by Kubevious. Learn more about [Kubevious architecture here](https://github.com/kubevious/kubevious/blob/master/ARCHITECTURE.md).
![Kubevious High-Level Architecture](https://github.com/kubevious/kubevious/blob/master/diagrams/high-level-architecture.png?raw=true)


## Local Setup and Development
```sh
# Install NPM dependencies
$ yarn
```

Parser needs to fetch API resources to report to the Backend components. The easiest way and fastest to get started is to use mock data without connecting to K8s clusters:
```sh
# Run Kubevious Parser using mock data
$ ./run-dev-mock.sh
```

Alternatively, can connect to a live cluster. 
```sh
# Setup cluster connection parameters:
$ export KUBERNETES_SERVICE_HOST=10.10.10.10
$ export KUBERNETES_SERVICE_PORT_HTTPS=443

# Save the token here:
# /var/run/secrets/kubernetes.io/serviceaccount/token

# Save the public certificate here:
# /var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# Run Kubevious Parser
$ ./run-dev-local.sh
```

Make sure to also run the **[Backend](https://github.com/kubevious/backend#local-setup-and-development)** and **[Frontend](https://github.com/kubevious/ui#local-setup-and-development)** components.


import { Backend } from '@kubevious/helper-backend'
import { Context } from '../context'
import { K8sLoader } from '../loaders/k8s'
import { KubernetesClient, KubernetesClientConfig } from 'k8s-super-client';

const backend = new Backend("parser");

backend.initialize(() => {

    const context = new Context(backend);

    if (!process.env.K8S_APISERVER) {
        throw new Error("No K8S_APISERVER");
    }
    if (!process.env.K8S_TOKEN) {
        throw new Error("No K8S_TOKEN");
    }
    if (!process.env.K8S_CA_DATA) {
        throw new Error("No K8S_CA_DATA");
    }

    const clientConfig : KubernetesClientConfig = {
        server: process.env.K8S_APISERVER,
        token: process.env.K8S_TOKEN,
        httpAgent: {
            ca: Buffer.from(process.env.K8S_CA_DATA, 'base64').toString('ascii')
        }
    }

    const client = new KubernetesClient(backend.logger, clientConfig)

    return client.init()
        .then(() => {
            const loader = new K8sLoader(context,
                client,
                {});
            context.addLoader(loader);
        })
        .then(() => context.run())

});
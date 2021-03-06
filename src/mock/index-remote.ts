

import { Backend } from '@kubevious/helper-backend'
import { Context } from '../context'
import { K8sLoader } from '../loaders/k8s'
import { KubernetesClient } from 'k8s-super-client';

const backend = new Backend("parser");

backend.initialize(() => {

    const context = new Context(backend);

    const client = new KubernetesClient(backend.logger, {
        server: 'http://127.0.0.1',
        token: '',
        httpAgent: {

        }
    })

    return client.init()
        .then(() => {
            var loader = new K8sLoader(context,
                client,
                {});
            context.addLoader(loader);
        })
        .then(() => context.run())

});
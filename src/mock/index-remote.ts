import { Promise } from 'the-promise';

import _ from 'the-lodash';

import { Backend } from '@kubevious/helper-backend'
import { connectDefaultRemoteCluster } from 'k8s-super-client';

import { Context } from '../context'
import { K8sLoader } from '../loaders/k8s';


const backend = new Backend("parser");

function fetchLoader() 
{
    return Promise.resolve()
        .then(() => {
            return connectDefaultRemoteCluster(backend.logger);
        })
        .then(client => {
            const info = {
                infra: "local"
            }
            const loader = new K8sLoader(backend.logger, client, info);
            return loader;
        })
}

new Context(backend, fetchLoader);

backend.run();
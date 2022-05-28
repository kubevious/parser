import { Promise } from 'the-promise';
import { Backend } from '@kubevious/helper-backend'
import { Context } from '../context'
import { K8sMockLoader } from './loaders/k8s-mock'

const backend = new Backend("parser");

function fetchLoader()
{
    return Promise.resolve()
        .then(() => {
            let mockDirName = 'mock-data/data';
            const myArgs = process.argv.slice(2);
            if (myArgs.length > 0) {
                mockDirName = myArgs[0];
            }
            return new K8sMockLoader(backend.logger, mockDirName);
        })
}

new Context(backend, fetchLoader);

backend.run();
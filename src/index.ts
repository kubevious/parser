import { Backend } from '@kubevious/helper-backend'
import { Promise } from 'the-promise';
import { Context } from './context'
import { LocalLoader } from './loaders/local'

const backend = new Backend("parser");

function fetchLoader()
{
    return Promise.resolve()
        .then(() => {
            return new LocalLoader(backend.logger);
        })
}

new Context(backend, fetchLoader);

backend.run();

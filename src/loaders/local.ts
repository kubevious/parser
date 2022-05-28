import { Promise } from 'the-promise';
import { ILogger } from 'the-logger';

import { K8sLoader } from './k8s';

import { connectFromPod  } from 'k8s-super-client';
import { ILoader, ReadyHandler } from './types';
import { ApiResourceStatus } from '@kubevious/data-models';
import { Context } from '../context';

export class LocalLoader implements ILoader
{
    private _logger : ILogger;

    private _loader : ILoader | null = null;
    private _readyHandler? : ReadyHandler;

    constructor(logger : ILogger)
    {
        this._logger = logger.sublogger("LocalLoader");
        
        this.logger.info("Constructed");
    }

    get logger() : ILogger {
        return this._logger;
    }

    close()
    {

    }

    setupReadyHandler(handler : ReadyHandler)
    {
        this._readyHandler = handler;
        if (this._loader) {
            this._loader.setupReadyHandler(this._readyHandler);
        }
    }
    
    run(context: Context)
    {
        return connectFromPod(this._logger)
            .then(client => {
                const info = {
                    infra: "local"
                }
                this._loader = new K8sLoader(this._logger, client, info);
                this._loader.setupReadyHandler(this._readyHandler!);
                return this._loader.run(context);
            })
    }

    extractApiStatuses() : ApiResourceStatus[]
    {
        if (!this._loader) {
            return [];
        }
        return this._loader.extractApiStatuses();
    }
}
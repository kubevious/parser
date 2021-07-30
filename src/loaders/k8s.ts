import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { ILogger } from 'the-logger';

import { writeFileSync } from 'fs';
import * as Path from 'path' 

import { Context } from '../context';

import { KubernetesClient } from 'k8s-super-client';

import { K8sApiLoader } from './k8s-api';
import { ApiResourceStatus, ILoader, ReadyHandler } from './types';
import { ApiGroupInfo } from 'k8s-super-client/dist/cluster-info-fetcher';
import { ItemId, K8sConfig } from '@kubevious/helper-logic-processor';

export class K8sLoader implements ILoader
{
    private _context : Context;
    private _logger : ILogger;

    private _client : KubernetesClient;
    private _info : any;
    private _readyHandler? : ReadyHandler;

    private _apiLoaders : Record<string, K8sApiLoader> = {};

    private _readyTimer : NodeJS.Timeout | null = null;

    constructor(context : Context, client : KubernetesClient, info : any)
    {
        this._logger = context.logger.sublogger("K8sLoader");
        this._context = context;

        this._client = client;
        this._info = info;

        this.logger.info("Constructed");

        this._monitorApis();
    }

    get logger() {
        return this._logger;
    }

    close()
    {
        if (this._readyTimer) {
            clearInterval(this._readyTimer);
            this._readyTimer = null;
        }

        for(let apiLoader of _.values(this._apiLoaders))
        {
            apiLoader.close();
        }

        this._client.close();
    }

    private _monitorApis()
    {
        this._client.watchClusterApi((isPresent, apiGroup, client) => {

            const key = this._makeGroupKey(apiGroup);

            const currLoader = this._apiLoaders[key];
            if (currLoader) {
                currLoader.terminate();
                currLoader.close();
                delete this._apiLoaders[key]
            }

            
            if (isPresent && apiGroup.isEnabled)
            {
                if (this._context.apiSelector.isEnabled(apiGroup.apiName, apiGroup.apiVersion, apiGroup.kindName)) {
                    this._apiLoaders[key] = new K8sApiLoader(key, this, this._context, apiGroup, client!);
                }
            }

            this._context.concreteRegistry.triggerChange();
        })
    }

    setupReadyHandler(handler : ReadyHandler)
    {
        this._readyHandler = handler;
        this.reportReady();
    }

    run()
    {
        this._readyTimer = setInterval(() => {
            this.reportReady()
        }, 5 * 1000);
    }

    private _isReady() : boolean
    {
        for(let apiLoader of _.values(this._apiLoaders))
        {
            if (!apiLoader.isTargetReady()) {
                return false;
            }
        }
        return true;
    }

    reportReady() : void
    {
        if (!this._readyHandler) {
            return;
        }
        this._readyHandler!(this._isReady());
    }

    extractApiStatuses() : ApiResourceStatus[]
    {
        if (!this._client.clusterInfo) {
            return [];
        }
        
        let statuses : ApiResourceStatus[] = [];
        for(let apiGroup of _.values(this._client.clusterInfo.apiGroups))
        {
            const key = this._makeGroupKey(apiGroup);
            const loader = this._apiLoaders[key];

            const status : ApiResourceStatus = {
                apiName: apiGroup.apiName,
                apiVersion: apiGroup.apiVersion,
                kindName: apiGroup.kindName
            }

            if (!loader || !loader.isConnected)
            {
                status.isDisconnected = true;
            }

            if (!apiGroup.isEnabled) {
                status.isDisabled = true;
            }

            if (loader) {
                if (loader.errorCode || loader.errorMessage)
                {
                    status.error = {
                        code: loader.errorCode,
                        message: loader.errorMessage
                    }
                }
            }

            statuses.push(status);
        }

        return statuses;
    }

    private _makeGroupKey(apiGroup: ApiGroupInfo)
    {
        const key = `${apiGroup.apiName}::${apiGroup.apiVersion}::${apiGroup.kindName}`;
        return key;
    }
}

import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { ILogger } from 'the-logger';

import { KubernetesClient } from 'k8s-super-client';

import { K8sApiLoader } from './k8s-api';
import { ILoader, ReadyHandler } from './types';
import { ApiGroupInfo } from 'k8s-super-client';
import { K8sApiResourceStatus } from '@kubevious/entity-meta';
import { Context } from '../context';

export class K8sLoader implements ILoader
{
    private _logger : ILogger;

    private _client : KubernetesClient;
    private _info : any;
    private _readyHandler? : ReadyHandler;

    private _apiLoaders : Record<string, K8sApiLoader> = {};

    private _readyTimer : NodeJS.Timeout | null = null;

    private _isReady : boolean = false;

    constructor(logger : ILogger, client : KubernetesClient, info : any)
    {
        this._logger = logger.sublogger("K8sLoader");

        this._client = client;
        this._info = info;

        this.logger.info("Constructed");
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

        for(const apiLoader of _.values(this._apiLoaders))
        {
            apiLoader.close();
        }

        this._client.close();

        this._isReady = false;
        this._reportReadiness();
    }

    private _monitorApis(context: Context)
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
                if (context.apiSelector.isEnabled(apiGroup.apiName, apiGroup.version, apiGroup.kindName)) {
                    this._apiLoaders[key] = new K8sApiLoader(key, this, context, apiGroup, client!);
                }
            }

            context.concreteRegistry.triggerChange();
        })
    }

    setupReadyHandler(handler : ReadyHandler)
    {
        this._readyHandler = handler;
        this._reportReadiness();
    }

    run(context: Context)
    {
        this._monitorApis(context);

        this._readyTimer = setInterval(() => {
            this.determineReady()
        }, 5 * 1000);
    }

    determineReady(skipIfNotReady? : boolean) : void
    {
        if (skipIfNotReady) {
            if (!this._isReady) {
                return;
            }
        }

        this._checkReady();

        this._reportReadiness();
    }

    private _reportReadiness()
    {
        if (!this._readyHandler) {
            return;
        }
        this._readyHandler!(this._isReady);
    }

    private _checkReady()
    {
        if (_.keys(this._apiLoaders).length == 0) {
            this.logger.warn("[_checkReady] Not ready. No API services discovered yet.");
            this._isReady = false;
            return;
        }

        let isFinalReady = true;
        for(const apiLoader of _.values(this._apiLoaders))
        {
            const isReady = apiLoader.isTargetReady();
            if (isReady) {
                this.logger.info("[_checkReady] API Ready: %s", apiLoader.id);
            } else {
                this.logger.warn("[_checkReady] API Not Ready: %s", apiLoader.id);
                isFinalReady = false;
            }
        }

        if (isFinalReady) {
            this.logger.warn("[_checkReady] Is ready");
        } else {
            this.logger.warn("[_checkReady] Not ready");
        }

        this._isReady = isFinalReady;
    }

    extractApiStatuses() : K8sApiResourceStatus[]
    {
        if (!this._client.clusterInfo) {
            return [];
        }

        const myApiGroups = _.orderBy(_.values(this._client.clusterInfo.apiGroups),
            [x => x.apiName || '', x => x.version, x => x.kindName]);
        
        const statuses : K8sApiResourceStatus[] = [];
        for(const apiGroup of myApiGroups)
        {
            const key = this._makeGroupKey(apiGroup);
            const loader = this._apiLoaders[key];

            const status : K8sApiResourceStatus = {
                apiVersion: apiGroup.apiVersion,
                apiName: apiGroup.apiName,
                version: apiGroup.version,
                kindName: apiGroup.kindName,
                isNamespaced: apiGroup.isNamespaced
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
        const key = `${apiGroup.apiVersion}::${apiGroup.kindName}`;
        return key;
    }
}

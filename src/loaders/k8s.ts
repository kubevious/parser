import _ from 'the-lodash';
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

    private _apiGroups : Record<string, ApiGroupWrapper> = {};

    private _readyTimer : NodeJS.Timeout | null = null;

    private _isReady  = false;
    private _isClosed = false;

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
        this._isClosed = true;

        if (this._readyTimer) {
            clearInterval(this._readyTimer);
            this._readyTimer = null;
        }

        for(const apiGroupWrapper of _.values(this._apiGroups))
        {
            if (apiGroupWrapper.loader)
            {
                apiGroupWrapper.loader.terminate();
                apiGroupWrapper.loader.close();
            }
        }

        this._client.close();

        this._isReady = false;
        this._reportReadiness();
    }

    private _monitorApis(context: Context)
    {
        this._client.watchClusterApi((isPresent, apiGroup, client) => {

            if (this._isClosed) {
                return; // TODO: later on unsubscribe from watchClusterApi instead;
            }

            const key = this._makeGroupKey(apiGroup);

            const currApiWrapper = this._apiGroups[key];
            if (currApiWrapper) {
                if (currApiWrapper.loader) {
                    currApiWrapper.loader.terminate();
                    currApiWrapper.loader.close();
                }
                delete this._apiGroups[key]
            }

            if (isPresent)
            {
                const isEnabled = this._isInterestedApi(context, apiGroup);

                this._logger.info("[_monitorApis] %s, isEnabled: %s", key, isEnabled);

                this._apiGroups[key] = {
                    apiGroup: apiGroup,
                    isEnabled: isEnabled,
                    loader: isEnabled ? new K8sApiLoader(key, this, context, apiGroup, client!) : undefined
                }
            }

            context.concreteRegistry.triggerChange();
        })
    }

    private _isInterestedApi(context: Context, apiGroup: ApiGroupInfo)
    {
        // this._logger.info("[_isInterestedApi] apigroup:", apiGroup);

        if (!apiGroup.isEnabled) {
            return false;
        }

        const verbsDict = _.makeBoolDict(apiGroup.verbs);
        if (!verbsDict["watch"]) {
            return false;
        }

        if (!context.apiSelector.isEnabled(apiGroup.apiName, apiGroup.version, apiGroup.kindName)) {
            return false;
        }

        return true;
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
        const enabledApiGroups = _.values(this._apiGroups).filter(x => x.isEnabled);
        if (enabledApiGroups.length == 0) {
            this.logger.warn("[_checkReady] Not ready. No API services discovered yet.");
            this._isReady = false;
            return;
        }

        let isFinalReady = true;
        for(const apiLoader of enabledApiGroups.map(x => x.loader).map(x => x!))
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
            this.logger.info("[_checkReady] Is ready");
        } else {
            this.logger.warn("[_checkReady] Not ready");
        }

        this._isReady = isFinalReady;
    }

    extractApiStatuses() : K8sApiResourceStatus[]
    {
        const myApiGroups = _.orderBy(_.values(this._apiGroups), 
            [x => x.apiGroup.apiName || '', x => x.apiGroup.version, x => x.apiGroup.kindName]);

        
        const statuses : K8sApiResourceStatus[] = [];
        for(const apiGroupWrapper of myApiGroups)
        {
            const apiGroup = apiGroupWrapper.apiGroup;

            const status : K8sApiResourceStatus = {
                apiVersion: apiGroup.apiVersion,
                apiName: apiGroup.apiName,
                version: apiGroup.version,
                kindName: apiGroup.kindName,
                isNamespaced: apiGroup.isNamespaced,
                verbs: apiGroup.verbs
            }

            if (apiGroupWrapper.isEnabled)
            {
                status.isDisabled = false;
                status.isSkipped = false;
                status.isDisconnected = true;

                const loader = apiGroupWrapper.loader;
                if (loader)
                {
                    if (loader.isConnected)
                    {
                        status.isDisconnected = false;
                    }
                    else
                    {
                        if (loader.errorCode || loader.errorMessage)
                        {
                            status.error = {
                                code: loader.errorCode,
                                message: loader.errorMessage
                            }
                        }
                    }
                }
            }
            else
            {
                status.isDisabled = true;
                status.isSkipped = true;
                status.isDisconnected = true;
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


interface ApiGroupWrapper
{
    apiGroup: ApiGroupInfo,
    isEnabled: boolean,
    loader?: K8sApiLoader,
}
import _ from 'the-lodash';
import { ILogger } from 'the-logger';

import { writeFileSync } from 'fs';
import * as Path from 'path' 

import { Context } from '../context';

import moment from 'moment';
import { DeltaAction, ResourceAccessor, KubernetesObject } from 'k8s-super-client';
import { ApiGroupInfo } from 'k8s-super-client';
import { K8sLoader } from './k8s';

export class K8sApiLoader 
{
    private _context : Context;
    private _logger : ILogger;
    private _loader: K8sLoader;

    private _id: string;
    private _apiGroup: ApiGroupInfo;
    private _client: ResourceAccessor;

    private _connectDate: Date | null = null;
    private _disconnectDate: Date | null = null;

    private _isConnected: boolean = false;
    private _isDisconnected: boolean = false;
    private _errorCode: number | undefined = undefined;
    private _errorMessage: string | undefined = undefined;

    constructor(id: string, loader: K8sLoader, context : Context, apiGroup: ApiGroupInfo, client: ResourceAccessor)
    {
        this._logger = context.logger.sublogger("K8sApiLoader");
        this._context = context;
        this._loader = loader;

        this._id = id;
        this._apiGroup = apiGroup;
        this._client = client;

        this.logger.info("Constructed %s", this._id);

        this._watch();
    }

    get id() {
        return this._id;
    }

    get logger() {
        return this._logger;
    }

    get isConnected() {
        return this._isConnected;
    }

    get errorCode() {
        return this._errorCode;
    }

    get errorMessage() {
        return this._errorMessage;
    }

    terminate()
    {
        this.logger.info("[terminate] %s", this._id);

        this._context.concreteRegistry.removeApi(this._apiGroup);
    }

    close()
    {
        this.logger.info("[close] %s", this._id);
        this._client.close();
    }

    private _watch()
    {
        this.logger.info("[_watch] setup: %s", this._id);
        return this._client.watchAll(null, (action : DeltaAction, obj : KubernetesObject) => {
            this._logger.verbose("[_watch] %s ::: %s %s", this._id, action, obj.kind);
            this._logger.verbose("%s %s", action, obj.kind);
            this._logger.silly("%s %s :: ", action, obj.kind, obj);
            const isPresent = this._parseAction(action);

            // this._debugSaveToMock(isPresent, obj);
            this._handle(isPresent, obj);
        }, () => {
            this._logger.info("[_watch] Connected: %s", this._id);
            this._connectDate = new Date();
            this._isConnected = true;
            this._isDisconnected = false;
            this._disconnectDate = null;
            this._errorCode = undefined;
            this._errorMessage = undefined;
        }, (resourceAccessor : any, data: any) => {

            if (!this._isDisconnected) {
                this._disconnectDate = new Date();
            }
            this._isDisconnected = true;
            this._connectDate = null;
            this._isConnected = false;

            this._errorCode = undefined;
            this._errorMessage = undefined;
        
            if (data) {
                if (data.status) {
                    this._errorCode = data.status;
                }
                if (data.message) {
                    this._errorMessage = data.message;
                }
            }

            this._logger.error("[_watch] Disconnected: %s. Error Code: %s. Msg: %s", this._id, this._errorCode, this._errorMessage);

            this._reportNotReady();
        });
    }

    isTargetReady() : boolean
    {
        this.logger.verbose("[isTargetReady] %s", this._id);

        if (this._isConnected)
        {
            this.logger.silly("[isTargetReady] %s, IsConnected. date: %s", this._id, this._connectDate);

            const seconds = getDiffInSeconds(this._connectDate!);
            this.logger.silly("[isTargetReady] %s, Connected %s seconds ago.", this._id, seconds);
    
            if (seconds > 5) {
                this.logger.verbose("[isTargetReady] %s, is ready", this._id);
    
                return true;
            }
        }

        if (this._isDisconnected)
        {
            const seconds = getDiffInSeconds(this._disconnectDate!);
            this.logger.warn("[isTargetReady] %s, Disconnected on %s, %s seconds ago.", this._id, this._disconnectDate!.toISOString(), seconds);
    
            if (seconds > 10) {
                this.logger.warn("[isTargetReady] %s. Could not recover, so marking ready. Last Error Code: %s. Msg: %s. ", this._id, this._errorCode, this._errorMessage);
                return true;
            }
        }
        
        this.logger.silly("[isTargetReady] %s, is not ready", this._id);
        return false;
    }
    
    private _handle(isPresent: boolean, obj: KubernetesObject) : void
    {
        this._logger.silly("Handle: %s, present: %s", obj.kind, isPresent);
        this._context.k8sParser.parse(isPresent, obj);
    }

    private _parseAction(action: DeltaAction) : boolean
    {
        if (action == DeltaAction.Added || action == DeltaAction.Modified) {
            return true;
        }
        if (action == DeltaAction.Deleted) {
            return false;
        }
        return false;
    }

    private _reportNotReady() : void
    {
        this._loader.determineReady(true);
    }
    
    private _debugSaveToMock(isPresent: boolean, obj : any)
    {
        if (isPresent) {

            let parts = [obj.apiVersion, obj.kind, obj.namespace, obj.metadata.name];
            parts = parts.filter(x => x);
            let fileName =  parts.join('-');
            fileName = fileName.replace(/\./g, "-");
            fileName = fileName.replace(/\//g, "-");
            fileName = fileName.replace(/\\/g, "-");
            fileName = fileName + '.json';
            fileName = Path.resolve(__dirname, '..', '..', 'mock', 'data', fileName);
            this._logger.info(fileName);
            writeFileSync(fileName, JSON.stringify(obj, null, 4));
        }
    }

}

function getDiffInSeconds(date: Date) : number
{
    const now = moment();
    const eventDate = moment(date);
    const duration = moment.duration(now.diff(eventDate));
    const seconds = duration.asSeconds();
    return seconds;
}
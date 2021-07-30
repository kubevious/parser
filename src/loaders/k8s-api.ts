import _ from 'the-lodash';
import { Promise } from 'the-promise';
import { ILogger } from 'the-logger';

import { writeFileSync } from 'fs';
import * as Path from 'path' 

import { Context } from '../context';

import moment from 'moment';
import { DeltaAction, ResourceAccessor, KubernetesObject } from 'k8s-super-client';
import { ApiGroupInfo } from 'k8s-super-client/dist/cluster-info-fetcher';
import { K8sLoader } from './k8s';

export class K8sApiLoader 
{
    private _context : Context;
    private _logger : ILogger;
    private _loader: K8sLoader;

    private _id: string;
    private _apiGroup: ApiGroupInfo;
    private _client: ResourceAccessor;

    private _canIgnore: boolean = false;
    private _connectDate: Date | null = null;

    private _isConnected: boolean = false;
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
            let isPresent = this._parseAction(action);

            // this._debugSaveToMock(isPresent, obj);
            this._handle(isPresent, obj);
        }, () => {
            this._logger.info("[_watch] Connected: %s", this._id);
            this._connectDate = new Date();
            this._isConnected = true;
            this._errorCode = undefined;
            this._errorMessage = undefined;
            this._reportReady();
        }, (resourceAccessor : any, data: any) => {
            this._logger.info("[_watch] Disconnected: %s", this._id);
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
            if (data.status) {
                this._canIgnore = true;
            }
            this._reportReady();
        });
    }

    isTargetReady() : boolean
    {
        this.logger.verbose("[isTargetReady] %s", this._id);

        if (this._canIgnore) {
            this.logger.silly("[isTargetReady] %s, canIgnore: %s", this._id, this._canIgnore);
            return true;
        }

        if (this._connectDate) {
            this.logger.silly("[isTargetReady] %s, NO connectDate", this._id);
            return false;
        }

        this.logger.silly("[isTargetReady] %s, date: %s", this._id, this._connectDate);
        let now = moment(new Date());
        let connectDate = moment(this._connectDate);
        let duration = moment.duration(now.diff(connectDate));
        let seconds = duration.asSeconds();
        this.logger.silly("[isTargetReady] %s, seconds: %s", this._id, seconds);

        if (seconds > 5) {
            this.logger.verbose("[isTargetReady] %s, is ready", this._id);

            return true;
        }
        
        this.logger.silly("[isTargetReady] %s, is not ready", this._id);
        return false;
    }
    
    private _handle(isPresent: boolean, obj: KubernetesObject) : void
    {
        this._logger.verbose("Handle: %s, present: %s", obj.kind, isPresent);
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

    private _reportReady() : void
    {
        this._loader.reportReady();
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

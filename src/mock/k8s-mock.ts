import _ from 'the-lodash';
import { ILogger } from 'the-logger';
import { Context } from '../context';

import { readdirSync, statSync, readFileSync } from 'fs';
 
import * as Path from 'path';
import * as yaml from 'js-yaml';
import { ILoader, ReadyHandler } from '../loaders/types';
import { KubernetesObject } from 'k8s-super-client';
import { extractK8sConfigId } from '@kubevious/helper-logic-processor'
import { ApiResourceStatus } from '@kubevious/data-models';

export class K8sMockLoader implements ILoader
{
    private _context : Context;
    private _logger : ILogger;

    private _name : string;
    private _isReady : boolean = false;

    private _readyHandler? : ReadyHandler;

    private _statuses : Record<string, ApiResourceStatus> = {}

    constructor(context : Context, name: string)
    {
        this._context = context;
        this._logger = context.logger.sublogger("K8sMockLoader");
        this._name = name;

        this.logger.info("Constructed");
    }

    get logger() {
        return this._logger;
    }

    setupReadyHandler(handler : ReadyHandler)
    {
        this._readyHandler = handler;
        if (this._isReady) {
            this._readyHandler(true);
        }
    }

    close()
    {
        
    }

    run()
    {
        let dirName = Path.resolve(__dirname, '..', '..', this._name);
        this.logger.info('[run] DataDir: %s', dirName);

        let files = this._getAllFiles(dirName);
        for(let fullPath of files)
        {
            let contents = readFileSync(fullPath, { encoding: 'utf8' });
            let obj : any = null;
            if (fullPath.endsWith('.json')) {
                obj = JSON.parse(contents);
            } else if (fullPath.endsWith('.yaml')) {
                obj = yaml.safeLoadAll(contents);
            }
            if (obj) {
                if (_.isArray(obj)) {
                    for(let x of obj) {
                        this._handle(true, x);
                    }
                } else {
                    this._handle(true, obj);
                }
            }
        }

        setTimeout(() => {
            this._isReady = true;
            if (this._readyHandler) {
                this._readyHandler!(true);
            }
        }, 3000);
    }


    extractApiStatuses() : ApiResourceStatus[]
    {
        return _.values(this._statuses);
    }

    private _getAllFiles(dirPath: string, arrayOfFiles? : string[]) : string[] {
        let files = readdirSync(dirPath)
      
        arrayOfFiles = arrayOfFiles || []
      
        files.forEach((file : string) => {
            const childPath = Path.join(dirPath, file);
            if (statSync(childPath).isDirectory()) {
                arrayOfFiles = this._getAllFiles(childPath, arrayOfFiles)
            } else {
                arrayOfFiles!.push(childPath)
            }
        })
      
        return arrayOfFiles
    }

    private _handle(isPresent: boolean, obj : KubernetesObject) 
    {
        if (obj.kind == 'List')
        {
            for(let item of <KubernetesObject[]>(obj.items))
            {
                this._handle(isPresent, item);
            }
        }
        else
        {
            const id = extractK8sConfigId(obj);
            if (!this._context.apiSelector.isEnabled(id.api, id.version, obj.kind)) {
                this._logger.warn("Object %s :: %s is not tracked.", obj.apiVersion, obj.kind);
                return;
            }

            this._logger.debug("Handle: %s, present: %s", obj.kind, isPresent);
            this._context.k8sParser.parse(isPresent, obj);

            {
                const key = `${obj.apiVersion}:${obj.kind}`;
                let status = this._statuses[key];
                if (!status) {
                    status = { 
                        apiName: id.api,
                        apiVersion: id.version,
                        kindName: obj.kind
                    }
                    this._statuses[key] = status;
                }
            }
        }
    }

    private _parseAPIVersion(obj : KubernetesObject)
    {
        let apiParts = obj.apiVersion.split('/');
        let api : string | null = null;
        let version : string;
        if (apiParts.length == 2) {
            api = apiParts[0];
            version = apiParts[1];
        } else {
            api = null;
            version = apiParts[0];
        }

        return {
            api: api,
            version: version
        }
    }
}